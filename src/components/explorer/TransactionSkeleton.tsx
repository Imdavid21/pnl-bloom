/**
 * Transaction Skeleton
 * Loading state for transaction pages
 */

import { Skeleton } from '@/components/ui/skeleton';

export function TransactionSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-full max-w-lg" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/20">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      
      {/* Event Logs */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
