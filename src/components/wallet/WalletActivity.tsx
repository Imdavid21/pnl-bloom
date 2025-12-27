/**
 * Wallet Activity - Merged activity feed with position history timeline
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, RefreshCw, BarChart3, Filter, TrendingUp, TrendingDown, Clock, ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventRow, EventCard } from '@/components/explorer/EventRow';
import { useInfiniteActivity } from '@/hooks/useInfiniteActivity';
import { usePositionHistory, type PositionHistoryItem } from '@/hooks/usePositionHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WalletActivityProps {
  address: string;
}

const EVENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'perp', label: 'Perps' },
  { key: 'spot', label: 'Spot' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'funding', label: 'Funding' },
] as const;

type FilterKey = (typeof EVENT_FILTERS)[number]['key'];

const EmptyActivity = () => (
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

function TimelineSkeletonItem() {
  return (
    <div className="flex gap-3">
      <div className="w-3 flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-muted/50 animate-pulse" />
        <div className="w-0.5 h-full bg-muted/30 animate-pulse" />
      </div>
      <div className="flex-1 pb-4">
        <div className="h-16 bg-muted/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

function TimelineItem({ position, isLast }: { position: PositionHistoryItem; isLast: boolean }) {
  const isPositive = position.pnl >= 0;
  
  return (
    <div className="flex gap-3">
      <div className="w-3 flex flex-col items-center">
        <div className={cn(
          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
          isPositive ? "bg-up" : "bg-down"
        )} />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border/50" />
        )}
      </div>
      
      <div className="flex-1 pb-4">
        <div className={cn(
          "rounded border p-3 transition-colors hover:bg-muted/30",
          isPositive ? "border-up/20 bg-up/5" : "border-down/20 bg-down/5"
        )}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

function matchesFilter(eventType: string, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  
  // Match against actual event types from database
  switch (filter) {
    case 'perp':
      // Perp trades only - PERP_FILL events, exclude funding
      return eventType === 'PERP_FILL';
    case 'spot':
      // Spot buys and sells only
      return eventType === 'SPOT_BUY' || eventType === 'SPOT_SELL';
    case 'transfer':
      // All transfers
      return eventType === 'SPOT_TRANSFER_IN' || 
             eventType === 'SPOT_TRANSFER_OUT' ||
             eventType === 'ERC20_TRANSFER_IN' ||
             eventType === 'ERC20_TRANSFER_OUT';
    case 'funding':
      // Funding payments
      return eventType === 'PERP_FUNDING';
    default:
      return true;
  }
}

export function WalletActivity({ address }: WalletActivityProps) {
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [activeTab, setActiveTab] = useState<'activity' | 'history'>('activity');
  
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
    isError: historyError 
  } = usePositionHistory(address, 15);
  
  const allEvents = data?.pages.flatMap(page => page.events) || [];
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex(e => e.id === event.id)
  );
  
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return uniqueEvents;
    return uniqueEvents.filter(event => matchesFilter(event.type, activeFilter));
  }, [uniqueEvents, activeFilter]);
  
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

  return (
    <div id="activity" className="panel">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activity' | 'history')}>
        {/* Header with Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <TabsList className="h-8 bg-muted/30">
            <TabsTrigger value="activity" className="text-xs h-7 gap-1.5">
              <BarChart3 className="h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs h-7 gap-1.5">
              <History className="h-3 w-3" />
              Position History
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Activity Tab */}
        <TabsContent value="activity" className="m-0">
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
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center py-8">
                <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">Unable to load activity</p>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => refetch()}>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredEvents.length === 0 ? (
              activeFilter !== 'all' ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    No {EVENT_FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} activity found
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
                {isMobile ? (
                  <div className="space-y-2">
                    {filteredEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {filteredEvents.map(event => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </div>
                )}
                
                <div ref={loadMoreRef} className="pt-4">
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-[10px] uppercase tracking-wider">Loading...</span>
                    </div>
                  )}
                  
                  {!hasNextPage && filteredEvents.length > 10 && (
                    <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                      End of activity
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Position History Tab */}
        <TabsContent value="history" className="m-0">
          <div className="p-4">
            {historyLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TimelineSkeletonItem key={i} />
                ))}
              </div>
            ) : historyError || !historyData?.length ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  No closed positions yet
                </p>
              </div>
            ) : (
              <div>
                {historyData.map((position, index) => (
                  <TimelineItem 
                    key={position.id} 
                    position={position} 
                    isLast={index === historyData.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}