import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/market-calculator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { RecentTrade } from '@/hooks/useRecentTrades';
import { formatDistanceToNow } from 'date-fns';

interface RecentTradesTableProps {
  trades: RecentTrade[];
  isLoading: boolean;
  symbol: string;
}

export function RecentTradesTable({ trades, isLoading, symbol }: RecentTradesTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold">Recent Trades</h2>
        <p className="text-sm text-muted-foreground">
          Last {trades.length} trades
        </p>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No recent trades
        </div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {trades.map((trade, index) => {
            const prevTrade = index > 0 ? trades[index - 1] : null;
            const isSameTrader = prevTrade?.traderAddress === trade.traderAddress;

            return (
              <div
                key={trade.id}
                onClick={() => navigate(`/trade/${trade.id}`)}
                className={cn(
                  "flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg transition-all cursor-pointer group",
                  trade.side === 'long' 
                    ? "bg-green-500/5 hover:bg-green-500/10" 
                    : "bg-red-500/5 hover:bg-red-500/10",
                  trade.isLarge && "border-l-4 border-amber-500 pl-3"
                )}
              >
                {/* Whale indicator */}
                {trade.isLarge && (
                  <span className="text-base">🐋</span>
                )}

                {/* Time */}
                <div className="w-16 md:w-20 text-xs md:text-sm text-muted-foreground">
                  {formatDistanceToNow(trade.timestamp, { addSuffix: false })}
                </div>

                {/* Side */}
                <Badge 
                  variant="outline"
                  className={cn(
                    "w-16 justify-center text-xs",
                    trade.side === 'long'
                      ? "bg-green-500/10 text-green-500 border-green-500/30"
                      : "bg-red-500/10 text-red-500 border-red-500/30"
                  )}
                >
                  {trade.side.toUpperCase()}
                </Badge>

                {/* Size */}
                <div className="flex-1 min-w-0 font-medium text-sm md:text-base">
                  <span className="font-semibold">{trade.size.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4
                  })}</span>
                  <span className="text-muted-foreground ml-1">{symbol}</span>
                </div>

                {/* Price */}
                <div className="hidden sm:block w-24 text-right font-mono text-sm">
                  ${formatPrice(trade.price)}
                </div>

                {/* Total */}
                <div className={cn(
                  "w-20 md:w-24 text-right text-sm",
                  trade.notionalValue < 10000 ? "text-muted-foreground" : ""
                )}>
                  ${trade.notionalValue >= 1000 
                    ? `${(trade.notionalValue / 1000).toFixed(1)}K` 
                    : trade.notionalValue.toFixed(0)}
                </div>

                {/* Trader */}
                <div className="hidden md:block w-24 text-right">
                  {isSameTrader ? (
                    <span className="text-xs text-muted-foreground">↑ same</span>
                  ) : (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/wallet/${trade.traderAddress}`);
                      }}
                      className="text-xs font-mono text-muted-foreground hover:text-primary"
                    >
                      {trade.traderAddress.slice(0, 6)}...
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
