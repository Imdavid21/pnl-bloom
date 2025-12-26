/**
 * Positions Summary Card
 * Shows total exposure and breakdown with risk warning
 */

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { PositionsSummary } from '@/lib/position-aggregator';

interface PositionsSummaryProps {
  summary: PositionsSummary | null;
  isLoading?: boolean;
}

function formatUsd(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function BreakdownBar({ 
  perps, 
  spot, 
  lending, 
  lp 
}: { 
  perps: number; 
  spot: number; 
  lending: number; 
  lp: number;
}) {
  const total = perps + spot + lending + lp;
  if (total === 0) return null;

  const segments = [
    { key: 'perps', value: perps, color: 'bg-blue-500' },
    { key: 'spot', value: spot, color: 'bg-emerald-500' },
    { key: 'lending', value: lending, color: 'bg-amber-500' },
    { key: 'lp', value: lp, color: 'bg-purple-500' },
  ].filter(s => s.value > 0);

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/30">
      {segments.map((segment) => (
        <div
          key={segment.key}
          className={cn('h-full transition-all', segment.color)}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function PositionsSummary({ summary, isLoading }: PositionsSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-card/40 p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-2 w-full" />
        <div className="flex gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  if (!summary || summary.totalValue === 0) {
    return null;
  }

  const { breakdown, percentages, highestRisk } = summary;
  const showRiskWarning = highestRisk && highestRisk.riskScore >= 70;

  return (
    <div className="rounded-xl bg-card/40 p-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-medium">
          Total Position Value
        </p>
        <p className="text-3xl font-bold tracking-tight">
          {formatUsd(summary.totalValue)}
        </p>
      </div>

      {/* Breakdown Bar */}
      <BreakdownBar
        perps={percentages.perps}
        spot={percentages.spot}
        lending={percentages.lendingNet}
        lp={percentages.lp}
      />

      {/* Breakdown Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {breakdown.perps > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Perps</span>
            <span className="font-medium">{formatUsd(breakdown.perps, true)}</span>
            <span className="text-muted-foreground/50">({percentages.perps.toFixed(0)}%)</span>
          </div>
        )}
        {breakdown.spot > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Spot</span>
            <span className="font-medium">{formatUsd(breakdown.spot, true)}</span>
            <span className="text-muted-foreground/50">({percentages.spot.toFixed(0)}%)</span>
          </div>
        )}
        {breakdown.lendingNet !== 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Lending</span>
            <span className="font-medium">{formatUsd(breakdown.lendingNet, true)}</span>
            <span className="text-muted-foreground/50">({percentages.lendingNet.toFixed(0)}%)</span>
          </div>
        )}
        {breakdown.lp > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">LP</span>
            <span className="font-medium">{formatUsd(breakdown.lp, true)}</span>
            <span className="text-muted-foreground/50">({percentages.lp.toFixed(0)}%)</span>
          </div>
        )}
      </div>

      {/* High Risk Warning */}
      {showRiskWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            High risk: {highestRisk.market} at {Math.round(highestRisk.riskScore)}% liquidation risk
          </span>
        </div>
      )}
    </div>
  );
}
