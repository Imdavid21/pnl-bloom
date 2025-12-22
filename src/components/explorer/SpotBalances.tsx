import { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, Loader2, ExternalLink } from 'lucide-react';
import { getSpotClearinghouseState, getSpotMetaAndAssetCtxs, type SpotBalance, type SpotMeta, type SpotAssetContext } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface SpotBalancesProps {
  address: string;
  onNavigate?: (type: 'spot-token', id: string) => void;
}

interface EnrichedBalance extends SpotBalance {
  price: number;
  usdValue: number;
  change24h: number;
}

export function SpotBalances({ address, onNavigate }: SpotBalancesProps) {
  const [balances, setBalances] = useState<EnrichedBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchBalances = async () => {
      setIsLoading(true);
      try {
        const [spotState, metaAndCtxs] = await Promise.all([
          getSpotClearinghouseState(address),
          getSpotMetaAndAssetCtxs(),
        ]);

        if (!spotState?.balances || !metaAndCtxs) {
          setBalances([]);
          setIsLoading(false);
          return;
        }

        const [spotMeta, assetCtxs] = metaAndCtxs;

        // Create a price map
        const priceMap = new Map<number, { price: number; change24h: number }>();
        spotMeta.universe.forEach((pair, i) => {
          const ctx = assetCtxs[i];
          if (ctx) {
            const price = parseFloat(ctx.midPx || ctx.markPx || '0');
            const prevPrice = parseFloat(ctx.prevDayPx || '0');
            const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
            // Map base token to price
            priceMap.set(pair.tokens[0], { price, change24h });
          }
        });

        // Enrich balances with prices
        const enriched: EnrichedBalance[] = [];
        let total = 0;

        spotState.balances.forEach((balance) => {
          const totalBalance = parseFloat(balance.total || '0');
          if (totalBalance <= 0) return;

          const priceData = priceMap.get(balance.token) || { price: 0, change24h: 0 };
          
          // USDC special case - always $1
          let price = priceData.price;
          if (balance.coin === 'USDC') {
            price = 1;
          }
          
          const usdValue = totalBalance * price;
          total += usdValue;

          enriched.push({
            ...balance,
            price,
            usdValue,
            change24h: balance.coin === 'USDC' ? 0 : priceData.change24h,
          });
        });

        // Sort by USD value descending
        enriched.sort((a, b) => b.usdValue - a.usdValue);
        
        setBalances(enriched);
        setTotalValue(total);
      } catch (err) {
        console.error('[SpotBalances] Error:', err);
      }
      setIsLoading(false);
    };

    fetchBalances();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address]);

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(decimals);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Spot Holdings</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Spot Holdings</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">No spot holdings</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Spot Holdings</span>
          <span className="text-xs text-muted-foreground">({balances.length})</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">${formatNumber(totalValue)}</p>
          <p className="text-[10px] text-muted-foreground">Total Value</p>
        </div>
      </div>

      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
        {balances.map((balance) => (
          <div
            key={balance.coin}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onNavigate?.('spot-token', balance.coin)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-amber-500">
                  {balance.coin.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{balance.coin}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatNumber(parseFloat(balance.total), 4)} tokens
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono">${formatNumber(balance.usdValue)}</p>
              {balance.coin !== 'USDC' && (
                <div className={cn(
                  "flex items-center justify-end gap-0.5 text-xs",
                  balance.change24h >= 0 ? "text-profit-3" : "text-loss-3"
                )}>
                  {balance.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(balance.change24h).toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
