import { useState, useEffect, useRef, useCallback } from 'react';
import { CircleDollarSign, Layers, Globe, Box, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricBlock } from './MetricBlock';

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
  const txCountRef = useRef<number>(102460000);

  // Calculate TPS from recent blocks
  const calculateTps = useCallback(() => {
    const timestamps = blockTimestampsRef.current;
    if (timestamps.length < 2) return 3.9;
    
    const now = Date.now();
    const recentBlocks = timestamps.filter(t => now - t < 10000);
    
    if (recentBlocks.length < 2) return 3.9;
    
    const timeSpan = (recentBlocks[recentBlocks.length - 1] - recentBlocks[0]) / 1000;
    const blocksInSpan = recentBlocks.length;
    
    const tps = timeSpan > 0 ? (blocksInSpan * 4) / timeSpan : 3.9;
    return Math.min(tps, 10);
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
          
          if (data.id === 1 && data.result) {
            console.log('[HypeStats] Subscribed to newHeads:', data.result);
          }
          
          if (data.method === 'eth_subscription' && data.params?.result) {
            const block = data.params.result;
            const blockNumber = parseInt(block.number, 16);
            const timestamp = Date.now();
            
            blockTimestampsRef.current.push(timestamp);
            if (blockTimestampsRef.current.length > 20) {
              blockTimestampsRef.current.shift();
            }
            
            const prevTimestamp = lastBlockUpdate;
            const blockTime = prevTimestamp ? (timestamp - prevTimestamp) / 1000 : 0.98;
            
            const txCount = block.transactions?.length || parseInt(block.gasUsed, 16) / 21000 || 4;
            txCountRef.current += Math.max(1, Math.floor(txCount));
            
            setLastBlockUpdate(timestamp);
            
            setStats(prev => ({
              ...prev,
              latestBlock: blockNumber,
              blockTime: Math.min(blockTime, 5),
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
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error('[HypeStats] WebSocket connection error:', err);
      setIsLive(false);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  }, [lastBlockUpdate, calculateTps]);

  // Fetch price data
  const fetchPriceData = useCallback(async () => {
    try {
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
        const hypeIndex = perpsData[0].universe.findIndex((u: any) => u.name === 'HYPE');
        if (hypeIndex >= 0 && perpsData[1][hypeIndex]) {
          hypePrice = parseFloat(perpsData[1][hypeIndex].markPx || '0');
          const prevDayPx = parseFloat(perpsData[1][hypeIndex].prevDayPx || '0');
          if (prevDayPx > 0) {
            priceChange24h = ((hypePrice - prevDayPx) / prevDayPx) * 100;
          }
        }
        
        const btcIndex = perpsData[0].universe.findIndex((u: any) => u.name === 'BTC');
        if (btcIndex >= 0 && perpsData[1][btcIndex]) {
          btcPrice = parseFloat(perpsData[1][btcIndex].markPx || '0');
        }
      }
      
      const hypePriceBtc = hypePrice && btcPrice ? hypePrice / btcPrice : null;
      const circSupply = 336685219;
      const marketCap = hypePrice ? hypePrice * circSupply : null;
      
      setStats(prev => ({
        ...prev,
        hypePrice: hypePrice ?? prev.hypePrice,
        hypePriceBtc: hypePriceBtc ?? prev.hypePriceBtc,
        priceChange24h: priceChange24h ?? prev.priceChange24h,
        marketCap: marketCap ?? prev.marketCap,
        circSupply: circSupply ?? prev.circSupply,
      }));
      
      setIsLoading(false);
    } catch (err) {
      console.error('[HypeStats] Error fetching price data:', err);
    }
  }, []);

  // Initial block fetch (fallback)
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
          blockTime: prev.blockTime ?? 0.98,
          totalTxns: txCountRef.current,
          tps: prev.tps ?? 3.9,
        }));
        setLastBlockUpdate(Date.now());
        setIsLoading(false);
      }
    } catch (e) {
      console.error('[HypeStats] Error fetching initial block:', e);
    }
  }, []);

  useEffect(() => {
    fetchPriceData();
    fetchInitialBlock();
    connectWebSocket();
    
    const priceInterval = setInterval(fetchPriceData, 5000);
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

  // Formatters
  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return `$${price.toFixed(2)}`;
  };

  const formatBtcPrice = (price: number | null) => {
    if (price === null) return '';
    return `@ ${price.toFixed(5)} BTC`;
  };

  const formatMarketCap = (cap: number | null): string => {
    if (cap === null) return '-';
    return `$${cap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSupply = (supply: number | null): string => {
    if (supply === null) return '';
    return `(${supply.toLocaleString()} HYPE)`;
  };

  const formatTxns = (txns: number | null): string => {
    if (txns === null) return '-';
    return txns >= 1e6 ? `${(txns / 1e6).toFixed(2)}M` : txns.toLocaleString();
  };

  const formatTps = (tps: number | null): string => {
    if (tps === null) return '';
    return `(${tps.toFixed(1)} TPS)`;
  };

  const formatBlock = (block: number | null): string => {
    if (block === null) return '-';
    return block.toLocaleString();
  };

  const formatBlockTime = (time: number | null): string => {
    if (time === null) return '';
    return `(${time.toFixed(2)}s ago)`;
  };

  return (
    <div className={cn(
      "relative overflow-hidden",
      "rounded-2xl",
      "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
      "border border-border/40",
      "backdrop-blur-xl",
      "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)]",
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {isLive ? (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-profit-3"></span>
            </span>
            <span className="text-[10px] text-profit-3/80 font-medium uppercase tracking-wide">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wide">Polling</span>
          </>
        )}
      </div>

      {/* 2x2 Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* HYPE Price */}
        <MetricBlock
          label="HYPE Price"
          primaryValue={formatPrice(stats.hypePrice)}
          secondaryValue={formatBtcPrice(stats.hypePriceBtc)}
          icon={CircleDollarSign}
          delta={stats.priceChange24h !== null ? {
            value: stats.priceChange24h,
            formatted: `${stats.priceChange24h.toFixed(2)}%`
          } : undefined}
          isLoading={isLoading}
          className="border-b md:border-b-0 md:border-r border-border/20 lg:border-r"
        />

        {/* Market Cap */}
        <MetricBlock
          label="HYPE Market Cap"
          primaryValue={formatMarketCap(stats.marketCap)}
          secondaryValue={formatSupply(stats.circSupply)}
          icon={Globe}
          isLoading={isLoading}
          className="border-b lg:border-b-0 lg:border-r border-border/20"
        />

        {/* Transactions */}
        <MetricBlock
          label="Transactions"
          primaryValue={formatTxns(stats.totalTxns)}
          secondaryValue={formatTps(stats.tps)}
          icon={Layers}
          isLoading={isLoading}
          className="border-b md:border-b-0 md:border-r lg:border-r border-border/20"
        />

        {/* Latest Block */}
        <MetricBlock
          label="Latest Block"
          primaryValue={formatBlock(stats.latestBlock)}
          secondaryValue={formatBlockTime(stats.blockTime)}
          icon={Box}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
