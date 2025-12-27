/**
 * Position Aggregator
 * Merge positions from HyperCore (perps + spot) and HyperEVM (lending + LP)
 */

import { supabase } from '@/integrations/supabase/client';
import { getSpotClearinghouseState, getSpotMetaAndAssetCtxs } from './hyperliquidApi';
import { calculateLiquidationRisk, type RiskPosition } from './risk-calculator';

// ============ TYPES ============

export interface PerpPosition {
  market: string;
  side: 'long' | 'short';
  size: number;
  sizeNotional: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  leverage: number;
  liquidationRisk: number;
  marginUsed: number;
}

export interface SpotBalance {
  symbol: string;
  balance: number;
  valueUsd: number;
  price: number;
  change24h: number;
}

export interface LendingPosition {
  asset: string;
  type: 'supplied' | 'borrowed';
  amount: number;
  valueUsd: number;
  apy: number;
}

export interface LPPosition {
  poolName: string;
  sharePct: number;
  positionValue: number;
  fees24h: number;
  poolUrl: string;
}

export interface PositionsSummary {
  totalValue: number;
  breakdown: {
    perps: number;
    spot: number;
    lendingNet: number;
    lp: number;
  };
  percentages: {
    perps: number;
    spot: number;
    lendingNet: number;
    lp: number;
  };
  highestRisk: {
    market: string;
    riskScore: number;
  } | null;
}

export interface UnifiedPositions {
  summary: PositionsSummary;
  perps: PerpPosition[];
  spot: SpotBalance[];
  lending: LendingPosition[];
  lp: LPPosition[];
  perpsTotalMargin: number;
}

