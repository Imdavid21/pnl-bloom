import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Fill {
  ts: string;
  market: string;
  side: 'long' | 'short';
  size: number;
  exec_price: number;
  realized_pnl_usd: number;
  fee_usd: number;
  volume_usd: number;
  meta: {
    dir?: string;
    startPosition?: number;
    isClose?: boolean;
  } | null;
}

interface FundingEvent {
  ts: string;
  market: string;
  funding_usd: number;
}

interface ClosedTrade {
  market: string;
  side: string;
  entry_time: string;
  exit_time: string;
  avg_entry_price: number;
  avg_exit_price: number;
  size: number;
  notional_value: number;
  margin_used: number | null;
  effective_leverage: number | null;
  realized_pnl: number;
  fees: number;
  funding: number;
  net_pnl: number;
  is_win: boolean;
  trade_duration_hours: number;
}

interface DailyEquity {
  day: string;
  trading_pnl: number;
  funding_pnl: number;
  fees: number;
}

interface DrawdownEvent {
  peak_date: string;
  trough_date: string;
  recovery_date: string | null;
  peak_equity: number;
  trough_equity: number;
  drawdown_depth: number;
  drawdown_pct: number;
  recovery_days: number | null;
  is_recovered: boolean;
}

// Improved trade reconstruction: uses dir field to detect opens/closes
// and creates a trade each time position goes flat
function reconstructClosedTrades(
  fills: Fill[], 
  funding: FundingEvent[],
  clearinghouseSnapshots: Array<{ day: string; account_value: number; total_margin_used: number }>
): ClosedTrade[] {
  interface PositionState {
    market: string;
    side: 'long' | 'short' | null;
    size: number;
    avgEntry: number;
    totalCost: number;
    entryTime: string | null;
    fees: number;
    funding: number;
    realizedPnl: number;
  }

  const positions: Map<string, PositionState> = new Map();
  const closedTrades: ClosedTrade[] = [];
  
  // Group funding by market and day
  const fundingByMarketDay: Map<string, number> = new Map();
  for (const f of funding) {
    const day = f.ts.split('T')[0];
    const key = `${f.market}:${day}`;
    fundingByMarketDay.set(key, (fundingByMarketDay.get(key) || 0) + f.funding_usd);
  }

  // Create margin lookup
  const marginByDay: Map<string, { accountValue: number; marginUsed: number }> = new Map();
  for (const snapshot of clearinghouseSnapshots.sort((a, b) => a.day.localeCompare(b.day))) {
    marginByDay.set(snapshot.day, { 
      accountValue: snapshot.account_value, 
      marginUsed: snapshot.total_margin_used 
    });
  }

  // Get closest margin data for a day
  function getMarginForDay(day: string): { accountValue: number; marginUsed: number } | null {
    const snapshot = marginByDay.get(day);
    if (snapshot) return snapshot;
    // Find closest prior day
    let closestDay: string | null = null;
    for (const d of marginByDay.keys()) {
      if (d <= day && (!closestDay || d > closestDay)) {
        closestDay = d;
      }
    }
    return closestDay ? marginByDay.get(closestDay) || null : null;
  }

  // Sort fills by timestamp
  const sortedFills = [...fills].sort((a, b) => 
    new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  console.log(`[compute-analytics] Processing ${sortedFills.length} fills for trade reconstruction`);

  for (const fill of sortedFills) {
    const market = fill.market;
    let pos = positions.get(market);
    
    if (!pos) {
      pos = {
        market,
        side: null,
        size: 0,
        avgEntry: 0,
        totalCost: 0,
        entryTime: null,
        fees: 0,
        funding: 0,
        realizedPnl: 0,
      };
      positions.set(market, pos);
    }

    const fillSize = Math.abs(fill.size);
    const fillSide = fill.side;
    const fillPrice = fill.exec_price;
    const fee = fill.fee_usd || 0;
    const closedPnl = fill.realized_pnl_usd || 0;
    
    // Parse direction from meta
    const dir = fill.meta?.dir || '';
    const isOpen = dir.includes('Open');
    const isClose = dir.includes('Close');
    const startPosition = fill.meta?.startPosition || 0;

    pos.fees += fee;
    pos.realizedPnl += closedPnl;

    if (pos.size === 0 || isOpen) {
      // Opening or adding to position
      if (pos.size === 0) {
        pos.side = fillSide;
        pos.entryTime = fill.ts;
        pos.avgEntry = fillPrice;
        pos.totalCost = fillSize * fillPrice;
        pos.size = fillSize;
      } else if (pos.side === fillSide) {
        // Adding to existing position
        const newTotalCost = pos.totalCost + (fillSize * fillPrice);
        const newSize = pos.size + fillSize;
        pos.avgEntry = newTotalCost / newSize;
        pos.size = newSize;
        pos.totalCost = newTotalCost;
      } else {
        // Reducing opposite position (shouldn't happen with isOpen, but handle it)
        handlePositionReduction(pos, fill, fillSize, fillPrice, closedTrades, fundingByMarketDay, getMarginForDay);
      }
    } else {
      // Closing or reducing position
      handlePositionReduction(pos, fill, fillSize, fillPrice, closedTrades, fundingByMarketDay, getMarginForDay);
    }
  }

  console.log(`[compute-analytics] Reconstructed ${closedTrades.length} closed trades`);
  return closedTrades;
}

function handlePositionReduction(
  pos: any,
  fill: Fill,
  fillSize: number,
  fillPrice: number,
  closedTrades: ClosedTrade[],
  fundingByMarketDay: Map<string, number>,
  getMarginForDay: (day: string) => { accountValue: number; marginUsed: number } | null
) {
  const closeSize = Math.min(fillSize, pos.size);
  const remainingFillSize = fillSize - closeSize;
  
  if (closeSize > 0 && pos.entryTime) {
    // Calculate trade metrics
    const entryTime = pos.entryTime;
    const exitTime = fill.ts;
    const durationMs = new Date(exitTime).getTime() - new Date(entryTime).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    const entryDay = entryTime.split('T')[0];
    const exitDay = exitTime.split('T')[0];
    
    // Calculate funding for this trade
    let tradeFunding = 0;
    const entryDate = new Date(entryDay);
    const exitDate = new Date(exitDay);
    for (let d = new Date(entryDate); d <= exitDate; d.setDate(d.getDate() + 1)) {
      const dayStr = d.toISOString().split('T')[0];
      const key = `${pos.market}:${dayStr}`;
      tradeFunding += fundingByMarketDay.get(key) || 0;
    }
    
    // Calculate PnL
    const pnl = pos.side === 'long'
      ? (fillPrice - pos.avgEntry) * closeSize
      : (pos.avgEntry - fillPrice) * closeSize;
    
    // Use accumulated realized PnL if available (more accurate from exchange)
    const realizedPnl = pos.realizedPnl;
    const notionalValue = closeSize * pos.avgEntry;
    
    // Calculate leverage
    const marginData = getMarginForDay(entryDay);
    let marginUsed: number | null = null;
    let effectiveLeverage: number | null = null;
    
    if (marginData && marginData.accountValue > 0) {
      // Estimate margin based on account leverage ratio
      const leverageRatio = marginData.marginUsed / marginData.accountValue;
      marginUsed = notionalValue * leverageRatio;
      effectiveLeverage = marginUsed > 0 ? notionalValue / marginUsed : 5;
    } else {
      // Default to 5x leverage estimate
      marginUsed = notionalValue / 5;
      effectiveLeverage = 5;
    }
    
    const tradeFees = pos.fees;
    const netPnl = realizedPnl + tradeFunding - tradeFees;
    
    closedTrades.push({
      market: pos.market,
      side: pos.side!,
      entry_time: entryTime,
      exit_time: exitTime,
      avg_entry_price: pos.avgEntry,
      avg_exit_price: fillPrice,
      size: closeSize,
      notional_value: notionalValue,
      margin_used: marginUsed,
      effective_leverage: effectiveLeverage,
      realized_pnl: realizedPnl,
      fees: tradeFees,
      funding: tradeFunding,
      net_pnl: netPnl,
      is_win: netPnl > 0,
      trade_duration_hours: durationHours,
    });
  }
  
  // Update position state
  pos.size -= closeSize;
  pos.totalCost = pos.size * pos.avgEntry;
  
  if (pos.size <= 0.0001) { // Effectively flat
    // Reset position
    pos.side = null;
    pos.size = 0;
    pos.avgEntry = 0;
    pos.totalCost = 0;
    pos.entryTime = null;
    pos.fees = 0;
    pos.funding = 0;
    pos.realizedPnl = 0;
    
    // If there's remaining fill size, start a new position in opposite direction
    if (remainingFillSize > 0) {
      pos.side = fill.side;
      pos.size = remainingFillSize;
      pos.avgEntry = fillPrice;
      pos.totalCost = remainingFillSize * fillPrice;
      pos.entryTime = fill.ts;
    }
  }
}

// Build daily equity curve
function buildEquityCurve(fills: Fill[], funding: FundingEvent[]): DailyEquity[] {
  const dailyData: Map<string, DailyEquity> = new Map();
  
  for (const fill of fills) {
    const day = fill.ts.split('T')[0];
    let daily = dailyData.get(day);
    if (!daily) {
      daily = { day, trading_pnl: 0, funding_pnl: 0, fees: 0 };
      dailyData.set(day, daily);
    }
    daily.trading_pnl += fill.realized_pnl_usd || 0;
    daily.fees += fill.fee_usd || 0;
  }
  
  for (const f of funding) {
    const day = f.ts.split('T')[0];
    let daily = dailyData.get(day);
    if (!daily) {
      daily = { day, trading_pnl: 0, funding_pnl: 0, fees: 0 };
      dailyData.set(day, daily);
    }
    daily.funding_pnl += f.funding_usd || 0;
  }
  
  return Array.from(dailyData.values()).sort((a, b) => a.day.localeCompare(b.day));
}

// Detect drawdown events
function detectDrawdowns(equityCurve: Array<{ day: string; cumulative_net_pnl: number }>): DrawdownEvent[] {
  if (equityCurve.length < 2) return [];
  
  const events: DrawdownEvent[] = [];
  let peak = equityCurve[0].cumulative_net_pnl;
  let peakDate = equityCurve[0].day;
  let inDrawdown = false;
  let trough = peak;
  let troughDate = peakDate;
  
  for (let i = 1; i < equityCurve.length; i++) {
    const current = equityCurve[i];
    const equity = current.cumulative_net_pnl;
    
    if (equity > peak) {
      if (inDrawdown && peak - trough > 0) {
        const recoveryDays = Math.floor(
          (new Date(current.day).getTime() - new Date(peakDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        events.push({
          peak_date: peakDate,
          trough_date: troughDate,
          recovery_date: current.day,
          peak_equity: peak,
          trough_equity: trough,
          drawdown_depth: peak - trough,
          drawdown_pct: peak > 0 ? ((peak - trough) / peak) * 100 : 0,
          recovery_days: recoveryDays,
          is_recovered: true,
        });
        inDrawdown = false;
      }
      peak = equity;
      peakDate = current.day;
      trough = equity;
      troughDate = current.day;
    } else if (equity < trough) {
      trough = equity;
      troughDate = current.day;
      inDrawdown = true;
    }
  }
  
  if (inDrawdown && peak - trough > 0) {
    events.push({
      peak_date: peakDate,
      trough_date: troughDate,
      recovery_date: null,
      peak_equity: peak,
      trough_equity: trough,
      drawdown_depth: peak - trough,
      drawdown_pct: peak > 0 ? ((peak - trough) / peak) * 100 : 0,
      recovery_days: null,
      is_recovered: false,
    });
  }
  
  return events;
}

// Calculate per-market stats
function calculateMarketStats(closedTrades: ClosedTrade[]): Map<string, any> {
  const stats: Map<string, any> = new Map();
  
  for (const trade of closedTrades) {
    let s = stats.get(trade.market);
    if (!s) {
      s = {
        market: trade.market,
        total_trades: 0,
        wins: 0,
        losses: 0,
        total_pnl: 0,
        total_volume: 0,
        total_fees: 0,
        total_funding: 0,
        win_pnl: 0,
        loss_pnl: 0,
        leverage_sum: 0,
        size_sum: 0,
      };
      stats.set(trade.market, s);
    }
    
    s.total_trades++;
    s.total_pnl += trade.net_pnl;
    s.total_volume += trade.notional_value;
    s.total_fees += trade.fees;
    s.total_funding += trade.funding;
    s.size_sum += trade.size;
    
    if (trade.effective_leverage) {
      s.leverage_sum += trade.effective_leverage;
    }
    
    if (trade.is_win) {
      s.wins++;
      s.win_pnl += trade.net_pnl;
    } else {
      s.losses++;
      s.loss_pnl += Math.abs(trade.net_pnl);
    }
  }
  
  for (const [market, s] of stats) {
    s.win_rate = s.total_trades > 0 ? s.wins / s.total_trades : 0;
    s.avg_trade_size = s.total_trades > 0 ? s.size_sum / s.total_trades : 0;
    s.avg_leverage = s.total_trades > 0 ? s.leverage_sum / s.total_trades : 0;
    s.avg_win = s.wins > 0 ? s.win_pnl / s.wins : 0;
    s.avg_loss = s.losses > 0 ? s.loss_pnl / s.losses : 0;
    s.profit_factor = s.loss_pnl > 0 ? s.win_pnl / s.loss_pnl : (s.win_pnl > 0 ? Infinity : 0);
  }
  
  return stats;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { wallet } = await req.json();
    
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletLower = wallet.toLowerCase();
    console.log(`[compute-analytics] Starting analytics computation for ${walletLower}`);

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

    // Fetch all perp fills WITH meta field for dir and startPosition
    const { data: fillEvents, error: fillError } = await supabase
      .from('economic_events')
      .select('ts, market, side, size, exec_price, realized_pnl_usd, fee_usd, volume_usd, meta')
      .eq('wallet_id', walletId)
      .eq('event_type', 'PERP_FILL')
      .order('ts', { ascending: true });

    if (fillError) throw fillError;

    // Fetch all funding events
    const { data: fundingEvents, error: fundingError } = await supabase
      .from('economic_events')
      .select('ts, market, funding_usd')
      .eq('wallet_id', walletId)
      .eq('event_type', 'PERP_FUNDING')
      .order('ts', { ascending: true });

    if (fundingError) throw fundingError;

    // Fetch clearinghouse snapshots
    const { data: clearinghouseSnapshots, error: snapshotError } = await supabase
      .from('clearinghouse_snapshots')
      .select('day, account_value, total_margin_used')
      .eq('wallet_id', walletId)
      .order('day', { ascending: true });

    if (snapshotError) {
      console.log(`[compute-analytics] No clearinghouse snapshots found`);
    }

    console.log(`[compute-analytics] Found ${fillEvents?.length || 0} fills, ${fundingEvents?.length || 0} funding events, ${clearinghouseSnapshots?.length || 0} margin snapshots`);

    const fills: Fill[] = (fillEvents || []).map((e: any) => ({
      ts: e.ts,
      market: e.market,
      side: e.side || 'long',
      size: Math.abs(e.size || 0),
      exec_price: e.exec_price || 0,
      realized_pnl_usd: e.realized_pnl_usd || 0,
      fee_usd: e.fee_usd || 0,
      volume_usd: e.volume_usd || 0,
      meta: e.meta || null,
    }));

    const funding: FundingEvent[] = (fundingEvents || []).map((e: any) => ({
      ts: e.ts,
      market: e.market || '',
      funding_usd: e.funding_usd || 0,
    }));

    // 1. Reconstruct closed trades
    console.log(`[compute-analytics] Reconstructing closed trades...`);
    const closedTrades = reconstructClosedTrades(fills, funding, clearinghouseSnapshots || []);
    console.log(`[compute-analytics] Found ${closedTrades.length} closed trades`);

    // 2. Build daily equity curve
    console.log(`[compute-analytics] Building equity curve...`);
    const dailyEquity = buildEquityCurve(fills, funding);
    
    let cumTradingPnl = 0;
    let cumFundingPnl = 0;
    let cumFees = 0;
    let peak = 0;
    
    const equityCurveRecords = dailyEquity.map(d => {
      cumTradingPnl += d.trading_pnl;
      cumFundingPnl += d.funding_pnl;
      cumFees += d.fees;
      const netChange = d.trading_pnl + d.funding_pnl - d.fees;
      const cumNetPnl = cumTradingPnl + cumFundingPnl - cumFees;
      
      if (cumNetPnl > peak) peak = cumNetPnl;
      const drawdown = peak - cumNetPnl;
      const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      return {
        wallet_id: walletId,
        day: d.day,
        starting_equity: cumNetPnl - netChange,
        ending_equity: cumNetPnl,
        trading_pnl: d.trading_pnl,
        funding_pnl: d.funding_pnl,
        fees: d.fees,
        net_change: netChange,
        cumulative_trading_pnl: cumTradingPnl,
        cumulative_funding_pnl: cumFundingPnl,
        cumulative_fees: cumFees,
        cumulative_net_pnl: cumNetPnl,
        peak_equity: peak,
        drawdown,
        drawdown_pct: drawdownPct,
      };
    });

    // 3. Detect drawdowns
    console.log(`[compute-analytics] Detecting drawdowns...`);
    const drawdowns = detectDrawdowns(equityCurveRecords);
    console.log(`[compute-analytics] Found ${drawdowns.length} drawdown events`);

    // 4. Calculate market stats
    console.log(`[compute-analytics] Calculating market stats...`);
    const marketStats = calculateMarketStats(closedTrades);

    // Store results - clear and insert
    // Use delete first, then batch insert in chunks
    await supabase.from('closed_trades').delete().eq('wallet_id', walletId);
    await supabase.from('equity_curve').delete().eq('wallet_id', walletId);
    await supabase.from('drawdown_events').delete().eq('wallet_id', walletId);
    await supabase.from('market_stats').delete().eq('wallet_id', walletId);

    // Insert closed trades in batches, deduplicating by exit_time+market
    if (closedTrades.length > 0) {
      // Deduplicate trades that may have same exit_time for same market
      const tradeMap = new Map<string, typeof closedTrades[0]>();
      for (const t of closedTrades) {
        const key = `${t.market}:${t.exit_time}`;
        const existing = tradeMap.get(key);
        if (existing) {
          // Merge trades with same exit time
          existing.size += t.size;
          existing.notional_value += t.notional_value;
          existing.realized_pnl += t.realized_pnl;
          existing.fees += t.fees;
          existing.funding += t.funding;
          existing.net_pnl += t.net_pnl;
          existing.is_win = existing.net_pnl > 0;
        } else {
          tradeMap.set(key, { ...t });
        }
      }
      const dedupedTrades = Array.from(tradeMap.values());
      console.log(`[compute-analytics] Deduped ${closedTrades.length} trades to ${dedupedTrades.length}`);
      
      const { error: tradeError } = await supabase
        .from('closed_trades')
        .insert(dedupedTrades.map(t => ({ ...t, wallet_id: walletId })));
      if (tradeError) console.error('[compute-analytics] Error inserting trades:', tradeError);
    }

    if (equityCurveRecords.length > 0) {
      const { error: equityError } = await supabase
        .from('equity_curve')
        .insert(equityCurveRecords);
      if (equityError) console.error('[compute-analytics] Error inserting equity:', equityError);
    }

    if (drawdowns.length > 0) {
      const { error: ddError } = await supabase
        .from('drawdown_events')
        .insert(drawdowns.map(d => ({ ...d, wallet_id: walletId })));
      if (ddError) console.error('[compute-analytics] Error inserting drawdowns:', ddError);
    }

    const marketStatsRecords = Array.from(marketStats.values()).map(s => ({
      wallet_id: walletId,
      market: s.market,
      total_trades: s.total_trades,
      wins: s.wins,
      losses: s.losses,
      win_rate: s.win_rate,
      total_pnl: s.total_pnl,
      total_volume: s.total_volume,
      total_fees: s.total_fees,
      total_funding: s.total_funding,
      avg_trade_size: s.avg_trade_size,
      avg_leverage: s.avg_leverage,
      avg_win: s.avg_win,
      avg_loss: s.avg_loss,
      profit_factor: isFinite(s.profit_factor) ? s.profit_factor : null,
    }));

    if (marketStatsRecords.length > 0) {
      const { error: statsError } = await supabase
        .from('market_stats')
        .insert(marketStatsRecords);
      if (statsError) console.error('[compute-analytics] Error inserting market stats:', statsError);
    }

    console.log(`[compute-analytics] Computation complete`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet: walletLower,
        summary: {
          closed_trades: closedTrades.length,
          equity_curve_days: equityCurveRecords.length,
          drawdown_events: drawdowns.length,
          markets_traded: marketStatsRecords.length,
          total_trading_pnl: cumTradingPnl,
          total_funding_pnl: cumFundingPnl,
          total_fees: cumFees,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[compute-analytics] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
