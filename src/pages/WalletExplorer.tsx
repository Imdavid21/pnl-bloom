import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletExplorer } from '@/hooks/useWalletExplorer';
import { WalletExplorerHeader } from '@/components/explorer/WalletExplorerHeader';
import { WalletStatsGrid } from '@/components/explorer/WalletStatsGrid';
import { RecentEventsTable } from '@/components/explorer/RecentEventsTable';
import { ExplorerActions } from '@/components/explorer/ExplorerActions';
import { Layout } from '@/components/Layout';

export default function WalletExplorer() {
  const { address = '' } = useParams<{ address: string }>();
  const navigate = useNavigate();
  
  const {
    liveState,
    activitySummary,
    recentEvents,
    evmData,
    hasHypercore,
    hasHyperevm,
    isLoading,
    liveStateLoading,
    activityLoading,
    eventsLoading,
    error,
    refetchAll,
  } = useWalletExplorer(address);

  // Parse values from live state
  const accountValue = Number(liveState?.marginSummary?.accountValue || 0);
  const openPositions = liveState?.assetPositions?.length || 0;
  const marginUsed = Number(liveState?.marginSummary?.totalMarginUsed || 0);

  // Parse values from activity summary
  const pnl30d = activitySummary?.pnl30d || 0;
  const volume30d = activitySummary?.volume30d || 0;
  const trades30d = activitySummary?.trades30d || 0;
  const firstSeen = activitySummary?.firstSeen || null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explorer');
    }
  };

  if (!address) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No wallet address provided</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
        {/* Navigation */}
        <ExplorerActions
          entityType="wallet"
          entityId={address}
          title={`Wallet ${address.slice(0, 8)}...`}
          externalUrl={`https://purrsec.com/address/${address}`}
          onBack={handleBack}
          onRefresh={refetchAll}
          isRefreshing={isLoading}
        />

        {/* Header with address and badges */}
        <WalletExplorerHeader
          address={address}
          hasHypercore={hasHypercore}
          hasHyperevm={hasHyperevm}
          isContract={evmData?.isContract}
        />

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load wallet data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <WalletStatsGrid
          accountValue={accountValue}
          pnl30d={pnl30d}
          openPositions={openPositions}
          marginUsed={marginUsed}
          volume30d={volume30d}
          trades30d={trades30d}
          firstSeen={firstSeen}
          isLoading={liveStateLoading || activityLoading}
        />

        {/* Recent Activity */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground/90">Recent Activity</h2>
          <RecentEventsTable
            events={recentEvents}
            isLoading={eventsLoading}
          />
        </div>

        {/* Analytics CTA */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Want deeper insights on this wallet?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                View detailed PnL analytics, trade history, and performance metrics
              </p>
            </div>
            <Button asChild className="gap-2 shrink-0">
              <Link to={`/analytics?wallet=${address}`}>
                View Full Analytics
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* External links */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
            <a
              href={`https://app.hyperliquid.xyz/explorer/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Hyperliquid Explorer
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
            <a
              href={`https://purrsec.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Purrsec
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
