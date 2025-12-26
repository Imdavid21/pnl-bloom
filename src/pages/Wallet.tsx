/**
 * Unified Wallet Page - Hyperliquid Design
 * Delta-4: High information density, instant insights
 * Single-column focus with glassmorphism panels
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { Layout } from '@/components/Layout';
import { WalletHeader } from '@/components/explorer/WalletHeader';
import { HeroStats } from '@/components/explorer/HeroStats';
import { MetricsGrid } from '@/components/explorer/MetricsGrid';
import { UnifiedPositions } from '@/components/explorer/UnifiedPositions';
import { UnifiedActivityFeed } from '@/components/explorer/UnifiedActivityFeed';
import { AnalyticsCTA } from '@/components/explorer/AnalyticsCTA';
import { selectCTA } from '@/lib/cta-selector';
import { hasHighRiskPositions } from '@/lib/risk-detector';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function WalletNotFound({ address }: { address: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
        <Search className="h-7 w-7 text-muted-foreground/30" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground/90">No activity found</h2>
        <p className="text-sm text-muted-foreground/50 max-w-sm">
          This address hasn&apos;t traded on Hyperliquid yet.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="mt-4">
        <Link to="/">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Explore Active Wallets
        </Link>
      </Button>
    </div>
  );
}

// Quick action bar for wallet
function QuickActions({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={copyAddress}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3 w-3 mr-1 text-profit" />
        ) : (
          <Copy className="h-3 w-3 mr-1" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <a
        href={`https://hyperliquid.xyz/explorer/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center h-7 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Explorer
      </a>
    </div>
  );
}

export default function Wallet() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useUnifiedWallet(address);
  const { data: positions } = useUnifiedPositions(address || '');
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  
  // Show address immediately from URL
  const displayAddress = address || '';
  const shortAddress = displayAddress.length > 16 
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : displayAddress;
  
  // Check if wallet has no activity
  const hasNoActivity = data && !data.domains.hypercore && !data.domains.hyperevm;
  
  if (!isLoading && (error || hasNoActivity)) {
    return (
      <Layout>
        <Helmet>
          <title>Wallet Not Found | HyperPNL</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-5xl px-4 py-8">
            <WalletNotFound address={displayAddress} />
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Helmet>
        <title>{shortAddress} | HyperPNL</title>
        <meta name="description" content={`View wallet ${shortAddress} activity on Hyperliquid - positions, PnL, and trading history.`} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
          {/* Top bar: Back + Actions */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <QuickActions address={displayAddress} />
          </div>
          
          {/* Header */}
          <WalletHeader
            address={displayAddress}
            domains={data?.domains || { hypercore: false, hyperevm: false }}
            firstSeen={data?.firstSeen || null}
            lastActive={data?.lastActive || null}
            tradesCount={data?.trades30d || 0}
          />
          
          {/* Hero Stats Panel */}
          <div className="panel">
            <HeroStats
              totalValue={data?.totalValue || 0}
              pnl30d={data?.pnl30d || 0}
              pnlPercent30d={data?.pnlPercent30d || 0}
              isLoading={isLoading}
              address={displayAddress}
            />
          </div>
          
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
          
          {/* Positions Panel */}
          <section className="panel">
            <div className="panel-body">
              <UnifiedPositions address={displayAddress} />
            </div>
          </section>
          
          {/* Activity Feed Panel */}
          <section id="activity" className="panel">
            <div className="panel-header">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent Activity
              </h2>
            </div>
            <div className="panel-body">
              <UnifiedActivityFeed address={displayAddress} />
            </div>
          </section>
          
          {/* Analytics CTA */}
          {!isLoading && (() => {
            const hasHighRisk = positions ? hasHighRiskPositions(positions) : false;
            const ctaConfig = selectCTA({
              winRate: data?.winRate || 0,
              pnl30d: data?.pnl30d || 0,
              trades30d: data?.trades30d || 0,
              hasHighRisk,
              address: displayAddress,
            });
            return <AnalyticsCTA config={ctaConfig} address={displayAddress} />;
          })()}
          
          {/* Chain indicator */}
          {data && !isLoading && (
            <p className="text-[10px] text-center text-muted-foreground/30 pb-4">
              {data.domains.hypercore && data.domains.hyperevm 
                ? 'Showing HyperCore + HyperEVM activity'
                : data.domains.hypercore 
                  ? 'Showing HyperCore activity only'
                  : 'Showing HyperEVM activity only'
              }
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
