import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Skeleton } from '@/components/ui/skeleton';
import { Layout } from '@/components/Layout';
import { MarketHeader } from '@/components/explorer/MarketHeader';
import { MarketStats } from '@/components/explorer/MarketStats';
import { TopTradersTable } from '@/components/explorer/TopTradersTable';
import { RecentTradesTable } from '@/components/explorer/RecentTradesTable';
import { MarketSidebar } from '@/components/explorer/MarketSidebar';
import { MarketNotFound } from '@/components/explorer/MarketNotFound';
import { useMarketData, useMarketExists } from '@/hooks/useMarketData';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useTopTraders } from '@/hooks/useTopTraders';
import { useRecentTrades } from '@/hooks/useRecentTrades';

function MarketSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 flex flex-col items-center">
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-6 w-32 mt-2" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    </div>
  );
}

export default function Market() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const normalizedSymbol = symbol.toUpperCase();
  
  const { data: exists, isLoading: checkingExists } = useMarketExists(normalizedSymbol);
  const { data: marketData, isLoading: loadingMarket, error } = useMarketData(normalizedSymbol);
  const { price, direction } = useMarketPrice(normalizedSymbol, marketData?.currentPrice);
  const { data: topTraders = [], isLoading: loadingTraders } = useTopTraders(normalizedSymbol);
  const { trades, isLoading: loadingTrades } = useRecentTrades(normalizedSymbol);

  // Loading state
  if (checkingExists || loadingMarket) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <MarketSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  // Market not found
  if (exists === false || error) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <MarketNotFound symbol={normalizedSymbol} />
          </div>
        </div>
      </Layout>
    );
  }

  if (!marketData) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <MarketSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  // Use real-time price if available
  const currentPrice = price > 0 ? price : marketData.currentPrice;
  const change24h = price > 0 
    ? {
        absolute: price - (price / (1 + marketData.change24h.percentage / 100)),
        percentage: marketData.change24h.percentage
      }
    : marketData.change24h;

  return (
    <Layout>
      <Helmet>
        <title>{normalizedSymbol}-PERP | Hyperliquid Market | Hype Explorer</title>
        <meta 
          name="description" 
          content={`Track ${normalizedSymbol} perpetual futures on Hyperliquid. Real-time prices, top traders, recent trades, and market analytics.`} 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          <div className="space-y-6 md:space-y-8">
            {/* Header with Hero Price */}
            <MarketHeader
              symbol={normalizedSymbol}
              name={marketData.name}
              currentPrice={currentPrice}
              markPrice={marketData.markPrice}
              indexPrice={marketData.indexPrice}
              change24h={change24h}
              priceDirection={direction}
            />

            {/* Stats Grid */}
            <MarketStats
              volume24h={marketData.stats24h.volume}
              tradesCount={marketData.stats24h.tradesCount}
              openInterest={marketData.openInterest}
              activePositions={marketData.activePositions}
              fundingRate={marketData.fundingRate}
              high24h={marketData.stats24h.high}
              low24h={marketData.stats24h.low}
            />

            {/* Main Content + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                {/* Top Traders */}
                <TopTradersTable
                  traders={topTraders}
                  isLoading={loadingTraders}
                  symbol={normalizedSymbol}
                />

                {/* Recent Trades */}
                <RecentTradesTable
                  trades={trades}
                  isLoading={loadingTrades}
                  symbol={normalizedSymbol}
                />
              </div>

              {/* Sidebar */}
              <div className="hidden lg:block">
                <MarketSidebar
                  symbol={normalizedSymbol}
                  specs={marketData.specs}
                  fundingRate={marketData.fundingRate}
                />
              </div>
            </div>

            {/* Mobile Sidebar (below content) */}
            <div className="lg:hidden">
              <MarketSidebar
                symbol={normalizedSymbol}
                specs={marketData.specs}
                fundingRate={marketData.fundingRate}
              />
            </div>

            {/* Analytics CTA */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="text-4xl">🎯</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    Follow Profitable {normalizedSymbol} Traders
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get real-time alerts when top performers open positions in this market
                  </p>
                </div>
                <button 
                  onClick={() => window.location.href = `/analytics?market=${normalizedSymbol}`}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Set Up Alerts →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
