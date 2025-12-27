/**
 * Position History Hook
 * Fetches closed positions with outcomes for timeline display
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PositionHistoryItem {
  id: string;
  market: string;
  side: 'long' | 'short';
  openTime: Date;
  closeTime: Date;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  isWin: boolean;
  duration: string;
  leverage: number;
}

async function fetchPositionHistory(address: string, limit = 20): Promise<PositionHistoryItem[]> {
  // Get wallet ID
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('address', address.toLowerCase())
    .maybeSingle();

  if (!wallet) return [];

  // Fetch closed trades
  const { data, error } = await supabase
    .from('closed_trades')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('exit_time', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Failed to fetch position history:', error);
    return [];
  }

  return data.map(trade => {
    const duration = formatDuration(
      new Date(trade.entry_time),
      new Date(trade.exit_time)
    );
    
    const marginUsed = Number(trade.margin_used || 0);
    const pnlPercent = marginUsed > 0 
      ? (Number(trade.net_pnl) / marginUsed) * 100 
      : 0;

    return {
      id: trade.id,
      market: trade.market,
      side: trade.side as 'long' | 'short',
      openTime: new Date(trade.entry_time),
      closeTime: new Date(trade.exit_time),
      entryPrice: Number(trade.avg_entry_price),
      exitPrice: Number(trade.avg_exit_price),
      size: Number(trade.size),
      pnl: Number(trade.net_pnl),
      pnlPercent,
      isWin: trade.is_win,
      duration,
      leverage: Number(trade.effective_leverage || 1),
    };
  });
}

function formatDuration(start: Date, end: Date): string {
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function usePositionHistory(address: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['position-history', address?.toLowerCase(), limit],
    queryFn: () => fetchPositionHistory(address!, limit),
    enabled: !!address && address.length === 42,
    staleTime: 60_000, // 1 minute
  });
}
