/**
 * Wallet Metrics - Terminal style metric cards
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatNumber } from '@/lib/wallet-aggregator';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | null;
}

function MetricCard({ label, value, subtext, trend }: MetricCardProps) {
  return (
    <div className="panel p-4 group hover:border-primary/30 transition-colors">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className={cn(
        "text-xl font-mono font-semibold tabular-nums",
        trend === 'up' && "text-up",
        trend === 'down' && "text-down",
        !trend && "text-foreground"
      )}>
        {value}
      </p>
      {subtext && (
        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{subtext}</p>
      )}
    </div>
  );
}

interface WalletMetricsProps {
  openPositions: number;
  marginUsed: number;
  volume30d: number;
  trades30d: number;
  pnl30d: number;
  winRate: number;
  wins: number;
  totalTrades: number;
}

export function WalletMetrics({
  openPositions,
  marginUsed,
  volume30d,
  trades30d,
  pnl30d,
  winRate,
  wins,
  totalTrades,
}: WalletMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        label="Positions"
        value={formatNumber(openPositions)}
        subtext={`${formatUsd(marginUsed, true)} margin`}
      />
      
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={`${formatNumber(trades30d)} trades`}
      />
      
      <MetricCard
        label="30D PnL"
        value={`${pnl30d >= 0 ? '+' : ''}${formatUsd(pnl30d, true)}`}
        trend={pnl30d >= 0 ? 'up' : 'down'}
      />
      
      <MetricCard
        label="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        subtext={`${wins}/${totalTrades} wins`}
      />
    </div>
  );
}