/**
 * Wallet Positions - Clean positions section
 */

import { Link } from 'react-router-dom';
import { Briefcase, RefreshCw } from 'lucide-react';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Briefcase className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No Open Positions</h3>
      <p className="text-sm text-muted-foreground mb-4">
        No active positions at the moment
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to="#activity">View Activity</Link>
      </Button>
    </div>
  );
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
    <Card id="positions">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Positions</CardTitle>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !hasPositions ? (
          <EmptyPositions />
        ) : (
          <>
            {/* Summary */}
            <PositionsSummary 
              summary={data?.summary || null} 
              isLoading={false} 
            />

            {/* Perps */}
            {(data?.perps?.length || 0) > 0 && (
              <PerpPositionsTable
                positions={data?.perps || []}
                marginUsed={data?.perpsTotalMargin || 0}
                isLoading={false}
                onNavigate={handleNavigateMarket}
              />
            )}

            {/* Spot */}
            {(data?.spot?.length || 0) > 0 && (
              <SpotBalancesGrid
                balances={data?.spot || []}
                isLoading={false}
                onNavigate={handleNavigateToken}
              />
            )}

            {/* Lending */}
            {(data?.lending?.length || 0) > 0 && (
              <LendingPositionsTable
                positions={data?.lending || []}
                isLoading={false}
                onNavigate={handleNavigateToken}
              />
            )}

            {/* LP */}
            {(data?.lp?.length || 0) > 0 && (
              <LPPositionsGrid
                positions={data?.lp || []}
                isLoading={false}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
