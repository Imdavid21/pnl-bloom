import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, BarChart2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface MarketStat {
  market: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  total_volume: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number | null;
}

interface WalletTradingStatsProps {
  walletAddress: string;
  onSyncRequest?: () => void;
}

export function WalletTradingStats({ walletAddress, onSyncRequest }: WalletTradingStatsProps) {
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      
      try {
        // First, find the wallet ID
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('address', walletAddress.toLowerCase())
          .single();

        if (!wallet) {
          setHasData(false);
          setIsLoading(false);
          return;
        }

        setWalletId(wallet.id);

        // Fetch market stats from the PnL backend
        const { data: stats, error } = await supabase
          .from('market_stats')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('total_pnl', { ascending: false });

        if (error || !stats || stats.length === 0) {
          setHasData(false);
        } else {
          setMarketStats(stats);
          setHasData(true);
        }
      } catch (err) {
        console.error('[WalletTradingStats] Error:', err);
        setHasData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [walletAddress]);

  // Calculate aggregate stats
  const aggregateStats = marketStats.reduce((acc, stat) => {
    acc.totalTrades += stat.total_trades;
    acc.wins += stat.wins;
    acc.losses += stat.losses;
    acc.totalPnl += stat.total_pnl;
    acc.totalVolume += stat.total_volume;
    acc.totalWinPnl += stat.avg_win * stat.wins;
    acc.totalLossPnl += Math.abs(stat.avg_loss) * stat.losses;
    return acc;
  }, {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnl: 0,
    totalVolume: 0,
    totalWinPnl: 0,
    totalLossPnl: 0,
  });

  const winRate = aggregateStats.totalTrades > 0 
    ? (aggregateStats.wins / aggregateStats.totalTrades) * 100 
    : 0;
  
  const profitFactor = aggregateStats.totalLossPnl > 0 
    ? aggregateStats.totalWinPnl / aggregateStats.totalLossPnl 
    : aggregateStats.totalWinPnl > 0 ? Infinity : 0;

  const avgWin = aggregateStats.wins > 0 ? aggregateStats.totalWinPnl / aggregateStats.wins : 0;
  const avgLoss = aggregateStats.losses > 0 ? aggregateStats.totalLossPnl / aggregateStats.losses : 0;
  const riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  // Best market
  const bestMarket = marketStats.length > 0 ? marketStats[0] : null;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Trading Analytics</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
            PnL Engine
          </span>
        </div>
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Trading Analytics</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            Not Synced
          </span>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Advanced trading analytics require syncing this wallet with our PnL engine.
          </p>
          {onSyncRequest ? (
            <Button variant="outline" size="sm" onClick={onSyncRequest} className="gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Go to PnL Page to Sync
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/?wallet=${walletAddress}`, '_blank')}
              className="gap-2"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Open in PnL Tracker
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">Trading Analytics</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-profit-3/20 text-profit-3 font-medium">
          Synced
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {marketStats.length} markets • {aggregateStats.totalTrades} trades
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Win Rate */}
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
          trend={winRate >= 50 ? 'up' : 'down'}
          subtext={`${aggregateStats.wins}W / ${aggregateStats.losses}L`}
        />
        
        {/* Profit Factor */}
        <StatCard
          label="Profit Factor"
          value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={profitFactor >= 1 ? 'up' : 'down'}
          subtext={profitFactor >= 1.5 ? 'Strong' : profitFactor >= 1 ? 'Positive' : 'Needs work'}
        />
        
        {/* Total PnL */}
        <StatCard
          label="Total PnL"
          value={`$${Math.abs(aggregateStats.totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={aggregateStats.totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          trend={aggregateStats.totalPnl >= 0 ? 'up' : 'down'}
          subtext={aggregateStats.totalPnl >= 0 ? 'Profitable' : 'Net Loss'}
        />
        
        {/* Best Market */}
        <StatCard
          label="Best Market"
          value={bestMarket?.market.replace('-USD', '') || 'N/A'}
          icon={<Activity className="h-4 w-4" />}
          trend="up"
          subtext={bestMarket ? `+$${bestMarket.total_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
        />
      </div>

      {/* Risk Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {/* Avg Win */}
        <StatCard
          label="Avg Win"
          value={`$${avgWin.toFixed(2)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
          subtext="per winning trade"
          small
        />
        
        {/* Avg Loss */}
        <StatCard
          label="Avg Loss"
          value={`$${avgLoss.toFixed(2)}`}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
          subtext="per losing trade"
          small
        />
        
        {/* Risk/Reward */}
        <StatCard
          label="Risk/Reward"
          value={riskReward === Infinity ? '∞' : `1:${riskReward.toFixed(2)}`}
          icon={<Activity className="h-4 w-4" />}
          trend={riskReward >= 1.5 ? 'up' : 'neutral'}
          subtext={riskReward >= 2 ? 'Excellent' : riskReward >= 1 ? 'Good' : 'Review sizing'}
          small
        />
        
        {/* Total Volume */}
        <StatCard
          label="Total Volume"
          value={`$${(aggregateStats.totalVolume / 1000000).toFixed(2)}M`}
          icon={<DollarSign className="h-4 w-4" />}
          trend="neutral"
          subtext={`${marketStats.length} markets`}
          small
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  subtext: string;
  small?: boolean;
}

function StatCard({ label, value, icon, trend, subtext, small }: StatCardProps) {
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
