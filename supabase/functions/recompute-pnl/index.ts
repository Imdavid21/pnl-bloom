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

    // Get wallet
    const { data: walletData } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

    if (!walletData) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found. Sync wallet first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletId = walletData.id;

    // Create recompute run record
    const { data: recomputeRun, error: runError } = await supabase
      .from('recompute_runs')
      .insert({
        wallet_id: walletId,
        status: 'running',
      })
      .select('id')
      .single();

    if (runError) throw runError;

    console.log(`[recompute-pnl] Starting recompute for ${walletLower}`);

    // Delete existing daily and monthly PnL
    await supabase.from('daily_pnl').delete().eq('wallet_id', walletId);
    await supabase.from('monthly_pnl').delete().eq('wallet_id', walletId);

    console.log(`[recompute-pnl] Cleared existing PnL data`);

    // Get all unique days from economic_events
    const { data: allDays } = await supabase
      .from('economic_events')
      .select('day')
      .eq('wallet_id', walletId)
      .order('day', { ascending: true });

    const uniqueDays = [...new Set((allDays || []).map(d => d.day))].sort();
    console.log(`[recompute-pnl] Found ${uniqueDays.length} days to recompute`);

    let daysProcessed = 0;

    // Recompute daily PnL
    for (const day of uniqueDays) {
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

        daysProcessed++;
        
        if (daysProcessed % 30 === 0) {
          console.log(`[recompute-pnl] Processed ${daysProcessed}/${uniqueDays.length} days`);
        }
      }
    }

    // Recompute monthly PnL
    const affectedMonths = new Set(uniqueDays.map(day => day.substring(0, 7) + '-01'));
    
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

        console.log(`[recompute-pnl] Month ${monthPrefix}: pnl=$${monthlyMetrics.total_pnl.toFixed(2)}`);
      }
    }

    // Update recompute run
    await supabase.from('recompute_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      days_processed: daysProcessed,
    }).eq('id', recomputeRun.id);

    console.log(`[recompute-pnl] Complete: ${daysProcessed} days recomputed`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet: walletLower,
        recompute: {
          daysProcessed,
          monthsProcessed: affectedMonths.size,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[recompute-pnl] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
