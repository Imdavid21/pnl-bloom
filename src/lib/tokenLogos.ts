// Token logo mapping with contract addresses for HyperEVM tokens
// Uses multiple fallback sources for logos

export interface TokenInfo {
  symbol: string;
  name: string;
  address?: string;
  logoUrl: string;
  decimals?: number;
}

// CDN sources for token logos
const TRUST_WALLET_ASSETS = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';
const COINGECKO_CDN = 'https://assets.coingecko.com/coins/images';

// Primary tokens with verified addresses on HyperEVM
export const TOKEN_REGISTRY: Record<string, TokenInfo> = {
  // Native & Core
  HYPE: {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  WHYPE: {
    symbol: 'WHYPE',
    name: 'Wrapped HYPE',
    address: '0x5555555555555555555555555555555555555555',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  
  // Major Crypto
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    logoUrl: `${TRUST_WALLET_ASSETS}/ethereum/info/logo.png`,
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    logoUrl: `${TRUST_WALLET_ASSETS}/bitcoin/info/logo.png`,
  },
  
  // Unit Protocol tokens
  UBTC: {
    symbol: 'UBTC',
    name: 'Unit Bitcoin',
    logoUrl: `${COINGECKO_CDN}/35825/standard/ubtc.png`,
  },
  UETH: {
    symbol: 'UETH',
    name: 'Unit Ethereum',
    logoUrl: `${COINGECKO_CDN}/35826/standard/ueth.png`,
  },
  UFART: {
    symbol: 'UFART',
    name: 'Unit Fartcoin',
    logoUrl: `${COINGECKO_CDN}/52171/standard/ufart.png`,
  },
  
  // Stablecoins
  USDC: {
    symbol: 'USDC',
    name: 'USDC',
    address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
    logoUrl: `${TRUST_WALLET_ASSETS}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'USD₮0',
    address: '0xB8CE59FC3717ada4C02eaDF9682A9E934F625ebb',
    logoUrl: `${TRUST_WALLET_ASSETS}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
    decimals: 6,
  },
  USDH: {
    symbol: 'USDH',
    name: 'USDH',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/usdh.svg',
  },
  USDE: {
    symbol: 'USDE',
    name: 'USDeOFT',
    logoUrl: `${COINGECKO_CDN}/33613/standard/usde.png`,
  },
  FEUSD: {
    symbol: 'feUSD',
    name: 'feUSD',
    logoUrl: `${COINGECKO_CDN}/36529/standard/feusd.png`,
  },
  HUSD: {
    symbol: 'HUSD',
    name: 'Hyper USD',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/usdh.svg',
  },
  LASTUSD: {
    symbol: 'LASTUSD',
    name: 'Last USD',
    logoUrl: `${COINGECKO_CDN}/52897/standard/lastusd.png`,
  },
  USDP: {
    symbol: 'USDp',
    name: 'USDp',
    logoUrl: `${COINGECKO_CDN}/52898/standard/usdp.png`,
  },
  KEI: {
    symbol: 'KEI',
    name: 'KEI Stablecoin',
    logoUrl: `${COINGECKO_CDN}/35024/standard/kei.png`,
  },
  FRAXUSD: {
    symbol: 'frxUSD',
    name: 'Frax USD',
    logoUrl: `${COINGECKO_CDN}/39873/standard/frxusd.png`,
  },
  SFRAXUSD: {
    symbol: 'sfrxUSD',
    name: 'Staked Frax USD',
    logoUrl: `${COINGECKO_CDN}/39874/standard/sfrxusd.png`,
  },
  
  // Kinetiq tokens
  KHYPE: {
    symbol: 'kHYPE',
    name: 'Kinetiq Staked HYPE',
    logoUrl: 'https://raw.githubusercontent.com/kinetiq-protocol/brand-assets/main/khype.png',
  },
  KQ: {
    symbol: 'KQ',
    name: 'Kinetiq Governance Token',
    logoUrl: 'https://raw.githubusercontent.com/kinetiq-protocol/brand-assets/main/kq.png',
  },
  KMLST: {
    symbol: 'kmLST',
    name: 'Kinetiq Markets LST',
    logoUrl: 'https://raw.githubusercontent.com/kinetiq-protocol/brand-assets/main/kmlst.png',
  },
  
  // Staked HYPE variants
  SHYPE: {
    symbol: 'sHYPE',
    name: 'Staked HYPE Shares',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  STHYPE: {
    symbol: 'stHYPE',
    name: 'Staked HYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  LHYPE: {
    symbol: 'lHYPE',
    name: 'Looped HYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  MHYPE: {
    symbol: 'mHYPE',
    name: 'Hyperpie Staked mHYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  UHYPE: {
    symbol: 'uHYPE',
    name: 'Hyperbeat Ultra HYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  HAHYPE: {
    symbol: 'haHYPE',
    name: 'haHYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  LHYY: {
    symbol: 'lHYY',
    name: 'Liquid HYPE Yield',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  HKHYPE: {
    symbol: 'hkHYPE',
    name: 'Harmonix kHYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  EFHYPE: {
    symbol: 'efHYPE',
    name: 'hyperbeat x ether.fi HYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  
  // Hyperbeat tokens
  HBUSDT: {
    symbol: 'hbUSDT',
    name: 'Hyperbeat USDT',
    logoUrl: `${TRUST_WALLET_ASSETS}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  },
  
  // HLP tokens
  HWHLP: {
    symbol: 'hwHLP',
    name: 'hwHLP',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hlp.svg',
  },
  WHLP: {
    symbol: 'wHLP',
    name: 'Wrapped HLP',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hlp.svg',
  },
  
  // Memecoins & Community
  PURR: {
    symbol: 'PURR',
    name: 'Purr',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/purr.svg',
  },
  HFUN: {
    symbol: 'HFUN',
    name: 'HFUN',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hfun.svg',
  },
  WGC: {
    symbol: 'WGC',
    name: 'Wild Goat Coin',
    logoUrl: `${COINGECKO_CDN}/52172/standard/wgc.png`,
  },
  LICKO: {
    symbol: 'LICKO',
    name: 'LICKO',
    logoUrl: `${COINGECKO_CDN}/52173/standard/licko.png`,
  },
  PIP: {
    symbol: 'PiP',
    name: 'PiP',
    logoUrl: `${COINGECKO_CDN}/52174/standard/pip.png`,
  },
  ARB: {
    symbol: 'ARB',
    name: 'alright buddy',
    logoUrl: `${COINGECKO_CDN}/52175/standard/arb.png`,
  },
  KITTEN: {
    symbol: 'KITTEN',
    name: 'Kittenswap',
    logoUrl: `${COINGECKO_CDN}/52176/standard/kitten.png`,
  },
  SWAP: {
    symbol: 'SWAP',
    name: 'Swap',
    logoUrl: `${COINGECKO_CDN}/52177/standard/swap.png`,
  },
  
  // DeFi Protocols
  RELEND: {
    symbol: 'rUSDC',
    name: 'Relend Network USDC',
    logoUrl: `${COINGECKO_CDN}/52178/standard/relend.png`,
  },
  AMPED: {
    symbol: 'AMPED',
    name: 'Amped Finance',
    logoUrl: `${COINGECKO_CDN}/52179/standard/amped.png`,
  },
  PENDLE: {
    symbol: 'PENDLE',
    name: 'Pendle',
    logoUrl: `${COINGECKO_CDN}/15069/standard/pendle.png`,
  },
  PRFI: {
    symbol: 'PRFI',
    name: 'PRFI',
    logoUrl: `${COINGECKO_CDN}/52180/standard/prfi.png`,
  },
  ANZ: {
    symbol: 'ANZ',
    name: 'Anzen Token',
    logoUrl: `${COINGECKO_CDN}/52181/standard/anz.png`,
  },
  LC: {
    symbol: 'LC',
    name: 'Looping Collective',
    logoUrl: `${COINGECKO_CDN}/52182/standard/lc.png`,
  },
  LL: {
    symbol: 'LL',
    name: 'LiquidLaunch',
    logoUrl: `${COINGECKO_CDN}/52183/standard/ll.png`,
  },
  HOLY: {
    symbol: 'HOLY',
    name: 'Holy Liquid',
    logoUrl: `${COINGECKO_CDN}/52184/standard/holy.png`,
  },
  VISION: {
    symbol: 'VISION',
    name: 'Vision',
    logoUrl: `${COINGECKO_CDN}/52185/standard/vision.png`,
  },
  HYPERTRICS: {
    symbol: 'HYPERTRICS',
    name: 'HYPERTRICS',
    logoUrl: `${COINGECKO_CDN}/52186/standard/hypertrics.png`,
  },
  SATLAYER: {
    symbol: 'SAT',
    name: 'SatLayer',
    logoUrl: `${COINGECKO_CDN}/52187/standard/satlayer.png`,
  },
  HYPERSTABLE: {
    symbol: 'HS',
    name: 'Hyperstable',
    logoUrl: `${COINGECKO_CDN}/52188/standard/hyperstable.png`,
  },
  
  // Frax tokens
  FRXETH: {
    symbol: 'frxETH',
    name: 'Frax Ether',
    logoUrl: `${COINGECKO_CDN}/28284/standard/frxeth.png`,
  },
  SFRXETH: {
    symbol: 'sfrxETH',
    name: 'Staked Frax Ether',
    logoUrl: `${COINGECKO_CDN}/28285/standard/sfrxeth.png`,
  },
  WFRAX: {
    symbol: 'wFRAX',
    name: 'Wrapped Frax',
    logoUrl: `${COINGECKO_CDN}/13422/standard/frax.png`,
  },
  FPI: {
    symbol: 'FPI',
    name: 'Frax Price Index',
    logoUrl: `${COINGECKO_CDN}/24945/standard/fpi.png`,
  },
  
  // BTC variants
  THBILL: {
    symbol: 'thBILL',
    name: 'thBILL',
    logoUrl: `${COINGECKO_CDN}/52189/standard/thbill.png`,
  },
  BRBTC: {
    symbol: 'brBTC',
    name: 'brBTC',
    logoUrl: `${COINGECKO_CDN}/52190/standard/brbtc.png`,
  },
  UNIBTC: {
    symbol: 'uniBTC',
    name: 'uniBTC',
    logoUrl: `${COINGECKO_CDN}/38965/standard/unibtc.png`,
  },
  
  // Gold
  XAUT: {
    symbol: 'XAUT',
    name: 'Tether Gold',
    logoUrl: `${COINGECKO_CDN}/8834/standard/xaut.png`,
  },
};

// Symbol normalization map for case-insensitive lookup
const SYMBOL_NORMALIZE: Record<string, string> = {
  'wrapped hype': 'WHYPE',
  'whype': 'WHYPE',
  'khype': 'KHYPE',
  'shype': 'SHYPE',
  'sthype': 'STHYPE',
  'lhype': 'LHYPE',
  'mhype': 'MHYPE',
  'uhype': 'UHYPE',
  'hahype': 'HAHYPE',
  'efhype': 'EFHYPE',
  'hkhype': 'HKHYPE',
  'lhyy': 'LHYY',
  'usdc': 'USDC',
  'usdt': 'USDT',
  'usd₮0': 'USDT',
  'frxeth': 'FRXETH',
  'sfrxeth': 'SFRXETH',
  'frxusd': 'FRAXUSD',
  'sfrxusd': 'SFRAXUSD',
  'wfrax': 'WFRAX',
  'feusd': 'FEUSD',
  'fpi': 'FPI',
};

/**
 * Get token info by symbol
 */
export function getTokenInfo(symbol: string): TokenInfo | null {
  const upper = symbol.toUpperCase();
  
  // Direct lookup
  if (TOKEN_REGISTRY[upper]) {
    return TOKEN_REGISTRY[upper];
  }
  
  // Normalized lookup
  const normalized = SYMBOL_NORMALIZE[symbol.toLowerCase()];
  if (normalized && TOKEN_REGISTRY[normalized]) {
    return TOKEN_REGISTRY[normalized];
  }
  
  return null;
}

/**
 * Get token logo URL with fallback
 */
export function getTokenLogoUrl(symbol: string): string {
  const info = getTokenInfo(symbol);
  if (info?.logoUrl) {
    return info.logoUrl;
  }
  
  // Fallback to Hyperliquid icon path
  return `https://app.hyperliquid.xyz/icons/tokens/${symbol.toLowerCase()}.svg`;
}

/**
 * Generic fallback logo for unknown tokens
 */
export const FALLBACK_TOKEN_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzM0Mzg0MCIvPjx0ZXh0IHg9IjE2IiB5PSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5YTFhOCIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPj88L3RleHQ+PC9zdmc+';
