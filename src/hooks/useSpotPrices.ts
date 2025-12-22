import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

export interface SpotPrice {
  coin: string;
  midPx: string;
  markPx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  change24h: number;
}

export function useSpotPrices(coins: string[] = []) {
  const [prices, setPrices] = useState<Map<string, SpotPrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);

  const safeSetPrices = useCallback((updater: (prev: Map<string, SpotPrice>) => Map<string, SpotPrice>) => {
    if (isMountedRef.current) {
      setPrices(updater);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (coins.length === 0) return;

    const connect = () => {
      if (!isMountedRef.current || reconnectAttemptRef.current >= 3) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          console.log('[SpotPrices WS] Connected');
          reconnectAttemptRef.current = 0;
          setConnected(true);

          // Subscribe to allMids for real-time price updates
          ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' },
          }));
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.channel === 'allMids' && data.data?.mids) {
              const mids = data.data.mids;
              safeSetPrices(prev => {
                const next = new Map(prev);
                Object.entries(mids).forEach(([coin, midPx]) => {
                  // Check if this is a spot coin we care about
                  if (coins.includes(coin) || coins.length === 0) {
                    const existing = next.get(coin);
                    const newMidPx = String(midPx);
                    const prevDayPx = existing?.prevDayPx || newMidPx;
                    const change24h = prevDayPx !== '0' 
                      ? ((parseFloat(newMidPx) - parseFloat(prevDayPx)) / parseFloat(prevDayPx)) * 100 
                      : 0;
                    next.set(coin, {
                      coin,
                      midPx: newMidPx,
                      markPx: existing?.markPx || newMidPx,
                      prevDayPx,
                      dayNtlVlm: existing?.dayNtlVlm || '0',
                      change24h,
                    });
                  }
                });
                return next;
              });
            }
          } catch (err) {
            console.error('[SpotPrices WS] Parse error:', err);
          }
        };

        ws.onerror = () => {
          console.error('[SpotPrices WS] Error');
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          setConnected(false);
          reconnectAttemptRef.current++;
          if (reconnectAttemptRef.current < 3) {
            setTimeout(connect, 3000 * reconnectAttemptRef.current);
          }
        };
      } catch (err) {
        console.error('[SpotPrices WS] Connection error:', err);
      }
    };

    connect();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [coins.join(','), safeSetPrices]);

  return { prices, connected };
}
