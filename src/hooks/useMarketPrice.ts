import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceUpdate {
  price: number;
  previousPrice: number;
  direction: 'up' | 'down' | 'none';
  timestamp: number;
}

export function useMarketPrice(symbol: string, initialPrice: number = 0) {
  const [priceData, setPriceData] = useState<PriceUpdate>({
    price: initialPrice,
    previousPrice: initialPrice,
    direction: 'none',
    timestamp: Date.now()
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
        return;
      }

      const mids = data as Record<string, string>;
      const newPrice = parseFloat(mids[symbol.toUpperCase()]) || 0;
      
      if (newPrice > 0 && newPrice !== lastPriceRef.current) {
        const previousPrice = lastPriceRef.current;
        const changePercent = Math.abs((newPrice - previousPrice) / previousPrice) * 100;
        
        // Only update direction if change is > 0.01%
        const direction = changePercent < 0.01 
          ? 'none' 
          : newPrice > previousPrice ? 'up' : 'down';

        lastPriceRef.current = newPrice;
        
        setPriceData({
          price: newPrice,
          previousPrice,
          direction,
          timestamp: Date.now()
        });
      }
      
      setIsConnected(true);
    } catch (err) {
      console.error('Price fetch failed:', err);
      setIsConnected(false);
    }
  }, [symbol]);

  useEffect(() => {
    // Initial fetch
    fetchPrice();
    
    // Poll every 5 seconds
    intervalRef.current = setInterval(fetchPrice, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice]);

  // Reset direction after animation
  useEffect(() => {
    if (priceData.direction !== 'none') {
      const timer = setTimeout(() => {
        setPriceData(prev => ({ ...prev, direction: 'none' }));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [priceData.direction]);

  return {
    price: priceData.price,
    previousPrice: priceData.previousPrice,
    direction: priceData.direction,
    isConnected,
    lastUpdate: priceData.timestamp
  };
}
