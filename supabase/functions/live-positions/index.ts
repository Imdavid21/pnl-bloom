import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface Position {
  market: string;
  position_size: number;
  avg_entry: number;
  liquidation_px: number | null;
  mark_price: number;
  effective_leverage: number;
  margin_used: number;
  unrealized_pnl: number;
  position_value: number;
  return_on_equity: number;
  max_leverage: number;
  liq_score: number;
}

interface ClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalMarginUsed: string;
  };
  assetPositions: Array<{
    position: {
      coin: string;
      szi: string;
      entryPx: string;
      positionValue: string;
      unrealizedPnl: string;
      returnOnEquity: string;
      leverage: {
        type: string;
        value: number;
        rawUsd?: string;
      };
      liquidationPx: string | null;
      marginUsed: string;
      maxLeverage: number;
    };
  }>;
}

async function fetchHyperliquidData(body: any): Promise<any> {
  console.log(`[live-positions] Fetching ${body.type} for ${body.user}...`);
  
  const response = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid API error: ${response.status}`);
  }

  return response.json();
}

async function fetchMeta(): Promise<Map<string, { name: string; szDecimals: number }>> {
  const meta = await fetchHyperliquidData({ type: 'meta' });
  const assetMap = new Map<string, { name: string; szDecimals: number }>();
  
  if (meta?.universe) {
    for (const asset of meta.universe) {
      assetMap.set(asset.name, {
        name: asset.name,
        szDecimals: asset.szDecimals,
      });
    }
  }
  
  return assetMap;
}

async function fetchAllMids(): Promise<Map<string, number>> {
  const mids = await fetchHyperliquidData({ type: 'allMids' });
  const midMap = new Map<string, number>();
  
  if (mids) {
    for (const [coin, price] of Object.entries(mids)) {
      midMap.set(coin, parseFloat(price as string));
    }
  }
  
  return midMap;
}

function calculateLiqScore(
  positionSize: number,
  entryPrice: number,
  markPrice: number,
  liquidationPx: number | null,
  leverage: number,
  marginUsed: number,
  unrealizedPnl: number
): number {
  // Liq score: 0 = very safe, 1 = about to be liquidated
  
  if (!liquidationPx || liquidationPx <= 0) {
    // No liquidation price available, estimate from leverage
    // Higher leverage = higher risk
    return Math.min(1, leverage / 100);
  }
  
  const isLong = positionSize > 0;
  
  // Calculate distance to liquidation
  const distanceToLiq = isLong 
    ? (markPrice - liquidationPx) / markPrice
    : (liquidationPx - markPrice) / markPrice;
  
  // If distance is negative, we're past liquidation price (shouldn't happen)
  if (distanceToLiq < 0) {
    return 1;
  }
  
  // Calculate max distance based on leverage
  // At 10x leverage, max distance is roughly 10%
  const maxDistance = 1 / leverage;
  
  // Score is how much of the buffer we've used
  // If we've used 80% of the buffer, score is 0.8
  const usedBuffer = 1 - (distanceToLiq / maxDistance);
  
  // Also factor in unrealized loss
  if (marginUsed > 0 && unrealizedPnl < 0) {
    const lossPct = Math.abs(unrealizedPnl) / marginUsed;
    // If loss is 50% of margin, add 0.25 to score
    const lossContribution = Math.min(0.5, lossPct * 0.5);
    return Math.min(1, Math.max(0, usedBuffer + lossContribution));
  }
  
  return Math.min(1, Math.max(0, usedBuffer));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const wallet = url.searchParams.get('wallet');

    if (!wallet || !WALLET_REGEX.test(wallet.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Valid wallet address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletLower = wallet.toLowerCase();
    console.log(`[live-positions] Fetching live positions for ${walletLower}`);

    // Fetch clearinghouse state and mark prices in parallel
    const [clearinghouseState, mids] = await Promise.all([
      fetchHyperliquidData({
        type: 'clearinghouseState',
        user: walletLower,
      }) as Promise<ClearinghouseState>,
      fetchAllMids(),
    ]);

    if (!clearinghouseState?.assetPositions) {
      return new Response(
        JSON.stringify({ 
          positions: [],
          account: {
            account_value: 0,
            total_margin_used: 0,
            total_notional: 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const positions: Position[] = [];

    for (const ap of clearinghouseState.assetPositions) {
      const pos = ap.position;
      const positionSize = parseFloat(pos.szi);
      
      // Skip zero positions
      if (Math.abs(positionSize) < 0.0000001) continue;

      const market = pos.coin;
      const entryPrice = parseFloat(pos.entryPx);
      const markPrice = mids.get(market) || entryPrice;
      const positionValue = parseFloat(pos.positionValue);
      const unrealizedPnl = parseFloat(pos.unrealizedPnl);
      const marginUsed = parseFloat(pos.marginUsed);
      const returnOnEquity = parseFloat(pos.returnOnEquity);
      const maxLeverage = pos.maxLeverage || 50;
      
      // Parse leverage
      let effectiveLeverage = 1;
      if (pos.leverage) {
        if (pos.leverage.type === 'cross') {
          // Cross margin leverage from account
          const accountValue = parseFloat(clearinghouseState.marginSummary.accountValue);
          effectiveLeverage = accountValue > 0 ? Math.abs(positionValue) / accountValue : 1;
        } else {
          effectiveLeverage = pos.leverage.value || 1;
        }
      }
      
      // Parse liquidation price
      let liquidationPx: number | null = null;
      if (pos.liquidationPx && pos.liquidationPx !== 'null') {
        liquidationPx = parseFloat(pos.liquidationPx);
      }

      // Calculate liquidation score
      const liqScore = calculateLiqScore(
        positionSize,
        entryPrice,
        markPrice,
        liquidationPx,
        effectiveLeverage,
        marginUsed,
        unrealizedPnl
      );

      positions.push({
        market: `${market}-PERP`,
        position_size: positionSize,
        avg_entry: entryPrice,
        liquidation_px: liquidationPx,
        mark_price: markPrice,
        effective_leverage: effectiveLeverage,
        margin_used: marginUsed,
        unrealized_pnl: unrealizedPnl,
        position_value: positionValue,
        return_on_equity: returnOnEquity,
        max_leverage: maxLeverage,
        liq_score: liqScore,
      });
    }

    // Sort by liq score descending (most at risk first)
    positions.sort((a, b) => b.liq_score - a.liq_score);

    const account = {
      account_value: parseFloat(clearinghouseState.marginSummary.accountValue),
      total_margin_used: parseFloat(clearinghouseState.marginSummary.totalMarginUsed),
      total_notional: parseFloat(clearinghouseState.marginSummary.totalNtlPos),
    };

    console.log(`[live-positions] Found ${positions.length} open positions`);

    return new Response(
      JSON.stringify({ positions, account }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[live-positions] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
