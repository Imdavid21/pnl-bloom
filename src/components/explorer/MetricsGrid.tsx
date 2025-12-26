/**
 * Metrics Grid Component
 * 4 cards showing key wallet metrics
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatNumber, formatPercent } from '@/lib/wallet-aggregator';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  isPositive?: boolean;
  isLoading?: boolean;
}

function MetricCard({ label, value, subtext, isPositive, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-muted/20 rounded-xl p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }
  
  return (
    <div className="bg-muted/20 rounded-xl p-5 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p className={cn(
        "text-2xl md:text-3xl font-semibold tracking-tight",
        isPositive === true && "text-emerald-600 dark:text-emerald-400",
        isPositive === false && "text-red-600 dark:text-red-400"
      )}>
        {value}
      </p>
      <p className="text-sm text-muted-foreground/60">
        {subtext}
      </p>
    </div>
  );
}

interface MetricsGridProps {
  openPositions: number;
  marginUsed: number;
  volume30d: number;
  trades30d: number;
  pnl30d: number;
  pnlPercent30d: number;
  winRate: number;
  wins: number;
  totalTrades: number;
  isLoading?: boolean;
}

export function MetricsGrid({
  openPositions,
  marginUsed,
  volume30d,
  trades30d,
  pnl30d,
  pnlPercent30d,
  winRate,
  wins,
  totalTrades,
  isLoading = false,
}: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Open Positions"
        value={formatNumber(openPositions)}
        subtext={`${formatUsd(marginUsed, true)} margin used`}
        isLoading={isLoading}
      />
      
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={`${formatNumber(trades30d)} trades`}
        isLoading={isLoading}
      />
      
      <MetricCard
        label="30D PnL"
        value={`${pnl30d >= 0 ? '+' : ''}${formatUsd(pnl30d, true)}`}
        subtext={formatPercent(pnlPercent30d) + ' return'}
        isPositive={pnl30d >= 0}
        isLoading={isLoading}
      />
      
      <MetricCard
        label="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        subtext={`${wins}/${totalTrades} wins`}
        isLoading={isLoading}
      />
    </div>
  );
}
