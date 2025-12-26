/**
 * Asset Distribution Hook
 * Calculate distribution segments from unified positions
 */

import { useMemo } from 'react';
import type { UnifiedPositions } from '@/lib/position-aggregator';
import type { DistributionSegment } from '@/components/explorer/DistributionChart';

// Color palette for distribution segments
const COLORS = {
  hypercore_perps: '#3B82F6', // Blue
  hypercore_spot: '#06B6D4',  // Cyan
  hyperevm_tokens: '#8B5CF6', // Purple
  lending_supplied: '#10B981', // Green
  lending_borrowed: '#EF4444', // Red (negative)
  lp_positions: '#F59E0B',     // Orange
};

export function useAssetDistribution(positions: UnifiedPositions | null | undefined) {
  return useMemo(() => {
    if (!positions) {
      return {
        segments: [],
        insights: [],
        totalValue: 0,
      };
    }

    const { summary, perps, spot, lending, lp } = positions;
    const totalValue = summary.totalValue;

    if (totalValue === 0) {
      return {
        segments: [],
        insights: [],
        totalValue: 0,
      };
    }

    // Calculate values
    const perpValue = perps.reduce((sum, p) => sum + p.sizeNotional, 0);
    const spotValue = spot.reduce((sum, s) => sum + s.valueUsd, 0);
    const suppliedValue = lending.filter(l => l.type === 'supplied').reduce((sum, l) => sum + l.valueUsd, 0);
    const borrowedValue = lending.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.valueUsd, 0);
    const lendingNet = suppliedValue - borrowedValue;
    const lpValue = lp.reduce((sum, l) => sum + l.positionValue, 0);

    // Build segments
    const segments: DistributionSegment[] = [];

    if (perpValue > 0) {
      segments.push({
        key: 'perps',
        label: 'Perps',
        value: perpValue,
        percentage: (perpValue / totalValue) * 100,
        color: COLORS.hypercore_perps,
      });
    }

    if (spotValue > 0) {
      segments.push({
        key: 'spot',
        label: 'Spot',
        value: spotValue,
        percentage: (spotValue / totalValue) * 100,
        color: COLORS.hypercore_spot,
      });
    }

    if (lendingNet > 0) {
      segments.push({
        key: 'lending',
        label: 'Lending',
        value: lendingNet,
        percentage: (lendingNet / totalValue) * 100,
        color: COLORS.lending_supplied,
      });
    }

    if (lpValue > 0) {
      segments.push({
        key: 'lp',
        label: 'LP',
        value: lpValue,
        percentage: (lpValue / totalValue) * 100,
        color: COLORS.lp_positions,
      });
    }

    // Sort by value descending
    segments.sort((a, b) => b.value - a.value);

    // Generate insights
    const insights: string[] = [];
    const perpPercentage = (perpValue / totalValue) * 100;
    const lpPercentage = (lpValue / totalValue) * 100;

    if (perpPercentage > 70) {
      insights.push('⚠️ High concentration in perpetual futures');
    }

    if (borrowedValue > suppliedValue) {
      insights.push('⚠️ Net borrowing position (leverage)');
    }

    if (lpPercentage > 20) {
      insights.push('💧 Significant liquidity provision');
    }

    // Check if well diversified
    const maxPercentage = Math.max(...segments.map(s => s.percentage));
    if (segments.length >= 3 && maxPercentage <= 40) {
      insights.push('✓ Well diversified across protocols');
    }

    return {
      segments,
      insights: insights.slice(0, 2), // Max 2 insights
      totalValue,
    };
  }, [positions]);
}
