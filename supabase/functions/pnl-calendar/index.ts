import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { calculateFillVolume, EconomicEvent, calculateWinRate } from "../_shared/metrics.ts";

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
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
    const view = url.searchParams.get('view') || 'total';
    const product = url.searchParams.get('product') || 'all';
    const tz = url.searchParams.get('tz') || 'utc';

    // Validate wallet address format
    const wallet = validateWallet(walletParam);
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[pnl-calendar] Fetching calendar for wallet: ${wallet}, year: ${year}`);

    // Get or create wallet
    let { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', wallet)
      .maybeSingle();

    if (walletError) {
      console.error('[pnl-calendar] Error fetching wallet:', walletError);
      throw walletError;
    }

    if (!walletData) {
      console.log(`[pnl-calendar] Creating new wallet for address: ${wallet}`);
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ address: wallet })
        .select('id')
        .single();

      if (createError) {
        console.error('[pnl-calendar] Error creating wallet:', createError);
        throw createError;
      }
      walletData = newWallet;
    }

    const walletId = walletData.id;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    console.log(`[pnl-calendar] Fetching daily PnL from ${startDate} to ${endDate}`);

    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_pnl')
      .select('*')
      .eq('wallet_id', walletId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true });

    if (dailyError) {
      console.error('[pnl-calendar] Error fetching daily PnL:', dailyError);
      throw dailyError;
    }

    const { data: monthlyData, error: monthlyError } = await supabase
      .from('monthly_pnl')
      .select('*')
      .eq('wallet_id', walletId)
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (monthlyError) {
      console.error('[pnl-calendar] Error fetching monthly PnL:', monthlyError);
      throw monthlyError;
    }

    const daily = (dailyData || []).map((d: any) => ({
      date: d.day,
      pnl: parseFloat(d.closed_pnl) || 0,  // Use closed_pnl as the only PnL
      funding: parseFloat(d.funding) || 0,
      fees: parseFloat(d.fees) || 0,
      perps_pnl: parseFloat(d.perps_pnl) || 0,
      trades_count: d.trades_count || 0,
    }));

    const monthlySummary = (monthlyData || []).map((m: any) => ({
      month: m.month.substring(0, 7),
      pnl: parseFloat(m.closed_pnl) || 0,  // Use closed_pnl as the only PnL
      funding: parseFloat(m.funding) || 0,
      profitable_days: m.profitable_days || 0,
      trading_days: m.trading_days || 0,
    }));

    // Fetch total volume - paginate to get ALL fills
    let totalVolume = 0;
    let offset = 0;
    const PAGE_SIZE = 1000;
    
    while (true) {
      const { data: volumeData, error: volumeError } = await supabase
        .from('economic_events')
        .select('size, exec_price, event_type')
        .eq('wallet_id', walletId)
        .eq('event_type', 'PERP_FILL')
        .gte('day', startDate)
        .lte('day', endDate)
        .range(offset, offset + PAGE_SIZE - 1);

      if (volumeError || !volumeData || volumeData.length === 0) break;
      
      // Use centralized metric calculation - SINGLE SOURCE OF TRUTH
      for (const event of volumeData) {
        totalVolume += calculateFillVolume(event as EconomicEvent);
      }
      
      if (volumeData.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    
    console.log(`[pnl-calendar] Total volume: $${totalVolume.toFixed(2)} from paginated fills`);

    // Fetch closed trades count - this is the count of completed round-trip trades
    const { count: closedTradesCount, error: tradesError } = await supabase
      .from('closed_trades')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId)
      .gte('exit_time', `${year}-01-01T00:00:00Z`)
      .lte('exit_time', `${year}-12-31T23:59:59Z`);

    if (tradesError) {
      console.error('[pnl-calendar] Error fetching closed trades count:', tradesError);
    }

    const response = {
      year,
      wallet,
      daily,
      monthly_summary: monthlySummary,
      total_volume: totalVolume,
      closed_trades_count: closedTradesCount || 0,
      meta: {
        view,
        product,
        tz,
        last_updated_at: new Date().toISOString(),
      },
    };

    console.log(`[pnl-calendar] Returning ${daily.length} daily records`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[pnl-calendar] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
