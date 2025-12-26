import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatVolume, getRankBadge, getWinRateColor } from '@/lib/market-calculator';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableText } from './CopyableText';
import { ChevronRight } from 'lucide-react';
import { TopTrader } from '@/hooks/useTopTraders';

interface TopTradersTableProps {
  traders: TopTrader[];
  isLoading: boolean;
  symbol: string;
}

type Timeframe = '7d' | '30d' | '90d';

export function TopTradersTable({ traders, isLoading, symbol }: TopTradersTableProps) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">Top Traders</h2>
          <p className="text-sm text-muted-foreground">
            Ranked by {timeframe === '7d' ? '7-day' : timeframe === '30d' ? '30-day' : '90-day'} PnL
          </p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                timeframe === tf.value
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {traders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No trading activity in selected period
        </div>
      ) : (
        <div className="space-y-1">
          {traders.map((trader) => {
            const badge = getRankBadge(trader.rank);
            const isPositive = trader.pnlUsd >= 0;

            return (
              <div
                key={trader.walletAddress}
                onClick={() => navigate(`/wallet/${trader.walletAddress}`)}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                {/* Rank */}
                <div className={cn(
                  "w-8 text-center font-bold",
                  trader.rank <= 3 ? "text-lg" : "text-muted-foreground"
                )}>
                  {badge || `#${trader.rank}`}
                </div>

                {/* Wallet Address */}
                <div className="flex-1 min-w-0">
                  <CopyableText 
                    text={trader.walletAddress}
                    displayText={`${trader.walletAddress.slice(0, 6)}...${trader.walletAddress.slice(-4)}`}
                    className="font-mono text-sm"
                  />
                </div>

                {/* PnL */}
                <div className={cn(
                  "text-right font-medium w-32 md:w-40",
                  isPositive ? "text-green-500" : "text-red-500"
                )}>
                  <div>
                    {isPositive ? '+' : ''}${Math.abs(trader.pnlUsd).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className="text-xs opacity-80">
                    ({isPositive ? '+' : ''}{trader.pnlPercentage.toFixed(1)}%)
                  </div>
                </div>

                {/* Volume - Hidden on mobile */}
                <div className="hidden md:block text-right text-muted-foreground w-24">
                  {formatVolume(trader.volumeUsd)}
                </div>

                {/* Trades - Hidden on mobile */}
                <div className="hidden md:block text-right text-muted-foreground w-16">
                  {trader.tradesCount}
                </div>

                {/* Win Rate */}
                <div className={cn(
                  "hidden sm:block text-right w-16",
                  getWinRateColor(trader.winRate)
                )}>
                  {trader.winRate.toFixed(1)}%
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {traders.length >= 10 && (
        <div className="text-center pt-2">
          <button 
            onClick={() => navigate(`/leaderboard?market=${symbol}`)}
            className="text-sm text-primary hover:underline"
          >
            View All Traders →
          </button>
        </div>
      )}
    </div>
  );
}
