/**
 * Risk Detector
 * Identify risk conditions in wallet positions
 */

import type { UnifiedPositions } from './position-aggregator';

export interface RiskAlert {
  type: 'liquidation' | 'health_factor' | 'concentration' | 'leverage';
  severity: 'low' | 'medium' | 'high';
  message: string;
  link?: string;
}

export interface RiskAnalysis {
  hasRisk: boolean;
  alerts: RiskAlert[];
  overallSeverity: 'low' | 'medium' | 'high' | 'none';
}

/**
 * Detect risk conditions from unified positions
 */
export function detectRisks(positions: UnifiedPositions, address: string): RiskAnalysis {
  const alerts: RiskAlert[] = [];

  // Check for high liquidation risk positions
  positions.perps.forEach((pos) => {
    if (pos.liquidationRisk >= 70) {
      alerts.push({
        type: 'liquidation',
        severity: 'high',
        message: `${pos.market} ${pos.side} position: ${Math.round(pos.liquidationRisk)}% liquidation risk`,
        link: `/explorer/market/${pos.market}`,
      });
    } else if (pos.liquidationRisk >= 50) {
      alerts.push({
        type: 'liquidation',
        severity: 'medium',
        message: `${pos.market} ${pos.side} position: ${Math.round(pos.liquidationRisk)}% liquidation risk`,
        link: `/explorer/market/${pos.market}`,
      });
    }
  });

  // Check lending health factor
  const suppliedTotal = positions.lending
    .filter(l => l.type === 'supplied')
    .reduce((sum, l) => sum + l.valueUsd, 0);
  const borrowedTotal = positions.lending
    .filter(l => l.type === 'borrowed')
    .reduce((sum, l) => sum + l.valueUsd, 0);

  if (borrowedTotal > 0 && suppliedTotal > 0) {
    const healthFactor = suppliedTotal / borrowedTotal;
    if (healthFactor < 1.5) {
      alerts.push({
        type: 'health_factor',
        severity: healthFactor < 1.2 ? 'high' : 'medium',
        message: `Lending health factor: ${healthFactor.toFixed(2)} (recommended: >1.5)`,
      });
    }
  }

  // Check for borrowed > 50% of supplied
  if (suppliedTotal > 0 && borrowedTotal > suppliedTotal * 0.5) {
    alerts.push({
      type: 'leverage',
      severity: 'medium',
      message: `High lending leverage: ${((borrowedTotal / suppliedTotal) * 100).toFixed(0)}% utilization`,
    });
  }

  // Check portfolio concentration
  const totalValue = positions.summary.totalValue;
  if (totalValue > 0) {
    const maxPosition = positions.perps.reduce(
      (max, p) => p.sizeNotional > max.value ? { market: p.market, value: p.sizeNotional } : max,
      { market: '', value: 0 }
    );

    if (maxPosition.value > totalValue * 0.6) {
      alerts.push({
        type: 'concentration',
        severity: 'medium',
        message: `Portfolio concentration: ${Math.round((maxPosition.value / totalValue) * 100)}% in ${maxPosition.market}`,
        link: `/explorer/market/${maxPosition.market}`,
      });
    }
  }

  // Determine overall severity
  let overallSeverity: 'low' | 'medium' | 'high' | 'none' = 'none';
  if (alerts.some(a => a.severity === 'high')) {
    overallSeverity = 'high';
  } else if (alerts.some(a => a.severity === 'medium')) {
    overallSeverity = 'medium';
  } else if (alerts.length > 0) {
    overallSeverity = 'low';
  }

  return {
    hasRisk: alerts.length > 0,
    alerts: alerts.slice(0, 3), // Max 3 alerts
    overallSeverity,
  };
}

/**
 * Check if any position has high risk
 */
export function hasHighRiskPositions(positions: UnifiedPositions): boolean {
  return positions.perps.some(p => p.liquidationRisk >= 70);
}
