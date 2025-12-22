import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, BarChart2, Loader2, RefreshCw, CheckCircle2, Database, Calendar, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

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

interface SyncProgress {
  status: string;
  fills_ingested: number;
  funding_ingested: number;
  events_ingested: number;
  days_recomputed: number;
  started_at: string;
  error_message?: string | null;
}

interface WalletTradingStatsProps {
  walletAddress: string;
  onSyncRequest?: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function WalletTradingStats({ walletAddress }: WalletTradingStatsProps) {
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
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

      // Check for any running sync
      const { data: runningSync } = await supabase
        .from('sync_runs')
        .select('*')
        .eq('wallet_id', wallet.id)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (runningSync) {
        setIsSyncing(true);
        setSyncProgress({
          status: runningSync.status,
          fills_ingested: runningSync.fills_ingested || 0,
          funding_ingested: runningSync.funding_ingested || 0,
          events_ingested: runningSync.events_ingested || 0,
          days_recomputed: runningSync.days_recomputed || 0,
          started_at: runningSync.started_at,
        });
        startProgressPolling(wallet.id);
      }

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
  }, [walletAddress]);

  const startProgressPolling = useCallback((wId: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: syncRun } = await supabase
          .from('sync_runs')
          .select('*')
          .eq('wallet_id', wId)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (syncRun) {
          setSyncProgress({
            status: syncRun.status,
            fills_ingested: syncRun.fills_ingested || 0,
            funding_ingested: syncRun.funding_ingested || 0,
            events_ingested: syncRun.events_ingested || 0,
            days_recomputed: syncRun.days_recomputed || 0,
            started_at: syncRun.started_at,
            error_message: syncRun.error_message,
          });

          if (syncRun.status === 'completed') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsSyncing(false);
            toast.success('Wallet synced successfully!');
            await fetchStats();
          } else if (syncRun.status === 'failed') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsSyncing(false);
            toast.error(syncRun.error_message || 'Sync failed');
          }
        }
      } catch (err) {
        console.error('[WalletTradingStats] Poll error:', err);
      }
    }, 2000);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchStats]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress({
      status: 'starting',
      fills_ingested: 0,
      funding_ingested: 0,
      events_ingested: 0,
      days_recomputed: 0,
      started_at: new Date().toISOString(),
    });
    
    try {
      // Call the sync-wallet edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ wallet: walletAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }

      const result = await response.json();
      
      if (result.status === 'completed' || result.status === 'success') {
        toast.success('Wallet synced successfully!');
        setIsSyncing(false);
        setSyncProgress(null);
        await fetchStats();
      } else if (result.runId || result.status === 'running') {
        // Start polling for progress
        toast.info('Sync started. Tracking progress...');
        if (walletId) {
          startProgressPolling(walletId);
        }
      } else {
        setIsSyncing(false);
        setSyncProgress(null);
        toast.error('Sync returned unexpected status');
      }
    } catch (err) {
      console.error('[WalletTradingStats] Sync error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sync wallet');
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [walletAddress, walletId, fetchStats, startProgressPolling]);

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

  // Sync Progress Display Component
  const SyncProgressDisplay = () => {
    if (!syncProgress) return null;
    
    const elapsedSeconds = Math.floor((Date.now() - new Date(syncProgress.started_at).getTime()) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedSecondsRemainder = elapsedSeconds % 60;
    
    const totalIngested = syncProgress.fills_ingested + syncProgress.funding_ingested;
    
    return (
      <div className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {syncProgress.status === 'starting' ? 'Initializing...' : 
               syncProgress.status === 'running' ? 'Processing trades...' :
               syncProgress.status === 'completed' ? 'Complete!' :
               syncProgress.status === 'failed' ? 'Failed' : 'Syncing...'}
            </span>
            <span className="text-muted-foreground font-mono">
              {elapsedMinutes > 0 ? `${elapsedMinutes}m ` : ''}{elapsedSecondsRemainder}s
            </span>
          </div>
          <Progress value={syncProgress.status === 'completed' ? 100 : undefined} className="h-1.5" />
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Database className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Fills</span>
            </div>
            <p className="text-lg font-semibold font-mono">
              {syncProgress.fills_ingested.toLocaleString()}
            </p>
          </div>
          
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Funding</span>
            </div>
            <p className="text-lg font-semibold font-mono">
              {syncProgress.funding_ingested.toLocaleString()}
            </p>
          </div>
          
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Events</span>
            </div>
            <p className="text-lg font-semibold font-mono">
              {syncProgress.events_ingested.toLocaleString()}
            </p>
          </div>
          
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Days</span>
            </div>
            <p className="text-lg font-semibold font-mono">
              {syncProgress.days_recomputed}
            </p>
          </div>
        </div>
        
        {syncProgress.error_message && (
          <p className="text-xs text-loss text-center">
            {syncProgress.error_message}
          </p>
        )}
      </div>
    );
  };

  if (!hasData) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Trading Analytics</h2>
          {isSyncing ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Not Synced
            </span>
          )}
        </div>
        
        {isSyncing && syncProgress ? (
          <SyncProgressDisplay />
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Sync this wallet to unlock advanced trading analytics powered by our PnL engine.
            </p>
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Wallet Now
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">Trading Analytics</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-profit-3/20 text-profit-3 font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Synced
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {marketStats.length} markets • {aggregateStats.totalTrades} trades
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSync}
          disabled={isSyncing}
          className="h-7 px-2 text-xs gap-1.5"
        >
          {isSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </Button>
        <Link 
          to={`/analytics?wallet=${walletAddress}`}
          className="h-7 px-2 text-xs gap-1 inline-flex items-center rounded-md border border-border bg-background hover:bg-muted transition-colors"
        >
          Full Analytics
          <ArrowRight className="h-3 w-3" />
        </Link>
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
