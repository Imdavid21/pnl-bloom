/**
 * Unified Activity Feed Component
 * Shows all wallet events across HyperCore and HyperEVM
 */

import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventRow, EventCard } from './EventRow';
import { useInfiniteActivity } from '@/hooks/useInfiniteActivity';
import { useIsMobile } from '@/hooks/use-mobile';

interface UnifiedActivityFeedProps {
  address: string;
  className?: string;
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 px-3 -mx-3">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-4 flex-1 max-w-[300px]" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-10" />
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
        <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground/90">No Activity</h3>
        <p className="text-sm text-muted-foreground/60 max-w-xs">
          This wallet hasn&apos;t made any trades yet
        </p>
      </div>
      <Button variant="outline" asChild className="mt-2">
        <Link to="/leaderboard">
          Explore Active Wallets →
        </Link>
      </Button>
    </div>
  );
}

// Error state
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <p className="text-sm text-muted-foreground/70">Unable to load activity</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}

export function UnifiedActivityFeed({ address, className }: UnifiedActivityFeedProps) {
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
  
  // Flatten all pages into single array
  const allEvents = data?.pages.flatMap(page => page.events) || [];
  
  // Deduplicate events by id
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex(e => e.id === event.id)
  );
  
  // Intersection observer for infinite scroll
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
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-0", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }
  
  // Empty state
  if (uniqueEvents.length === 0) {
    return <EmptyState />;
  }
  
  return (
    <div className={cn("space-y-0", className)}>
      {/* Activity list */}
      {isMobile ? (
        // Mobile: Card layout
        <div className="space-y-3">
          {uniqueEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        // Desktop: Table layout
        <div>
          {uniqueEvents.map(event => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
      
      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        
        {!hasNextPage && uniqueEvents.length > 10 && (
          <p className="text-center text-xs text-muted-foreground/40">
            No more activity
          </p>
        )}
      </div>
    </div>
  );
}

export default UnifiedActivityFeed;
