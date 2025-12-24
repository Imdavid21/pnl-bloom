
export interface RiskFactor {
    id: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
}

export interface RiskAnalysisResult {
    score: number; // 0-100, where 100 is perfectly safe
    factors: RiskFactor[];
    level: 'Safe' | 'Moderate' | 'High' | 'Critical';
}

interface PositionInput {
    effective_leverage: number;
    liq_score: number; // 0-1, where 1 is liquidated
    margin_used: number;
    position_value: number;
    unrealized_pnl: number;
    market: string;
}

export function calculateAccountHealth(
    positions: PositionInput[],
    accountValue: number
): RiskAnalysisResult {
    let score = 100;
    const factors: RiskFactor[] = [];

    if (!positions || positions.length === 0) {
        return {
            score: 100,
            factors: [],
            level: 'Safe'
        };
    }

    // 1. Leverage Risk (Max 40 points impact)
    const totalNotional = positions.reduce((sum, p) => sum + Math.abs(p.position_value), 0);
    const accountLeverage = totalNotional / accountValue;

    if (accountLeverage > 20) {
        score -= 40;
        factors.push({
            id: 'extreme_leverage',
            severity: 'high',
            title: 'Extreme Account Leverage',
            description: `Total account leverage is ${accountLeverage.toFixed(1)}x, significantly amplifying risk.`
        });
    } else if (accountLeverage > 10) {
        score -= 20;
        factors.push({
            id: 'high_leverage',
            severity: 'medium',
            title: 'High Account Leverage',
            description: `Total notional exposure exceeds 10x equity (${accountLeverage.toFixed(1)}x).`
        });
    } else if (accountLeverage > 5) {
        score -= 5;
    }

    // 2. Liquidation Proximity (Max 40 points impact)
    const maxLiqScore = Math.max(...positions.map(p => p.liq_score));

    if (maxLiqScore > 0.8) {
        score -= 40;
        factors.push({
            id: 'imminent_liquidation',
            severity: 'high',
            title: 'Liquidation Imminent',
            description: 'One or more positions are extremely close to liquidation price.'
        });
    } else if (maxLiqScore > 0.6) {
        score -= 20;
        factors.push({
            id: 'liquidation_risk',
            severity: 'medium',
            title: 'High Liquidation Risk',
            description: 'Positions are approaching liquidation thresholds.'
        });
    }

    // 3. Concentration Risk (Max 20 points impact)
    if (positions.length > 0) {
        const largestPosition = Math.max(...positions.map(p => Math.abs(p.position_value)));
        const concentration = largestPosition / totalNotional;

        if (positions.length > 1 && concentration > 0.8) {
            score -= 15;
            factors.push({
                id: 'concentration',
                severity: 'medium',
                title: 'Concentrated Exposure',
                description: `${(concentration * 100).toFixed(0)}% of your exposure is in a single position.`
            });
        }
    }

    // 4. Drawdown check (Warning only)
    const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
    const currentDrawdown = totalUnrealized < 0 ? Math.abs(totalUnrealized) / accountValue : 0;

    if (currentDrawdown > 0.25) {
        score -= 10;
        factors.push({
            id: 'drawdown',
            severity: 'high',
            title: 'Significant Drawdown',
            description: `Current open positions are down ${(currentDrawdown * 100).toFixed(1)}% of account value.`
        });
    }

    // Clamping
    score = Math.max(0, Math.min(100, score));

    let level: RiskAnalysisResult['level'] = 'Safe';
    if (score < 50) level = 'Critical';
    else if (score < 70) level = 'High';
    else if (score < 85) level = 'Moderate';

    return { score, factors, level };
}
