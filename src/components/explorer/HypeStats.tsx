import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HypeStatsData {
  hypePrice: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  circSupply: number | null;
  totalTxns: number | null;
  tps: number | null;
  latestBlock: number | null;
  blockTime: number | null;
}

// Minimal stat item - center aligned, reduced visual weight
function StatItem({ 
  label, 
  value, 
  subValue,
  change,
  isLoading 
}: { 
  label: string;
  value: string;
  subValue?: string;
  change?: number | null;
  isLoading?: boolean;
}) {
  const isPlaceholder = value.includes('--');
  
  return (
    <div className="flex flex-col items-center justify-center py-4 px-3 text-center min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-1.5">
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <span className={cn(
          "text-sm font-medium tabular-nums transition-all duration-300",
          isPlaceholder ? "text-muted-foreground/30 animate-pulse" : "text-foreground/80"
        )}>
          {value}
        </span>
        {change !== undefined && change !== null && !isPlaceholder && (
          <span className={cn(
            "text-[10px] font-medium tabular-nums",
            change >= 0 ? "text-profit-3/70" : "text-loss-3/70"
          )}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
      {subValue && (
        <span className={cn(
          "text-[10px] text-muted-foreground/40 mt-0.5 tabular-nums",
          isPlaceholder && "animate-pulse"
        )}>
          {subValue}
        </span>
      )}
    </div>
  );
}

export function HypeStats() {
  const [stats, setStats] = useState<HypeStatsData>({
    hypePrice: null,
    priceChange24h: null,
    marketCap: null,
    circSupply: null,
    totalTxns: null,
    tps: null,
    latestBlock: null,
    blockTime: null,
  });
  const [isLive, setIsLive] = useState(false);
  const [lastBlockUpdate, setLastBlockUpdate] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const blockTimestampsRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const txCountRef = useRef<number>(102460000);

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

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('wss://rpc.hyperliquid.xyz/evm');
      wsRef.current = ws;

      ws.onopen = () => {
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

      ws.onerror = () => setIsLive(false);
      ws.onclose = () => {
        setIsLive(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };
    } catch (err) {
      setIsLive(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [lastBlockUpdate, calculateTps]);

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
      
      if (perpsData && perpsData[0]?.universe && perpsData[1]) {
        const hypeIndex = perpsData[0].universe.findIndex((u: any) => u.name === 'HYPE');
        if (hypeIndex >= 0 && perpsData[1][hypeIndex]) {
          hypePrice = parseFloat(perpsData[1][hypeIndex].markPx || '0');
          const prevDayPx = parseFloat(perpsData[1][hypeIndex].prevDayPx || '0');
          if (prevDayPx > 0) {
            priceChange24h = ((hypePrice - prevDayPx) / prevDayPx) * 100;
          }
        }
      }
      
      const circSupply = 336685219;
      const marketCap = hypePrice ? hypePrice * circSupply : null;
      
      setStats(prev => ({
        ...prev,
        hypePrice: hypePrice ?? prev.hypePrice,
        priceChange24h: priceChange24h ?? prev.priceChange24h,
        marketCap: marketCap ?? prev.marketCap,
        circSupply: circSupply ?? prev.circSupply,
      }));
    } catch (err) {
      console.error('[HypeStats] Error fetching price data:', err);
    }
  }, []);

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
      if (!isLive) fetchInitialBlock();
    }, 2000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(blockInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchPriceData, fetchInitialBlock, connectWebSocket, isLive]);

  // Formatters with placeholder values
  const formatPrice = (price: number | null) => 
    price === null ? '$--.-' : `$${price.toFixed(2)}`;

  const formatMarketCap = (cap: number | null): string => {
    if (cap === null) return '$--.--B';
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatTxns = (txns: number | null): string => 
    txns === null ? '---.--M' : txns >= 1e6 ? `${(txns / 1e6).toFixed(2)}M` : txns.toLocaleString();

  const formatBlock = (block: number | null): string => 
    block === null ? '--,---,---' : block.toLocaleString();

  return (
    <div className={cn(
      "relative overflow-hidden",
      "rounded-xl border border-border/20",
      "bg-gradient-to-r from-card/30 via-card/20 to-card/30",
      "backdrop-blur-sm"
    )}>
      {/* Subtle live indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {isLive && (
          <span className="relative flex h-1 w-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3/40 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1 w-1 bg-profit-3/60"></span>
          </span>
        )}
      </div>

      {/* Stats row - horizontal, center-aligned */}
      <div className="flex items-stretch divide-x divide-border/10">
        <StatItem
          label="HYPE"
          value={formatPrice(stats.hypePrice)}
          change={stats.priceChange24h}
        />
        <StatItem
          label="Market Cap"
          value={formatMarketCap(stats.marketCap)}
        />
        <StatItem
          label="Transactions"
          value={formatTxns(stats.totalTxns)}
          subValue={stats.tps !== null ? `${stats.tps.toFixed(1)} TPS` : undefined}
        />
        <StatItem
          label="Block"
          value={formatBlock(stats.latestBlock)}
          subValue={stats.blockTime !== null ? `${stats.blockTime.toFixed(2)}s` : undefined}
        />
      </div>
    </div>
  );
}