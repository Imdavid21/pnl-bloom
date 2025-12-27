/**
 * Wallet Metrics - Terminal style metric cards with domain breakdown
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatNumber } from '@/lib/formatters';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | null;
  breakdown?: { label: string; value: string; variant?: 'hypercore' | 'hyperevm' }[];
}

function MetricCard({ label, value, subtext, trend, breakdown }: MetricCardProps) {
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
      {breakdown && breakdown.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/30">
          {breakdown.map((item, idx) => (
            <span 
              key={idx}
              className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded",
                item.variant === 'hypercore' && "bg-prediction/10 text-prediction border border-prediction/20",
                item.variant === 'hyperevm' && "bg-perpetual/10 text-perpetual border border-perpetual/20",
                !item.variant && "bg-muted/50 text-muted-foreground"
              )}
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
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
  // Domain-specific data
  hypercoreStats?: {
    volume: number;
    trades: number;
    positions: number;
  };
  hyperevmStats?: {
    volume: number;
    txCount: number;
    tokenCount: number;
  };
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
  hypercoreStats,
  hyperevmStats,
}: WalletMetricsProps) {
  const accountAge = formatAccountAge(firstSeen);
  
  // Build volume breakdown
  const volumeBreakdown: { label: string; value: string; variant?: 'hypercore' | 'hyperevm' }[] = [];
  if (hypercoreStats && hypercoreStats.volume > 0) {
    volumeBreakdown.push({ label: 'HC', value: formatUsd(hypercoreStats.volume, true), variant: 'hypercore' });
  }
  if (hyperevmStats && hyperevmStats.volume > 0) {
    volumeBreakdown.push({ label: 'EVM', value: formatUsd(hyperevmStats.volume, true), variant: 'hyperevm' });
  }
  
  // Build trades breakdown
  const tradesBreakdown: { label: string; value: string; variant?: 'hypercore' | 'hyperevm' }[] = [];
  if (hypercoreStats && hypercoreStats.trades > 0) {
    tradesBreakdown.push({ label: 'HC', value: `${formatNumber(hypercoreStats.trades)}`, variant: 'hypercore' });
  }
  if (hyperevmStats && hyperevmStats.txCount > 0) {
    tradesBreakdown.push({ label: 'EVM', value: `${formatNumber(hyperevmStats.txCount)} txs`, variant: 'hyperevm' });
  }
  
  // Combined subtext
  const tradesSubtext = totalTrades > 0 
    ? `${formatNumber(totalTrades)} total trades` 
    : trades30d > 0 
      ? `${formatNumber(trades30d)} trades`
      : hyperevmStats?.txCount 
        ? `${formatNumber(hyperevmStats.txCount)} txs`
        : 'No trades';
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricCard
        label="30D Volume"
        value={formatUsd(volume30d, true)}
        subtext={tradesSubtext}
        breakdown={volumeBreakdown.length > 1 ? volumeBreakdown : undefined}
      />
      
      <MetricCard
        label="Win Rate"
        value={winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}
        subtext={totalTrades > 0 ? `${formatNumber(totalTrades)} total` : 'No trades'}
        breakdown={hypercoreStats?.positions ? [
          { label: 'Positions', value: `${hypercoreStats.positions}`, variant: 'hypercore' }
        ] : undefined}
      />
      
      <MetricCard
        label="Account Age"
        value={accountAge.value}
        subtext={accountAge.subtext}
        breakdown={hyperevmStats?.tokenCount ? [
          { label: 'Tokens', value: `${hyperevmStats.tokenCount}`, variant: 'hyperevm' }
        ] : undefined}
      />
    </div>
  );
}