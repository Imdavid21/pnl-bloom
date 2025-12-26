/**
 * Distribution Chart
 * Horizontal stacked bar showing asset allocation
 */

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface DistributionSegment {
  key: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
  assetBreakdown?: string;
}

interface DistributionChartProps {
  segments: DistributionSegment[];
  isLoading?: boolean;
  onSegmentClick?: (key: string) => void;
  compact?: boolean;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DistributionChart({ 
  segments, 
  isLoading,
  onSegmentClick,
  compact = false,
}: DistributionChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    );
  }

  const visibleSegments = segments.filter(s => s.percentage > 0);
  const totalValue = segments.reduce((sum, s) => sum + s.value, 0);

  if (visibleSegments.length === 0 || totalValue === 0) {
    return (
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-muted/30 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">100% Cash</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Stacked Bar */}
      <div className={cn("rounded-lg overflow-hidden flex bg-muted/20", compact ? "h-8" : "h-10")}>
        {visibleSegments.map((segment) => (
          <button
            key={segment.key}
            className={cn(
              'h-full flex items-center justify-center transition-opacity hover:opacity-90',
              onSegmentClick && 'cursor-pointer'
            )}
            style={{ 
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
            }}
            onClick={() => onSegmentClick?.(segment.key)}
            title={`${segment.label}: ${formatUsd(segment.value)} (${segment.percentage.toFixed(1)}%)${segment.assetBreakdown ? ` — ${segment.assetBreakdown}` : ''}`}
          >
            {segment.percentage >= 10 && (
              <span className={cn("font-medium text-white truncate px-1", compact ? "text-xs" : "text-xs")}>
                {segment.percentage >= 20 ? segment.label : ''} {Math.round(segment.percentage)}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Legend with asset breakdown */}
      <div className={cn(
        "grid gap-x-4 gap-y-1.5",
        compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
      )}>
        {visibleSegments.map((segment) => (
          <button
            key={segment.key}
            className={cn(
              'flex items-center gap-2 text-left',
              compact ? "text-xs" : "text-sm",
              onSegmentClick && 'hover:opacity-80 cursor-pointer'
            )}
            onClick={() => onSegmentClick?.(segment.key)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}:</span>
            <span className="font-medium">{formatUsd(segment.value)}</span>
            <span className="text-muted-foreground/60">({segment.percentage.toFixed(0)}%)</span>
            {segment.assetBreakdown && (
              <span className="text-muted-foreground/50 truncate max-w-[120px]">
                — {segment.assetBreakdown}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
