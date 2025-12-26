import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatVolume } from '@/lib/market-calculator';
import { formatTokenAmount } from '@/lib/token-aggregator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TopTrader } from '@/lib/token-aggregator';
import { formatDistanceToNow } from 'date-fns';

interface HyperCoreTradingProps {
  symbol: string;
  stats?: {
    volume24h: number;
    trades24h: number;
    uniqueTraders24h: number;
  };
  topTraders: TopTrader[];
  recentTransfers: Array<{
    id: string;
    timestamp: Date;
    type: 'in' | 'out';
    amount: number;
    wallet: string;
  }>;
  isLoading: boolean;
}

export function HyperCoreTrading({
  symbol,
  stats,
  topTraders,
  recentTransfers,
  isLoading,
}: HyperCoreTradingProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Trading Activity Summary */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Trading Activity (24h)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">Volume</div>
              <div className="text-lg font-bold">{formatVolume(stats.volume24h)}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">Trades</div>
              <div className="text-lg font-bold">{stats.trades24h.toLocaleString()}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">Unique Traders</div>
              <div className="text-lg font-bold">{stats.uniqueTraders24h}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">Avg Trade</div>
              <div className="text-lg font-bold">
                {stats.trades24h > 0 ? formatVolume(stats.volume24h / stats.trades24h) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Traders */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top Traders (30d)</h3>
        {topTraders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trading activity in the last 30 days
          </div>
        ) : (
          <div className="space-y-1">
            {topTraders.map((trader) => (
              <div
                key={trader.walletAddress}
                onClick={() => navigate(`/wallet/${trader.walletAddress}`)}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="w-8 text-center font-bold text-muted-foreground">
                  #{trader.rank}
                </div>
                <div className="flex-1 min-w-0 font-mono text-sm truncate">
                  {trader.walletAddress.slice(0, 6)}...{trader.walletAddress.slice(-4)}
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatVolume(trader.volume)}</div>
                  <div className="text-xs text-muted-foreground">{trader.trades} trades</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transfers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Transfers</h3>
        {recentTransfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent transfers
          </div>
        ) : (
          <div className="space-y-1">
            {recentTransfers.map((transfer) => (
              <div
                key={transfer.id}
                onClick={() => navigate(`/wallet/${transfer.wallet}`)}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="w-16 text-xs text-muted-foreground">
                  {formatDistanceToNow(transfer.timestamp, { addSuffix: false })}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-14 justify-center text-xs",
                    transfer.type === 'in'
                      ? "bg-green-500/10 text-green-500 border-green-500/30"
                      : "bg-red-500/10 text-red-500 border-red-500/30"
                  )}
                >
                  {transfer.type === 'in' ? (
                    <ArrowDownLeft className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  )}
                  {transfer.type.toUpperCase()}
                </Badge>
                <div className="flex-1 font-medium">
                  {formatTokenAmount(transfer.amount)} {symbol}
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  {transfer.wallet.slice(0, 6)}...{transfer.wallet.slice(-4)}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
