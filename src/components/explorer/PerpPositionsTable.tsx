/**
 * Perpetual Positions Table
 * Displays open perp positions with risk indicators
 */

import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { getRiskDotClass } from '@/lib/risk-calculator';
import type { PerpPosition } from '@/lib/position-aggregator';

interface PerpPositionsTableProps {
  positions: PerpPosition[];
  marginUsed: number;
  isLoading?: boolean;
  onNavigate?: (market: string) => void;
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(decimals);
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${formatNumber(value, 0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function formatPnl(value: number, pct: number): { text: string; isPositive: boolean } {
  const sign = value >= 0 ? '+' : '';
  const pctSign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}$${formatNumber(Math.abs(value))} (${pctSign}${pct.toFixed(1)}%)`,
    isPositive: value >= 0,
  };
}

function PositionSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export function PerpPositionsTable({ 
  positions, 
  marginUsed, 
  isLoading,
  onNavigate 
}: PerpPositionsTableProps) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Perpetual Positions</h3>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border/40">
          <PositionSkeleton />
          <PositionSkeleton />
          <PositionSkeleton />
        </div>
      </section>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Perpetual Positions</h3>
        <p className="text-sm text-muted-foreground/60 py-4">
          No open perpetual positions
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Perpetual Positions</h3>
        <p className="text-sm text-muted-foreground/60">
          {positions.length} open • ${formatNumber(marginUsed)} margin used
        </p>
      </div>

      {/* Table */}
      <div className="divide-y divide-border/40">
        {positions.map((position) => {
          const pnl = formatPnl(position.unrealizedPnl, position.unrealizedPnlPct);
          
          return (
            <div
              key={position.market}
              className="flex items-center justify-between py-3 px-2 -mx-2 hover:bg-muted/20 rounded-lg transition-colors cursor-pointer group"
              onClick={() => onNavigate?.(position.market)}
            >
              {/* Left: Market, Side, Size */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Market */}
                <span className="font-semibold text-sm md:text-base w-12 md:w-14">
                  {position.market}
                </span>
                
                {/* Side Badge */}
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded',
                  position.side === 'long' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-red-500/10 text-red-500'
                )}>
                  {position.side.toUpperCase()}
                </span>
                
                {/* Size */}
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {formatNumber(position.size, 4)} {position.market}
                </span>
              </div>

              {/* Middle: Entry / Current (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-6 text-sm tabular-nums">
                <div className="text-muted-foreground">
                  {formatPrice(position.entryPrice)}
                </div>
                <div className="text-foreground">
                  {formatPrice(position.currentPrice)}
                </div>
              </div>

              {/* Right: PnL, Risk, Arrow */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* PnL */}
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium tabular-nums',
                  pnl.isPositive ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {pnl.isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{pnl.text}</span>
                  <span className="sm:hidden">
                    {pnl.isPositive ? '+' : '-'}${formatNumber(Math.abs(position.unrealizedPnl))}
                  </span>
                </div>

                {/* Risk Indicator */}
                <div className="flex items-center gap-1.5 text-sm tabular-nums">
                  <div className={cn('w-2 h-2 rounded-full', getRiskDotClass(position.liquidationRisk))} />
                  <span className="text-muted-foreground hidden sm:inline">
                    {Math.round(position.liquidationRisk)}%
                  </span>
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
