import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMarketSpecs, calculateTimeUntilFunding } from '@/lib/market-calculator';

interface MarketMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

interface AssetContext {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  impactPxs: string[];
}

export interface MarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  markPrice: number;
  indexPrice: number;
  change24h: {
    absolute: number;
    percentage: number;
  };
  stats24h: {
    volume: number;
    tradesCount: number;
    high: number;
    low: number;
  };
  openInterest: number;
  activePositions: number;
  fundingRate: number;
  nextFunding: { hours: number; minutes: number; seconds: number };
  specs: {
    tickSize: number;
    minOrderSize: number;
    maxLeverage: number;
    makerFee: number;
    takerFee: number;
  };
}

async function fetchMarketData(symbol: string): Promise<MarketData> {
  // Fetch from Hyperliquid API via proxy
  const { data: metaAndCtx, error } = await supabase.functions.invoke('hyperliquid-proxy', {
    body: { type: 'metaAndAssetCtxs' }
  });

  if (error) throw error;

  const [meta, assetCtxs] = metaAndCtx as [{ universe: MarketMeta[] }, AssetContext[]];
  
  // Find the market index
  const marketIndex = meta.universe.findIndex(
    m => m.name.toUpperCase() === symbol.toUpperCase()
  );

  if (marketIndex === -1) {
    throw new Error('Market not found');
  }

  const marketMeta = meta.universe[marketIndex];
  const ctx = assetCtxs[marketIndex];

  const currentPrice = parseFloat(ctx.midPx) || 0;
  const markPrice = parseFloat(ctx.markPx) || currentPrice;
  const prevDayPrice = parseFloat(ctx.prevDayPx) || currentPrice;
  const volume24h = parseFloat(ctx.dayNtlVlm) || 0;
  const openInterest = parseFloat(ctx.openInterest) || 0;
  const fundingRate = parseFloat(ctx.funding) || 0;

  const change24h = {
    absolute: currentPrice - prevDayPrice,
    percentage: prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0
  };

  const specs = getMarketSpecs(symbol);

  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()}-PERP`,
    currentPrice,
    markPrice,
    indexPrice: markPrice, // Using mark as index approximation
    change24h,
    stats24h: {
      volume: volume24h,
      tradesCount: Math.floor(volume24h / 50000), // Estimate
      high: currentPrice * 1.02, // Approximation
      low: currentPrice * 0.98,
    },
    openInterest,
    activePositions: Math.floor(openInterest / 10000), // Estimate
    fundingRate,
    nextFunding: calculateTimeUntilFunding(),
    specs: {
      tickSize: specs.tickSize,
      minOrderSize: specs.minOrderSize,
      maxLeverage: marketMeta.maxLeverage || specs.maxLeverage,
      makerFee: specs.makerFee,
      takerFee: specs.takerFee,
    }
  };
}

export function useMarketData(symbol: string) {
  return useQuery({
    queryKey: ['market-data', symbol],
    queryFn: () => fetchMarketData(symbol),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
    retry: 2,
  });
}

// Check if market exists
export function useMarketExists(symbol: string) {
  return useQuery({
    queryKey: ['market-exists', symbol],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('hyperliquid-proxy', {
        body: { type: 'meta' }
      });
      
      if (error) return false;
      
      const markets = (data as { universe: MarketMeta[] }).universe;
      return markets.some(m => m.name.toUpperCase() === symbol.toUpperCase());
    },
    staleTime: 60000,
  });
}
