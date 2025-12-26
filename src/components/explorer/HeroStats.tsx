/**
 * Hero Stats Component
 * Shows total account value prominently with 30d change + Asset Distribution
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/wallet-aggregator';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { useAssetDistribution } from '@/hooks/useAssetDistribution';
import { DistributionChart } from './DistributionChart';
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
  const { segments, insights } = useAssetDistribution(positions);
  
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
      <div className="flex flex-col items-center gap-3 py-8">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-7 w-40" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Total Value + 30d Change */}
      <div className="flex flex-col items-center gap-2 py-4">
        {/* Total Value - Hero */}
        <span className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          {formatUsd(totalValue)}
        </span>
        
        {/* 30d Change */}
        <div className={cn(
          "flex items-center gap-1.5 text-lg md:text-xl font-medium",
          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>
          {isPositive ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
          <span>
            {isPositive ? '+' : ''}{formatUsd(pnl30d)} ({formatPercent(pnlPercent30d)})
          </span>
        </div>
      </div>
      
      {/* Asset Distribution */}
      {address && (
        <div className="space-y-4">
          <DistributionChart 
            segments={segments} 
            isLoading={positionsLoading}
            onSegmentClick={handleSegmentClick}
            compact
          />
          
          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-1">
              {insights.map((insight, index) => (
                <p key={index} className="text-xs text-muted-foreground text-center">
                  {insight}
                </p>
              ))}
            </div>
          )}
          
          {/* Risk Summary - Collapsible */}
          {riskAnalysis.hasRisk && (
            <RiskSummaryCard 
              analysis={riskAnalysis} 
              address={address} 
              defaultOpen={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
