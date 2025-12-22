import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
};

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

// PnL Engine - Spot Ledger
interface SpotPosition {
  balance: number;
  avg_cost: number;
}

// PnL Engine - Perps Ledger
interface PerpsPosition {
  position_size: number;
  avg_entry: number;
}

interface DailyPnL {
  realized_spot: number;
  realized_perps: number;
  funding: number;
  fees: number;
  unrealized_change: number;
  trades_count: number;
}

function processSpotBuy(
  position: SpotPosition,
  qty: number,
  price: number
): { position: SpotPosition; realized: number } {
  const newBalance = position.balance + qty;
  const newAvgCost = newBalance > 0 
    ? (position.balance * position.avg_cost + qty * price) / newBalance 
    : price;
  
  return {
    position: { balance: newBalance, avg_cost: newAvgCost },
    realized: 0,
  };
}

function processSpotSell(
  position: SpotPosition,
  qty: number,
  price: number,
  fee: number
): { position: SpotPosition; realized: number } {
  const realized = qty * (price - position.avg_cost) - fee;
  const newBalance = position.balance - qty;
  
  return {
    position: { balance: Math.max(0, newBalance), avg_cost: position.avg_cost },
    realized,
  };
}

function processPerpFill(
  position: PerpsPosition,
  side: string,
  size: number,
  exec_price: number,
  fee: number
): { position: PerpsPosition; realized: number } {
  const signedSize = side === 'long' ? size : -size;
  let realized = -fee;
  let newPosition = { ...position };

  if (position.position_size === 0) {
    newPosition = { position_size: signedSize, avg_entry: exec_price };
  } else if (Math.sign(signedSize) === Math.sign(position.position_size)) {
    const totalSize = position.position_size + signedSize;
    const newAvg = (Math.abs(position.position_size) * position.avg_entry + Math.abs(signedSize) * exec_price) / Math.abs(totalSize);
    newPosition = { position_size: totalSize, avg_entry: newAvg };
  } else {
    const closeQty = Math.min(Math.abs(signedSize), Math.abs(position.position_size));
    const pnlPerUnit = position.position_size > 0 
      ? exec_price - position.avg_entry 
      : position.avg_entry - exec_price;
    realized += closeQty * pnlPerUnit;

    const remainingOriginal = Math.abs(position.position_size) - closeQty;
    const remainingNew = Math.abs(signedSize) - closeQty;

    if (remainingOriginal > 0) {
      newPosition = { 
        position_size: Math.sign(position.position_size) * remainingOriginal, 
        avg_entry: position.avg_entry 
      };
    } else if (remainingNew > 0) {
      newPosition = { 
        position_size: Math.sign(signedSize) * remainingNew, 
        avg_entry: exec_price 
      };
    } else {
      newPosition = { position_size: 0, avg_entry: 0 };
    }
  }

  return { position: newPosition, realized };
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

    const { wallet, start_day, end_day } = await req.json();

    // Validate wallet address format
    const walletLower = validateWallet(wallet);
    if (!walletLower) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!start_day || !end_day) {
      return new Response(
        JSON.stringify({ error: 'start_day and end_day are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-recompute] Recomputing PnL for wallet: ${walletLower}, from ${start_day} to ${end_day}`);

    // Get wallet
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

    if (walletError) throw walletError;
    if (!walletData) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletId = walletData.id;

    // Fetch all economic events in the range
    const { data: events, error: eventsError } = await supabase
      .from('economic_events')
      .select('*')
      .eq('wallet_id', walletId)
      .gte('day', start_day)
      .lte('day', end_day)
      .order('ts', { ascending: true });

    if (eventsError) throw eventsError;

    // Initialize position maps
    const spotPositions: Map<string, SpotPosition> = new Map();
    const perpsPositions: Map<string, PerpsPosition> = new Map();
    
    // Group events by day
    const eventsByDay: Map<string, any[]> = new Map();
    for (const event of events || []) {
      const day = event.day;
      if (!eventsByDay.has(day)) {
        eventsByDay.set(day, []);
      }
      eventsByDay.get(day)!.push(event);
    }

    // Fetch EOD mark prices
    const { data: markSnapshots } = await supabase
      .from('mark_snapshots')
      .select('market, day, mark_price')
      .gte('day', start_day)
      .lte('day', end_day)
      .order('day', { ascending: true });

    const marksByDay: Map<string, Map<string, number>> = new Map();
    for (const snap of markSnapshots || []) {
      if (!marksByDay.has(snap.day)) {
        marksByDay.set(snap.day, new Map());
      }
      marksByDay.get(snap.day)!.set(snap.market, parseFloat(snap.mark_price));
    }

    // Fetch price snapshots for spot unrealized
    const { data: priceSnapshots } = await supabase
      .from('price_snapshots')
      .select('asset, day, price_usd')
      .gte('day', start_day)
      .lte('day', end_day)
      .order('day', { ascending: true });

    const pricesByDay: Map<string, Map<string, number>> = new Map();
    for (const snap of priceSnapshots || []) {
      if (!pricesByDay.has(snap.day)) {
        pricesByDay.set(snap.day, new Map());
      }
      pricesByDay.get(snap.day)!.set(snap.asset, parseFloat(snap.price_usd));
    }

    const sortedDays = Array.from(eventsByDay.keys()).sort();
    let prevUnrealized = 0;
    const dailyResults: any[] = [];

    for (const day of sortedDays) {
      const dayEvents = eventsByDay.get(day) || [];
      const dailyPnl: DailyPnL = {
        realized_spot: 0,
        realized_perps: 0,
        funding: 0,
        fees: 0,
        unrealized_change: 0,
        trades_count: 0,
      };

      for (const event of dayEvents) {
        const eventType = event.event_type;
        const fee = parseFloat(event.fee_usd) || 0;

        switch (eventType) {
          case 'SPOT_BUY': {
            const asset = event.asset || 'UNKNOWN';
            const qty = parseFloat(event.qty) || 0;
            const price = parseFloat(event.price_usd) || 0;
            const pos = spotPositions.get(asset) || { balance: 0, avg_cost: 0 };
            const result = processSpotBuy(pos, qty, price);
            spotPositions.set(asset, result.position);
            dailyPnl.trades_count++;
            dailyPnl.fees += fee;
            break;
          }
          case 'SPOT_SELL': {
            const asset = event.asset || 'UNKNOWN';
            const qty = parseFloat(event.qty) || 0;
            const price = parseFloat(event.price_usd) || 0;
            const pos = spotPositions.get(asset) || { balance: 0, avg_cost: 0 };
            const result = processSpotSell(pos, qty, price, fee);
            spotPositions.set(asset, result.position);
            dailyPnl.realized_spot += result.realized;
            dailyPnl.trades_count++;
            break;
          }
          case 'PERP_FILL': {
            const market = event.market || 'UNKNOWN';
            const side = event.side || 'long';
            const size = parseFloat(event.size) || 0;
            const exec_price = parseFloat(event.exec_price) || 0;
            const pos = perpsPositions.get(market) || { position_size: 0, avg_entry: 0 };
            const result = processPerpFill(pos, side, size, exec_price, fee);
            perpsPositions.set(market, result.position);
            dailyPnl.realized_perps += result.realized;
            dailyPnl.trades_count++;
            break;
          }
          case 'PERP_FUNDING': {
            const fundingAmount = parseFloat(event.funding_usd) || 0;
            dailyPnl.funding += fundingAmount;
            break;
          }
          case 'PERP_FEE':
          case 'SPOT_FEE': {
            dailyPnl.fees += fee;
            break;
          }
          case 'SPOT_TRANSFER_IN':
          case 'SPOT_TRANSFER_OUT': {
            const asset = event.asset || 'UNKNOWN';
            const qty = parseFloat(event.qty) || 0;
            const price = parseFloat(event.price_usd) || 0;
            const pos = spotPositions.get(asset) || { balance: 0, avg_cost: 0 };
            
            if (eventType === 'SPOT_TRANSFER_IN') {
              const result = processSpotBuy(pos, qty, price);
              spotPositions.set(asset, result.position);
            } else {
              pos.balance = Math.max(0, pos.balance - qty);
              spotPositions.set(asset, pos);
            }
            break;
          }
        }
      }

      // Calculate EOD unrealized PnL
      let eodUnrealized = 0;
      const dayMarks = marksByDay.get(day);
      const dayPrices = pricesByDay.get(day);

      for (const [market, pos] of perpsPositions) {
        if (pos.position_size !== 0 && dayMarks) {
          const markPrice = dayMarks.get(market) || pos.avg_entry;
          const unrealizedPnl = pos.position_size > 0
            ? pos.position_size * (markPrice - pos.avg_entry)
            : Math.abs(pos.position_size) * (pos.avg_entry - markPrice);
          eodUnrealized += unrealizedPnl;
        }
      }

      for (const [asset, pos] of spotPositions) {
        if (pos.balance > 0 && dayPrices) {
          const currentPrice = dayPrices.get(asset);
          if (currentPrice && pos.avg_cost > 0) {
            const unrealizedPnl = pos.balance * (currentPrice - pos.avg_cost);
            eodUnrealized += unrealizedPnl;
          }
        }
      }

      dailyPnl.unrealized_change = eodUnrealized - prevUnrealized;
      prevUnrealized = eodUnrealized;

      const closedPnl = dailyPnl.realized_spot + dailyPnl.realized_perps + dailyPnl.funding - dailyPnl.fees;
      const totalPnl = closedPnl + dailyPnl.unrealized_change;

      dailyResults.push({
        wallet_id: walletId,
        day,
        total_pnl: totalPnl,
        closed_pnl: closedPnl,
        unrealized_change: dailyPnl.unrealized_change,
        funding: dailyPnl.funding,
        fees: dailyPnl.fees,
        perps_pnl: dailyPnl.realized_perps,
        spot_pnl: dailyPnl.realized_spot,
        trades_count: dailyPnl.trades_count,
      });
    }

    // Upsert daily PnL records
    if (dailyResults.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_pnl')
        .upsert(dailyResults, { onConflict: 'wallet_id,day' });

      if (upsertError) throw upsertError;
    }

    // Update positions snapshots
    for (const [asset, pos] of spotPositions) {
      await supabase
        .from('positions_spot')
        .upsert({
          wallet_id: walletId,
          asset,
          balance: pos.balance,
          avg_cost: pos.avg_cost,
        }, { onConflict: 'wallet_id,asset' });
    }

    for (const [market, pos] of perpsPositions) {
      await supabase
        .from('positions_perps')
        .upsert({
          wallet_id: walletId,
          market,
          position_size: pos.position_size,
          avg_entry: pos.avg_entry,
        }, { onConflict: 'wallet_id,market' });
    }

    // Compute monthly summaries
    const monthlyMap: Map<string, any> = new Map();
    for (const daily of dailyResults) {
      const month = daily.day.substring(0, 7) + '-01';
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          wallet_id: walletId,
          month,
          total_pnl: 0,
          closed_pnl: 0,
          funding: 0,
          profitable_days: 0,
          trading_days: 0,
        });
      }
      const m = monthlyMap.get(month)!;
      m.total_pnl += daily.total_pnl;
      m.closed_pnl += daily.closed_pnl;
      m.funding += daily.funding;
      if (daily.total_pnl > 0) m.profitable_days++;
      if (daily.trades_count > 0) m.trading_days++;
    }

    const monthlyRecords = Array.from(monthlyMap.values());
    if (monthlyRecords.length > 0) {
      await supabase.from('monthly_pnl').upsert(monthlyRecords, { onConflict: 'wallet_id,month' });
    }

    console.log(`[admin-recompute] Processed ${dailyResults.length} days`);

    return new Response(
      JSON.stringify({
        success: true,
        days_processed: dailyResults.length,
        events_processed: (events || []).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[admin-recompute] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
