/**
 * Wallet Page - Terminal style UI
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { Layout } from '@/components/Layout';
import { WalletHero } from '@/components/wallet/WalletHero';
import { WalletMetrics } from '@/components/wallet/WalletMetrics';
import { WalletPositions } from '@/components/wallet/WalletPositions';
import { WalletActivity } from '@/components/wallet/WalletActivity';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Copy, Check, ExternalLink, BarChart3 } from 'lucide-react';
import { useState } from 'react';

function WalletNotFound({ address }: { address: string }) {
  return (
    <div className="panel flex flex-col items-center justify-center py-20 text-center border-dashed">
      <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <h2 className="font-mono text-base font-medium mb-1">No activity found</h2>
      <p className="text-[10px] text-muted-foreground mb-6 max-w-sm uppercase tracking-wider">
        This address hasn't traded on Hyperliquid yet.
      </p>
      <Button variant="outline" size="sm" className="text-xs h-7" asChild>
        <Link to="/">
          <ArrowLeft className="h-3 w-3 mr-2" />
          Explore Active Wallets
        </Link>
      </Button>
    </div>
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
    <div className="flex items-center gap-2 font-mono text-xs">
      <span className="text-muted-foreground truncate max-w-[180px] sm:max-w-none">
        {address}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={copyAddress}
      >
        {copied ? (
          <Check className="h-3 w-3 text-up" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        asChild
      >
        <a
          href={`https://hyperliquid.xyz/explorer/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 bg-muted/30 rounded animate-pulse" />
        <div className="h-6 w-48 bg-muted/30 rounded animate-pulse" />
      </div>
      <div className="panel p-6">
        <div className="space-y-4">
          <div className="h-3 w-24 mx-auto bg-muted/30 rounded animate-pulse" />
          <div className="h-10 w-36 mx-auto bg-muted/30 rounded animate-pulse" />
          <div className="h-5 w-20 mx-auto bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="panel p-4">
            <div className="h-3 w-14 mb-2 bg-muted/30 rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Wallet() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useUnifiedWallet(address);
  
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
  
  if (!isLoading && (error || hasNoActivity)) {
    return (
      <Layout>
        <Helmet>
          <title>Wallet Not Found | HyperPNL</title>
        </Helmet>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mb-6 -ml-2 text-xs h-7"
          >
            <ArrowLeft className="h-3 w-3 mr-2" />
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
      
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="-ml-2 text-xs h-7"
          >
            <ArrowLeft className="h-3 w-3 mr-2" />
            Back
          </Button>
          <AddressBar address={displayAddress} />
        </div>
        
        {isLoading ? (
          <WalletSkeleton />
        ) : (
          <>
            {/* CTA Banner */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded border border-border/40 bg-muted/20">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs text-foreground font-medium">Advanced Analytics</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                <Link to={`/analytics/${displayAddress}`}>Explore Advanced Analytics</Link>
              </Button>
            </div>
            
            {/* Hero Section */}
            <WalletHero
              totalValue={data?.totalValue || 0}
              pnl30d={data?.pnl30d || 0}
              pnlPercent30d={data?.pnlPercent30d || 0}
              domains={data?.domains || { hypercore: false, hyperevm: false }}
              firstSeen={data?.firstSeen || null}
              lastActive={data?.lastActive || null}
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
            
            {/* Activity & Position History (merged) */}
            <WalletActivity address={displayAddress} />
            
            {/* Chain indicator */}
            {data && (
              <p className="text-[10px] text-center text-muted-foreground/40 pt-4 font-mono uppercase tracking-wider">
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