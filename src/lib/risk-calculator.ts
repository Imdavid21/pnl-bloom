/**
 * Risk Calculator
 * Calculate liquidation risk scores for positions
 */

export interface RiskPosition {
  leverage: number;
  marginUsed: number;
  accountValue: number;
  entryPrice: number;
  currentPrice: number;
  side: 'long' | 'short';
}

/**
 * Calculate liquidation risk score (0-100)
 * Higher score = higher risk
 */
export function calculateLiquidationRisk(position: RiskPosition): number {
  // Leverage component (max 30 points)
  // 10x leverage = 30 points, 1x = 3 points
  const leverageScore = Math.min(30, (position.leverage / 10) * 30);
  
  // Margin ratio component (max 40 points)
  // If margin used is high relative to account value, higher risk
  const marginRatio = position.accountValue > 0 
    ? position.marginUsed / position.accountValue 
    : 0;
  const marginScore = Math.min(40, marginRatio * 50);
  
  // Price proximity component (max 30 points)
  // How close is current price to liquidation price?
  const priceDistance = calculatePriceDistanceToLiq(position);
  const priceScore = Math.min(30, (1 - priceDistance) * 30);
  
  const totalScore = leverageScore + marginScore + priceScore;
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Calculate distance to liquidation as a ratio (0-1)
 * 1 = far from liquidation, 0 = at liquidation
 */
function calculatePriceDistanceToLiq(position: RiskPosition): number {
  if (position.entryPrice <= 0 || position.leverage <= 0) return 1;
  
  // Simplified liquidation calculation
  // For longs: liqPrice = entryPrice * (1 - 1/leverage * 0.9)
  // For shorts: liqPrice = entryPrice * (1 + 1/leverage * 0.9)
  const maintenanceBuffer = 0.9; // 90% of margin before liquidation
  
  let liqPrice: number;
  if (position.side === 'long') {
    liqPrice = position.entryPrice * (1 - (1 / position.leverage) * maintenanceBuffer);
    // Distance for longs: how far current price is above liq price
    const maxDistance = position.entryPrice - liqPrice;
    const currentDistance = position.currentPrice - liqPrice;
    return maxDistance > 0 ? Math.max(0, Math.min(1, currentDistance / maxDistance)) : 0;
  } else {
    liqPrice = position.entryPrice * (1 + (1 / position.leverage) * maintenanceBuffer);
    // Distance for shorts: how far current price is below liq price
    const maxDistance = liqPrice - position.entryPrice;
    const currentDistance = liqPrice - position.currentPrice;
    return maxDistance > 0 ? Math.max(0, Math.min(1, currentDistance / maxDistance)) : 0;
  }
}

/**
 * Get risk level category
 */
export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

/**
 * Get risk color class
 */
export function getRiskColorClass(score: number): string {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low': return 'text-emerald-500';
    case 'medium': return 'text-amber-500';
    case 'high': return 'text-red-500';
  }
}

/**
 * Get risk dot color class
 */
export function getRiskDotClass(score: number): string {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'high': return 'bg-red-500';
  }
}
