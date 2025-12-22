import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateWallet(wallet: string | null | undefined): string | null {
  if (!wallet) return null;
  const cleaned = wallet.trim().toLowerCase();
  return WALLET_REGEX.test(cleaned) ? cleaned : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const walletParam = url.searchParams.get('wallet');
    const date = url.searchParams.get('date');
    const tz = url.searchParams.get('tz') || 'utc';

    // Validate wallet address format
    const wallet = validateWallet(walletParam);
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'date parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[pnl-day] Fetching day details for wallet: ${wallet}, date: ${date}`);

    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', wallet)
      .maybeSingle();

    if (walletError) {
      console.error('[pnl-day] Error fetching wallet:', walletError);
      throw walletError;
    }

    if (!walletData) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletId = walletData.id;

    const { data: events, error: eventsError } = await supabase
      .from('economic_events')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('day', date)
      .order('ts', { ascending: true });

    if (eventsError) {
      console.error('[pnl-day] Error fetching events:', eventsError);
      throw eventsError;
    }

    const perpsFills = (events || []).filter((e: any) => e.event_type === 'PERP_FILL').map((e: any) => ({
      id: e.id,
      timestamp: e.ts,
      market: e.market,
      side: e.side,
      size: parseFloat(e.size) || 0,
      exec_price: parseFloat(e.exec_price) || 0,
      realized_pnl: parseFloat(e.realized_pnl_usd) || 0,
      fee: parseFloat(e.fee_usd) || 0,
      tx_hash: e.tx_hash,
    }));

    const funding = (events || [])
      .filter((e: any) => e.event_type === 'PERP_FUNDING' || e.event_type === 'PERP_FEE')
      .map((e: any) => ({
        id: e.id,
        timestamp: e.ts,
        type: e.event_type,
        market: e.market || e.asset,
        amount: parseFloat(e.funding_usd || e.fee_usd) || 0,
      }));

    const { data: dailySummary, error: dailyError } = await supabase
      .from('daily_pnl')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('day', date)
      .maybeSingle();

    if (dailyError) {
      console.error('[pnl-day] Error fetching daily summary:', dailyError);
    }

    const response = {
      date,
      wallet,
      summary: dailySummary
        ? {
            total_pnl: parseFloat(dailySummary.total_pnl) || 0,
            closed_pnl: parseFloat(dailySummary.closed_pnl) || 0,
            unrealized_change: parseFloat(dailySummary.unrealized_change) || 0,
            funding: parseFloat(dailySummary.funding) || 0,
            fees: parseFloat(dailySummary.fees) || 0,
            perps_pnl: parseFloat(dailySummary.perps_pnl) || 0,
            trades_count: dailySummary.trades_count || 0,
          }
        : null,
      perps_fills: perpsFills,
      funding,
      meta: {
        tz,
        events_count: (events || []).length,
      },
    };

    console.log(`[pnl-day] Returning ${(events || []).length} events`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[pnl-day] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
