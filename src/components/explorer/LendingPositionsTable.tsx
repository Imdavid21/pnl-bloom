/**
 * Lending Positions Table
 * Displays supplied and borrowed positions
 */

import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { LendingPosition } from '@/lib/position-aggregator';

interface LendingPositionsTableProps {
  positions: LendingPosition[];
  isLoading?: boolean;
  onNavigate?: (asset: string) => void;
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
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

function PositionSkeleton() {
  return (
    <div className="flex items-center justify-between py-2.5 px-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  );
}

export function LendingPositionsTable({ 
  positions, 
  isLoading,
  onNavigate 
}: LendingPositionsTableProps) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Lending & Borrowing</h3>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y divide-border/40">
          <PositionSkeleton />
          <PositionSkeleton />
        </div>
      </section>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Lending & Borrowing</h3>
        <p className="text-sm text-muted-foreground/60 py-4">
          No lending positions
        </p>
      </section>
    );
  }

  const supplied = positions.filter(p => p.type === 'supplied');
  const borrowed = positions.filter(p => p.type === 'borrowed');
  const suppliedTotal = supplied.reduce((sum, p) => sum + p.valueUsd, 0);
  const borrowedTotal = borrowed.reduce((sum, p) => sum + p.valueUsd, 0);
  const netValue = suppliedTotal - borrowedTotal;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Lending & Borrowing</h3>
        <p className="text-sm text-muted-foreground/60">
          Supplied: {formatUsd(suppliedTotal)} • Borrowed: {formatUsd(borrowedTotal)} • Net: {formatUsd(netValue)}
        </p>
      </div>

      {/* Table */}
      <div className="divide-y divide-border/40">
        {positions.map((position, index) => {
          const isEarning = position.type === 'supplied';
          
          return (
            <div
              key={`${position.asset}-${position.type}-${index}`}
              className="flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-muted/20 rounded-lg transition-colors cursor-pointer group"
              onClick={() => onNavigate?.(position.asset)}
            >
              {/* Left: Asset, Type, Amount */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Asset */}
                <span className="font-medium text-sm w-12">
                  {position.asset}
                </span>
                
                {/* Type Badge */}
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded',
                  isEarning 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : 'bg-amber-500/10 text-amber-500'
                )}>
                  {position.type === 'supplied' ? 'Supplied' : 'Borrowed'}
                </span>
                
                {/* Amount */}
                <span className="text-sm text-muted-foreground">
                  {formatNumber(position.amount)} {position.asset}
                </span>
              </div>

              {/* Right: Value, APY, Arrow */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Value */}
                <span className="text-sm tabular-nums">
                  {formatUsd(position.valueUsd)}
                </span>

                {/* APY */}
                <div className={cn(
                  'flex items-center gap-0.5 text-sm tabular-nums',
                  isEarning ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {isEarning ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {position.apy.toFixed(1)}%
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
