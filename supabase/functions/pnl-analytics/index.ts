import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const wallet = url.searchParams.get('wallet');
    const dataset = url.searchParams.get('dataset'); // equity_curve, closed_trades, drawdowns, market_stats, summary
    const minTrades = parseInt(url.searchParams.get('min_trades') || '0');

    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletLower = wallet.toLowerCase();
    console.log(`[pnl-analytics] Fetching ${dataset || 'all'} for ${walletLower}`);

    // Get wallet ID
    const { data: walletData } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

    // If wallet not found, return empty data instead of 404
    // This allows the frontend to show "no data yet" instead of an error
    if (!walletData) {
      console.log(`[pnl-analytics] Wallet ${walletLower} not found, returning empty data`);
      return new Response(
        JSON.stringify({ 
          message: 'Wallet not synced yet',
          summary: {
            total_trading_pnl: 0,
            total_funding_pnl: 0,
            total_fees: 0,
            net_pnl: 0,
            funding_share: 0,
            total_trades: 0,
            win_rate: 0,
            max_drawdown: 0,
            avg_recovery_days: 0,
            markets_traded: 0,
          },
          equity_curve: [],
          closed_trades: [],
          market_stats: [],
          positions: [],
          drawdowns: [],
          trade_size_leverage: { grouping: 'market', data: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletId = walletData.id;
    let responseData: any = {};

    // Fetch requested dataset(s)
    if (!dataset || dataset === 'all' || dataset === 'summary') {
      // Fetch summary stats
      const { data: equityCurve } = await supabase
        .from('equity_curve')
        .select('cumulative_trading_pnl, cumulative_funding_pnl, cumulative_fees, cumulative_net_pnl')
        .eq('wallet_id', walletId)
        .order('day', { ascending: false })
        .limit(1);

      const { data: marketStats } = await supabase
        .from('market_stats')
        .select('total_trades, wins, total_pnl')
        .eq('wallet_id', walletId);

      const { data: drawdowns } = await supabase
        .from('drawdown_events')
        .select('drawdown_depth, recovery_days, is_recovered')
        .eq('wallet_id', walletId);

      const latest = equityCurve?.[0];
      const totalTradingPnl = latest?.cumulative_trading_pnl || 0;
      const totalFundingPnl = latest?.cumulative_funding_pnl || 0;
      const totalFees = latest?.cumulative_fees || 0;
      const netPnl = latest?.cumulative_net_pnl || 0;
      
      const fundingShare = (totalTradingPnl + totalFundingPnl - totalFees) !== 0
        ? totalFundingPnl / (totalTradingPnl + totalFundingPnl - totalFees)
        : 0;

      const totalTrades = marketStats?.reduce((sum, m) => sum + m.total_trades, 0) || 0;
      const totalWins = marketStats?.reduce((sum, m) => sum + m.wins, 0) || 0;
      const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;

      const maxDrawdown = drawdowns?.reduce((max, d) => Math.max(max, d.drawdown_depth), 0) || 0;
      const avgRecoveryDays = drawdowns?.filter(d => d.is_recovered && d.recovery_days)
        .reduce((sum, d, _, arr) => sum + (d.recovery_days! / arr.length), 0) || 0;

      responseData.summary = {
        total_trading_pnl: totalTradingPnl,
        total_funding_pnl: totalFundingPnl,
        total_fees: totalFees,
        net_pnl: netPnl,
        funding_share: fundingShare,
        total_trades: totalTrades,
        win_rate: winRate,
        max_drawdown: maxDrawdown,
        avg_recovery_days: avgRecoveryDays,
        markets_traded: marketStats?.length || 0,
      };
    }

    if (!dataset || dataset === 'all' || dataset === 'equity_curve') {
      // Funding vs Trading PnL Split (cumulative time series)
      const { data: equityCurve, error } = await supabase
        .from('equity_curve')
        .select('day, trading_pnl, funding_pnl, fees, cumulative_trading_pnl, cumulative_funding_pnl, cumulative_fees, cumulative_net_pnl, peak_equity, drawdown, drawdown_pct')
        .eq('wallet_id', walletId)
        .order('day', { ascending: true });

      if (error) throw error;
      
      // Fetch deposits/withdrawals from economic_events
      const { data: transfers } = await supabase
        .from('economic_events')
        .select('ts, day, event_type, usd_value')
        .eq('wallet_id', walletId)
        .in('event_type', ['SPOT_TRANSFER_IN', 'SPOT_TRANSFER_OUT'])
        .order('ts', { ascending: true });
      
      // Group transfers by day
      const transfersByDay: Record<string, { deposits: number; withdrawals: number }> = {};
      for (const t of transfers || []) {
        if (!transfersByDay[t.day]) {
          transfersByDay[t.day] = { deposits: 0, withdrawals: 0 };
        }
        if (t.event_type === 'SPOT_TRANSFER_IN') {
          transfersByDay[t.day].deposits += t.usd_value || 0;
        } else {
          transfersByDay[t.day].withdrawals += t.usd_value || 0;
        }
      }
      
      // Merge transfers into equity curve
      const enrichedCurve = (equityCurve || []).map(point => ({
        ...point,
        deposits: transfersByDay[point.day]?.deposits || 0,
        withdrawals: transfersByDay[point.day]?.withdrawals || 0,
      }));
      
      responseData.equity_curve = enrichedCurve;
    }

    if (!dataset || dataset === 'all' || dataset === 'closed_trades') {
      // Leverage vs Outcome Scatter
      const { data: closedTrades, error } = await supabase
        .from('closed_trades')
        .select('market, side, entry_time, exit_time, size, notional_value, effective_leverage, realized_pnl, fees, funding, net_pnl, is_win, trade_duration_hours')
        .eq('wallet_id', walletId)
        .order('exit_time', { ascending: true });

      if (error) throw error;
      responseData.closed_trades = closedTrades || [];
    }

    if (!dataset || dataset === 'all' || dataset === 'market_stats') {
      // Market Skill Matrix
      let query = supabase
        .from('market_stats')
        .select('market, total_trades, wins, losses, win_rate, total_pnl, total_volume, total_fees, total_funding, avg_trade_size, avg_leverage, avg_win, avg_loss, profit_factor')
        .eq('wallet_id', walletId);

      if (minTrades > 0) {
        query = query.gte('total_trades', minTrades);
      }

      const { data: marketStats, error } = await query.order('total_pnl', { ascending: false });

      if (error) throw error;
      responseData.market_stats = marketStats || [];
    }

    if (!dataset || dataset === 'all' || dataset === 'positions') {
      // Current positions with liquidation data
      const { data: positions, error } = await supabase
        .from('positions_perps')
        .select('market, position_size, avg_entry, liquidation_px, effective_leverage, margin_used, unrealized_pnl')
        .eq('wallet_id', walletId)
        .neq('position_size', 0);

      if (error) throw error;
      responseData.positions = positions || [];
    }

    if (!dataset || dataset === 'all' || dataset === 'drawdowns') {
      // Drawdown Depth vs Recovery Time
      const { data: drawdowns, error } = await supabase
        .from('drawdown_events')
        .select('peak_date, trough_date, recovery_date, peak_equity, trough_equity, drawdown_depth, drawdown_pct, recovery_days, is_recovered')
        .eq('wallet_id', walletId)
        .order('peak_date', { ascending: true });

      if (error) throw error;
      responseData.drawdowns = drawdowns || [];
    }

    if (!dataset || dataset === 'all' || dataset === 'trade_size_leverage') {
      // Trade Size + PnL aggregation
      const grouping = url.searchParams.get('grouping') || 'market'; // market, day, week
      const excludePercentile = parseFloat(url.searchParams.get('exclude_percentile') || '0'); // e.g., 99 to exclude top 1%
      
      const { data: closedTrades, error } = await supabase
        .from('closed_trades')
        .select('market, entry_time, notional_value, net_pnl')
        .eq('wallet_id', walletId);

      if (error) throw error;
      
      let trades = closedTrades || [];
      
      // Optional: exclude outliers above percentile
      if (excludePercentile > 0 && excludePercentile < 100 && trades.length > 0) {
        const sortedBySize = [...trades].sort((a, b) => a.notional_value - b.notional_value);
        const cutoffIndex = Math.floor(trades.length * (excludePercentile / 100));
        const maxSize = sortedBySize[cutoffIndex]?.notional_value || Infinity;
        trades = trades.filter(t => t.notional_value <= maxSize);
      }
      
      // Group trades
      const groups: Record<string, { total_size: number; total_pnl: number; count: number }> = {};
      
      for (const trade of trades) {
        let key: string;
        
        if (grouping === 'market') {
          key = trade.market;
        } else if (grouping === 'day') {
          key = trade.entry_time.split('T')[0];
        } else if (grouping === 'week') {
          const date = new Date(trade.entry_time);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = trade.market;
        }
        
        if (!groups[key]) {
          groups[key] = { total_size: 0, total_pnl: 0, count: 0 };
        }
        
        groups[key].total_size += trade.notional_value;
        groups[key].total_pnl += trade.net_pnl || 0;
        groups[key].count += 1;
      }
      
      // Compute averages
      const aggregatedData = Object.entries(groups).map(([key, stats]) => ({
        key,
        avg_trade_size: stats.count > 0 ? stats.total_size / stats.count : 0,
        avg_pnl: stats.count > 0 ? stats.total_pnl / stats.count : 0,
        trade_count: stats.count,
      }));
      
      // Sort by trade count descending
      aggregatedData.sort((a, b) => b.trade_count - a.trade_count);
      
      responseData.trade_size_leverage = {
        grouping,
        data: aggregatedData,
      };
    }

    console.log(`[pnl-analytics] Returning analytics data`);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[pnl-analytics] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});