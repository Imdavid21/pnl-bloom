import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHyperliquidWebSocket, type Fill } from '@/hooks/useHyperliquidWebSocket';
import { TokenLogo } from './TokenLogo';

interface RecentTradesProps {
  onNavigate?: (type: 'wallet', id: string) => void;
}

export function RecentTrades({ onNavigate }: RecentTradesProps) {
  const { fills, connected } = useHyperliquidWebSocket(['trades']);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!connected && fills.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Live Trades</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          Connecting to live trade feed...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Live Trades</h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-profit-3"></span>
          </span>
          <span className="text-[10px] text-muted-foreground">WebSocket</span>
        </div>
      </div>

      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {fills.slice(0, 20).map((fill, i) => {
          const isBuy = fill.side === 'B';
          const size = parseFloat(fill.sz || '0');
          const price = parseFloat(fill.px || '0');
          const notional = size * price;

          return (
            <div
              key={`${fill.tid || fill.time}-${i}`}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-all",
                i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <TokenLogo symbol={fill.coin} size="sm" />
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded flex items-center justify-center",
                    isBuy ? "bg-profit-3" : "bg-loss-3"
                  )}>
                    {isBuy ? (
                      <TrendingUp className="h-2 w-2 text-white" />
                    ) : (
                      <TrendingDown className="h-2 w-2 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{fill.coin}</span>
                    <span className={cn(
                      "px-1 py-0.5 rounded text-[9px] font-medium",
                      isBuy ? "bg-profit-3/20 text-profit-3" : "bg-loss-3/20 text-loss-3"
                    )}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-mono">{size.toFixed(4)}</span>
                    <span>@</span>
                    <span className="font-mono">${price >= 1 ? price.toFixed(2) : price.toPrecision(4)}</span>
                    {fill.user && (
                      <>
                        <span>•</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onNavigate?.('wallet', fill.user!); }}
                          className="font-mono text-primary/80 hover:text-primary hover:underline"
                        >
                          {truncateAddress(fill.user)}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-muted-foreground">{formatTime(fill.time)}</div>
                <div className="text-[10px] text-muted-foreground">
                  ${notional >= 1000 ? `${(notional/1000).toFixed(1)}K` : notional.toFixed(0)}
                </div>
              </div>
            </div>
          );
        })}

        {fills.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Waiting for trades...
          </div>
        )}
      </div>
    </div>
  );
}
