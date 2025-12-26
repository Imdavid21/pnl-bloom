/**
 * Wallet Metrics - Clean metric cards grid
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUsd, formatNumber } from '@/lib/wallet-aggregator';
import { TrendingUp, TrendingDown, Activity, Percent, Layers } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | null;
  icon: React.ReactNode;
}

function MetricCard({ label, value, subtext, trend, icon }: MetricCardProps) {
  return (
    <Card className="group hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            {icon}
          </span>
        </div>
        <p className={cn(
          "text-xl font-semibold tabular-nums",
          trend === 'up' && "text-green-500",
          trend === 'down' && "text-red-500"
        )}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="Positions"
        value={formatNumber(openPositions)}
        subtext={`${formatUsd(marginUsed, true)} margin`}
        icon={<Layers className="h-4 w-4" />}
      />
      
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={`${formatNumber(trades30d)} trades`}
        icon={<Activity className="h-4 w-4" />}
      />
      
      <MetricCard
        label="30D PnL"
        value={`${pnl30d >= 0 ? '+' : ''}${formatUsd(pnl30d, true)}`}
        trend={pnl30d >= 0 ? 'up' : 'down'}
        icon={pnl30d >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      />
      
      <MetricCard
        label="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        subtext={`${wins}/${totalTrades} wins`}
        icon={<Percent className="h-4 w-4" />}
      />
    </div>
  );
}
