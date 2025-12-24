import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { RiskAnalysis } from '@/components/analytics/RiskAnalysis';

interface Position {
  market: string;
  position_size: number;
  avg_entry: number;
  liquidation_px: number | null;
  mark_price: number;
  effective_leverage: number;
  margin_used: number;
  unrealized_pnl: number;
  position_value: number;
  return_on_equity: number;
  max_leverage: number;
  liq_score: number;
}

interface AccountSummary {
  account_value: number;
  total_margin_used: number;
  total_notional: number;
}

interface LivePositionsResponse {
  positions: Position[];
  account: AccountSummary;
}

interface CurrentPositionsProps {
  wallet: string | null;
  className?: string;
}

async function fetchLivePositions(wallet: string): Promise<LivePositionsResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-positions?wallet=${wallet}`;
  const response = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch positions');
  }

  return response.json();
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toFixed(decimals);
}

function formatPrice(value: number): string {
  if (value >= 10000) return formatNumber(value, 0);
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

export function CurrentPositions({ wallet, className }: CurrentPositionsProps) {
  const [data, setData] = useState<LivePositionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!wallet) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchLivePositions(wallet);
      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    if (!wallet) return;

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [wallet, fetchData]);

  if (!wallet) {
    return null;
  }

  if (isLoading && !data) {
    return (
      <div className={cn("panel", className)}>
        <div className="panel-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Current Positions</h3>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 text-primary animate-spin" />
              <span className="text-[10px] text-muted-foreground">Loading...</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-lg skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("panel", className)}>
        <div className="panel-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Current Positions</h3>
            <button onClick={fetchData} className="text-xs text-muted-foreground hover:text-foreground">
              Retry
            </button>
          </div>
          <p className="text-xs text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.positions || data.positions.length === 0) {
    return (
      <div className={cn("panel", className)}>
        <div className="panel-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Current Positions</h3>
            {lastUpdate && (
              <span className="text-[10px] text-muted-foreground">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          <EmptyState
            icon={BarChart2}
            title="No Active Positions"
            description="You don't have any open positions on Hyperliquid right now. Open a trade to see it tracked here live."
            action={{
              label: "Trade on Hyperliquid",
              onClick: () => window.open('https://app.hyperliquid.xyz/trade', '_blank')
            }}
            className="min-h-[200px] border-none bg-transparent"
          />
        </div>
      </div>
    );
  }

  const { positions, account } = data;

  return (
    <div className={cn("panel", className)}>
      <div className="panel-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground">Current Positions</h3>
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] text-primary font-medium">LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              Acct: ${formatNumber(account.account_value, 0)}
            </span>
            <span className="font-mono tabular-nums">
              Margin: ${formatNumber(account.total_margin_used, 0)}
            </span>
            {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
          </div>
        </div>

        {/* Positions Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {positions.map((pos) => {
            const isLong = pos.position_size > 0;
            const size = Math.abs(pos.position_size);

            return (
              <div
                key={pos.market}
                className={cn(
                  "relative p-3 rounded-lg border transition-micro",
                  "bg-card/50 hover:bg-card/80",
                  pos.liq_score > 0.7 ? "border-destructive/50" :
                    pos.liq_score > 0.4 ? "border-warning/50" :
                      isLong ? "border-profit/30" : "border-loss/30"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isLong ? (
                      <TrendingUp className="h-4 w-4 text-profit" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-loss" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {pos.market.replace('-PERP', '')}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    isLong ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                  )}>
                    {isLong ? 'LONG' : 'SHORT'}
                  </span>
                </div>

                {/* Size & Prices */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Size</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {size >= 1 ? size.toFixed(4) : size.toPrecision(4)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block mb-0.5">Entry</span>
                    <span className="font-mono tabular-nums text-foreground">
                      ${formatPrice(pos.avg_entry)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Mark</span>
                    <span className="font-mono tabular-nums text-foreground">
                      ${formatPrice(pos.mark_price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block mb-0.5">Liq</span>
                    <span className={cn(
                      "font-mono tabular-nums",
                      pos.liq_score > 0.7 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {pos.liquidation_px ? `$${formatPrice(pos.liquidation_px)}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Leverage & Margin */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Leverage</span>
                    <span className={cn(
                      "font-mono tabular-nums",
                      pos.effective_leverage >= 20 ? "text-destructive" :
                        pos.effective_leverage >= 10 ? "text-warning" : "text-foreground"
                    )}>
                      {pos.effective_leverage.toFixed(1)}x
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block mb-0.5">Margin</span>
                    <span className="font-mono tabular-nums text-foreground">
                      ${formatNumber(pos.margin_used, 0)}
                    </span>
                  </div>
                </div>

                {/* Liquidation Score */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Liq Score</span>
                    <div className="flex items-center gap-1">
                      {pos.liq_score > 0.7 && (
                        <AlertTriangle className="h-3 w-3 text-destructive animate-pulse" />
                      )}
                      <span className={cn(
                        "text-[10px] font-mono tabular-nums font-medium",
                        pos.liq_score > 0.7 ? "text-destructive" :
                          pos.liq_score > 0.4 ? "text-warning" : "text-profit"
                      )}>
                        {pos.liq_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        pos.liq_score > 0.7 ? "bg-destructive" :
                          pos.liq_score > 0.4 ? "bg-warning" : "bg-profit"
                      )}
                      style={{ width: `${Math.min(100, pos.liq_score * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Unrealized PnL */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Unrealized PnL</span>
                    <div className="text-right">
                      <span className={cn(
                        "text-sm font-mono tabular-nums font-medium",
                        pos.unrealized_pnl >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {pos.unrealized_pnl >= 0 ? '+' : ''}{formatNumber(pos.unrealized_pnl, 2)}
                      </span>
                      {pos.return_on_equity !== 0 && (
                        <span className={cn(
                          "text-[10px] font-mono tabular-nums ml-1",
                          pos.return_on_equity >= 0 ? "text-profit" : "text-loss"
                        )}>
                          ({pos.return_on_equity >= 0 ? '+' : ''}{(pos.return_on_equity * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live indicator */}
                <div className="absolute top-2 right-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    pos.liq_score > 0.7 ? "bg-destructive" : "bg-primary"
                  )} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Analysis Section */}
      {positions.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <RiskAnalysis positions={positions} accountValue={account.account_value} />
        </div>
      )}
    </div>
    </div >
  );
}
