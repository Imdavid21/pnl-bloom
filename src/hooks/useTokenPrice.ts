import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TokenPriceState {
  price: number;
  previousPrice: number;
  direction: 'up' | 'down' | 'none';
  change24h: number;
  source: 'oracle' | 'dex' | 'spot';
  lastUpdate: number;
}

export function useTokenPrice(symbol: string, initialPrice: number = 0) {
  const [priceState, setPriceState] = useState<TokenPriceState>({
    price: initialPrice,
    previousPrice: initialPrice,
    direction: 'none',
    change24h: 0,
    source: 'spot',
    lastUpdate: Date.now(),
  });
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef(initialPrice);

  const fetchPrice = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('hyperliquid-proxy', {
        body: { type: 'allMids' }
      });

      if (error) {
        console.error('Price fetch error:', error);
        setIsConnected(false);
        return;
      }

      const mids = data as Record<string, string>;
      const newPrice = parseFloat(mids[symbol.toUpperCase()]) || 0;

      if (newPrice > 0) {
        const previousPrice = lastPriceRef.current;
        const changePercent = previousPrice > 0 
          ? Math.abs((newPrice - previousPrice) / previousPrice) * 100 
          : 0;

        const direction = changePercent < 0.01
          ? 'none'
          : newPrice > previousPrice ? 'up' : 'down';

        lastPriceRef.current = newPrice;

        setPriceState(prev => ({
          price: newPrice,
          previousPrice,
          direction,
          change24h: prev.change24h, // Keep existing 24h change
          source: 'oracle',
          lastUpdate: Date.now(),
        }));
        
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Price fetch failed:', err);
      setIsConnected(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchPrice();
    intervalRef.current = setInterval(fetchPrice, 10000); // Every 10 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice]);

  // Reset direction after animation
  useEffect(() => {
    if (priceState.direction !== 'none') {
      const timer = setTimeout(() => {
        setPriceState(prev => ({ ...prev, direction: 'none' }));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [priceState.direction]);

  return {
    ...priceState,
    isConnected,
  };
}
