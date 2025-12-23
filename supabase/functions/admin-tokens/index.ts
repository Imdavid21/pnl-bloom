import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_PASSWORD = '1234';
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

interface TokenInfo {
  symbol: string;
  name: string;
  address?: string;
  price: number;
  volume24h: number;
  volume7d?: number;
  volume30d?: number;
  openInterest: number;
  fundingRate: number;
  category: string;
  assetId?: string;
  // Enhanced fields
  logoUrl?: string;
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  priceHistory?: { time: number; price: number }[];
  volumeHistory?: { time: number; volume: number }[];
  topHolders?: { address: string; balance: number; percentage: number }[];
  szDecimals?: number;
}

// Token logo mappings
const TOKEN_LOGOS: Record<string, string> = {
  HYPE: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  PURR: 'https://app.hyperliquid.xyz/icons/tokens/purr.svg',
  BTC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
  ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  SOL: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  ARB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  OP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  MATIC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  AVAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/standard/chainlink.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/standard/uni.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png',
  CRV: 'https://assets.coingecko.com/coins/images/12124/standard/Curve.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/standard/dogecoin.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.png',
  WIF: 'https://assets.coingecko.com/coins/images/33566/standard/wif.png',
  BONK: 'https://assets.coingecko.com/coins/images/28600/standard/bonk.png',
};

function getTokenLogo(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (TOKEN_LOGOS[upper]) return TOKEN_LOGOS[upper];
  // Fallback to Hyperliquid icons
  return `https://app.hyperliquid.xyz/icons/tokens/${symbol.toLowerCase()}.svg`;
}

async function fetchHyperliquidMeta(): Promise<any> {
  const response = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });
  return response.json();
}

async function fetchAllMids(): Promise<Record<string, string>> {
  const response = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' }),
  });
  return response.json();
}

async function fetchSpotMeta(): Promise<any> {
  const response = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'spotMeta' }),
  });
  return response.json();
}

async function fetchSpotMetaAndAssetCtxs(): Promise<any> {
  const response = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
  });
  return response.json();
}

async function fetchCandleData(coin: string, interval: string = '1d', limit: number = 30): Promise<any[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - (limit * 24 * 60 * 60 * 1000);
    
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: {
          coin,
          interval,
          startTime,
          endTime,
        }
      }),
    });
    return response.json();
  } catch (e) {
    console.error('Failed to fetch candle data:', e);
    return [];
  }
}

async function fetchTopHolders(tokenAddress: string): Promise<{ address: string; balance: number; percentage: number }[]> {
  // For now, return mock data as Hyperliquid doesn't expose holder data directly
  // In production, you'd query an indexer or blockchain explorer
  return [];
}

function categorizeToken(symbol: string, name: string): string {
  const lower = symbol.toLowerCase();
  const nameLower = name.toLowerCase();
  
  if (lower.startsWith('k')) return 'kAsset';
  if (['btc', 'eth', 'ltc', 'xrp'].includes(lower)) return 'Major';
  if (['sol', 'avax', 'bnb', 'ada', 'dot', 'atom', 'near', 'apt', 'sui', 'sei', 'ton', 'ftm', 'trx', 'cfx', 'sonic', 'bera', 'zeta', 'inj'].includes(lower)) return 'L1';
  if (['arb', 'op', 'matic', 'strk', 'zk', 'lrc', 'move', 'layer3'].includes(lower)) return 'L2';
  if (['link', 'uni', 'aave', 'crv', 'dydx', 'ldo', 'jup', 'pendle', 'ena', 'ethfi', 'morpho', 'usual', 'lista', 'shell', 'deep', 'hype'].includes(lower)) return 'DeFi';
  if (['doge', 'pepe', 'wif', 'bonk', 'floki', 'meme', 'brett', 'bome', 'popcat', 'turbo', 'moodeng', 'goat', 'pnut', 'mog', 'chillguy', 'ban', 'fartcoin', 'neiro', 'trump', 'melania', 'tst', 'boop', 'spx', 'fartboy', 'toshi', 'koma', 'gmcat'].includes(lower)) return 'Meme';
  if (['ai16z', 'aixbt', 'virtual', 'render', 'io', 'act', 'zerebro', 'griffain', 'vvaifu', 'alch', 'pippin', 'arc', 'game', 'cookie', 'buzz', 'kaito'].includes(lower)) return 'AI';
  if (['ape', 'blur', 'pengu', 'me', 'anime'].includes(lower)) return 'NFT';
  if (['sand', 'mana'].includes(lower)) return 'Metaverse';
  if (['gmt', 'magic', 'not', 'farm', 'house'].includes(lower)) return 'Gaming';
  if (['w', 'zro'].includes(lower)) return 'Bridge';
  if (['pyth'].includes(lower)) return 'Oracle';
  if (['ordi'].includes(lower)) return 'BRC-20';
  if (['fil'].includes(lower)) return 'Storage';
  if (['ondo'].includes(lower)) return 'RWA';
  if (['people'].includes(lower)) return 'DAO';
  if (['cyber', 'vine'].includes(lower)) return 'Social';
  if (['ip'].includes(lower)) return 'IP';
  if (['launchcoin'].includes(lower)) return 'Launchpad';
  
  return 'Other';
}

