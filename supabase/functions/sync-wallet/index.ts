import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  calculateDailyMetrics, 
  calculateMonthlyMetrics,
  EconomicEvent 
} from "../_shared/metrics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PAGE_LIMIT = 500;
const RATE_LIMIT_DELAY = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateWallet(wallet: string | null | undefined): string | null {
  if (!wallet) return null;
  const cleaned = wallet.trim().toLowerCase();
  return WALLET_REGEX.test(cleaned) ? cleaned : null;
}

async function fetchHyperliquidData(body: any, retries = 5): Promise<any> {
  console.log(`[sync-wallet] Fetching ${body.type}...`);
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const waitTime = Math.min((attempt + 1) * 2000, 10000);
      console.log(`[sync-wallet] Rate limited, waiting ${waitTime}ms...`);
      await sleep(waitTime);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }
  
  throw new Error('Max retries exceeded due to rate limiting');
}

async function fetchAllFills(wallet: string, startTime: number, endTime: number, maxFills?: number): Promise<any[]> {
  const allFills: any[] = [];
  let currentStartTime = startTime;
  let pageCount = 0;
  const MAX_PAGES = 50;
  const fillLimit = maxFills || 25000;

  while (pageCount < MAX_PAGES) {
    console.log(`[sync-wallet] Fetching fills page ${pageCount + 1}`);
    
    const fills = await fetchHyperliquidData({
      type: 'userFillsByTime',
      user: wallet,
      startTime: currentStartTime,
      endTime: endTime,
      aggregateByTime: false,
    });

    if (!fills || fills.length === 0) break;

    allFills.push(...fills);
    pageCount++;

    if (fills.length < PAGE_LIMIT) break;
    if (allFills.length >= fillLimit) break;

    const lastFillTime = fills[fills.length - 1].time;
    currentStartTime = lastFillTime + 1;
    
    if (currentStartTime >= endTime) break;
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`[sync-wallet] Fetched ${allFills.length} total fills`);
  return allFills;
}

async function fetchAllFunding(wallet: string, startTime: number, endTime: number): Promise<any[]> {
  const allFunding: any[] = [];
  let currentStartTime = startTime;
  let pageCount = 0;
  const MAX_PAGES = 50;

  while (pageCount < MAX_PAGES) {
    console.log(`[sync-wallet] Fetching funding page ${pageCount + 1}`);
    
    const funding = await fetchHyperliquidData({
      type: 'userFunding',
      user: wallet,
      startTime: currentStartTime,
      endTime: endTime,
    });

    if (!funding || funding.length === 0) break;

    allFunding.push(...funding);
    pageCount++;

    if (funding.length < PAGE_LIMIT) break;

    const lastFundingTime = funding[funding.length - 1].time;
    currentStartTime = lastFundingTime + 1;
    
    if (currentStartTime >= endTime) break;
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`[sync-wallet] Fetched ${allFunding.length} total funding`);
  return allFunding;
}

function normalizeFill(walletId: string, fill: any): any {
  const ts = new Date(fill.time);
  const day = ts.toISOString().split('T')[0];
  
  let side: 'long' | 'short';
  if (fill.dir?.includes('Long')) {
    side = 'long';
  } else {
    side = 'short';
  }

  const size = parseFloat(fill.sz) || 0;
  const price = parseFloat(fill.px) || 0;
  const volume = size * price;

  const dedupeId = fill.tid || fill.oid || fill.time;

  return {
    wallet_id: walletId,
    ts: ts.toISOString(),
    day,
    event_type: 'PERP_FILL',
    venue: 'hypercore',
    market: fill.coin,
    side,
    size,
    exec_price: price,
    usd_value: volume,
    realized_pnl_usd: fill.closedPnl ? parseFloat(fill.closedPnl) : 0,
    fee_usd: parseFloat(fill.fee) || 0,
    tx_hash: fill.hash || null,
    meta: {
      dedupe: `fill:${fill.coin}:${dedupeId}`,
      dir: fill.dir,
      tid: fill.tid,
      oid: fill.oid,
      crossed: fill.crossed,
      feeToken: fill.feeToken,
      startPosition: fill.startPosition,
    },
  };
}

