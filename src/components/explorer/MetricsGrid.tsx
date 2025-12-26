/**
 * Metrics Grid Component - Hyperliquid Design
 * High information density, compact panels
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatNumber, formatPercent } from '@/lib/wallet-aggregator';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, Percent, Layers, DollarSign } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  isPositive?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, subtext, isPositive, isLoading, icon }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="panel p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }
  
  return (
    <div className="panel p-4 space-y-1 group hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
          {label}
        </p>
        {icon && (
          <span className="text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">
            {icon}
          </span>
        )}
      </div>
      <p className={cn(
        "text-xl font-semibold tracking-tight tabular-nums",
        isPositive === true && "text-profit",
        isPositive === false && "text-destructive"
      )}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground/50">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Open Positions"
        value={formatNumber(openPositions)}
        subtext={`${formatUsd(marginUsed, true)} margin`}
        isLoading={isLoading}
        icon={<Layers className="h-3.5 w-3.5" />}
      />
      
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={`${formatNumber(trades30d)} trades`}
        isLoading={isLoading}
        icon={<Activity className="h-3.5 w-3.5" />}
      />
      
      <MetricCard
        label="30D PnL"
        value={`${pnl30d >= 0 ? '+' : ''}${formatUsd(pnl30d, true)}`}
        subtext={`${formatPercent(pnlPercent30d)} return`}
        isPositive={pnl30d >= 0}
        isLoading={isLoading}
        icon={pnl30d >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      />
      
      <MetricCard
        label="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        subtext={`${wins}/${totalTrades} wins`}
        isLoading={isLoading}
        icon={<Percent className="h-3.5 w-3.5" />}
      />
    </div>
  );
}