async function getTopTokens(timeframe: '24h' | '7d' | '30d', includeCharts: boolean = false): Promise<TokenInfo[]> {
  const [metaData, midsData, spotData] = await Promise.all([
    fetchHyperliquidMeta(),
    fetchAllMids(),
    fetchSpotMetaAndAssetCtxs().catch(() => null),
  ]);

  const tokens: TokenInfo[] = [];

  // Process perps
  if (metaData && Array.isArray(metaData) && metaData.length >= 2) {
    const meta = metaData[0];
    const assetCtxs = metaData[1];

    for (let index = 0; index < (meta.universe?.length || 0); index++) {
      const asset = meta.universe[index];
      const ctx = assetCtxs[index];
      const symbol = asset.name;
      const midPrice = midsData?.[symbol] ? parseFloat(midsData[symbol]) : 0;
      const volume24h = ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0;
      const openInterest = ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0;

      // Estimate market cap from OI and price
      const estimatedMarketCap = openInterest * 10; // Rough estimate
      
      const tokenInfo: TokenInfo = {
        symbol,
        name: asset.name,
        price: midPrice,
        volume24h,
        openInterest,
        fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
        category: categorizeToken(symbol, asset.name),
        assetId: `@${index + 1}`,
        logoUrl: getTokenLogo(symbol),
        marketCap: estimatedMarketCap,
        szDecimals: asset.szDecimals,
        change24h: ctx?.prevDayPx ? ((midPrice - parseFloat(ctx.prevDayPx)) / parseFloat(ctx.prevDayPx)) * 100 : undefined,
      };

      // Fetch chart data if requested (limited to top tokens for performance)
      if (includeCharts && tokens.length < 20) {
        try {
          const candles = await fetchCandleData(symbol, '1d', timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 1);
          if (candles && Array.isArray(candles)) {
            tokenInfo.priceHistory = candles.map((c: any) => ({
              time: c.t,
              price: parseFloat(c.c),
            }));
            tokenInfo.volumeHistory = candles.map((c: any) => ({
              time: c.t,
              volume: parseFloat(c.v) * parseFloat(c.c),
            }));
            
            // Calculate high/low from candles
            if (candles.length > 0) {
              tokenInfo.high24h = Math.max(...candles.slice(-1).map((c: any) => parseFloat(c.h)));
              tokenInfo.low24h = Math.min(...candles.slice(-1).map((c: any) => parseFloat(c.l)));
            }
          }
        } catch (e) {
          console.error(`Failed to fetch charts for ${symbol}:`, e);
        }
      }

      tokens.push(tokenInfo);
    }
  }

  // Process spot tokens
  if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
    const spotMeta = spotData[0];
    const spotCtxs = spotData[1];

    spotMeta.tokens?.forEach((token: any, index: number) => {
      const ctx = spotCtxs[index];
      const existingIndex = tokens.findIndex(t => t.symbol.toLowerCase() === token.name.toLowerCase());
      
      if (existingIndex === -1) {
        tokens.push({
          symbol: token.name,
          name: token.fullName || token.name,
          address: token.tokenId,
          price: ctx?.midPx ? parseFloat(ctx.midPx) : 0,
          volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
          openInterest: 0,
          fundingRate: 0,
          category: categorizeToken(token.name, token.fullName || token.name),
          logoUrl: getTokenLogo(token.name),
          circulatingSupply: token.circulatingSupply ? parseFloat(token.circulatingSupply) : undefined,
          totalSupply: token.totalSupply ? parseFloat(token.totalSupply) : undefined,
        });
      } else {
        // Merge spot data with perp data
        tokens[existingIndex].address = token.tokenId;
        tokens[existingIndex].circulatingSupply = token.circulatingSupply ? parseFloat(token.circulatingSupply) : undefined;
        tokens[existingIndex].totalSupply = token.totalSupply ? parseFloat(token.totalSupply) : undefined;
      }
    });
  }

  // Sort by volume based on timeframe (using 24h as proxy for all)
  tokens.sort((a, b) => b.volume24h - a.volume24h);

  return tokens.slice(0, 100);
}

