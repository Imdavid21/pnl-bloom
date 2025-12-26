/**
 * LP Positions Grid
 * Displays liquidity pool positions in a responsive grid
 */

import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LPPosition } from '@/lib/position-aggregator';

interface LPPositionsGridProps {
  positions: LPPosition[];
  isLoading?: boolean;
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
    <div className="rounded-lg bg-muted/20 p-4 space-y-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function LPPositionsGrid({ 
  positions, 
  isLoading 
}: LPPositionsGridProps) {
  const totalValue = positions.reduce((sum, p) => sum + p.positionValue, 0);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Liquidity Positions</h3>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PositionSkeleton />
          <PositionSkeleton />
        </div>
      </section>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Liquidity Positions</h3>
        <p className="text-sm text-muted-foreground/60 py-4">
          No liquidity positions
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Liquidity Positions</h3>
        <p className="text-sm text-muted-foreground/60">
          {positions.length} pools • {formatUsd(totalValue)} total
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {positions.map((position, index) => (
          <a
            key={`${position.poolName}-${index}`}
            href={position.poolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-muted/20 p-4 hover:bg-muted/30 transition-colors group"
          >
            {/* Pool Name */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{position.poolName}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </div>

            {/* Share */}
            <p className="text-xs text-muted-foreground mb-1">
              {position.sharePct.toFixed(4)}% share
            </p>

            {/* Value */}
            <p className="text-lg font-medium tabular-nums">
              {formatUsd(position.positionValue)}
            </p>

            {/* 24h Fees */}
            <p className="text-sm text-emerald-500 mt-1">
              24h fees: +${formatNumber(position.fees24h)}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
