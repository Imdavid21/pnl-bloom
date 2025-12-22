import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Layers, CircleDollarSign, Box, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HypeStatsData {
  hypePrice: number | null;
  hypePriceBtc: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  circSupply: number | null;
  totalTxns: number | null;
  tps: number | null;
  latestBlock: number | null;
  blockTime: number | null;
}

export function HypeStats() {
  const [stats, setStats] = useState<HypeStatsData>({
    hypePrice: null,
    hypePriceBtc: null,
    priceChange24h: null,
    marketCap: null,
    circSupply: null,
    totalTxns: null,
    tps: null,
    latestBlock: null,
    blockTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastBlockUpdate, setLastBlockUpdate] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const blockTimestampsRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const txCountRef = useRef<number>(102460000); // Base transaction count

  // Calculate TPS from recent blocks
  const calculateTps = useCallback(() => {
    const timestamps = blockTimestampsRef.current;
    if (timestamps.length < 2) return 3.9; // Default TPS
    
    // Get blocks from last 10 seconds
    const now = Date.now();
    const recentBlocks = timestamps.filter(t => now - t < 10000);
    
    if (recentBlocks.length < 2) return 3.9;
    
    const timeSpan = (recentBlocks[recentBlocks.length - 1] - recentBlocks[0]) / 1000;
    const blocksInSpan = recentBlocks.length;
    
    // Assume ~4 txs per block on average
    const tps = timeSpan > 0 ? (blocksInSpan * 4) / timeSpan : 3.9;
    return Math.min(tps, 10); // Cap at 10 TPS
  }, []);

  // WebSocket connection for real-time block updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('wss://rpc.hyperliquid.xyz/evm');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[HypeStats] WebSocket connected');
        setIsLive(true);
        
        // Subscribe to new block headers
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['newHeads'],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle subscription confirmation
          if (data.id === 1 && data.result) {
            console.log('[HypeStats] Subscribed to newHeads:', data.result);
          }
          
          // Handle new block notifications
          if (data.method === 'eth_subscription' && data.params?.result) {
            const block = data.params.result;
            const blockNumber = parseInt(block.number, 16);
            const timestamp = Date.now();
            
            // Track block timestamps for TPS calculation
            blockTimestampsRef.current.push(timestamp);
            if (blockTimestampsRef.current.length > 20) {
              blockTimestampsRef.current.shift();
            }
            
            // Calculate block time from previous block
            const prevTimestamp = lastBlockUpdate;
            const blockTime = prevTimestamp ? (timestamp - prevTimestamp) / 1000 : 0.98;
            
            // Increment transaction count (estimate based on block)
            const txCount = block.transactions?.length || parseInt(block.gasUsed, 16) / 21000 || 4;
            txCountRef.current += Math.max(1, Math.floor(txCount));
            
            setLastBlockUpdate(timestamp);
            setStats(prev => ({
              ...prev,
              latestBlock: blockNumber,
              blockTime: Math.min(blockTime, 5), // Cap display at 5s
              totalTxns: txCountRef.current,
              tps: calculateTps(),
            }));
          }
        } catch (err) {
          console.error('[HypeStats] WebSocket message error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[HypeStats] WebSocket error:', error);
        setIsLive(false);
      };

      ws.onclose = () => {
        console.log('[HypeStats] WebSocket closed, reconnecting...');
        setIsLive(false);
        wsRef.current = null;
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error('[HypeStats] WebSocket connection error:', err);
      setIsLive(false);
      
      // Fallback to polling if WebSocket fails
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  }, [lastBlockUpdate, calculateTps]);

  // Fetch price data (runs more frequently)
  const fetchPriceData = useCallback(async () => {
    try {
      // Fetch HYPE price from Hyperliquid perps (more reliable)
      const perpsResponse = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });
      const perpsData = await perpsResponse.json();
      
      let hypePrice: number | null = null;
      let priceChange24h: number | null = null;
      let btcPrice: number | null = null;
      
      if (perpsData && perpsData[0]?.universe && perpsData[1]) {
        // Get HYPE price
        const hypeIndex = perpsData[0].universe.findIndex((u: any) => u.name === 'HYPE');
        if (hypeIndex >= 0 && perpsData[1][hypeIndex]) {
          hypePrice = parseFloat(perpsData[1][hypeIndex].markPx || '0');
          const prevDayPx = parseFloat(perpsData[1][hypeIndex].prevDayPx || '0');
          if (prevDayPx > 0) {
            priceChange24h = ((hypePrice - prevDayPx) / prevDayPx) * 100;
          }
        }
        
        // Get BTC price
        const btcIndex = perpsData[0].universe.findIndex((u: any) => u.name === 'BTC');
        if (btcIndex >= 0 && perpsData[1][btcIndex]) {
          btcPrice = parseFloat(perpsData[1][btcIndex].markPx || '0');
        }
      }
      
      const hypePriceBtc = hypePrice && btcPrice ? hypePrice / btcPrice : null;
      const circSupply = 337000000; // Updated circulating supply
      const marketCap = hypePrice ? hypePrice * circSupply : null;
      
      setStats(prev => ({
        ...prev,
        hypePrice,
        hypePriceBtc,
        priceChange24h,
        marketCap,
        circSupply,
      }));
      
      setIsLoading(false);
    } catch (err) {
      console.error('[HypeStats] Error fetching price data:', err);
      setIsLoading(false);
    }
  }, []);

  // Initial block fetch (fallback if WebSocket not available)
  const fetchInitialBlock = useCallback(async () => {
    try {
      const rpcResponse = await fetch('https://rpc.hyperliquid.xyz/evm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_blockNumber',
          params: [],
        }),
      });
      const rpcData = await rpcResponse.json();
      if (rpcData.result) {
        const blockNumber = parseInt(rpcData.result, 16);
        setStats(prev => ({
          ...prev,
          latestBlock: blockNumber,
          blockTime: 0.98,
          totalTxns: txCountRef.current,
          tps: 3.9,
        }));
        setLastBlockUpdate(Date.now());
      }
    } catch (e) {
      console.error('[HypeStats] Error fetching initial block:', e);
    }
  }, []);

  useEffect(() => {
    // Fetch initial data
    fetchPriceData();
    fetchInitialBlock();
    
    // Connect WebSocket for real-time block updates
    connectWebSocket();
    
    // Poll price data every 5 seconds
    const priceInterval = setInterval(fetchPriceData, 5000);
    
    // Fallback block polling every 2 seconds if WebSocket fails
    const blockInterval = setInterval(() => {
      if (!isLive) {
        fetchInitialBlock();
      }
    }, 2000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(blockInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchPriceData, fetchInitialBlock, connectWebSocket, isLive]);

  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return `$${price.toFixed(2)}`;
  };

  const formatBtcPrice = (price: number | null) => {
    if (price === null) return '-';
    return `${price.toFixed(5)} BTC`;
  };

  const formatMarketCap = (cap: number | null, supply: number | null): { main: string; sub: string } => {
    if (cap === null) return { main: '-', sub: '' };
    const formatted = cap >= 1e9 
      ? `$${(cap / 1e9).toFixed(2)}B` 
      : `$${(cap / 1e6).toFixed(2)}M`;
    const supplyFormatted = supply ? `${(supply / 1e6).toFixed(0)}M HYPE` : '';
    return { main: formatted, sub: supplyFormatted };
  };

  const formatTxns = (txns: number | null, tps: number | null): { main: string; sub: string } => {
    if (txns === null) return { main: '-', sub: '' };
    const main = txns >= 1e6 ? `${(txns / 1e6).toFixed(2)} M` : txns.toLocaleString();
    const sub = tps ? `${tps.toFixed(1)} TPS` : '';
    return { main, sub };
  };

  const formatBlock = (block: number | null, time: number | null): { main: string; sub: string } => {
    if (block === null) return { main: '-', sub: '-' };
    return { 
      main: block.toLocaleString(), 
      sub: time ? `${time.toFixed(2)}s` : '' 
    };
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-2" />
              <div className="h-5 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const marketCapData = formatMarketCap(stats.marketCap, stats.circSupply);
  const txnsData = formatTxns(stats.totalTxns, stats.tps);
  const blockData = formatBlock(stats.latestBlock, stats.blockTime);

  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4 md:p-5 relative">
      {/* Live indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-profit-3"></span>
            </span>
            <span className="text-[10px] text-profit-3 font-medium uppercase">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Polling</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {/* HYPE Price */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CircleDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">HYPE Price</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-semibold text-foreground transition-all">
                {formatPrice(stats.hypePrice)}
              </span>
              <span className="text-xs text-muted-foreground">
                @ {formatBtcPrice(stats.hypePriceBtc)}
              </span>
              {stats.priceChange24h !== null && (
                <span className={cn(
                  "text-xs font-medium",
                  stats.priceChange24h >= 0 ? "text-profit-3" : "text-loss-3"
                )}>
                  ({stats.priceChange24h >= 0 ? '+' : ''}{stats.priceChange24h.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Transactions</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground tabular-nums">{txnsData.main}</span>
              {txnsData.sub && (
                <span className="text-xs text-muted-foreground">({txnsData.sub})</span>
              )}
            </div>
          </div>
        </div>

        {/* Market Cap */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">HYPE Market Cap</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-semibold text-foreground">{marketCapData.main}</span>
              {marketCapData.sub && (
                <span className="text-xs text-muted-foreground">({marketCapData.sub})</span>
              )}
            </div>
          </div>
        </div>

        {/* Latest Block */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Latest Block</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground tabular-nums">{blockData.main}</span>
              {blockData.sub && (
                <span className="text-xs text-muted-foreground">({blockData.sub})</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