async function getTokenByAddress(address: string): Promise<TokenInfo | null> {
  const spotData = await fetchSpotMetaAndAssetCtxs().catch(() => null);

  if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
    const spotMeta = spotData[0];
    const spotCtxs = spotData[1];

    const tokenIndex = spotMeta.tokens?.findIndex((t: any) => 
      t.tokenId?.toLowerCase() === address.toLowerCase()
    );

    if (tokenIndex !== undefined && tokenIndex >= 0) {
      const token = spotMeta.tokens[tokenIndex];
      const ctx = spotCtxs[tokenIndex];
      const price = ctx?.midPx ? parseFloat(ctx.midPx) : 0;

      // Fetch chart data
      let priceHistory: { time: number; price: number }[] = [];
      let volumeHistory: { time: number; volume: number }[] = [];
      
      try {
        const candles = await fetchCandleData(token.name, '1d', 30);
        if (candles && Array.isArray(candles)) {
          priceHistory = candles.map((c: any) => ({
            time: c.t,
            price: parseFloat(c.c),
          }));
          volumeHistory = candles.map((c: any) => ({
            time: c.t,
            volume: parseFloat(c.v) * parseFloat(c.c),
          }));
        }
      } catch (e) {
        console.error('Failed to fetch charts:', e);
      }

      return {
        symbol: token.name,
        name: token.fullName || token.name,
        address: token.tokenId,
        price,
        volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
        openInterest: 0,
        fundingRate: 0,
        category: categorizeToken(token.name, token.fullName || token.name),
        logoUrl: getTokenLogo(token.name),
        circulatingSupply: token.circulatingSupply ? parseFloat(token.circulatingSupply) : undefined,
        totalSupply: token.totalSupply ? parseFloat(token.totalSupply) : undefined,
        marketCap: price * (token.circulatingSupply ? parseFloat(token.circulatingSupply) : 0),
        priceHistory,
        volumeHistory,
      };
    }
  }

  return null;
}

async function getTokensByName(name: string): Promise<TokenInfo[]> {
  const [metaData, midsData, spotData] = await Promise.all([
    fetchHyperliquidMeta(),
    fetchAllMids(),
    fetchSpotMetaAndAssetCtxs().catch(() => null),
  ]);

  const tokens: TokenInfo[] = [];
  const searchLower = name.toLowerCase();

  // Search perps
  if (metaData && Array.isArray(metaData) && metaData.length >= 2) {
    const meta = metaData[0];
    const assetCtxs = metaData[1];

    meta.universe?.forEach((asset: any, index: number) => {
      const symbol = asset.name;
      if (symbol.toLowerCase().includes(searchLower)) {
        const ctx = assetCtxs[index];
        const midPrice = midsData?.[symbol] ? parseFloat(midsData[symbol]) : 0;

        tokens.push({
          symbol,
          name: asset.name,
          price: midPrice,
          volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
          openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0,
          fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
          category: categorizeToken(symbol, asset.name),
          assetId: `@${index + 1}`,
          logoUrl: getTokenLogo(symbol),
          szDecimals: asset.szDecimals,
        });
      }
    });
  }

  // Search spot
  if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
    const spotMeta = spotData[0];
    const spotCtxs = spotData[1];

    spotMeta.tokens?.forEach((token: any, index: number) => {
      const matchesSymbol = token.name?.toLowerCase().includes(searchLower);
      const matchesName = token.fullName?.toLowerCase().includes(searchLower);
      
      if (matchesSymbol || matchesName) {
        const ctx = spotCtxs[index];
        const existingIndex = tokens.findIndex(t => t.symbol.toLowerCase() === token.name.toLowerCase());
        const price = ctx?.midPx ? parseFloat(ctx.midPx) : 0;
        
        if (existingIndex === -1) {
          tokens.push({
            symbol: token.name,
            name: token.fullName || token.name,
            address: token.tokenId,
            price,
            volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
            openInterest: 0,
            fundingRate: 0,
            category: categorizeToken(token.name, token.fullName || token.name),
            logoUrl: getTokenLogo(token.name),
            circulatingSupply: token.circulatingSupply ? parseFloat(token.circulatingSupply) : undefined,
            totalSupply: token.totalSupply ? parseFloat(token.totalSupply) : undefined,
            marketCap: price * (token.circulatingSupply ? parseFloat(token.circulatingSupply) : 0),
          });
        } else {
          // Merge with existing
          tokens[existingIndex].address = token.tokenId;
          tokens[existingIndex].circulatingSupply = token.circulatingSupply ? parseFloat(token.circulatingSupply) : undefined;
          tokens[existingIndex].totalSupply = token.totalSupply ? parseFloat(token.totalSupply) : undefined;
        }
      }
    });
  }

  return tokens;
}

