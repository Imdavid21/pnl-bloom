// Token resolver - resolves symbol or address to unified token data

export interface TokenIdentity {
  symbol: string;
  name: string;
  type: 'symbol' | 'address';
  chains: {
    hypercore: boolean;
    hyperevm: boolean;
  };
  hyperevm_address?: string;
  decimals?: number;
}

// Known HyperCore spot tokens
export const HYPERCORE_TOKENS: Record<string, { name: string; decimals: number }> = {
  'USDC': { name: 'USD Coin', decimals: 6 },
  'HYPE': { name: 'Hyperliquid', decimals: 18 },
  'PURR': { name: 'Purr', decimals: 18 },
  'BTC': { name: 'Bitcoin', decimals: 8 },
  'ETH': { name: 'Ethereum', decimals: 18 },
  'SOL': { name: 'Solana', decimals: 9 },
  'JEFF': { name: 'Jeff', decimals: 18 },
  'PIP': { name: 'Pip', decimals: 18 },
};

// Known HyperEVM tokens (example addresses)
export const HYPEREVM_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  // Add known ERC20 addresses as they become available
};

export function isAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(input);
}

export function normalizeSymbol(input: string): string {
  return input.toUpperCase().replace('-PERP', '').replace('-SPOT', '');
}

export async function resolveToken(identifier: string): Promise<TokenIdentity | null> {
  // Check if it's an address
  if (isAddress(identifier)) {
    const knownToken = HYPEREVM_TOKENS[identifier.toLowerCase()];
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        name: knownToken.name,
        type: 'address',
        chains: { hypercore: false, hyperevm: true },
        hyperevm_address: identifier,
        decimals: knownToken.decimals,
      };
    }
    
    // Unknown address - assume it's an ERC20 on HyperEVM
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      type: 'address',
      chains: { hypercore: false, hyperevm: true },
      hyperevm_address: identifier,
    };
  }

  // It's a symbol
  const symbol = normalizeSymbol(identifier);
  const hypercoreToken = HYPERCORE_TOKENS[symbol];
  
  if (hypercoreToken) {
    return {
      symbol,
      name: hypercoreToken.name,
      type: 'symbol',
      chains: { hypercore: true, hyperevm: symbol !== 'BTC' && symbol !== 'SOL' },
      decimals: hypercoreToken.decimals,
    };
  }

  // Check if it's a valid perp market symbol
  const PERP_SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE', 'ARB', 'AVAX', 'SUI', 'OP', 'LINK', 'MATIC'];
  if (PERP_SYMBOLS.includes(symbol)) {
    return {
      symbol,
      name: symbol,
      type: 'symbol',
      chains: { hypercore: true, hyperevm: false },
    };
  }

  return null;
}

export function getTokenType(symbol: string): 'stablecoin' | 'governance' | 'utility' | 'wrapped' | null {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD'];
  const governance = ['HYPE', 'UNI', 'AAVE', 'MKR'];
  const wrapped = ['WBTC', 'WETH', 'WSTETH'];
  
  if (stablecoins.includes(symbol)) return 'stablecoin';
  if (governance.includes(symbol)) return 'governance';
  if (wrapped.includes(symbol)) return 'wrapped';
  
  return 'utility';
}

export function getTokenDescription(symbol: string): string | null {
  const descriptions: Record<string, string> = {
    'USDC': 'USD Coin (USDC) is a stablecoin pegged to the US Dollar, issued by Circle. It\'s widely used for trading and transfers across DeFi protocols.',
    'HYPE': 'HYPE is the native governance token of Hyperliquid. It\'s used for staking, governance voting, and earning protocol rewards.',
    'BTC': 'Bitcoin is the first and largest cryptocurrency by market cap. It serves as a store of value and is traded across all major exchanges.',
    'ETH': 'Ethereum is a decentralized platform for smart contracts. ETH is used for gas fees and as collateral across DeFi.',
    'SOL': 'Solana is a high-performance blockchain known for fast transactions and low fees. SOL is used for staking and network fees.',
    'PURR': 'PURR is a community token on Hyperliquid, originally launched as a meme token that gained significant traction.',
  };
  
  return descriptions[symbol] || null;
}

export function getTokenLinks(symbol: string): { website?: string; twitter?: string; docs?: string } | null {
  const links: Record<string, { website?: string; twitter?: string; docs?: string }> = {
    'USDC': {
      website: 'https://www.circle.com/usdc',
      twitter: 'https://twitter.com/circle',
      docs: 'https://developers.circle.com/docs',
    },
    'HYPE': {
      website: 'https://hyperliquid.xyz',
      twitter: 'https://twitter.com/HyperliquidX',
      docs: 'https://hyperliquid.gitbook.io/hyperliquid-docs/',
    },
    'BTC': {
      website: 'https://bitcoin.org',
      twitter: 'https://twitter.com/bitcoin',
    },
    'ETH': {
      website: 'https://ethereum.org',
      twitter: 'https://twitter.com/ethereum',
      docs: 'https://ethereum.org/developers',
    },
  };
  
  return links[symbol] || null;
}
