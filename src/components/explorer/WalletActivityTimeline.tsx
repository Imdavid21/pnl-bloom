import { ArrowUpRight, ArrowDownLeft, Repeat, DollarSign, AlertTriangle, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Episode } from '@/lib/explorer/types';

interface WalletActivityTimelineProps {
  episodes: Episode[];
  onNavigate: (type: 'tx' | 'wallet', id: string) => void;
  maxItems?: number;
}

// Convert fills/transactions to episodes
export function fillsToEpisodes(fills: Array<{
  coin: string;
  side: string;
  sz: string;
  px: string;
  time: number;
  hash: string;
  closedPnl: string;
  dir: string;
}>): Episode[] {
  return fills.map((fill, i) => ({
    id: fill.hash || `fill-${i}`,
    type: 'trade' as const,
    timestamp: fill.time,
    summary: `${fill.side === 'B' ? 'Bought' : 'Sold'} ${fill.sz} ${fill.coin} at $${parseFloat(fill.px).toFixed(2)}`,
    narrative: generateFillNarrative(fill),
    deltas: [
      {
        asset: fill.coin,
        symbol: fill.coin,
        before: '—',
        after: '—',
        delta: fill.side === 'B' ? fill.sz : `-${fill.sz}`,
        deltaUsd: (parseFloat(fill.sz) * parseFloat(fill.px)).toFixed(2),
        direction: fill.side === 'B' ? 'in' as const : 'out' as const,
        chain: 'hypercore' as const,
      }
    ],
    txHashes: fill.hash ? [fill.hash] : [],
    chain: 'hypercore',
    relatedEntities: [],
  }));
}

function generateFillNarrative(fill: {
  coin: string;
  side: string;
  sz: string;
  px: string;
  closedPnl: string;
  dir: string;
}): string {
  const action = fill.side === 'B' ? 'bought' : 'sold';
  const direction = fill.dir || '';
  const pnl = parseFloat(fill.closedPnl || '0');
  
  let narrative = `${action} ${fill.sz} ${fill.coin} at $${parseFloat(fill.px).toFixed(2)}`;
  
  if (direction) {
    narrative = `${direction}: ${narrative}`;
  }
  
  if (pnl !== 0) {
    narrative += ` (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`;
  }
  
  return narrative;
}

export function WalletActivityTimeline({ episodes, onNavigate, maxItems = 10 }: WalletActivityTimelineProps) {
  const displayEpisodes = episodes.slice(0, maxItems);

  if (displayEpisodes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
        <p className="text-sm text-muted-foreground text-center py-8">No recent activity found</p>
      </div>
    );
  }

  const getEpisodeIcon = (type: Episode['type']) => {
    switch (type) {
      case 'trade':
        return TrendingUp;
      case 'transfer':
        return ArrowUpRight;
      case 'swap':
        return Repeat;
      case 'funding':
        return DollarSign;
      case 'liquidation':
        return AlertTriangle;
      case 'deposit':
        return ArrowDownLeft;
      case 'withdrawal':
        return ArrowUpRight;
      default:
        return ChevronRight;
    }
  };

  const getEpisodeColor = (type: Episode['type'], deltas: Episode['deltas']) => {
    if (type === 'liquidation') return 'text-loss-3 bg-loss-3/10';
    
    // Check if net positive or negative based on deltas
    const netDelta = deltas.reduce((sum, d) => {
      const val = parseFloat(d.delta);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    if (type === 'trade') {
      return netDelta >= 0 ? 'text-profit-3 bg-profit-3/10' : 'text-loss-3 bg-loss-3/10';
    }
    
    if (type === 'deposit') return 'text-profit-3 bg-profit-3/10';
    if (type === 'withdrawal') return 'text-loss-3 bg-loss-3/10';
    
    return 'text-primary bg-primary/10';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
      
      <div className="space-y-3">
        {displayEpisodes.map((episode, index) => {
          const Icon = getEpisodeIcon(episode.type);
          const colorClass = getEpisodeColor(episode.type, episode.deltas);
          const [iconColor, iconBg] = colorClass.split(' ');
          
          return (
            <div 
              key={episode.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group",
                index !== displayEpisodes.length - 1 && "border-b border-border/30"
              )}
              onClick={() => episode.txHashes[0] && onNavigate('tx', episode.txHashes[0])}
            >
              {/* Icon */}
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("h-4 w-4", iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {episode.narrative || episode.summary}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatTime(episode.timestamp)}</span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    episode.chain === 'hypercore' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {episode.chain === 'hypercore' ? 'Hypercore' : 'HyperEVM'}
                  </span>
                </div>
              </div>

              {/* Delta summary */}
              {episode.deltas.length > 0 && (
                <div className="text-right shrink-0">
                  {episode.deltas.slice(0, 1).map((delta, i) => {
                    const value = parseFloat(delta.delta);
                    const isPositive = !isNaN(value) && value > 0;
                    return (
                      <p 
                        key={i}
                        className={cn(
                          "text-sm font-mono font-medium",
                          isPositive ? "text-profit-3" : "text-loss-3"
                        )}
                      >
                        {isPositive ? '+' : ''}{delta.delta} {delta.symbol}
                      </p>
                    );
                  })}
                  {episode.deltas[0]?.deltaUsd && (
                    <p className="text-xs text-muted-foreground">
                      ${episode.deltas[0].deltaUsd}
                    </p>
                  )}
                </div>
              )}

              {/* Chevron */}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
            </div>
          );
        })}
      </div>

      {episodes.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Showing {maxItems} of {episodes.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