async function getTokenDetails(symbol: string): Promise<TokenInfo | null> {
  const [metaData, midsData, spotData] = await Promise.all([
    fetchHyperliquidMeta(),
    fetchAllMids(),
    fetchSpotMetaAndAssetCtxs().catch(() => null),
  ]);

  const searchLower = symbol.toLowerCase();
  let token: TokenInfo | null = null;

  // Search perps first
  if (metaData && Array.isArray(metaData) && metaData.length >= 2) {
    const meta = metaData[0];
    const assetCtxs = metaData[1];

    const index = meta.universe?.findIndex((a: any) => a.name.toLowerCase() === searchLower);
    
    if (index !== undefined && index >= 0) {
      const asset = meta.universe[index];
      const ctx = assetCtxs[index];
      const midPrice = midsData?.[asset.name] ? parseFloat(midsData[asset.name]) : 0;
      const openInterest = ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0;

      token = {
        symbol: asset.name,
        name: asset.name,
        price: midPrice,
        volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
        openInterest,
        fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
        category: categorizeToken(asset.name, asset.name),
        assetId: `@${index + 1}`,
        logoUrl: getTokenLogo(asset.name),
        marketCap: openInterest * 10,
        szDecimals: asset.szDecimals,
        change24h: ctx?.prevDayPx ? ((midPrice - parseFloat(ctx.prevDayPx)) / parseFloat(ctx.prevDayPx)) * 100 : undefined,
      };
    }
  }

  // Merge with spot data if available
  if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
    const spotMeta = spotData[0];
    const spotCtxs = spotData[1];

    const spotIndex = spotMeta.tokens?.findIndex((t: any) => 
      t.name?.toLowerCase() === searchLower
    );

    if (spotIndex !== undefined && spotIndex >= 0) {
      const spotToken = spotMeta.tokens[spotIndex];
      const spotCtx = spotCtxs[spotIndex];
      const price = spotCtx?.midPx ? parseFloat(spotCtx.midPx) : (token?.price || 0);
      const circulatingSupply = spotToken.circulatingSupply ? parseFloat(spotToken.circulatingSupply) : undefined;

      if (token) {
        token.address = spotToken.tokenId;
        token.circulatingSupply = circulatingSupply;
        token.totalSupply = spotToken.totalSupply ? parseFloat(spotToken.totalSupply) : undefined;
        token.marketCap = circulatingSupply ? price * circulatingSupply : token.marketCap;
      } else {
        token = {
          symbol: spotToken.name,
          name: spotToken.fullName || spotToken.name,
          address: spotToken.tokenId,
          price,
          volume24h: spotCtx?.dayNtlVlm ? parseFloat(spotCtx.dayNtlVlm) : 0,
          openInterest: 0,
          fundingRate: 0,
          category: categorizeToken(spotToken.name, spotToken.fullName || spotToken.name),
          logoUrl: getTokenLogo(spotToken.name),
          circulatingSupply,
          totalSupply: spotToken.totalSupply ? parseFloat(spotToken.totalSupply) : undefined,
          marketCap: circulatingSupply ? price * circulatingSupply : undefined,
        };
      }
    }
  }

  if (!token) return null;

  // Fetch chart data
  try {
    const candles = await fetchCandleData(token.symbol, '1d', 30);
    if (candles && Array.isArray(candles)) {
      token.priceHistory = candles.map((c: any) => ({
        time: c.t,
        price: parseFloat(c.c),
      }));
      token.volumeHistory = candles.map((c: any) => ({
        time: c.t,
        volume: parseFloat(c.v) * parseFloat(c.c),
      }));
      
      if (candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        token.high24h = parseFloat(lastCandle.h);
        token.low24h = parseFloat(lastCandle.l);
      }
    }
  } catch (e) {
    console.error('Failed to fetch charts:', e);
  }

  return token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const password = url.searchParams.get('password') || req.headers.get('x-admin-password');

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const action = url.searchParams.get('action');
    let result: any;

    switch (action) {
      case 'top-tokens': {
        const timeframe = (url.searchParams.get('timeframe') as '24h' | '7d' | '30d') || '24h';
        const includeCharts = url.searchParams.get('charts') === 'true';
        result = await getTopTokens(timeframe, includeCharts);
        break;
      }
      case 'by-address': {
        const address = url.searchParams.get('address');
        if (!address) {
          return new Response(JSON.stringify({ error: 'Address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getTokenByAddress(address);
        break;
      }
      case 'by-name': {
        const name = url.searchParams.get('name');
        if (!name) {
          return new Response(JSON.stringify({ error: 'Name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getTokensByName(name);
        break;
      }
      case 'token-details': {
        const symbol = url.searchParams.get('symbol');
        if (!symbol) {
          return new Response(JSON.stringify({ error: 'Symbol required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getTokenDetails(symbol);
        break;
      }
      case 'all-tokens': {
        result = await getTopTokens('24h', false);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Admin tokens error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
