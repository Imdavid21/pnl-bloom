import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenHeader } from '@/components/explorer/TokenHeader';
import { TokenStats } from '@/components/explorer/TokenStats';
import { TokenOverview } from '@/components/explorer/TokenOverview';
import { HyperCoreTrading } from '@/components/explorer/HyperCoreTrading';
import { TokenNotFound } from '@/components/explorer/TokenNotFound';
import { useTokenData, useTopTokenTraders, useHypercoreActivity } from '@/hooks/useTokenData';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { HYPERCORE_TOKENS } from '@/lib/token-resolver';

type TabType = 'overview' | 'hypercore' | 'hyperevm' | 'holders';

function TokenSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-20 mt-2" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-5 w-24 mt-2" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-96" />

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function Token() {
  const { identifier = '' } = useParams<{ identifier: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: tokenData, isLoading, error } = useTokenData(identifier);
  const { price, direction } = useTokenPrice(
    tokenData?.symbol || '', 
    tokenData?.currentPrice
  );
  const { data: topTraders = [], isLoading: loadingTraders } = useTopTokenTraders(
    tokenData?.symbol || ''
  );
  const { data: hypercoreActivity, isLoading: loadingActivity } = useHypercoreActivity(
    tokenData?.symbol || ''
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <TokenSkeleton />
        </div>
      </div>
    );
  }

  // Not found
  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <TokenNotFound identifier={identifier} />
        </div>
      </div>
    );
  }

  // Use real-time price if available
  const currentPrice = price > 0 ? price : tokenData.currentPrice;

  // Build tabs based on what data exists
  const tabs: { id: TabType; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'hypercore', label: 'HyperCore Trading', show: tokenData.chains.hypercore },
    { id: 'hyperevm', label: 'HyperEVM Details', show: tokenData.chains.hyperevm },
    { id: 'holders', label: 'Holders', show: tokenData.chains.hyperevm },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  // Get decimals from known tokens
  const decimals = HYPERCORE_TOKENS[tokenData.symbol]?.decimals;

  return (
    <>
      <Helmet>
        <title>{tokenData.symbol} - {tokenData.name} | Hype Explorer</title>
        <meta
          name="description"
          content={`View ${tokenData.name} (${tokenData.symbol}) price, trading activity, and on-chain data on Hyperliquid.`}
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <TokenHeader
              symbol={tokenData.symbol}
              name={tokenData.name}
              currentPrice={currentPrice}
              change24h={tokenData.change24h}
              priceDirection={direction}
              priceSource={tokenData.priceSource}
              chains={tokenData.chains}
              hyperevmAddress={tokenData.hyperevm?.contractAddress}
              type={tokenData.type}
            />

            {/* Stats */}
            <TokenStats
              totalSupply={tokenData.totalSupply}
              circulatingSupply={tokenData.circulatingSupply}
              volume24h={tokenData.hypercore?.volume24h || tokenData.hyperevm?.volume24h || 0}
              hypercoreVolume={tokenData.hypercore?.volume24h}
              hyperevmVolume={tokenData.hyperevm?.volume24h}
              holdersCount={tokenData.hyperevm?.holdersCount}
              symbol={tokenData.symbol}
              currentPrice={currentPrice}
              chains={tokenData.chains}
            />

            {/* Tabs */}
            <div className="border-b">
              <div className="flex gap-6 overflow-x-auto">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-3 text-sm font-medium whitespace-nowrap transition-colors relative",
                      activeTab === tab.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'overview' && (
                <TokenOverview
                  symbol={tokenData.symbol}
                  description={tokenData.description}
                  type={tokenData.type}
                  decimals={decimals}
                  links={tokenData.links}
                  chains={tokenData.chains}
                />
              )}

              {activeTab === 'hypercore' && tokenData.chains.hypercore && (
                <HyperCoreTrading
                  symbol={tokenData.symbol}
                  stats={tokenData.hypercore}
                  topTraders={topTraders}
                  recentTransfers={hypercoreActivity?.recentTransfers || []}
                  isLoading={loadingTraders || loadingActivity}
                />
              )}

              {activeTab === 'hyperevm' && tokenData.chains.hyperevm && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>HyperEVM contract details coming soon.</p>
                  {tokenData.hyperevm?.contractAddress && (
                    <p className="text-sm mt-2">
                      Contract: {tokenData.hyperevm.contractAddress}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'holders' && tokenData.chains.hyperevm && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Holder data not yet indexed.</p>
                  <p className="text-sm mt-2">Check back soon for top holders and distribution.</p>
                </div>
              )}
            </div>

            {/* Analytics CTA */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="text-4xl">
                  {tokenData.type === 'stablecoin' ? '💰' : '📊'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {tokenData.type === 'stablecoin'
                      ? `Track ${tokenData.symbol} Flows`
                      : `Follow ${tokenData.symbol} Holders`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tokenData.type === 'stablecoin'
                      ? 'Monitor large transfers and exchange movements'
                      : 'Get alerts on large holder movements and accumulation'}
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = `/analytics?token=${tokenData.symbol}`}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  {tokenData.type === 'stablecoin' ? 'Set Up Alerts →' : 'Track Whales →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
