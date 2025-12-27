/**
 * Wallet Page - Terminal style UI
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useWalletSync } from '@/hooks/useWalletSync';
import { Layout } from '@/components/Layout';
import { WalletHero } from '@/components/wallet/WalletHero';
import { WalletMetrics } from '@/components/wallet/WalletMetrics';
import { WalletPositions } from '@/components/wallet/WalletPositions';
import { WalletActivity } from '@/components/wallet/WalletActivity';
import { DomainBreakdown } from '@/components/wallet/DomainBreakdown';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Copy, Check, ExternalLink, BarChart3, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

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
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="panel p-4">
            <div className="h-3 w-14 mb-2 bg-muted/30 rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncBanner({ 
  isSyncing, 
  syncComplete, 
  error, 
  progress, 
  estimatedTime,
  startedAt,
  onRetry,
  onManualSync,
  walletExists,
}: {
  isSyncing: boolean;
  syncComplete: boolean;
  error: string | null;
  progress: { 
    fills: number; 
    funding: number; 
    events: number; 
    days?: number; 
    volume?: number;
    hypercore?: { fills: number; funding: number };
    hyperevm?: { txs: number; tokens: number };
  } | null;
  estimatedTime: number | null;
  startedAt: number | null;
  onRetry: () => void;
  onManualSync: () => void;
  walletExists: boolean | undefined;
}) {
  const [elapsed, setElapsed] = useState(0);

  // Update elapsed time during sync
  useEffect(() => {
    if (!isSyncing || !startedAt) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSyncing, startedAt]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Show manual refresh button if wallet exists and not currently syncing
  if (walletExists && !isSyncing && !syncComplete && !error) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded border border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Refresh wallet data to get latest trades</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs" 
          onClick={onManualSync}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Sync Now
        </Button>
      </div>
    );
  }

  if (!isSyncing && !syncComplete && !error) return null;

  // Build chain-specific progress text
  const buildProgressText = () => {
    const parts: string[] = [];
    
    if (progress?.hypercore && (progress.hypercore.fills > 0 || progress.hypercore.funding > 0)) {
      parts.push(`Core: ${progress.hypercore.fills} trades, ${progress.hypercore.funding} funding`);
    }
    
    if (progress?.hyperevm && (progress.hyperevm.txs > 0 || progress.hyperevm.tokens > 0)) {
      parts.push(`EVM: ${progress.hyperevm.txs} txs, ${progress.hyperevm.tokens} tokens`);
    }
    
    // Fallback to legacy format
    if (parts.length === 0 && progress) {
      parts.push(`${progress.fills} trades, ${progress.funding} funding`);
      if (progress.volume) {
        parts.push(`$${(progress.volume / 1000).toFixed(1)}K volume`);
      }
    }
    
    return parts.join(' • ');
  };

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded border ${
      error 
        ? 'border-down/40 bg-down/10' 
        : syncComplete 
          ? 'border-up/40 bg-up/10' 
          : 'border-primary/40 bg-primary/10'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isSyncing ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
        ) : syncComplete ? (
          <CheckCircle2 className="h-4 w-4 text-up flex-shrink-0" />
        ) : (
          <RefreshCw className="h-4 w-4 text-down flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium truncate">
            {isSyncing 
              ? `Syncing HyperCore + HyperEVM... ${formatTime(elapsed)}${estimatedTime ? ` / ~${formatTime(estimatedTime)}` : ''}`
              : syncComplete 
                ? `Sync complete!`
                : `Sync failed: ${error}`
            }
          </span>
          {syncComplete && progress && (
            <span className="text-[10px] text-muted-foreground">
              {buildProgressText()}
            </span>
          )}
        </div>
      </div>
      {error && (
        <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
      {syncComplete && (
        <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={onManualSync}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      )}
    </div>
  );
}

export default function Wallet() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, timeframe, setTimeframe, pnlData, refetchFresh } = useUnifiedWallet(address);
  const { 
    isSyncing, 
    syncComplete, 
    error: syncError, 
    progress, 
    estimatedTime,
    startedAt,
    retrySync, 
    triggerManualSync,
    walletExists,
  } = useWalletSync(address);
  
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
            {/* Sync Banner */}
            <SyncBanner 
              isSyncing={isSyncing}
              syncComplete={syncComplete}
              error={syncError}
              progress={progress}
              estimatedTime={estimatedTime}
              startedAt={startedAt}
              onRetry={retrySync}
              onManualSync={triggerManualSync}
              walletExists={walletExists}
            />

            
            {/* Hero Section - with PnL timeframe selector */}
            <WalletHero
              totalValue={data?.totalValue || 0}
              hypercoreValue={data?.hypercoreValue || 0}
              hyperevmValue={data?.hyperevmValue || 0}
              pnl={pnlData.pnl}
              pnlPercent={pnlData.pnlPercent}
              pnlTimeframe={timeframe}
              onTimeframeChange={setTimeframe}
              domains={data?.domains || { hypercore: false, hyperevm: false }}
              firstSeen={data?.firstSeen || null}
              lastActive={data?.lastActive || null}
            />
            
            {/* Metrics Grid - with domain breakdown */}
            <WalletMetrics
              volume30d={data?.volume30d || 0}
              trades30d={data?.trades30d || 0}
              firstSeen={data?.firstSeen || null}
              totalTrades={data?.totalTrades || 0}
              winRate={data?.winRate || 0}
              hypercoreStats={data?.hypercoreStats ? {
                volume: data.hypercoreStats.volume30d,
                trades: data.hypercoreStats.trades30d,
                positions: data.hypercoreStats.positions,
              } : undefined}
              hyperevmStats={data?.hyperevmStats ? {
                volume: data.hyperevmStats.volume30d,
                txCount: data.hyperevmStats.txCount30d,
                tokenCount: data.hyperevmStats.tokenCount,
              } : undefined}
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
