/**
 * Spot Balances Grid
 * Displays spot token holdings in a responsive grid
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from './TokenLogo';
import type { SpotBalance } from '@/lib/position-aggregator';

interface SpotBalancesGridProps {
  balances: SpotBalance[];
  isLoading?: boolean;
  onNavigate?: (symbol: string) => void;
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  if (value < 1 && value > 0) return value.toFixed(4);
  return value.toFixed(decimals);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function BalanceSkeleton() {
  return (
    <div className="rounded-lg bg-muted/20 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function SpotBalancesGrid({ 
  balances, 
  isLoading,
  onNavigate 
}: SpotBalancesGridProps) {
  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Spot Balances</h3>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <BalanceSkeleton />
          <BalanceSkeleton />
          <BalanceSkeleton />
          <BalanceSkeleton />
        </div>
      </section>
    );
  }

  if (balances.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Spot Balances</h3>
        <p className="text-sm text-muted-foreground/60 py-4">
          No spot balances
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Spot Balances</h3>
        <p className="text-sm text-muted-foreground/60">
          {balances.length} assets • {formatUsd(totalValue)} total
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {balances.map((balance) => (
          <div
            key={balance.symbol}
            className="rounded-lg bg-muted/20 p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => onNavigate?.(balance.symbol)}
          >
            {/* Token Header */}
            <div className="flex items-center gap-2 mb-2">
              <TokenLogo symbol={balance.symbol} size="sm" />
              <span className="font-semibold text-sm">{balance.symbol}</span>
            </div>

            {/* Balance Amount */}
            <p className="text-lg font-medium tabular-nums">
              {formatNumber(balance.balance)}
            </p>

            {/* USD Value & Change */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-muted-foreground">
                {formatUsd(balance.valueUsd)}
              </span>
              {balance.symbol !== 'USDC' && balance.change24h !== 0 && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs',
                  balance.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {balance.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(balance.change24h).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
