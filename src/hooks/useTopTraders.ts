import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopTrader {
  rank: number;
  walletAddress: string;
  pnlUsd: number;
  pnlPercentage: number;
  volumeUsd: number;
  tradesCount: number;
  winRate: number;
}

async function fetchTopTraders(
  symbol: string, 
  timeframeDays: number
): Promise<TopTrader[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframeDays);

  // Query closed trades for this market
  const { data: trades, error } = await supabase
    .from('closed_trades')
    .select('wallet_id, net_pnl, notional_value, is_win')
    .eq('market', symbol.toUpperCase())
    .gte('exit_time', startDate.toISOString());

  if (error) {
    console.error('Error fetching top traders:', error);
    return [];
  }

  if (!trades || trades.length === 0) {
    return [];
  }

  // Aggregate by wallet
  const traderMap = new Map<string, {
    totalPnl: number;
    totalVolume: number;
    tradesCount: number;
    wins: number;
  }>();

  for (const trade of trades) {
    const existing = traderMap.get(trade.wallet_id) || {
      totalPnl: 0,
      totalVolume: 0,
      tradesCount: 0,
      wins: 0
    };

    traderMap.set(trade.wallet_id, {
      totalPnl: existing.totalPnl + (trade.net_pnl || 0),
      totalVolume: existing.totalVolume + (trade.notional_value || 0),
      tradesCount: existing.tradesCount + 1,
      wins: existing.wins + (trade.is_win ? 1 : 0)
    });
  }

  // Get wallet addresses
  const walletIds = Array.from(traderMap.keys());
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, address')
    .in('id', walletIds);

  const walletAddressMap = new Map(
    (wallets || []).map(w => [w.id, w.address])
  );

  // Convert to array and sort by PnL
  const traders = Array.from(traderMap.entries())
    .map(([walletId, stats]) => ({
      walletId,
      walletAddress: walletAddressMap.get(walletId) || walletId,
      ...stats,
      winRate: stats.tradesCount > 0 ? (stats.wins / stats.tradesCount) * 100 : 0
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 10);

  // Add ranks and calculate PnL percentage
  return traders.map((trader, index) => ({
    rank: index + 1,
    walletAddress: trader.walletAddress,
    pnlUsd: trader.totalPnl,
    pnlPercentage: trader.totalVolume > 0 
      ? (trader.totalPnl / trader.totalVolume) * 100 
      : 0,
    volumeUsd: trader.totalVolume,
    tradesCount: trader.tradesCount,
    winRate: trader.winRate
  }));
}

export function useTopTraders(symbol: string, timeframeDays: number = 7) {
  return useQuery({
    queryKey: ['top-traders', symbol, timeframeDays],
    queryFn: () => fetchTopTraders(symbol, timeframeDays),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
}
