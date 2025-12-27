/**
 * Wallet Activity - Unified activity feed with position history inline
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, RefreshCw, BarChart3, Filter, TrendingUp, TrendingDown, Clock, ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventRow, EventCard } from '@/components/explorer/EventRow';
import { useInfiniteActivity } from '@/hooks/useInfiniteActivity';
import { usePositionHistory, type PositionHistoryItem } from '@/hooks/usePositionHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface WalletActivityProps {
  address: string;
}

const EVENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'positions', label: 'Closed Positions' },
  { key: 'perp', label: 'Perps' },
  { key: 'spot', label: 'Spot' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'funding', label: 'Funding' },
  { key: 'evm', label: 'HyperEVM' },
] as const;

type FilterKey = (typeof EVENT_FILTERS)[number]['key'];

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center mb-3">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="font-mono text-sm font-medium mb-1">No Activity</h3>
      <p className="text-[10px] text-muted-foreground mb-4 uppercase tracking-wider">
        No trades recorded yet
      </p>
      <Button variant="outline" size="sm" className="text-xs h-7" asChild>
        <Link to="/">Explore Wallets</Link>
      </Button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/30">
      <div className="h-3 w-12 bg-muted/30 rounded animate-pulse" />
      <div className="h-5 w-14 bg-muted/30 rounded animate-pulse" />
      <div className="h-3 flex-1 max-w-[200px] bg-muted/30 rounded animate-pulse" />
      <div className="h-3 w-16 bg-muted/30 rounded animate-pulse" />
    </div>
  );
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// Unified timeline item for closed positions
function ClosedPositionCard({ position }: { position: PositionHistoryItem }) {
  const isPositive = position.pnl >= 0;
  
  return (
    <div className={cn(
      "rounded border p-3 transition-colors hover:bg-muted/30",
      isPositive ? "border-up/20 bg-up/5" : "border-down/20 bg-down/5"
    )}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono uppercase bg-primary/10 text-primary border-primary/30">
            Closed
          </Badge>
          <Link 
            to={`/explorer/market/${position.market}`}
            className="font-mono font-semibold text-sm hover:text-primary transition-colors"
          >
            {position.market}
          </Link>
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded",
            position.side === 'long' 
              ? "bg-up/10 text-up" 
              : "bg-down/10 text-down"
          )}>
            {position.side}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {position.leverage.toFixed(1)}x
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-up" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-down" />
          )}
          <span className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            isPositive ? "text-up" : "text-down"
          )}>
            {isPositive ? '+' : ''}{formatUsd(position.pnl)}
          </span>
          <span className={cn(
            "text-[10px] font-mono tabular-nums",
            isPositive ? "text-up/70" : "text-down/70"
          )}>
            ({isPositive ? '+' : ''}{position.pnlPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums">
            ${position.entryPrice.toFixed(2)} <ArrowRight className="h-2.5 w-2.5 inline" /> ${position.exitPrice.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {position.duration}
          </span>
        </div>
        <span className="font-mono">
          {format(position.closeTime, 'MMM d, HH:mm')}
        </span>
      </div>
    </div>
  );
}

function matchesFilter(eventType: string, filter: FilterKey, domain?: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'positions') return false; // Handled separately
  
  switch (filter) {
    case 'perp':
      return eventType === 'PERP_FILL';
    case 'spot':
      return eventType === 'SPOT_BUY' || eventType === 'SPOT_SELL';
    case 'transfer':
      return eventType === 'SPOT_TRANSFER_IN' || 
             eventType === 'SPOT_TRANSFER_OUT' ||
             eventType === 'ERC20_TRANSFER_IN' ||
             eventType === 'ERC20_TRANSFER_OUT';
    case 'funding':
      return eventType === 'PERP_FUNDING';
    case 'evm':
      return domain === 'hyperevm';
    default:
      return true;
  }
}

// Type for unified timeline items
type TimelineItem = 
  | { type: 'event'; data: any; timestamp: Date }
  | { type: 'position'; data: PositionHistoryItem; timestamp: Date };

export function WalletActivity({ address }: WalletActivityProps) {
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteActivity(address);
  
  const { 
    data: historyData, 
    isLoading: historyLoading, 
    refetch: refetchHistory,
  } = usePositionHistory(address, 20);
  
  const allEvents = data?.pages.flatMap(page => page.events) || [];
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex(e => e.id === event.id)
  );
  
  // Create unified timeline
  const unifiedTimeline = useMemo(() => {
    if (activeFilter === 'positions') {
      // Only show closed positions
      return (historyData || []).map(pos => ({
        type: 'position' as const,
        data: pos,
        timestamp: pos.closeTime,
      }));
    }
    
    const timeline: TimelineItem[] = [];
    
    // Add events
    uniqueEvents.forEach(event => {
      if (matchesFilter(event.type, activeFilter, event.domain)) {
        timeline.push({
          type: 'event',
          data: event,
          timestamp: new Date(event.timestamp),
        });
      }
    });
    
    // Add closed positions interleaved (only for 'all' filter)
    if (activeFilter === 'all' && historyData) {
      historyData.forEach(pos => {
        timeline.push({
          type: 'position',
          data: pos,
          timestamp: pos.closeTime,
        });
      });
    }
    
    // Sort by timestamp descending
    return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [uniqueEvents, historyData, activeFilter]);
  
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );
  
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });
    
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleRefresh = () => {
    refetch();
    refetchHistory();
  };

  // Count stats
  const positionCount = historyData?.length || 0;
  const winCount = historyData?.filter(p => p.pnl >= 0).length || 0;

  return (
    <div id="activity" className="panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="panel-header mb-0">Activity</span>
          {positionCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Trophy className="h-3 w-3 text-primary" />
              <span className="font-mono">{winCount}/{positionCount} wins</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRefresh}
          disabled={isLoading || historyLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${(isLoading || historyLoading) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-1 flex-wrap p-4 pb-2">
        <Filter className="h-3 w-3 text-muted-foreground mr-1" />
        {EVENT_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "px-2 py-1 text-[10px] uppercase tracking-wider font-mono rounded transition-colors",
              activeFilter === filter.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="p-4 pt-2">
        {(isLoading && historyLoading) ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-8">
            <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">Unable to load activity</p>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </div>
        ) : unifiedTimeline.length === 0 ? (
          activeFilter !== 'all' ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                No {EVENT_FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} found
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 mt-2" 
                onClick={() => setActiveFilter('all')}
              >
                Clear filter
              </Button>
            </div>
          ) : (
            <EmptyActivity />
          )
        ) : (
          <>
            <div className="space-y-2">
              {unifiedTimeline.map((item, idx) => {
                if (item.type === 'position') {
                  return (
                    <ClosedPositionCard 
                      key={`pos-${item.data.id}`} 
                      position={item.data} 
                    />
                  );
                }
                
                // Event item
                if (isMobile) {
                  return <EventCard key={item.data.id} event={item.data} />;
                }
                return <EventRow key={item.data.id} event={item.data} />;
              })}
            </div>
            
            <div ref={loadMoreRef} className="pt-4">
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[10px] uppercase tracking-wider">Loading...</span>
                </div>
              )}
              
              {!hasNextPage && unifiedTimeline.length > 10 && (
                <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  End of activity
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}