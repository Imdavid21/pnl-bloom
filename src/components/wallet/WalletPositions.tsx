/**
 * Wallet Positions - Terminal style positions section
 */

import { Link } from 'react-router-dom';
import { Briefcase, RefreshCw } from 'lucide-react';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { Button } from '@/components/ui/button';
import { PerpPositionsTable } from '@/components/explorer/PerpPositionsTable';
import { SpotBalancesGrid } from '@/components/explorer/SpotBalancesGrid';
import { LendingPositionsTable } from '@/components/explorer/LendingPositionsTable';
import { LPPositionsGrid } from '@/components/explorer/LPPositionsGrid';
import { PositionsSummary } from '@/components/explorer/PositionsSummary';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface WalletPositionsProps {
  address: string;
}

function EmptyPositions() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center mb-3">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="font-mono text-sm font-medium mb-1">No Open Positions</h3>
      <p className="text-[10px] text-muted-foreground mb-4 uppercase tracking-wider">
        No active positions at the moment
      </p>
      <Button variant="outline" size="sm" className="text-xs h-7" asChild>
        <Link to="#activity">View Activity</Link>
      </Button>
    </div>
  );
}

function SkeletonBlock() {
  return <div className="h-24 bg-muted/30 rounded animate-pulse" />;
}

export function WalletPositions({ address }: WalletPositionsProps) {
  const navigate = useNavigate();
  const { data, isLoading, dataUpdatedAt, refetch, isRefetching } = useUnifiedPositions(address);
  const [lastUpdated, setLastUpdated] = useState('');

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

  const hasPositions = data && (
    data.perps.length > 0 ||
    data.spot.length > 0 ||
    data.lending.length > 0 ||
    data.lp.length > 0
  );

  return (
    <div id="positions" className="panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="panel-header mb-0">Positions</span>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {lastUpdated}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        ) : !hasPositions ? (
          <EmptyPositions />
        ) : (
          <>
            <PositionsSummary 
              summary={data?.summary || null} 
              isLoading={false} 
            />

            {(data?.perps?.length || 0) > 0 && (
              <PerpPositionsTable
                positions={data?.perps || []}
                marginUsed={data?.perpsTotalMargin || 0}
                isLoading={false}
                onNavigate={handleNavigateMarket}
              />
            )}

            {(data?.spot?.length || 0) > 0 && (
              <SpotBalancesGrid
                balances={data?.spot || []}
                isLoading={false}
                onNavigate={handleNavigateToken}
              />
            )}

            {(data?.lending?.length || 0) > 0 && (
              <LendingPositionsTable
                positions={data?.lending || []}
                isLoading={false}
                onNavigate={handleNavigateToken}
              />
            )}

            {(data?.lp?.length || 0) > 0 && (
              <LPPositionsGrid
                positions={data?.lp || []}
                isLoading={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}