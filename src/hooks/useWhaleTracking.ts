import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

export interface WhaleTrade {
  coin: string;
  side: 'B' | 'S';
  size: number;
  price: number;
  notional: number;
  time: number;
  user?: string;
  tid?: number;
  marketImpact?: number; // Estimated slippage %
}

interface WhaleState {
  connected: boolean;
  trades: WhaleTrade[];
  loading: boolean;
}

const WHALE_THRESHOLD = 50000; // $50k+ = whale trade
const MAX_TRADES = 100;
const MAJOR_COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'WIF', 'PEPE', 'ONDO', 'SUI', 'HYPE'];

export function useWhaleTracking() {
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 3;
  
  const [state, setState] = useState<WhaleState>({
    connected: false,
    trades: [],
    loading: true,
  });

  const safeSetState = useCallback((updater: (prev: WhaleState) => WhaleState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  const addWhaleTrade = useCallback((trade: WhaleTrade) => {
    safeSetState(prev => ({
      ...prev,
      trades: [trade, ...prev.trades].slice(0, MAX_TRADES),
    }));
  }, [safeSetState]);

  // Estimate market impact based on notional size
  const estimateMarketImpact = (coin: string, notional: number): number => {
    // Simple heuristic: larger trades have more impact, less liquid coins have more impact
    const liquidityFactor = ['BTC', 'ETH'].includes(coin) ? 0.001 : 
                           ['SOL', 'ARB', 'DOGE'].includes(coin) ? 0.003 : 0.01;
    return Math.min(notional * liquidityFactor / 100000, 2); // Cap at 2%
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    const connect = () => {
      if (!isMountedRef.current || isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) return;
      if (reconnectAttemptRef.current >= maxReconnectAttempts) return;

      isConnectingRef.current = true;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          reconnectAttemptRef.current = 0;
          isConnectingRef.current = false;
          safeSetState(prev => ({ ...prev, connected: true, loading: false }));

          // Subscribe to trades for major coins
          MAJOR_COINS.forEach(coin => {
            ws.send(JSON.stringify({
              method: 'subscribe',
              subscription: { type: 'trades', coin },
            }));
          });
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            
            if (data.channel === 'trades' && data.data) {
              const trades = Array.isArray(data.data) ? data.data : [data.data];
              trades.forEach((trade: any) => {
                const size = Math.abs(parseFloat(trade.sz || '0'));
                const price = parseFloat(trade.px || '0');
                const notional = size * price;
                
                // Only track whale trades
                if (notional >= WHALE_THRESHOLD) {
                  const whaleTrade: WhaleTrade = {
                    coin: trade.coin || data.subscription?.coin || 'BTC',
                    side: trade.side === 'B' ? 'B' : 'S',
                    size,
                    price,
                    notional,
                    time: trade.time || Date.now(),
                    tid: trade.tid,
                    user: trade.users?.[0] || undefined,
                    marketImpact: estimateMarketImpact(trade.coin || 'BTC', notional),
                  };
                  addWhaleTrade(whaleTrade);
                }
              });
            }
          } catch (err) {
            console.error('[Whale] Parse error:', err);
          }
        };

        ws.onerror = () => {
          isConnectingRef.current = false;
        };

        ws.onclose = () => {
          isConnectingRef.current = false;
          if (!isMountedRef.current) return;
          safeSetState(prev => ({ ...prev, connected: false }));
          
          reconnectAttemptRef.current++;
          if (isMountedRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
            const delay = Math.min(3000 * reconnectAttemptRef.current, 15000);
            setTimeout(connect, delay);
          }
        };
      } catch (err) {
        isConnectingRef.current = false;
      }
    };

    connect();

    return () => {
      isMountedRef.current = false;
      reconnectAttemptRef.current = maxReconnectAttempts;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [addWhaleTrade, safeSetState]);

  // Get trades from last 24h (simulated via session since WS is live only)
  const last24hTrades = state.trades;
  
  // Sort by notional (largest first)
  const sortedTrades = [...last24hTrades].sort((a, b) => b.notional - a.notional);

  return {
    connected: state.connected,
    loading: state.loading,
    trades: sortedTrades,
    totalVolume: last24hTrades.reduce((sum, t) => sum + t.notional, 0),
    buyVolume: last24hTrades.filter(t => t.side === 'B').reduce((sum, t) => sum + t.notional, 0),
    sellVolume: last24hTrades.filter(t => t.side === 'S').reduce((sum, t) => sum + t.notional, 0),
  };
}
