import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { proxyRequest, getSpotMetaAndAssetCtxs } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface Market {
  name: string;
  price: string;
  change24h: number;
  volume24h: number;
  type: 'perp' | 'spot';
}

interface TopMarketsProps {
  onNavigate?: (type: 'spot-token', id: string) => void;
}

export function TopMarkets({ onNavigate }: TopMarketsProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'perp' | 'spot'>('all');

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const [perpData, spotData] = await Promise.all([
          proxyRequest({ type: 'metaAndAssetCtxs' }),
          getSpotMetaAndAssetCtxs(),
        ]);

        const allMarkets: Market[] = [];

        // Process perp markets
        if (perpData) {
          const [meta, assetCtxs] = perpData;
          meta.universe?.forEach((market: any, i: number) => {
            const ctx = assetCtxs?.[i];
            if (ctx) {
              const price = parseFloat(ctx.markPx || '0');
              const prevDayPx = parseFloat(ctx.prevDayPx || '0');
              const change24h = prevDayPx > 0 ? ((price - prevDayPx) / prevDayPx) * 100 : 0;
              allMarkets.push({
                name: market.name,
                price: price.toString(),
                change24h,
                volume24h: parseFloat(ctx.dayNtlVlm || '0'),
                type: 'perp',
              });
            }
          });
        }

        // Process spot markets
        if (spotData) {
          const [spotMeta, spotCtxs] = spotData;
          spotMeta.universe?.forEach((pair, i) => {
            const ctx = spotCtxs?.[i];
            if (ctx && pair.isCanonical) {
              const token = spotMeta.tokens.find(t => t.index === pair.tokens[0]);
              const price = parseFloat(ctx.markPx || ctx.midPx || '0');
              const prevDayPx = parseFloat(ctx.prevDayPx || '0');
              const change24h = prevDayPx > 0 ? ((price - prevDayPx) / prevDayPx) * 100 : 0;
              allMarkets.push({
                name: token?.name || pair.name,
                price: price.toString(),
                change24h,
                volume24h: parseFloat(ctx.dayNtlVlm || '0'),
                type: 'spot',
              });
            }
          });
        }

        // Sort by 24h volume
        allMarkets.sort((a, b) => b.volume24h - a.volume24h);
        setMarkets(allMarkets);
      } catch (err) {
        console.error('[TopMarkets] Error:', err);
      }
      setIsLoading(false);
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = markets.filter(m => filter === 'all' || m.type === filter).slice(0, 10);

  const formatPrice = (price: string) => {
    const p = parseFloat(price);
    if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toPrecision(4)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
    return vol.toFixed(0);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="h-5 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Top Markets by Volume</h3>
        <div className="flex gap-1 p-0.5 bg-muted/50 rounded">
          {(['all', 'perp', 'spot'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2 py-0.5 text-[10px] rounded font-medium transition-colors",
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'all' ? 'All' : f === 'perp' ? 'Perps' : 'Spot'}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {filteredMarkets.map((market, i) => (
          <div 
            key={`${market.name}-${market.type}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => market.type === 'spot' && onNavigate?.('spot-token', market.name)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{market.name}</span>
                  <span className={cn(
                    "text-[9px] px-1 py-0.5 rounded font-medium",
                    market.type === 'perp' ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {market.type === 'perp' ? 'PERP' : 'SPOT'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">${formatVolume(market.volume24h)} vol</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono">{formatPrice(market.price)}</p>
              <div className={cn(
                "flex items-center justify-end gap-0.5 text-xs font-medium",
                market.change24h >= 0 ? "text-profit-3" : "text-loss-3"
              )}>
                {market.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(market.change24h).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
