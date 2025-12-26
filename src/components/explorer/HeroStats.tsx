/**
 * Hero Stats Component
 * Unified view: Total Value + Asset Distribution + Risk Analysis
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/wallet-aggregator';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { useAssetDistribution } from '@/hooks/useAssetDistribution';
import { RiskSummaryCard } from './RiskSummaryCard';
import { detectRisks } from '@/lib/risk-detector';

interface HeroStatsProps {
  totalValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  isLoading?: boolean;
  address?: string;
}

export function HeroStats({ 
  totalValue, 
  pnl30d, 
  pnlPercent30d,
  isLoading = false,
  address,
}: HeroStatsProps) {
  const isPositive = pnl30d >= 0;
  
  // Fetch positions for distribution
  const { data: positions, isLoading: positionsLoading } = useUnifiedPositions(address || '');
  const { segments } = useAssetDistribution(positions);
  
  // Detect risks
  const riskAnalysis = useMemo(() => {
    if (!positions) return { hasRisk: false, alerts: [], overallSeverity: 'none' as const };
    return detectRisks(positions, address || '');
  }, [positions, address]);
  
  const handleSegmentClick = (key: string) => {
    const sectionMap: Record<string, string> = {
      perps: 'perp-positions',
      spot: 'spot-balances',
      lending: 'lending-positions',
      lp: 'lp-positions',
    };
    
    const sectionId = sectionMap[key];
    if (sectionId) {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-full mt-4" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-5">
      {/* Total Value + 30d Change */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">
          Total Position Value
        </span>
        <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {formatUsd(totalValue)}
        </span>
        
        {/* 30d Change */}
        <div className={cn(
          "flex items-center gap-1.5 text-sm font-medium",
          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}{formatUsd(pnl30d)} ({formatPercent(pnlPercent30d)}) 30d
          </span>
        </div>
      </div>
      
      {/* Asset Distribution Bar */}
      {address && !positionsLoading && segments.length > 0 && (
        <div className="space-y-3">
          {/* Stacked Bar */}
          <div className="h-3 w-full rounded-full overflow-hidden bg-muted/30 flex">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="h-full transition-all hover:opacity-80"
                style={{ 
                  width: `${segment.percentage}%`, 
                  backgroundColor: segment.color,
                  minWidth: segment.percentage > 0 ? '4px' : '0'
                }}
                title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          
          {/* Legend with Asset Breakdown */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="font-medium">{segment.percentage.toFixed(0)}% {segment.label}</span>
                {segment.assetBreakdown && (
                  <span className="text-muted-foreground/60">({segment.assetBreakdown})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Risk Summary - Collapsible */}
      {address && riskAnalysis.hasRisk && (
        <RiskSummaryCard 
          analysis={riskAnalysis} 
          address={address} 
          defaultOpen={false}
        />
      )}
    </div>
  );
}