/**
 * Wallet Activity - Terminal style activity feed with type filter
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventRow, EventCard } from '@/components/explorer/EventRow';
import { useInfiniteActivity } from '@/hooks/useInfiniteActivity';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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

function matchesFilter(eventType: string, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  
  const typeNormalized = eventType.toLowerCase();
  
  switch (filter) {
    case 'perp':
      // Perp trades only - exclude funding events
      return (typeNormalized.includes('perp') || typeNormalized.includes('fill')) 
        && !typeNormalized.includes('funding');
    case 'spot':
      return typeNormalized.includes('spot') && !typeNormalized.includes('transfer');
    case 'transfer':
      return typeNormalized.includes('transfer');
    case 'funding':
      return typeNormalized.includes('funding');
    default:
      return true;
  }
}

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
  
  const allEvents = data?.pages.flatMap(page => page.events) || [];
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex(e => e.id === event.id)
  );
  
  // Filter events based on active filter
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
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="panel-header mb-0">Recent Activity</span>
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
        
        {/* Type Filter */}
        <div className="flex items-center gap-1 flex-wrap">
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
      </div>

      {/* Content */}
      <div className="p-4">
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
    </div>
  );
}