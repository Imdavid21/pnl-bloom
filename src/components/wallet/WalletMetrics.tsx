/**
 * Wallet Metrics - Terminal style metric cards (without positions)
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatNumber } from '@/lib/formatters';

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
  volume30d: number;
  trades30d: number;
  firstSeen: Date | null;
  totalTrades: number;
  winRate?: number;
}

function formatAccountAge(firstSeen: Date | null): { value: string; subtext: string } {
  if (!firstSeen) {
    return { value: '—', subtext: 'No history' };
  }
  
  const now = new Date();
  const diffMs = now.getTime() - firstSeen.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) {
    return { value: '<1 day', subtext: 'New account' };
  } else if (diffDays < 30) {
    return { value: `${diffDays}d`, subtext: 'Account age' };
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    return { 
      value: `${months}mo`, 
      subtext: remainingDays > 0 ? `${remainingDays}d ago` : 'Account age'
    };
  } else {
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return { 
      value: `${years}y ${months}mo`, 
      subtext: 'Account age'
    };
  }
}

export function WalletMetrics({
  volume30d,
  trades30d,
  firstSeen,
  totalTrades,
  winRate = 0,
}: WalletMetricsProps) {
  const accountAge = formatAccountAge(firstSeen);
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={`${formatNumber(trades30d)} trades`}
      />
      
      <MetricCard
        label="Win Rate"
        value={winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}
        subtext={totalTrades > 0 ? `${formatNumber(totalTrades)} total` : 'No trades'}
      />
      
      <MetricCard
        label="Account Age"
        value={accountAge.value}
        subtext={accountAge.subtext}
      />
    </div>
  );
}