function normalizeFunding(walletId: string, funding: any): any {
  const ts = new Date(funding.time);
  const day = ts.toISOString().split('T')[0];

  const delta = funding.delta;
  const coin = delta?.coin || funding.coin || 'UNKNOWN';
  const usdc = delta?.usdc || funding.usdc || 0;
  const fundingRate = delta?.fundingRate || funding.fundingRate;
  const szi = delta?.szi || funding.szi;

  return {
    wallet_id: walletId,
    ts: ts.toISOString(),
    day,
    event_type: 'PERP_FUNDING',
    venue: 'hypercore',
    market: coin,
    funding_usd: typeof usdc === 'string' ? parseFloat(usdc) : usdc,
    fee_usd: 0,
    meta: {
      dedupe: `funding:${funding.time}:${coin}`,
      funding_rate: fundingRate,
      position_size: szi,
      hash: funding.hash,
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

    const { wallet } = await req.json();
    
    const walletLower = validateWallet(wallet);
    if (!walletLower) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create wallet
    let { data: walletData } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

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

    // Create sync run record
    const { data: syncRun, error: syncError } = await supabase
      .from('sync_runs')
      .insert({
        wallet_id: walletId,
        status: 'running',
      })
      .select('id')
      .single();

    if (syncError) throw syncError;

    // Full history sync
    const startTime = new Date('2024-01-01T00:00:00Z').getTime();
    const endTime = Date.now();

    console.log(`[sync-wallet] Starting sync for ${walletLower}`);

    // Fetch data
    let fills: any[] = [];
    let funding: any[] = [];
    
    try {
      fills = await fetchAllFills(walletLower, startTime, endTime);
    } catch (e) {
      console.error('[sync-wallet] Error fetching fills:', e);
    }

    try {
      funding = await fetchAllFunding(walletLower, startTime, endTime);
    } catch (e) {
      console.error('[sync-wallet] Error fetching funding:', e);
    }

    // Insert raw events
    const rawFillEvents = fills.map(fill => {
      const ts = new Date(fill.time);
      const dedupeId = fill.tid || fill.oid || fill.time;
      return {
        wallet_id: walletId,
        source_type: 'hypercore',
        ts: ts.toISOString(),
        unique_key: `hypercore:fill:${fill.coin}:${dedupeId}:${walletLower}`,
        payload: fill,
      };
    });

    const rawFundingEvents = funding.map(f => {
      const ts = new Date(f.time);
      const coin = f.delta?.coin || f.coin || 'UNKNOWN';
      return {
        wallet_id: walletId,
        source_type: 'hypercore',
        ts: ts.toISOString(),
        unique_key: `hypercore:funding:${f.time}:${coin}:${walletLower}`,
        payload: f,
      };
    });

    if (rawFillEvents.length > 0) {
      await supabase.from('raw_events').upsert(rawFillEvents, { 
        onConflict: 'unique_key', 
        ignoreDuplicates: true 
      });
    }
    if (rawFundingEvents.length > 0) {
      await supabase.from('raw_events').upsert(rawFundingEvents, { 
        onConflict: 'unique_key', 
        ignoreDuplicates: true 
      });
    }

    // Process economic events
    const allAffectedDays: Set<string> = new Set();
    let economicEventsInserted = 0;
    let totalVolume = 0;

    const econFillEvents = fills.map(fill => {
      const event = normalizeFill(walletId, fill);
      allAffectedDays.add(event.day);
      return event;
    });

    const econFundingEvents = funding.map(f => {
      const event = normalizeFunding(walletId, f);
      allAffectedDays.add(event.day);
      return event;
    });

    // Batch insert
    const BATCH_SIZE = 500;
    for (let i = 0; i < econFillEvents.length; i += BATCH_SIZE) {
      const batch = econFillEvents.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('economic_events')
        .insert(batch)
        .select('usd_value');
      
      if (!error && data) {
        economicEventsInserted += data.length;
        totalVolume += data.reduce((sum: number, e: any) => sum + (parseFloat(e.usd_value) || 0), 0);
      }
    }

    for (let i = 0; i < econFundingEvents.length; i += BATCH_SIZE) {
      const batch = econFundingEvents.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('economic_events')
        .insert(batch)
        .select('id');
      
      if (!error && data) {
        economicEventsInserted += data.length;
      }
    }

    // Compute daily PnL
    const affectedDaysArray = Array.from(allAffectedDays).sort();
    console.log(`[sync-wallet] Computing PnL for ${affectedDaysArray.length} days`);

    for (const day of affectedDaysArray) {
      let allDayEvents: any[] = [];
      let offset = 0;
      const PAGE_SIZE = 1000;
      
      while (true) {
        const { data: pageEvents } = await supabase
          .from('economic_events')
          .select('event_type, realized_pnl_usd, funding_usd, fee_usd')
          .eq('wallet_id', walletId)
          .eq('day', day)
          .range(offset, offset + PAGE_SIZE - 1);
        
        if (!pageEvents || pageEvents.length === 0) break;
        allDayEvents = allDayEvents.concat(pageEvents);
        if (pageEvents.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      if (allDayEvents.length > 0) {
        const metrics = calculateDailyMetrics(allDayEvents as EconomicEvent[]);
        
        await supabase.from('daily_pnl').upsert({
          wallet_id: walletId,
          day,
          perps_pnl: metrics.realized_perps_pnl,
          funding: metrics.funding_pnl,
          fees: metrics.fees,
          trades_count: metrics.trades_count,
          volume: metrics.volume,
          closed_pnl: metrics.closed_pnl,
          total_pnl: metrics.closed_pnl,
        }, { onConflict: 'wallet_id,day' });

        console.log(`[sync-wallet] Day ${day}: perps=$${metrics.realized_perps_pnl.toFixed(2)}, funding=$${metrics.funding_pnl.toFixed(2)}`);
      }
    }

    // Compute monthly PnL
    const affectedMonths = new Set(affectedDaysArray.map(day => day.substring(0, 7) + '-01'));
    
    for (const month of affectedMonths) {
      const monthPrefix = month.substring(0, 7);
      
      const { data: monthlyDays } = await supabase
        .from('daily_pnl')
        .select('total_pnl, closed_pnl, funding, volume, trades_count')
        .eq('wallet_id', walletId)
        .gte('day', month)
        .lt('day', new Date(new Date(month).setMonth(new Date(month).getMonth() + 1)).toISOString().split('T')[0]);

      if (monthlyDays && monthlyDays.length > 0) {
        const monthlyMetrics = calculateMonthlyMetrics(monthlyDays);
        
        await supabase.from('monthly_pnl').upsert({
          wallet_id: walletId,
          month,
          ...monthlyMetrics,
        }, { onConflict: 'wallet_id,month' });

        console.log(`[sync-wallet] Month ${monthPrefix}: pnl=$${monthlyMetrics.total_pnl.toFixed(2)}`);
      }
    }

    // Update sync run
    await supabase.from('sync_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      fills_ingested: fills.length,
      funding_ingested: funding.length,
      events_ingested: economicEventsInserted,
      days_recomputed: affectedDaysArray.length,
    }).eq('id', syncRun.id);

    console.log(`[sync-wallet] Complete: ${economicEventsInserted} events, $${totalVolume.toFixed(2)} volume`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet: walletLower,
        sync: {
          fills: fills.length,
          funding: funding.length,
          events: economicEventsInserted,
          days: affectedDaysArray.length,
          volume: totalVolume,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-wallet] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
