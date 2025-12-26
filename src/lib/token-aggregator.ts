// Token data aggregator - merges data from multiple sources

import { TokenIdentity } from './token-resolver';

export interface UnifiedTokenData {
  symbol: string;
  name: string;
  iconUrl?: string;
  
  // Price
  currentPrice: number;
  priceSource: 'oracle' | 'dex' | 'spot';
  change24h: {
    absolute: number;
    percentage: number;
  };
  
  // Supply
  totalSupply?: number;
  circulatingSupply?: number;
  
  // Chains
  chains: {
    hypercore: boolean;
    hyperevm: boolean;
  };
  
  // HyperCore data
  hypercore?: {
    volume24h: number;
    trades24h: number;
    uniqueTraders24h: number;
  };
  
  // HyperEVM data
  hyperevm?: {
    contractAddress: string;
    decimals: number;
    holdersCount?: number;
    deployer?: string;
    deployedAt?: Date;
    volume24h?: number;
  };
  
  // Metadata
  description?: string;
  type?: 'stablecoin' | 'governance' | 'utility' | 'wrapped';
  links?: {
    website?: string;
    twitter?: string;
    docs?: string;
  };
}

export interface HypercoreStats {
  volume24h: number;
  trades24h: number;
  uniqueTraders24h: number;
  recentTransfers: Array<{
    id: string;
    timestamp: Date;
    type: 'in' | 'out';
    amount: number;
    wallet: string;
  }>;
}

export interface TopTrader {
  rank: number;
  walletAddress: string;
  volume: number;
  trades: number;
}

export function aggregateTokenData(
  identity: TokenIdentity,
  priceData: { price: number; change24h: number; source: string } | null,
  hypercoreData: HypercoreStats | null,
  hyperevmData: { address: string; decimals: number; totalSupply: number; holders?: number } | null,
  metadata: { description?: string; links?: Record<string, string> } | null
): UnifiedTokenData {
  const currentPrice = priceData?.price || 0;
  const prevPrice = currentPrice / (1 + (priceData?.change24h || 0) / 100);
  
  return {
    symbol: identity.symbol,
    name: identity.name,
    currentPrice,
    priceSource: priceData?.source === 'oracle' ? 'oracle' : priceData?.source === 'dex' ? 'dex' : 'spot',
    change24h: {
      absolute: currentPrice - prevPrice,
      percentage: priceData?.change24h || 0,
    },
    totalSupply: hyperevmData?.totalSupply,
    chains: identity.chains,
    hypercore: hypercoreData ? {
      volume24h: hypercoreData.volume24h,
      trades24h: hypercoreData.trades24h,
      uniqueTraders24h: hypercoreData.uniqueTraders24h,
    } : undefined,
    hyperevm: hyperevmData ? {
      contractAddress: hyperevmData.address,
      decimals: hyperevmData.decimals,
      holdersCount: hyperevmData.holders,
    } : undefined,
    description: metadata?.description,
    links: metadata?.links ? {
      website: metadata.links.website,
      twitter: metadata.links.twitter,
      docs: metadata.links.docs,
    } : undefined,
  };
}

export function formatTokenAmount(amount: number, decimals: number = 6): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function isPeggedToken(symbol: string): boolean {
  return ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'].includes(symbol);
}

export function checkPegHealth(symbol: string, price: number): { healthy: boolean; deviation: number } {
  if (!isPeggedToken(symbol)) {
    return { healthy: true, deviation: 0 };
  }
  
  const deviation = Math.abs(price - 1) * 100;
  return {
    healthy: deviation < 1,
    deviation,
  };
}
