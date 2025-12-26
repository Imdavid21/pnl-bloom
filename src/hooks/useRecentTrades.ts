import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isLargeTrade } from '@/lib/market-calculator';

export interface RecentTrade {
  id: string;
  timestamp: Date;
  side: 'long' | 'short';
  size: number;
  price: number;
  notionalValue: number;
  traderAddress: string;
  isLarge: boolean;
}

export function useRecentTrades(symbol: string, limit: number = 50) {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTradeIdRef = useRef<string | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      // Fetch recent trades from economic_events
      const { data: events, error: fetchError } = await supabase
        .from('economic_events')
        .select(`
          id,
          ts,
          side,
          size,
          exec_price,
          volume_usd,
          wallet_id
        `)
        .eq('market', symbol.toUpperCase())
        .eq('event_type', 'PERP_FILL')
        .order('ts', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      if (!events || events.length === 0) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      // Get wallet addresses
      const walletIds = [...new Set(events.map(e => e.wallet_id))];
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id, address')
        .in('id', walletIds);

      const walletMap = new Map(
        (wallets || []).map(w => [w.id, w.address])
      );

      const formattedTrades: RecentTrade[] = events.map(event => ({
        id: event.id,
        timestamp: new Date(event.ts),
        side: (event.side as 'long' | 'short') || 'long',
        size: Math.abs(event.size || 0),
        price: event.exec_price || 0,
        notionalValue: event.volume_usd || 0,
        traderAddress: walletMap.get(event.wallet_id) || event.wallet_id,
        isLarge: isLargeTrade(event.volume_usd || 0)
      }));

      // Check for new trades
      if (formattedTrades.length > 0 && formattedTrades[0].id !== lastTradeIdRef.current) {
        lastTradeIdRef.current = formattedTrades[0].id;
      }

      setTrades(formattedTrades);
      setError(null);
    } catch (err) {
      console.error('Error fetching recent trades:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, limit]);

  useEffect(() => {
    setIsLoading(true);
    fetchTrades();

    // Poll every 10 seconds
    intervalRef.current = setInterval(fetchTrades, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTrades]);

  const refetch = useCallback(() => {
    fetchTrades();
  }, [fetchTrades]);

  return {
    trades,
    isLoading,
    error,
    refetch
  };
}
