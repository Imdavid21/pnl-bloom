import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface WalletStatsGridProps {
  accountValue: number;
  pnl30d: number;
  openPositions: number;
  marginUsed: number;
  volume30d: number;
  trades30d: number;
  firstSeen: string | null;
  isLoading?: boolean;
}

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  isLoading,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | null;
  isLoading?: boolean;
}) {
  return (
    <Card className="bg-card/50 border-border/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <span className="text-xl font-semibold text-foreground">{value}</span>
            )}
            {subtitle && !isLoading && (
              <span className={cn(
                "text-xs",
                trend === 'up' && "text-green-600 dark:text-green-400",
                trend === 'down' && "text-red-600 dark:text-red-400",
                !trend && "text-muted-foreground"
              )}>
                {trend === 'up' && '↑ '}
                {trend === 'down' && '↓ '}
                {subtitle}
              </span>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            "bg-muted/50"
          )}>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WalletStatsGrid({
  accountValue,
  pnl30d,
  openPositions,
  marginUsed,
  volume30d,
  trades30d,
  firstSeen,
  isLoading,
}: WalletStatsGridProps) {
  // Format first seen as relative time
  const firstSeenText = firstSeen
    ? formatDistanceToNow(new Date(firstSeen), { addSuffix: true })
    : 'Unknown';

  // Determine PnL trend
  const pnlTrend = pnl30d > 0 ? 'up' : pnl30d < 0 ? 'down' : null;
  const pnlText = pnl30d >= 0 
    ? `+${formatUsd(pnl30d)} (30d)` 
    : `${formatUsd(pnl30d)} (30d)`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Account Value"
        value={formatUsd(accountValue)}
        subtitle={pnlText}
        icon={Wallet}
        trend={pnlTrend}
        isLoading={isLoading}
      />
      <StatCard
        label="Open Positions"
        value={openPositions.toString()}
        subtitle={marginUsed > 0 ? `${formatUsd(marginUsed)} margin` : 'No margin used'}
        icon={Layers}
        isLoading={isLoading}
      />
      <StatCard
        label="30d Volume"
        value={formatUsd(volume30d)}
        subtitle={`${trades30d.toLocaleString()} trades`}
        icon={BarChart3}
        isLoading={isLoading}
      />
      <StatCard
        label="First Seen"
        value={firstSeenText}
        icon={Calendar}
        isLoading={isLoading}
      />
    </div>
  );
}
