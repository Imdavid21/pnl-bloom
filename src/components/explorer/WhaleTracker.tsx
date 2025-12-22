import { Loader2, TrendingUp, TrendingDown, Fish, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhaleTracking } from '@/hooks/useWhaleTracking';

interface WhaleTrackerProps {
  onNavigate?: (type: 'wallet', id: string) => void;
}

export function WhaleTracker({ onNavigate }: WhaleTrackerProps) {
  const { connected, loading, trades, totalVolume, buyVolume, sellVolume } = useWhaleTracking();

  const formatNotional = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const buyPct = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Fish className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Whale Tracker</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Fish className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Whale Tracker</h3>
          <span className="text-[10px] text-muted-foreground">$50K+ trades</span>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-profit-3"></span>
              </span>
              <span className="text-[10px] text-muted-foreground">Live</span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground">Reconnecting...</span>
          )}
        </div>
      </div>

      {/* Volume Summary */}
      {trades.length > 0 && (
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Session whale volume</span>
            <span className="font-mono font-medium">{formatNotional(totalVolume)}</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-loss-3/30">
            <div 
              className="bg-profit-3 transition-all duration-500"
              style={{ width: `${buyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span className="text-profit">Buy: {formatNotional(buyVolume)}</span>
            <span className="text-loss">Sell: {formatNotional(sellVolume)}</span>
          </div>
        </div>
      )}

      {/* Trade List */}
      <div className="divide-y divide-border max-h-[350px] overflow-y-auto scrollbar-thin">
        {trades.slice(0, 15).map((trade, i) => {
          const isBuy = trade.side === 'B';
          
          return (
            <div
              key={`${trade.tid || trade.time}-${i}`}
              className={cn(
                "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-all",
                i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isBuy ? "bg-profit-3/10" : "bg-loss-3/10"
                )}>
                  {isBuy ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{trade.coin}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      isBuy ? "bg-profit-3/20 text-profit" : "bg-loss-3/20 text-loss"
                    )}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span className="font-mono text-sm font-semibold">{formatNotional(trade.notional)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-mono">{trade.size.toFixed(4)} @ ${trade.price >= 1 ? trade.price.toFixed(2) : trade.price.toPrecision(4)}</span>
                    {trade.marketImpact && trade.marketImpact > 0.01 && (
                      <>
                        <span>•</span>
                        <span className="text-warning">~{trade.marketImpact.toFixed(2)}% impact</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">{formatTime(trade.time)}</div>
                {trade.user && (
                  <button 
                    onClick={() => onNavigate?.('wallet', trade.user!)}
                    className="flex items-center gap-0.5 text-[10px] font-mono text-primary/80 hover:text-primary mt-0.5"
                  >
                    {truncateAddress(trade.user)}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Fish className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Waiting for whale trades...</p>
            <p className="text-xs mt-1">$50K+ trades will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
