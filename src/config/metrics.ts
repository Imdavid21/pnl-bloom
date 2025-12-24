
export interface MetricConfig {
    tier: 1 | 2 | 3;
    visibility: 'always' | 'expandable' | 'expert_mode';
    label: string;
    description: string;
    format: (value: number) => string;
    benchmark?: number; // Industry average
}

export const WALLET_METRICS: Record<string, MetricConfig> = {
    // TIER 1 - Always Visible
    total_pnl: {
        tier: 1,
        visibility: 'always',
        label: 'Total PnL',
        description: 'Net profit/loss including fees and funding',
        format: (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    win_rate: {
        tier: 1,
        visibility: 'always',
        label: 'Win Rate',
        description: 'Percentage of profitable trades',
        format: (v) => `${v.toFixed(1)}%`,
        benchmark: 55,
    },
    total_volume: {
        tier: 1,
        visibility: 'always',
        label: 'Volume',
        description: 'Total independent trading volume',
        format: (v) => `$${(v / 1000000).toFixed(2)}M`,
    },

    // TIER 2 - Expandable
    funding_pnl: {
        tier: 2,
        visibility: 'expandable',
        label: 'Net Funding',
        description: 'Cumulative funding payments received/paid',
        format: (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    total_trades: {
        tier: 2,
        visibility: 'expandable',
        label: 'Total Trades',
        description: 'Number of closed trading positions',
        format: (v) => v.toLocaleString(),
    },
    profit_factor: {
        tier: 2,
        visibility: 'expandable',
        label: 'Profit Factor',
        description: 'Gross Profit divided by Gross Loss',
        format: (v) => v.toFixed(2),
        benchmark: 1.5,
    },

    // TIER 3 - Expert Mode
    avg_win: {
        tier: 3,
        visibility: 'expert_mode',
        label: 'Avg Win',
        description: 'Average profit per winning trade',
        format: (v) => `$${v.toLocaleString()}`,
    },
    avg_loss: {
        tier: 3,
        visibility: 'expert_mode',
        label: 'Avg Loss',
        description: 'Average loss per losing trade',
        format: (v) => `$${v.toLocaleString()}`,
    },
    sharpe_ratio: {
        tier: 3,
        visibility: 'expert_mode',
        label: 'Sharpe Ratio',
        description: 'Risk-adjusted return metric',
        format: (v) => v.toFixed(2),
    }
};