// ============ FETCHERS ============

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchPerpPositions(address: string): Promise<{ positions: PerpPosition[]; marginUsed: number; accountValue: number }> {
  try {
    // Fetch clearinghouse state and all mids in parallel
    const [stateResponse, midsResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/hyperliquid-proxy`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'clearinghouseState', user: address }),
      }),
      fetch(`${SUPABASE_URL}/functions/v1/hyperliquid-proxy`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'allMids' }),
      }),
    ]);

    if (!stateResponse.ok) return { positions: [], marginUsed: 0, accountValue: 0 };

    const data = await stateResponse.json();
    const midsData = midsResponse.ok ? await midsResponse.json() : {};
    
    if (!data || data.error) return { positions: [], marginUsed: 0, accountValue: 0 };

    const marginSummary = data.marginSummary || {};
    const assetPositions = data.assetPositions || [];
    const accountValue = parseFloat(marginSummary.accountValue || '0');
    const marginUsed = parseFloat(marginSummary.totalMarginUsed || '0');

    const positions: PerpPosition[] = assetPositions
      .map((pos: any) => {
        const position = pos.position || pos;
        const coin = position.coin || pos.coin;
        const szi = parseFloat(position.szi || '0');
        const size = Math.abs(szi);
        const entryPrice = parseFloat(position.entryPx || '0');
        const leverage = parseFloat(position.leverage?.value || position.leverage || '1');
        const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
        const positionMargin = parseFloat(position.marginUsed || '0');
        
        // Get current price from mids
        const currentPrice = parseFloat(midsData[coin] || position.markPx || entryPrice.toString());
        const sizeNotional = size * currentPrice;
        
        const side: 'long' | 'short' = szi >= 0 ? 'long' : 'short';
        const unrealizedPnlPct = positionMargin > 0 ? (unrealizedPnl / positionMargin) * 100 : 0;
        
        // Calculate liquidation risk
        const riskPosition: RiskPosition = {
          leverage,
          marginUsed: positionMargin,
          accountValue,
          entryPrice,
          currentPrice,
          side,
        };
        const liquidationRisk = calculateLiquidationRisk(riskPosition);

        return {
          market: coin,
          side,
          size,
          sizeNotional,
          entryPrice,
          currentPrice,
          unrealizedPnl,
          unrealizedPnlPct,
          leverage,
          liquidationRisk,
          marginUsed: positionMargin,
        };
      })
      .filter((p: PerpPosition) => p.size > 0);

    return { positions, marginUsed, accountValue };
  } catch (error) {
    console.error('Failed to fetch perp positions:', error);
    return { positions: [], marginUsed: 0, accountValue: 0 };
  }
}

async function fetchSpotBalances(address: string): Promise<SpotBalance[]> {
  try {
    const [spotState, metaAndCtxs] = await Promise.all([
      getSpotClearinghouseState(address),
      getSpotMetaAndAssetCtxs(),
    ]);

    if (!spotState?.balances || !metaAndCtxs) return [];

    const [spotMeta, assetCtxs] = metaAndCtxs;

    // Create price map
    const priceMap = new Map<number, { price: number; change24h: number }>();
    spotMeta.universe.forEach((pair, i) => {
      const ctx = assetCtxs[i];
      if (ctx) {
        const price = parseFloat(ctx.midPx || ctx.markPx || '0');
        const prevPrice = parseFloat(ctx.prevDayPx || '0');
        const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
        priceMap.set(pair.tokens[0], { price, change24h });
      }
    });

    const balances: SpotBalance[] = [];

    spotState.balances.forEach((balance) => {
      const totalBalance = parseFloat(balance.total || '0');
      if (totalBalance <= 0) return;

      const priceData = priceMap.get(balance.token) || { price: 0, change24h: 0 };
      let price = priceData.price;
      
      // USDC special case
      if (balance.coin === 'USDC') {
        price = 1;
      }

      const usdValue = totalBalance * price;
      
      // Filter dust (< $1)
      if (usdValue < 1) return;

      balances.push({
        symbol: balance.coin,
        balance: totalBalance,
        valueUsd: usdValue,
        price,
        change24h: balance.coin === 'USDC' ? 0 : priceData.change24h,
      });
    });

    // Sort by USD value descending
    return balances.sort((a, b) => b.valueUsd - a.valueUsd);
  } catch (error) {
    console.error('Failed to fetch spot balances:', error);
    return [];
  }
}

async function fetchLendingPositions(address: string): Promise<LendingPosition[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/hyperevm-lending?address=${address}`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    if (data.error || !data.positions) return [];
    
    return data.positions.map((p: any) => ({
      asset: p.asset || 'Unknown',
      type: p.type as 'supplied' | 'borrowed',
      amount: Number(p.amount || 0),
      valueUsd: Number(p.valueUsd || 0),
      apy: Number(p.apy || 0),
    }));
  } catch (error) {
    console.error('Failed to fetch lending positions:', error);
    return [];
  }
}

async function fetchLPPositions(address: string): Promise<LPPosition[]> {
  // HyperEVM LP positions would be queried here
  // For now, return empty as DEX/LP protocols may vary
  // TODO: Implement when LP protocols are available on HyperEVM
  return [];
}

// ============ MAIN AGGREGATOR ============

export async function fetchUnifiedPositions(address: string): Promise<UnifiedPositions> {
  const normalizedAddress = address.toLowerCase();

  // Fetch all data in parallel
  const [perpData, spot, lending, lp] = await Promise.all([
    fetchPerpPositions(normalizedAddress),
    fetchSpotBalances(normalizedAddress),
    fetchLendingPositions(normalizedAddress),
    fetchLPPositions(normalizedAddress),
  ]);

  const { positions: perps, marginUsed: perpsTotalMargin } = perpData;

  // Calculate totals
  const perpValue = perps.reduce((sum, p) => sum + p.sizeNotional, 0);
  const spotValue = spot.reduce((sum, s) => sum + s.valueUsd, 0);
  const lendingSupplied = lending.filter(l => l.type === 'supplied').reduce((sum, l) => sum + l.valueUsd, 0);
  const lendingBorrowed = lending.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.valueUsd, 0);
  const lendingNet = lendingSupplied - lendingBorrowed;
  const lpValue = lp.reduce((sum, l) => sum + l.positionValue, 0);

  const totalValue = perpValue + spotValue + lendingNet + lpValue;

  // Calculate percentages
  const percentages = {
    perps: totalValue > 0 ? (perpValue / totalValue) * 100 : 0,
    spot: totalValue > 0 ? (spotValue / totalValue) * 100 : 0,
    lendingNet: totalValue > 0 ? (lendingNet / totalValue) * 100 : 0,
    lp: totalValue > 0 ? (lpValue / totalValue) * 100 : 0,
  };

  // Find highest risk position
  const highestRisk = perps.length > 0
    ? perps.reduce((max, p) => p.liquidationRisk > max.liquidationRisk ? p : max)
    : null;

  return {
    summary: {
      totalValue,
      breakdown: {
        perps: perpValue,
        spot: spotValue,
        lendingNet,
        lp: lpValue,
      },
      percentages,
      highestRisk: highestRisk ? {
        market: highestRisk.market,
        riskScore: highestRisk.liquidationRisk,
      } : null,
    },
    perps,
    spot,
    lending,
    lp,
    perpsTotalMargin,
  };
}
