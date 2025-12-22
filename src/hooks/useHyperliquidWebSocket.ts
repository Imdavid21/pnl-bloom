import { useState, useEffect, useRef, useCallback } from 'react';
import { getBlockDetails, getTxDetails, type BlockDetails, type TransactionDetails } from '@/lib/hyperliquidApi';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

export interface Block {
  blockNumber: number;
  hash: string;
  time: number;
  txCount: number;
  proposer?: string;
  txs?: Transaction[];
}

export interface Transaction {
  hash: string;
  block: number;
  time: number;
  user: string;
  action: string;
  type?: string;
  signatureChainId?: string;
  hyperliquidChain?: string;
  agentAddress?: string;
  agentName?: string;
  nonce?: number;
  error?: string | null;
  rawAction?: any;
}

export interface Fill {
  coin: string;
  side: string;
  sz: string;
  px: string;
  time: number;
  hash?: string;
  tid?: number;
  fee?: string;
  closedPnl?: string;
  user?: string;
}

interface WebSocketState {
  connected: boolean;
  blocks: Block[];
  transactions: Transaction[];
  fills: Fill[];
  lastBlockTime: Date | null;
  lastTxTime: Date | null;
  lastFillTime: Date | null;
}

const MAX_BUFFER_SIZE = 100;

export function useHyperliquidWebSocket(subscriptions: ('blocks' | 'allMids' | 'trades')[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 5;
  
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    blocks: [],
    transactions: [],
    fills: [],
    lastBlockTime: null,
    lastTxTime: null,
    lastFillTime: null,
  });

  // Memoize subscriptions to prevent dependency changes
  const subscriptionsKey = subscriptions.sort().join(',');

  const addFill = useCallback((fill: Fill) => {
    setState(prev => ({
      ...prev,
      fills: [fill, ...prev.fills].slice(0, MAX_BUFFER_SIZE),
      lastFillTime: new Date(),
    }));
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Limit reconnection attempts
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.warn('[WS] Max reconnection attempts reached, stopping.');
      return;
    }

    isConnectingRef.current = true;

    try {
      console.log('[WS] Connecting to Hyperliquid WebSocket...');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to Hyperliquid');
        reconnectAttemptRef.current = 0;
        isConnectingRef.current = false;
        setState(prev => ({ ...prev, connected: true }));

        // Subscribe to trades for major coins
        if (subscriptionsKey.includes('trades')) {
          const coins = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'WIF', 'PEPE'];
          coins.forEach(coin => {
            ws.send(JSON.stringify({
              method: 'subscribe',
              subscription: { type: 'trades', coin },
            }));
          });
          console.log('[WS] Subscribed to trade feeds');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle trades channel - real-time fill data
          if (data.channel === 'trades' && data.data) {
            const trades = Array.isArray(data.data) ? data.data : [data.data];
            trades.forEach((trade: any) => {
              const fill: Fill = {
                coin: trade.coin || data.subscription?.coin || 'BTC',
                side: trade.side || 'B',
                sz: String(Math.abs(parseFloat(trade.sz || '0'))),
                px: String(trade.px || 0),
                time: trade.time || Date.now(),
                tid: trade.tid,
                user: trade.users?.[0] || undefined,
              };
              addFill(fill);
            });
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onerror = () => {
        console.error('[WS] WebSocket error');
        isConnectingRef.current = false;
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        isConnectingRef.current = false;
        setState(prev => ({ ...prev, connected: false }));
        
        // Only reconnect if under limit
        reconnectAttemptRef.current++;
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(3000 * reconnectAttemptRef.current, 15000);
          console.log(`[WS] Reconnecting in ${delay/1000}s (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      isConnectingRef.current = false;
    }
  }, [subscriptionsKey, addFill]);

  const disconnect = useCallback(() => {
    reconnectAttemptRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, connected: false }));
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    reconnect: () => {
      reconnectAttemptRef.current = 0;
      connect();
    },
  };
}

// Hook that fetches real block data from the Explorer API
export function useRealBlockData(enabled: boolean = true) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestBlockHeight, setLatestBlockHeight] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch a single block and its transactions
  const fetchBlock = useCallback(async (height: number): Promise<Block | null> => {
    try {
      const blockData = await getBlockDetails(height);
      if (!blockData) return null;

      const block: Block = {
        blockNumber: blockData.blockNumber,
        hash: blockData.hash,
        time: blockData.time,
        txCount: blockData.txCount,
        proposer: blockData.proposer,
      };

      // Extract transactions
      const txs: Transaction[] = blockData.txs.map(tx => ({
        hash: tx.hash,
        block: tx.block,
        time: tx.time,
        user: tx.user,
        action: tx.action?.type || 'Unknown',
        type: tx.action?.type,
        error: tx.error,
        rawAction: tx.action,
      }));

      return { ...block, txs };
    } catch (err) {
      console.error('[Explorer] Failed to fetch block:', height, err);
      return null;
    }
  }, []);

  // Initial load - skip L1 block fetching for now since the API returns 404
  // The L1 explorer blocks are in the 800M+ range but the API seems to have issues
  useEffect(() => {
    if (!enabled) return;

    // For now, set loading to false and show empty state
    // This prevents the 404 error loop while we rely on HyperEVM blocks
    setIsLoading(false);
    console.log('[Explorer] L1 block fetcher disabled - using HyperEVM blocks instead');
  }, [enabled]);

  // Polling for new blocks
  useEffect(() => {
    if (!enabled || !latestBlockHeight) return;

    let currentHeight = latestBlockHeight;

    const pollNewBlocks = async () => {
      // Try to fetch the next block
      const nextHeight = currentHeight + 1;
      const block = await fetchBlock(nextHeight);

      if (block) {
        currentHeight = nextHeight;
        setLatestBlockHeight(nextHeight);

        setBlocks(prev => [block, ...prev].slice(0, MAX_BUFFER_SIZE));

        if (block.txs && block.txs.length > 0) {
          setTransactions(prev => [...block.txs!, ...prev].slice(0, MAX_BUFFER_SIZE));
        }

        setLastUpdate(new Date());
        console.log('[Explorer] New block:', nextHeight, 'with', block.txCount, 'txs');
      }
    };

    // Poll every 500ms (Hyperliquid blocks are ~400ms)
    intervalRef.current = setInterval(pollNewBlocks, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, latestBlockHeight, fetchBlock]);

  return { blocks, transactions, lastUpdate, isLoading };
}

// Combined hook that uses real Explorer API for blocks and WebSocket for trades
export function useHybridRealtime(enabled: boolean = true) {
  const ws = useHyperliquidWebSocket(['trades']);
  const explorer = useRealBlockData(enabled);
  
  return {
    connected: ws.connected,
    blocks: explorer.blocks,
    transactions: explorer.transactions,
    fills: ws.fills,
    lastBlockTime: explorer.lastUpdate,
    lastTxTime: explorer.lastUpdate,
    lastFillTime: ws.lastFillTime,
    isRealFills: ws.fills.length > 0,
    isLoading: explorer.isLoading,
  };
}

// Legacy export for backwards compatibility
export function useSimulatedRealtime(enabled: boolean = true) {
  return useRealBlockData(enabled);
}
