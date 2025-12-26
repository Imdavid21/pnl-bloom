/**
 * Hero Stats Component - Hyperliquid Design
 * Compact, information-dense hero section
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
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
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="p-5 space-y-4">
      {/* Total Value + 30d Change */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium">
          Total Position Value
        </span>
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums animate-count-up">
          {formatUsd(totalValue)}
        </span>
        
        {/* 30d Change */}
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPositive ? "text-profit" : "text-destructive"
        )}>
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span className="tabular-nums">
            {isPositive ? '+' : ''}{formatUsd(pnl30d)} ({formatPercent(pnlPercent30d)}) 30d
          </span>
        </div>
      </div>
      
      {/* Asset Distribution Bar */}
      {address && !positionsLoading && segments.length > 0 && (
        <div className="space-y-2.5">
          {/* Stacked Bar */}
          <div className="h-2 w-full rounded-full overflow-hidden bg-muted/20 flex">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="h-full transition-all hover:opacity-80 first:rounded-l-full last:rounded-r-full"
                style={{ 
                  width: `${segment.percentage}%`, 
                  backgroundColor: segment.color,
                  minWidth: segment.percentage > 0 ? '4px' : '0'
                }}
                title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="font-medium tabular-nums">{segment.percentage.toFixed(0)}%</span>
                <span>{segment.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Risk Summary */}
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
