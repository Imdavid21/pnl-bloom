import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hypercore API types
interface HypercoreFill {
  time: number; // Unix timestamp ms
  coin: string; // Market symbol e.g. "BTC"
  dir: 'Open Long' | 'Open Short' | 'Close Long' | 'Close Short';
  sz: string; // Size as string
  px: string; // Price as string
  fee: string; // Fee in USD
  closedPnl?: string; // Realized PnL if closing
  hash?: string; // Transaction hash
  oid?: number; // Order ID
}

interface HypercoreFunding {
  time: number;
  hash?: string;
  delta?: {
    coin: string;
    usdc: string | number;
    szi?: string;
    fundingRate?: string;
    type?: string;
  };
  // Old format fallback
  coin?: string;
  usdc?: string;
  szi?: string;
  fundingRate?: string;
}

interface HypercorePosition {
  coin: string;
  szi: string; // Signed size (positive = long, negative = short)
  entryPx: string;
  positionValue?: string;
  unrealizedPnl?: string;
  marginUsed?: string;
}

interface IngestPayload {
  wallet: string;
  fills?: HypercoreFill[];
  funding?: HypercoreFunding[];
  positions?: HypercorePosition[];
  mark_prices?: { [coin: string]: string };
}

// Normalize Hypercore fill into economic event
function normalizeFill(walletId: string, fill: HypercoreFill): any {
  const ts = new Date(fill.time);
  const day = ts.toISOString().split('T')[0];
  
  // Determine side from direction
  let side: 'long' | 'short';
  if (fill.dir.includes('Long')) {
    side = 'long';
  } else {
    side = 'short';
  }

  // Create a unique dedupe key for this fill
  const dedupeKey = `fill:${fill.coin}:${fill.oid || fill.time}`;

  return {
    wallet_id: walletId,
    ts: ts.toISOString(),
    day,
    event_type: 'PERP_FILL',
    venue: 'hypercore',
    market: fill.coin,
    side,
    size: parseFloat(fill.sz),
    exec_price: parseFloat(fill.px),
    realized_pnl_usd: fill.closedPnl ? parseFloat(fill.closedPnl) : 0,
    fee_usd: parseFloat(fill.fee) || 0,
    tx_hash: fill.hash || null,
    dedupe_key: dedupeKey,
    meta: {
      dir: fill.dir,
    },
  };
}

