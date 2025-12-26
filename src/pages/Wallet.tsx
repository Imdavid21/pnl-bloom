/**
 * Wallet Page - Minimal shadcn UI
 * Clean, responsive, interactive design
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { Layout } from '@/components/Layout';
import { WalletHero } from '@/components/wallet/WalletHero';
import { WalletMetrics } from '@/components/wallet/WalletMetrics';
import { WalletPositions } from '@/components/wallet/WalletPositions';
import { WalletActivity } from '@/components/wallet/WalletActivity';
import { WalletCTA } from '@/components/wallet/WalletCTA';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { selectCTA } from '@/lib/cta-selector';
import { hasHighRiskPositions } from '@/lib/risk-detector';

function WalletNotFound({ address }: { address: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium mb-1">No activity found</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        This address hasn't traded on Hyperliquid yet.
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Explore Active Wallets
        </Link>
      </Button>
    </Card>
  );
}

function AddressBar({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-none">
        {address}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={copyAddress}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        asChild
      >
        <a
          href={`https://hyperliquid.xyz/explorer/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-10 w-40 mx-auto" />
          <Skeleton className="h-5 w-24 mx-auto" />
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </Card>
        ))}
      </div>
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
  
  const displayAddress = address || '';
  const shortAddress = displayAddress.length > 16 
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : displayAddress;
  
  const hasNoActivity = data && !data.domains.hypercore && !data.domains.hyperevm;
  
  // CTA config
  const ctaConfig = !isLoading && data ? selectCTA({
    winRate: data.winRate || 0,
    pnl30d: data.pnl30d || 0,
    trades30d: data.trades30d || 0,
    hasHighRisk: positions ? hasHighRiskPositions(positions) : false,
    address: displayAddress,
  }) : null;
  
  if (!isLoading && (error || hasNoActivity)) {
    return (
      <Layout>
        <Helmet>
          <title>Wallet Not Found | HyperPNL</title>
        </Helmet>
        <div className="container max-w-4xl py-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <WalletNotFound address={displayAddress} />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Helmet>
        <title>{shortAddress} | HyperPNL</title>
        <meta name="description" content={`View wallet ${shortAddress} activity on Hyperliquid.`} />
      </Helmet>
      
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="-ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <AddressBar address={displayAddress} />
        </div>
        
        {isLoading ? (
          <WalletSkeleton />
        ) : (
          <>
            {/* Hero Section */}
            <WalletHero
              totalValue={data?.totalValue || 0}
              pnl30d={data?.pnl30d || 0}
              pnlPercent30d={data?.pnlPercent30d || 0}
              domains={data?.domains || { hypercore: false, hyperevm: false }}
              firstSeen={data?.firstSeen || null}
              lastActive={data?.lastActive || null}
              address={displayAddress}
            />
            
            {/* Metrics Grid */}
            <WalletMetrics
              openPositions={data?.openPositions || 0}
              marginUsed={data?.marginUsed || 0}
              volume30d={data?.volume30d || 0}
              trades30d={data?.trades30d || 0}
              pnl30d={data?.pnl30d || 0}
              winRate={data?.winRate || 0}
              wins={data?.wins || 0}
              totalTrades={data?.totalTrades || 0}
            />
            
            {/* Positions */}
            <WalletPositions address={displayAddress} />
            
            {/* Activity Feed */}
            <WalletActivity address={displayAddress} />
            
            {/* CTA */}
            {ctaConfig && (
              <WalletCTA config={ctaConfig} address={displayAddress} />
            )}
            
            {/* Chain indicator */}
            {data && (
              <p className="text-xs text-center text-muted-foreground/50 pt-4">
                {data.domains.hypercore && data.domains.hyperevm 
                  ? 'HyperCore + HyperEVM'
                  : data.domains.hypercore 
                    ? 'HyperCore'
                    : 'HyperEVM'
                }
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
