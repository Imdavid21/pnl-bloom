/**
 * Unified Wallet Page
 * Displays HyperCore + HyperEVM data in one seamless view
 * Steve Jobs design: Focus on what matters, zero clutter
 */

import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { WalletHeader } from '@/components/explorer/WalletHeader';
import { HeroStats } from '@/components/explorer/HeroStats';
import { MetricsGrid } from '@/components/explorer/MetricsGrid';
import { UnifiedActivityFeed } from '@/components/explorer/UnifiedActivityFeed';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';

function WalletNotFound({ address }: { address: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
        <Search className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground/90">No activity found</h2>
        <p className="text-sm text-muted-foreground/60 max-w-sm">
          This address hasn&apos;t traded on Hyperliquid yet.
        </p>
      </div>
      <Button variant="outline" asChild className="mt-4">
        <Link to="/explorer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Explore Active Wallets
        </Link>
      </Button>
    </div>
  );
}

export default function Wallet() {
  const { address } = useParams<{ address: string }>();
  const { data, isLoading, error } = useUnifiedWallet(address);
  
  // Show address immediately from URL
  const displayAddress = address || '';
  const shortAddress = displayAddress.length > 16 
    ? `${displayAddress.slice(0, 8)}...${displayAddress.slice(-6)}`
    : displayAddress;
  
  // Check if wallet has no activity
  const hasNoActivity = data && !data.domains.hypercore && !data.domains.hyperevm;
  
  if (!isLoading && (error || hasNoActivity)) {
    return (
      <>
        <Helmet>
          <title>Wallet Not Found | HyperPNL Explorer</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <WalletNotFound address={displayAddress} />
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>{shortAddress} | HyperPNL Explorer</title>
        <meta name="description" content={`View wallet ${shortAddress} activity on Hyperliquid - positions, PnL, and trading history across HyperCore and HyperEVM.`} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-10">
          {/* Back navigation */}
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="text-muted-foreground/60 hover:text-foreground -ml-2"
          >
            <Link to="/explorer">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Explorer
            </Link>
          </Button>
          
          {/* Header */}
          <WalletHeader
            address={displayAddress}
            domains={data?.domains || { hypercore: false, hyperevm: false }}
            firstSeen={data?.firstSeen || null}
            lastActive={data?.lastActive || null}
            tradesCount={data?.trades30d || 0}
          />
          
          {/* Hero: Total Account Value */}
          <HeroStats
            totalValue={data?.totalValue || 0}
            pnl30d={data?.pnl30d || 0}
            pnlPercent30d={data?.pnlPercent30d || 0}
            isLoading={isLoading}
          />
          
          {/* Metrics Grid */}
          <MetricsGrid
            openPositions={data?.openPositions || 0}
            marginUsed={data?.marginUsed || 0}
            volume30d={data?.volume30d || 0}
            trades30d={data?.trades30d || 0}
            pnl30d={data?.pnl30d || 0}
            pnlPercent30d={data?.pnlPercent30d || 0}
            winRate={data?.winRate || 0}
            wins={data?.wins || 0}
            totalTrades={data?.totalTrades || 0}
            isLoading={isLoading}
          />
          
          {/* Activity Feed */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground/50">
              Recent Activity
            </h2>
            <UnifiedActivityFeed address={displayAddress} />
          </section>
          
          {/* Partial data warning */}
          {data && !isLoading && data.domains.hypercore && !data.domains.hyperevm && (
            <p className="text-xs text-center text-muted-foreground/40">
              Showing HyperCore activity only
            </p>
          )}
          {data && !isLoading && !data.domains.hypercore && data.domains.hyperevm && (
            <p className="text-xs text-center text-muted-foreground/40">
              Showing HyperEVM activity only
            </p>
          )}
        </div>
      </div>
    </>
  );
}
