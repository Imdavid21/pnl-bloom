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

async function getTopTokens(timeframe: '24h' | '7d' | '30d'): Promise<TokenInfo[]> {
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

    meta.universe?.forEach((asset: any, index: number) => {
      const ctx = assetCtxs[index];
      const symbol = asset.name;
      const midPrice = midsData?.[symbol] ? parseFloat(midsData[symbol]) : 0;
      const volume24h = ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0;

      tokens.push({
        symbol,
        name: asset.name,
        price: midPrice,
        volume24h,
        openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0,
        fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
        category: categorizeToken(symbol, asset.name),
        assetId: `@${index + 1}`,
      });
    });
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
        });
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

      return {
        symbol: token.name,
        name: token.fullName || token.name,
        address: token.tokenId,
        price: ctx?.midPx ? parseFloat(ctx.midPx) : 0,
        volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
        openInterest: 0,
        fundingRate: 0,
        category: categorizeToken(token.name, token.fullName || token.name),
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
          });
        }
      }
    });
  }

  return tokens;
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
        result = await getTopTokens(timeframe);
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
      case 'all-tokens': {
        result = await getTopTokens('24h');
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
