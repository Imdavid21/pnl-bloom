import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

interface PollPayload {
  wallet: string;
  start_time?: number;
  end_time?: number;
  full_history?: boolean;
  max_fills?: number;
}

async function fetchHyperliquidData(body: any, retries = 5): Promise<any> {
  console.log(`[poll-hypercore] Fetching ${body.type}...`);
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const waitTime = Math.min((attempt + 1) * 2000, 10000);
      console.log(`[poll-hypercore] Rate limited, waiting ${waitTime}ms...`);
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

// Paginated fetch for userFillsByTime - NO date restrictions
async function fetchAllFills(wallet: string, startTime: number, endTime: number, maxFills?: number): Promise<any[]> {
  const allFills: any[] = [];
  let currentStartTime = startTime;
  let pageCount = 0;
  const MAX_PAGES = 100;
  const fillLimit = maxFills || 50000;

  while (pageCount < MAX_PAGES) {
    console.log(`[poll-hypercore] Fetching fills page ${pageCount + 1}, startTime: ${new Date(currentStartTime).toISOString()}`);
    
    const fills = await fetchHyperliquidData({
      type: 'userFillsByTime',
      user: wallet,
      startTime: currentStartTime,
      endTime: endTime,
      aggregateByTime: false,
    });

    if (!fills || fills.length === 0) {
      break;
    }

    allFills.push(...fills);
    pageCount++;

    if (fills.length < PAGE_LIMIT) {
      break;
    }

    if (allFills.length >= fillLimit) {
      console.log(`[poll-hypercore] Reached fill limit of ${fillLimit}`);
      break;
    }

    const lastFillTime = fills[fills.length - 1].time;
    currentStartTime = lastFillTime + 1;
    
    if (currentStartTime >= endTime) {
      break;
    }

    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`[poll-hypercore] Fetched ${allFills.length} total fills across ${pageCount} pages`);
  return allFills;
}

// Paginated fetch for userFunding
async function fetchAllFunding(wallet: string, startTime: number, endTime: number): Promise<any[]> {
  const allFunding: any[] = [];
  let currentStartTime = startTime;
  let pageCount = 0;
  const MAX_PAGES = 100;

  while (pageCount < MAX_PAGES) {
    console.log(`[poll-hypercore] Fetching funding page ${pageCount + 1}, startTime: ${new Date(currentStartTime).toISOString()}`);
    
    const funding = await fetchHyperliquidData({
      type: 'userFunding',
      user: wallet,
      startTime: currentStartTime,
      endTime: endTime,
    });

    if (!funding || funding.length === 0) {
      break;
    }

    allFunding.push(...funding);
    pageCount++;

    if (funding.length < PAGE_LIMIT) {
      break;
    }

    const lastFundingTime = funding[funding.length - 1].time;
    currentStartTime = lastFundingTime + 1;
    
    if (currentStartTime >= endTime) {
      break;
    }

    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`[poll-hypercore] Fetched ${allFunding.length} total funding payments across ${pageCount} pages`);
  return allFunding;
}

// Fetch deposits and withdrawals from ledger updates
async function fetchLedgerUpdates(wallet: string, startTime: number, endTime: number): Promise<any[]> {
  const allUpdates: any[] = [];
  let currentStartTime = startTime;
  let pageCount = 0;
  const MAX_PAGES = 50;

  while (pageCount < MAX_PAGES) {
    console.log(`[poll-hypercore] Fetching ledger updates page ${pageCount + 1}`);
    
    const updates = await fetchHyperliquidData({
      type: 'userNonFundingLedgerUpdates',
      user: wallet,
      startTime: currentStartTime,
      endTime: endTime,
    });

    if (!updates || updates.length === 0) {
      break;
    }

    allUpdates.push(...updates);
    pageCount++;

    if (updates.length < PAGE_LIMIT) {
      break;
    }

    const lastUpdateTime = updates[updates.length - 1].time;
    currentStartTime = lastUpdateTime + 1;
    
    if (currentStartTime >= endTime) {
      break;
    }

    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`[poll-hypercore] Fetched ${allUpdates.length} ledger updates (deposits/withdrawals)`);
  return allUpdates;
}

function normalizeFill(walletId: string, fill: any): any {
  const ts = new Date(fill.time);
  const day = ts.toISOString().split('T')[0];
  
  // Parse direction to understand side and if it's opening/closing
  const dir = fill.dir || '';
  let side: 'long' | 'short';
  let isClose = false;
  
  if (dir.includes('Long')) {
    side = 'long';
  } else {
    side = 'short';
  }
  
  if (dir.includes('Close')) {
    isClose = true;
  }

  const size = parseFloat(fill.sz) || 0;
  const price = parseFloat(fill.px) || 0;
  const volume = size * price;
  const startPosition = parseFloat(fill.startPosition) || 0;
  const closedPnl = parseFloat(fill.closedPnl) || 0;

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
    realized_pnl_usd: closedPnl,
    fee_usd: parseFloat(fill.fee) || 0,
    tx_hash: fill.hash || null,
    meta: {
      dedupe: `fill:${fill.coin}:${dedupeId}`,
      dir: fill.dir,
      tid: fill.tid,
      oid: fill.oid,
      crossed: fill.crossed,
      feeToken: fill.feeToken,
      startPosition: startPosition,
      cloid: fill.cloid,
      liquidation: fill.liquidation,
      isClose: isClose,
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

    const payload: PollPayload = await req.json();
    const { wallet, start_time, end_time, full_history, max_fills } = payload;

    const walletLower = validateWallet(wallet);
    if (!walletLower) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[poll-hypercore] Polling data for wallet: ${walletLower}`);

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

    // Use provided date range or defaults
    const DEFAULT_START = new Date('2025-01-01T00:00:00Z').getTime();
    const DEFAULT_END = new Date('2025-12-20T23:59:59Z').getTime();
    
    const effectiveStartTime = start_time || DEFAULT_START;
    const effectiveEndTime = end_time || DEFAULT_END;

    console.log(`[poll-hypercore] Fetching history from ${new Date(effectiveStartTime).toISOString()} to ${new Date(effectiveEndTime).toISOString()}`);

    // Fetch ALL user fills with pagination
    let fills: any[] = [];
    try {
      fills = await fetchAllFills(wallet, effectiveStartTime, effectiveEndTime, max_fills || 50000);
    } catch (e) {
      console.error('[poll-hypercore] Error fetching fills:', e);
    }

    // Fetch ALL funding history with pagination
    let funding: any[] = [];
    try {
      funding = await fetchAllFunding(wallet, effectiveStartTime, effectiveEndTime);
    } catch (e) {
      console.error('[poll-hypercore] Error fetching funding:', e);
    }

    // Fetch deposits and withdrawals
    let ledgerUpdates: any[] = [];
    try {
      ledgerUpdates = await fetchLedgerUpdates(wallet, effectiveStartTime, effectiveEndTime);
    } catch (e) {
      console.error('[poll-hypercore] Error fetching ledger updates:', e);
    }

    // Fetch current positions and account state
    let positions: any[] = [];
    let clearinghouseState: any = null;
    try {
      clearinghouseState = await fetchHyperliquidData({
        type: 'clearinghouseState',
        user: wallet,
      });
      positions = clearinghouseState?.assetPositions?.map((p: any) => p.position) || [];
      console.log(`[poll-hypercore] Fetched ${positions.length} positions`);
      console.log(`[poll-hypercore] Account value: ${clearinghouseState?.marginSummary?.accountValue || 'N/A'}`);
    } catch (e) {
      console.error('[poll-hypercore] Error fetching positions:', e);
    }

    // Fetch mark prices
    let markPrices: { [coin: string]: string } = {};
    try {
      const allMids = await fetchHyperliquidData({ type: 'allMids' });
      if (allMids) {
        markPrices = allMids;
      }
      console.log(`[poll-hypercore] Fetched ${Object.keys(markPrices).length} mark prices`);
    } catch (e) {
      console.error('[poll-hypercore] Error fetching mark prices:', e);
    }

    let economicEventsInserted = 0;
    const allAffectedDays: Set<string> = new Set();
    let totalVolume = 0;

    // Batch upsert raw events
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

    // Process economic events for fills
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

    // Process ledger updates (deposits/withdrawals)
    const econLedgerEvents = ledgerUpdates.map(update => {
      const ts = new Date(update.time);
      const day = ts.toISOString().split('T')[0];
      allAffectedDays.add(day);
      
      const delta = update.delta || {};
      const deltaType = delta.type || 'unknown';
      let eventType: string;
      let usdValue = 0;
      
      if (deltaType === 'deposit') {
        eventType = 'SPOT_TRANSFER_IN';
        usdValue = parseFloat(delta.usdc) || 0;
      } else if (deltaType === 'withdraw') {
        eventType = 'SPOT_TRANSFER_OUT';
        usdValue = -(parseFloat(delta.usdc) || 0);
      } else if (deltaType === 'internalTransfer') {
        // Internal transfers between spot/perp
        eventType = delta.usdc > 0 ? 'SPOT_TRANSFER_IN' : 'SPOT_TRANSFER_OUT';
        usdValue = parseFloat(delta.usdc) || 0;
      } else {
        eventType = 'SPOT_TRANSFER_IN';
        usdValue = parseFloat(delta.usdc) || 0;
      }
      
      return {
        wallet_id: walletId,
        ts: ts.toISOString(),
        day,
        event_type: eventType,
        venue: 'hypercore',
        asset: 'USDC',
        usd_value: Math.abs(usdValue),
        meta: {
          dedupe: `ledger:${update.time}:${deltaType}`,
          type: deltaType,
          hash: update.hash,
          raw: delta,
        },
      };
    });

    console.log(`[poll-hypercore] Inserting ${econFillEvents.length} fill events, ${econFundingEvents.length} funding events, ${econLedgerEvents.length} ledger events`);
    
    // Batch insert fills in chunks
    const BATCH_SIZE = 500;
    for (let i = 0; i < econFillEvents.length; i += BATCH_SIZE) {
      const batch = econFillEvents.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('economic_events')
        .insert(batch)
        .select('usd_value');
      
      if (!error && data) {
        economicEventsInserted += data.length;
        totalVolume += data.reduce((sum, e) => sum + (parseFloat(e.usd_value) || 0), 0);
      } else if (error && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        console.error('[poll-hypercore] Error inserting fill batch:', error.message);
      }
    }

    // Batch insert funding in chunks
    for (let i = 0; i < econFundingEvents.length; i += BATCH_SIZE) {
      const batch = econFundingEvents.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('economic_events')
        .insert(batch)
        .select('id');
      
      if (!error && data) {
        economicEventsInserted += data.length;
      } else if (error && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        console.error('[poll-hypercore] Error inserting funding batch:', error.message);
      }
    }

    // Batch insert ledger events (deposits/withdrawals) in chunks
    for (let i = 0; i < econLedgerEvents.length; i += BATCH_SIZE) {
      const batch = econLedgerEvents.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('economic_events')
        .insert(batch)
        .select('id');
      
      if (!error && data) {
        economicEventsInserted += data.length;
      } else if (error && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        console.error('[poll-hypercore] Error inserting ledger batch:', error.message);
      }
    }

    // Store positions with full margin/leverage data
    if (positions.length > 0) {
      const positionRecords = positions.map(pos => {
        const leverage = pos.leverage;
        const marginUsed = parseFloat(pos.marginUsed) || 0;
        const positionValue = parseFloat(pos.positionValue) || 0;
        const effectiveLeverage = leverage?.value || (marginUsed > 0 ? positionValue / marginUsed : 0);
        
        return {
          wallet_id: walletId,
          market: pos.coin,
          position_size: parseFloat(pos.szi) || 0,
          avg_entry: parseFloat(pos.entryPx) || 0,
          margin_used: marginUsed,
          effective_leverage: effectiveLeverage,
          position_value: positionValue,
          unrealized_pnl: parseFloat(pos.unrealizedPnl) || 0,
          liquidation_px: parseFloat(pos.liquidationPx) || 0,
          max_leverage: pos.maxLeverage || 0,
          return_on_equity: parseFloat(pos.returnOnEquity) || 0,
        };
      });

      await supabase.from('positions_perps').upsert(positionRecords, { 
        onConflict: 'wallet_id,market' 
      });
      console.log(`[poll-hypercore] Updated ${positionRecords.length} positions with margin data`);
    }

    // Store clearinghouse snapshot
    if (clearinghouseState?.marginSummary) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const marginSummary = clearinghouseState.marginSummary;
      
      await supabase.from('clearinghouse_snapshots').upsert({
        wallet_id: walletId,
        ts: now.toISOString(),
        day: today,
        account_value: parseFloat(marginSummary.accountValue) || 0,
        total_margin_used: parseFloat(marginSummary.totalMarginUsed) || 0,
        total_notional_position: parseFloat(marginSummary.totalNtlPos) || 0,
        withdrawable: parseFloat(clearinghouseState.withdrawable) || 0,
        cross_margin_summary: clearinghouseState.crossMarginSummary || null,
      }, { onConflict: 'wallet_id,day' });
      console.log(`[poll-hypercore] Stored clearinghouse snapshot: accountValue=${marginSummary.accountValue}`);
    }

    // Store mark prices
    if (Object.keys(markPrices).length > 0) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const markRecords = Object.entries(markPrices).map(([coin, price]) => ({
        market: coin,
        ts: now.toISOString(),
        day: today,
        mark_price: parseFloat(price),
      }));
      
      await supabase.from('mark_snapshots').upsert(markRecords, { 
        onConflict: 'market,day',
        ignoreDuplicates: true 
      });
      console.log(`[poll-hypercore] Stored ${markRecords.length} mark prices`);
    }

    // Calculate daily and monthly metrics inline
    const { data: allEvents } = await supabase
      .from('economic_events')
      .select('ts, market, event_type, realized_pnl_usd, funding_usd, fee_usd, volume_usd')
      .eq('wallet_id', walletId);

    // Group by day
    const dailyMap = new Map<string, { perps_pnl: number; funding: number; fees: number; volume: number; trades_count: number }>();
    for (const e of allEvents || []) {
      const day = e.ts.split('T')[0];
      let d = dailyMap.get(day);
      if (!d) {
        d = { perps_pnl: 0, funding: 0, fees: 0, volume: 0, trades_count: 0 };
        dailyMap.set(day, d);
      }
      if (e.event_type === 'PERP_FILL') {
        d.perps_pnl += parseFloat(e.realized_pnl_usd) || 0;
        d.fees += parseFloat(e.fee_usd) || 0;
        d.volume += parseFloat(e.volume_usd) || 0;
        d.trades_count++;
      } else if (e.event_type === 'PERP_FUNDING') {
        d.funding += parseFloat(e.funding_usd) || 0;
      }
    }

    const dailyRecords = Array.from(dailyMap.entries()).map(([day, m]) => ({
      wallet_id: walletId,
      day,
      perps_pnl: m.perps_pnl,
      funding: m.funding,
      fees: m.fees,
      closed_pnl: m.perps_pnl + m.funding - m.fees,
      total_pnl: m.perps_pnl + m.funding - m.fees,
      volume: m.volume,
      trades_count: m.trades_count,
    }));

    for (let i = 0; i < dailyRecords.length; i += BATCH_SIZE) {
      const batch = dailyRecords.slice(i, i + BATCH_SIZE);
      await supabase.from('daily_pnl').upsert(batch, { onConflict: 'wallet_id,day' });
    }

    // Group by month
    const monthlyMap = new Map<string, { total_pnl: number; funding: number; volume: number; trading_days: number; profitable_days: number }>();
    for (const d of dailyRecords) {
      const month = d.day.substring(0, 7) + '-01';
      let m = monthlyMap.get(month);
      if (!m) {
        m = { total_pnl: 0, funding: 0, volume: 0, trading_days: 0, profitable_days: 0 };
        monthlyMap.set(month, m);
      }
      m.total_pnl += d.total_pnl;
      m.funding += d.funding;
      m.volume += d.volume;
      if (d.trades_count > 0) m.trading_days++;
      if (d.total_pnl > 0) m.profitable_days++;
    }

    const monthlyRecords = Array.from(monthlyMap.entries()).map(([month, m]) => ({
      wallet_id: walletId,
      month,
      total_pnl: m.total_pnl,
      closed_pnl: m.total_pnl,
      funding: m.funding,
      volume: m.volume,
      trading_days: m.trading_days,
      profitable_days: m.profitable_days,
    }));

    await supabase.from('monthly_pnl').upsert(monthlyRecords, { onConflict: 'wallet_id,month' });

    console.log(`[poll-hypercore] Processed ${dailyRecords.length} days, ${monthlyRecords.length} months`);

    // Update source cursor
    await supabase.from('sources').upsert({
      wallet_id: walletId,
      source_type: 'hypercore',
      cursor: effectiveEndTime.toString(),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'wallet_id,source_type' });

    console.log(`[poll-hypercore] Complete: ${economicEventsInserted} events, $${totalVolume.toFixed(2)} volume`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet: walletLower,
        fills_ingested: fills.length,
        funding_ingested: funding.length,
        events_inserted: economicEventsInserted,
        days_affected: allAffectedDays.size,
        total_volume: totalVolume,
        positions: positions.length,
        mark_prices: Object.keys(markPrices).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[poll-hypercore] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