// Normalize Hypercore funding into economic event
function normalizeFunding(walletId: string, funding: HypercoreFunding): any {
  const ts = new Date(funding.time);
  const day = ts.toISOString().split('T')[0];

  // Handle nested delta format from Hyperliquid API
  const delta = funding.delta;
  const coin = delta?.coin || funding.coin || 'UNKNOWN';
  const usdc = delta?.usdc || funding.usdc || 0;
  const fundingRate = delta?.fundingRate || funding.fundingRate;
  const szi = delta?.szi || funding.szi;

  // Create a unique dedupe key for this funding payment
  const dedupeKey = `funding:${funding.time}:${coin}`;

  return {
    wallet_id: walletId,
    ts: ts.toISOString(),
    day,
    event_type: 'PERP_FUNDING',
    venue: 'hypercore',
    market: coin,
    funding_usd: typeof usdc === 'string' ? parseFloat(usdc) : usdc,
    fee_usd: 0,
    dedupe_key: dedupeKey,
    meta: {
      funding_rate: fundingRate,
      position_size: szi,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: IngestPayload = await req.json();
    const { wallet, fills, funding, positions, mark_prices } = payload;

    console.log(`[ingest-hypercore] Received data for wallet: ${wallet}`);
    console.log(`[ingest-hypercore] Fills: ${fills?.length || 0}, Funding: ${funding?.length || 0}, Positions: ${positions?.length || 0}`);

    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'wallet parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletLower = wallet.toLowerCase();

    // Get or create wallet
    let { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

    if (walletError) throw walletError;

    if (!walletData) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ address: walletLower })
        .select('id')
        .single();
      if (createError) throw createError;
      walletData = newWallet;
    }

    const walletId = walletData.id;
    let economicEventsInserted = 0;
    const allAffectedDays: Set<string> = new Set();

    // Process fills
    if (fills && Array.isArray(fills)) {
      for (const fill of fills) {
        const econEvent = normalizeFill(walletId, fill);
        allAffectedDays.add(econEvent.day);

        // Store raw event
        const uniqueKey = `hypercore:fill:${fill.time}:${fill.coin}:${fill.oid || ''}:${walletLower}`;
        await supabase.from('raw_events').upsert({
          wallet_id: walletId,
          source_type: 'hypercore',
          ts: econEvent.ts,
          unique_key: uniqueKey,
          payload: fill,
        }, { onConflict: 'unique_key', ignoreDuplicates: true });

        // Insert economic event
        const { error: econError } = await supabase
          .from('economic_events')
          .insert(econEvent);

        if (!econError) {
          economicEventsInserted++;
        } else if (!econError.message.includes('duplicate') && !econError.message.includes('unique')) {
          console.error('[ingest-hypercore] Error inserting fill:', econError);
        }
      }
    }

    // Process funding payments
    if (funding && Array.isArray(funding)) {
      for (const fundingPayment of funding) {
        const econEvent = normalizeFunding(walletId, fundingPayment);
        allAffectedDays.add(econEvent.day);

        // Store raw event
        const uniqueKey = `hypercore:funding:${fundingPayment.time}:${fundingPayment.coin}:${walletLower}`;
        await supabase.from('raw_events').upsert({
          wallet_id: walletId,
          source_type: 'hypercore',
          ts: econEvent.ts,
          unique_key: uniqueKey,
          payload: fundingPayment,
        }, { onConflict: 'unique_key', ignoreDuplicates: true });

        // Insert economic event
        const { error: econError } = await supabase
          .from('economic_events')
          .insert(econEvent);

        if (!econError) {
          economicEventsInserted++;
        } else if (!econError.message.includes('duplicate') && !econError.message.includes('unique')) {
          console.error('[ingest-hypercore] Error inserting funding:', econError);
        }
      }
    }

    // Store current positions snapshot
    if (positions && Array.isArray(positions)) {
      for (const pos of positions) {
        const positionSize = parseFloat(pos.szi);
        
        await supabase.from('positions_perps').upsert({
          wallet_id: walletId,
          market: pos.coin,
          position_size: positionSize,
          avg_entry: parseFloat(pos.entryPx),
        }, { onConflict: 'wallet_id,market' });
      }
      console.log(`[ingest-hypercore] Updated ${positions.length} position snapshots`);
    }

    // Store mark prices
    if (mark_prices && typeof mark_prices === 'object') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      for (const [coin, price] of Object.entries(mark_prices)) {
        await supabase.from('mark_snapshots').upsert({
          market: coin,
          ts: now.toISOString(),
          day: today,
          mark_price: parseFloat(price),
        }, { onConflict: 'market,ts' });
      }
      console.log(`[ingest-hypercore] Stored ${Object.keys(mark_prices).length} mark prices`);
    }

    // Update source cursor
    const latestFill = fills?.[fills.length - 1];
    const latestFunding = funding?.[funding.length - 1];
    const latestTime = Math.max(latestFill?.time || 0, latestFunding?.time || 0);
    
    if (latestTime > 0) {
      await supabase.from('sources').upsert({
        wallet_id: walletId,
        source_type: 'hypercore',
        cursor: latestTime.toString(),
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'wallet_id,source_type' });
    }

    // Trigger recompute for affected days
    const affectedDaysArray = Array.from(allAffectedDays).sort();
    if (affectedDaysArray.length > 0) {
      // For perp fills, recompute entire month as positions can cascade
      const minDay = new Date(affectedDaysArray[0]);
      minDay.setDate(1); // Start of month
      const maxDay = new Date(affectedDaysArray[affectedDaysArray.length - 1]);
      maxDay.setMonth(maxDay.getMonth() + 1, 0); // End of month

      console.log(`[ingest-hypercore] Triggering recompute from ${minDay.toISOString().split('T')[0]} to ${maxDay.toISOString().split('T')[0]}`);

      await supabase.functions.invoke('admin-recompute', {
        body: {
          wallet: walletLower,
          start_day: minDay.toISOString().split('T')[0],
          end_day: maxDay.toISOString().split('T')[0],
        },
      });
    }

    console.log(`[ingest-hypercore] Processed: ${economicEventsInserted} economic events`);

    return new Response(
      JSON.stringify({
        success: true,
        economic_events_inserted: economicEventsInserted,
        affected_days: affectedDaysArray,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[ingest-hypercore] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
