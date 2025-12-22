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
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    blocks: [],
    transactions: [],
    fills: [],
    lastBlockTime: null,
    lastTxTime: null,
    lastFillTime: null,
  });

  const addFill = useCallback((fill: Fill) => {
    setState(prev => ({
      ...prev,
      fills: [fill, ...prev.fills].slice(0, MAX_BUFFER_SIZE),
      lastFillTime: new Date(),
    }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      console.log('[WS] Connecting to Hyperliquid WebSocket...');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to Hyperliquid');
        setState(prev => ({ ...prev, connected: true }));

        // Subscribe to trades for major coins
        if (subscriptions.includes('trades')) {
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

      ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setState(prev => ({ ...prev, connected: false }));
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected, reconnecting in 3s...');
        setState(prev => ({ ...prev, connected: false }));
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      setState(prev => ({ ...prev, connected: false }));
    }
  }, [subscriptions, addFill]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
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
    reconnect: connect,
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

  // Initial load - find latest block and fetch recent blocks
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      setIsLoading(true);
      console.log('[Explorer] Initializing block fetcher...');

      // Try to find a valid block starting from a known recent range
      // The latest blocks are around 836,600,000+ as of Dec 2024
      let foundHeight: number | null = null;
      const testHeights = [836620000, 836610000, 836600000, 836500000];
      
      for (const height of testHeights) {
        console.log('[Explorer] Testing block height:', height);
        const block = await fetchBlock(height);
        if (block) {
          foundHeight = height;
          console.log('[Explorer] Found valid block at height:', height);
          break;
        }
      }

      if (!foundHeight) {
        console.error('[Explorer] Could not find valid block height');
        setIsLoading(false);
        return;
      }

      setLatestBlockHeight(foundHeight);

      // Fetch initial batch of blocks
      const initialBlocks: Block[] = [];
      const initialTxs: Transaction[] = [];

      const promises = Array.from({ length: 10 }, (_, i) => fetchBlock(foundHeight! - i));
      const results = await Promise.all(promises);

      for (const block of results) {
        if (block) {
          initialBlocks.push(block);
          if (block.txs) {
            initialTxs.push(...block.txs);
          }
        }
      }

      setBlocks(initialBlocks.sort((a, b) => b.blockNumber - a.blockNumber));
      setTransactions(initialTxs.sort((a, b) => b.time - a.time).slice(0, MAX_BUFFER_SIZE));
      setLastUpdate(new Date());
      setIsLoading(false);
      console.log('[Explorer] Loaded', initialBlocks.length, 'blocks and', initialTxs.length, 'transactions');
    };

    init();
  }, [enabled, fetchBlock]);

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
