import { TrendingUp, TrendingDown, Target, Clock, Percent, DollarSign, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Fill {
  coin: string;
  side: string;
  sz: string;
  px: string;
  time: number;
  closedPnl: string;
  dir: string;
}

interface WalletInsightsProps {
  fills: Fill[];
  accountValue: string;
}

export function WalletInsights({ fills, accountValue }: WalletInsightsProps) {
  // Calculate trading insights
  const insights = calculateInsights(fills, accountValue);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">Trading Insights</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
          Exclusive
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Win Rate */}
        <InsightCard
          label="Win Rate"
          value={`${insights.winRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
          trend={insights.winRate >= 50 ? 'up' : 'down'}
          subtext={`${insights.wins}W / ${insights.losses}L`}
        />
        
        {/* Profit Factor */}
        <InsightCard
          label="Profit Factor"
          value={insights.profitFactor.toFixed(2)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={insights.profitFactor >= 1 ? 'up' : 'down'}
          subtext={insights.profitFactor >= 1.5 ? 'Strong' : insights.profitFactor >= 1 ? 'Positive' : 'Needs work'}
        />
        
        {/* Avg Trade Duration */}
        <InsightCard
          label="Avg Hold Time"
          value={formatDuration(insights.avgHoldTime)}
          icon={<Clock className="h-4 w-4" />}
          trend="neutral"
          subtext={insights.tradingStyle}
        />
        
        {/* Best Asset */}
        <InsightCard
          label="Best Market"
          value={insights.bestMarket || 'N/A'}
          icon={<Activity className="h-4 w-4" />}
          trend="up"
          subtext={insights.bestMarketPnl ? `+$${insights.bestMarketPnl.toFixed(0)}` : '-'}
        />
      </div>

      {/* Risk Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {/* Avg Win */}
        <InsightCard
          label="Avg Win"
          value={`$${insights.avgWin.toFixed(2)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
          subtext="per winning trade"
          small
        />
        
        {/* Avg Loss */}
        <InsightCard
          label="Avg Loss"
          value={`$${Math.abs(insights.avgLoss).toFixed(2)}`}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
          subtext="per losing trade"
          small
        />
        
        {/* Risk/Reward */}
        <InsightCard
          label="Risk/Reward"
          value={`1:${insights.riskReward.toFixed(2)}`}
          icon={<Percent className="h-4 w-4" />}
          trend={insights.riskReward >= 1.5 ? 'up' : 'neutral'}
          subtext={insights.riskReward >= 2 ? 'Excellent' : insights.riskReward >= 1 ? 'Good' : 'Review sizing'}
          small
        />
        
        {/* Trade Count */}
        <InsightCard
          label="Total Trades"
          value={insights.totalTrades.toString()}
          icon={<Activity className="h-4 w-4" />}
          trend="neutral"
          subtext={`${insights.uniqueMarkets} markets`}
          small
        />
      </div>
    </div>
  );
}

interface InsightCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  subtext: string;
  small?: boolean;
}

function InsightCard({ label, value, icon, trend, subtext, small }: InsightCardProps) {
  return (
    <div className={cn(
      "rounded-lg bg-muted/30 p-3",
      small && "p-2.5"
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn(
          "p-1 rounded",
          trend === 'up' && "bg-profit-3/20 text-profit-3",
          trend === 'down' && "bg-loss-3/20 text-loss-3",
          trend === 'neutral' && "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        "font-semibold",
        small ? "text-base" : "text-lg",
        trend === 'up' && "text-profit-3",
        trend === 'down' && "text-loss-3",
        trend === 'neutral' && "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
    </div>
  );
}

function calculateInsights(fills: Fill[], accountValue: string) {
  let wins = 0;
  let losses = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  const marketPnl: Record<string, number> = {};
  const tradeTimes: number[] = [];
  const markets = new Set<string>();

  // Group fills to calculate per-trade metrics
  for (const fill of fills) {
    const pnl = parseFloat(fill.closedPnl || '0');
    markets.add(fill.coin);
    
    if (pnl > 0) {
      wins++;
      totalWinPnl += pnl;
    } else if (pnl < 0) {
      losses++;
      totalLossPnl += Math.abs(pnl);
    }

    // Track per-market PnL
    if (!marketPnl[fill.coin]) marketPnl[fill.coin] = 0;
    marketPnl[fill.coin] += pnl;

    tradeTimes.push(fill.time);
  }

  // Calculate average hold time (rough estimate from fill timestamps)
  let avgHoldTime = 0;
  if (tradeTimes.length > 1) {
    const sortedTimes = tradeTimes.sort((a, b) => a - b);
    let totalGap = 0;
    for (let i = 1; i < sortedTimes.length; i++) {
      totalGap += sortedTimes[i] - sortedTimes[i - 1];
    }
    avgHoldTime = totalGap / (sortedTimes.length - 1);
  }

  // Find best market
  let bestMarket = '';
  let bestMarketPnl = 0;
  for (const [market, pnl] of Object.entries(marketPnl)) {
    if (pnl > bestMarketPnl) {
      bestMarket = market;
      bestMarketPnl = pnl;
    }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;
  const avgWin = wins > 0 ? totalWinPnl / wins : 0;
  const avgLoss = losses > 0 ? totalLossPnl / losses : 0;
  const riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  // Determine trading style
  let tradingStyle = 'Mixed';
  if (avgHoldTime < 60000) tradingStyle = 'Scalper';
  else if (avgHoldTime < 3600000) tradingStyle = 'Day Trader';
  else if (avgHoldTime < 86400000) tradingStyle = 'Swing';
  else tradingStyle = 'Position';

  return {
    wins,
    losses,
    winRate,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin,
    avgLoss,
    riskReward: isFinite(riskReward) ? riskReward : 0,
    avgHoldTime,
    tradingStyle,
    bestMarket,
    bestMarketPnl,
    totalTrades,
    uniqueMarkets: markets.size,
  };
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}
