import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
};

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';
const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateWallet(wallet: string | null | undefined): string | null {
  if (!wallet) return null;
  const cleaned = wallet.trim().toLowerCase();
  return WALLET_REGEX.test(cleaned) ? cleaned : null;
}

function validateAdminKey(req: Request): boolean {
  const adminKey = Deno.env.get('ADMIN_API_KEY');
  if (!adminKey) return false;
  
  const providedKey = req.headers.get('x-admin-key');
  return providedKey === adminKey;
}

async function fetchHyperliquidData(endpoint: string, body: any): Promise<any> {
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

  // Validate admin API key
  if (!validateAdminKey(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { wallet, start, end } = await req.json();

    // Validate wallet address format
    const walletLower = validateWallet(wallet);
    if (!walletLower) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-backfill] Starting backfill for wallet: ${walletLower}, from ${start} to ${end}`);

    const startTime = start ? new Date(start).getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000;
    const endTime = end ? new Date(end).getTime() : Date.now();

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
    let fillsCount = 0;
    let fundingCount = 0;

    // Fetch Hyperliquid historical fills
    console.log(`[admin-backfill] Fetching Hyperliquid fills from ${startTime} to ${endTime}`);
    const fills = await fetchHyperliquidData('userFills', {
      type: 'userFills',
      user: walletLower,
      startTime,
      endTime,
    });

    if (Array.isArray(fills) && fills.length > 0) {
      console.log(`[admin-backfill] Processing ${fills.length} fills`);
      
      for (const fill of fills) {
        const ts = new Date(fill.time);
        const day = ts.toISOString().split('T')[0];
        const uniqueKey = `hypercore:fill:${fill.tid || fill.oid}:${walletLower}`;

        await supabase
          .from('raw_events')
          .upsert({
            wallet_id: walletId,
            source_type: 'hypercore',
            ts: ts.toISOString(),
            unique_key: uniqueKey,
            payload: fill,
          }, { onConflict: 'unique_key', ignoreDuplicates: true });

        const side = fill.side === 'B' ? 'long' : 'short';
        const size = parseFloat(fill.sz);
        const execPrice = parseFloat(fill.px);
        const fee = parseFloat(fill.fee || '0');
        const realizedPnl = parseFloat(fill.closedPnl || '0');

        await supabase
          .from('economic_events')
          .insert({
            wallet_id: walletId,
            ts: ts.toISOString(),
            day,
            event_type: 'PERP_FILL',
            venue: 'hypercore',
            market: fill.coin,
            side,
            size,
            exec_price: execPrice,
            realized_pnl_usd: realizedPnl,
            fee_usd: fee,
            tx_hash: fill.tid || fill.hash,
            meta: { dedupe: uniqueKey },
          })
          .then(() => fillsCount++);
      }
    }

    // Fetch Hyperliquid funding history
    console.log(`[admin-backfill] Fetching funding history`);
    const fundingData = await fetchHyperliquidData('userFunding', {
      type: 'userFunding',
      user: walletLower,
      startTime,
      endTime,
    });

    if (Array.isArray(fundingData) && fundingData.length > 0) {
      console.log(`[admin-backfill] Processing ${fundingData.length} funding events`);
      
      for (const funding of fundingData) {
        const ts = new Date(funding.time);
        const day = ts.toISOString().split('T')[0];
        const uniqueKey = `hypercore:funding:${funding.time}:${funding.coin}:${walletLower}`;

        await supabase
          .from('raw_events')
          .upsert({
            wallet_id: walletId,
            source_type: 'hypercore',
            ts: ts.toISOString(),
            unique_key: uniqueKey,
            payload: funding,
          }, { onConflict: 'unique_key', ignoreDuplicates: true });

        await supabase
          .from('economic_events')
          .insert({
            wallet_id: walletId,
            ts: ts.toISOString(),
            day,
            event_type: 'PERP_FUNDING',
            venue: 'hypercore',
            market: funding.coin,
            funding_usd: parseFloat(funding.usdc || '0'),
            meta: { dedupe: uniqueKey },
          })
          .then(() => fundingCount++);
      }
    }

    // Fetch current mark prices
    console.log(`[admin-backfill] Fetching current mark prices`);
    const allMids = await fetchHyperliquidData('allMids', { type: 'allMids' });
    
    if (allMids && typeof allMids === 'object') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      for (const [market, price] of Object.entries(allMids)) {
        await supabase
          .from('mark_snapshots')
          .upsert({
            market,
            ts: now.toISOString(),
            day: today,
            mark_price: parseFloat(price as string),
          }, { onConflict: 'market,ts', ignoreDuplicates: true });
      }
    }

    // Update source tracker
    await supabase
      .from('sources')
      .upsert({
        wallet_id: walletId,
        source_type: 'hypercore',
        cursor: endTime.toString(),
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'wallet_id,source_type', ignoreDuplicates: false });

    // Trigger recompute
    const startDay = new Date(startTime).toISOString().split('T')[0];
    const endDay = new Date(endTime).toISOString().split('T')[0];
    
    console.log(`[admin-backfill] Triggering recompute from ${startDay} to ${endDay}`);
    
    await supabase.functions.invoke('admin-recompute', {
      body: { wallet: walletLower, start_day: startDay, end_day: endDay },
    });

    console.log(`[admin-backfill] Backfill complete: ${fillsCount} fills, ${fundingCount} funding`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet_id: walletId,
        fills_processed: fillsCount,
        funding_processed: fundingCount,
        start: startDay,
        end: endDay,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[admin-backfill] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
