/**
 * Wallet Activity - Clean activity feed section
 */

import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventRow, EventCard } from '@/components/explorer/EventRow';
import { useInfiniteActivity } from '@/hooks/useInfiniteActivity';
import { useIsMobile } from '@/hooks/use-mobile';

interface WalletActivityProps {
  address: string;
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No Activity</h3>
      <p className="text-sm text-muted-foreground mb-4">
        No trades recorded yet
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/">Explore Wallets</Link>
      </Button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-4 flex-1 max-w-[200px]" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function WalletActivity({ address }: WalletActivityProps) {
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
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
    <Card id="activity">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-8">
            <p className="text-sm text-muted-foreground mb-3">Unable to load activity</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : uniqueEvents.length === 0 ? (
          <EmptyActivity />
        ) : (
          <>
            {isMobile ? (
              <div className="space-y-3">
                {uniqueEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {uniqueEvents.map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
            
            <div ref={loadMoreRef} className="pt-4">
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              
              {!hasNextPage && uniqueEvents.length > 10 && (
                <p className="text-center text-xs text-muted-foreground">
                  End of activity
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
