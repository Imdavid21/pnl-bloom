/**
 * Unified Positions Component
 * Displays all open positions across HyperCore and HyperEVM
 */

import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, RefreshCw } from 'lucide-react';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { PositionsSummary } from './PositionsSummary';
import { PerpPositionsTable } from './PerpPositionsTable';
import { SpotBalancesGrid } from './SpotBalancesGrid';
import { LendingPositionsTable } from './LendingPositionsTable';
import { LPPositionsGrid } from './LPPositionsGrid';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

interface UnifiedPositionsProps {
  address: string;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
        <Briefcase className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground/90">No Open Positions</h3>
        <p className="text-sm text-muted-foreground/60 max-w-sm">
          This wallet currently has no active positions
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="mt-2">
        <Link to="#activity">View Trading History</Link>
      </Button>
    </div>
  );
}

export function UnifiedPositions({ address }: UnifiedPositionsProps) {
  const navigate = useNavigate();
  const { data, isLoading, dataUpdatedAt, refetch, isRefetching } = useUnifiedPositions(address);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Update "last updated" text
  useEffect(() => {
    const updateTimestamp = () => {
      if (dataUpdatedAt) {
        setLastUpdated(formatDistanceToNow(dataUpdatedAt, { addSuffix: true }));
      }
    };
    
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 10_000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  const handleNavigateMarket = (market: string) => {
    navigate(`/explorer/market/${market}`);
  };

  const handleNavigateToken = (symbol: string) => {
    navigate(`/token/${symbol}`);
  };

  // Check if there are any positions at all
  const hasPositions = data && (
    data.perps.length > 0 ||
    data.spot.length > 0 ||
    data.lending.length > 0 ||
    data.lp.length > 0
  );

  if (!isLoading && !hasPositions) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {/* Last Updated & Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground/50">
          Positions
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground/40">
              Updated {lastUpdated}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <PositionsSummary 
        summary={data?.summary || null} 
        isLoading={isLoading} 
      />

      {/* Divider */}
      {(data?.summary?.totalValue || 0) > 0 && (
        <div className="border-t border-border/30" />
      )}

      {/* Perp Positions */}
      <PerpPositionsTable
        positions={data?.perps || []}
        marginUsed={data?.perpsTotalMargin || 0}
        isLoading={isLoading}
        onNavigate={handleNavigateMarket}
      />

      {/* Divider */}
      {(data?.perps?.length || 0) > 0 && (
        <div className="border-t border-border/30" />
      )}

      {/* Spot Balances */}
      <SpotBalancesGrid
        balances={data?.spot || []}
        isLoading={isLoading}
        onNavigate={handleNavigateToken}
      />

      {/* Divider */}
      {(data?.spot?.length || 0) > 0 && (
        <div className="border-t border-border/30" />
      )}

      {/* Lending Positions */}
      <LendingPositionsTable
        positions={data?.lending || []}
        isLoading={isLoading}
        onNavigate={handleNavigateToken}
      />

      {/* LP Positions */}
      {(data?.lp?.length || 0) > 0 && (
        <>
          <div className="border-t border-border/30" />
          <LPPositionsGrid
            positions={data?.lp || []}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
