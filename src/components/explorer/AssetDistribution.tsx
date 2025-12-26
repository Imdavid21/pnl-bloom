/**
 * Asset Distribution Section
 * Visual breakdown of assets across chains + Risk Summary + Analytics CTA
 */

import { useMemo } from 'react';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { useAssetDistribution } from '@/hooks/useAssetDistribution';
import { DistributionChart } from './DistributionChart';
import { RiskSummaryCard } from './RiskSummaryCard';
import { AnalyticsCTA } from './AnalyticsCTA';
import { detectRisks, hasHighRiskPositions } from '@/lib/risk-detector';
import { selectCTA } from '@/lib/cta-selector';
import { Skeleton } from '@/components/ui/skeleton';

interface AssetDistributionProps {
  address: string;
  winRate?: number;
  pnl30d?: number;
  trades30d?: number;
}

export function AssetDistribution({ 
  address,
  winRate = 0,
  pnl30d = 0,
  trades30d = 0,
}: AssetDistributionProps) {
  const { data: positions, isLoading } = useUnifiedPositions(address);
  const { segments, insights, totalValue } = useAssetDistribution(positions);

  // Detect risks
  const riskAnalysis = useMemo(() => {
    if (!positions) return { hasRisk: false, alerts: [], overallSeverity: 'none' as const };
    return detectRisks(positions, address);
  }, [positions, address]);

  // Select appropriate CTA
  const ctaConfig = useMemo(() => {
    const hasHighRisk = positions ? hasHighRiskPositions(positions) : false;
    return selectCTA({
      winRate,
      pnl30d,
      trades30d,
      hasHighRisk,
      address,
    });
  }, [winRate, pnl30d, trades30d, positions, address]);

  const handleSegmentClick = (key: string) => {
    // Scroll to relevant section
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

  // Don't show if no data at all
  if (!isLoading && totalValue === 0 && segments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Asset Distribution */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Asset Distribution</h2>
          <p className="text-sm text-muted-foreground/60">
            Where your assets are allocated
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ) : (
          <>
            <DistributionChart 
              segments={segments} 
              onSegmentClick={handleSegmentClick}
            />
            
            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-1 pt-2">
                {insights.map((insight, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    {insight}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Divider */}
      {riskAnalysis.hasRisk && (
        <div className="border-t border-border/30" />
      )}

      {/* Risk Summary */}
      {!isLoading && riskAnalysis.hasRisk && (
        <RiskSummaryCard analysis={riskAnalysis} address={address} />
      )}

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Analytics CTA */}
      {!isLoading && (
        <AnalyticsCTA config={ctaConfig} address={address} />
      )}
    </div>
  );
}
