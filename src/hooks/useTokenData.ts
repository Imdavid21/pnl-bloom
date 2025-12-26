import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveToken, getTokenDescription, getTokenLinks, getTokenType, TokenIdentity } from '@/lib/token-resolver';
import { aggregateTokenData, UnifiedTokenData, HypercoreStats, TopTrader } from '@/lib/token-aggregator';

async function fetchTokenPrice(symbol: string): Promise<{ price: number; change24h: number; source: string } | null> {
  try {
    // Try to get price from Hyperliquid API via proxy
    const { data, error } = await supabase.functions.invoke('hyperliquid-proxy', {
      body: { type: 'allMids' }
    });

    if (!error && data) {
      const mids = data as Record<string, string>;
      const price = parseFloat(mids[symbol]) || 0;
      
      if (price > 0) {
        // Get 24h change from spot meta
        const { data: spotData } = await supabase.functions.invoke('hyperliquid-proxy', {
          body: { type: 'spotMetaAndAssetCtxs' }
        });
        
        let change24h = 0;
        if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
          const [meta, contexts] = spotData;
          const tokenIndex = meta.tokens?.findIndex((t: any) => 
            t.name?.toUpperCase() === symbol.toUpperCase()
          );
          if (tokenIndex >= 0 && contexts[tokenIndex]) {
            const prevPrice = parseFloat(contexts[tokenIndex].prevDayPx) || price;
            change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          }
        }
        
        return { price, change24h, source: 'oracle' };
      }
    }
  } catch (err) {
    console.error('Failed to fetch token price:', err);
  }

  // Fallback: get last trade price from DB
  const { data: lastTrade } = await supabase
    .from('economic_events')
    .select('exec_price, ts')
    .eq('asset', symbol)
    .in('event_type', ['SPOT_BUY', 'SPOT_SELL'])
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTrade?.exec_price) {
    return { price: lastTrade.exec_price, change24h: 0, source: 'spot' };
  }

  return null;
}

async function fetchHypercoreStats(symbol: string): Promise<HypercoreStats | null> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  try {
    // Get 24h stats
    const { data: events } = await supabase
      .from('economic_events')
      .select('wallet_id, volume_usd, event_type, qty, ts')
      .eq('asset', symbol)
      .in('event_type', ['SPOT_BUY', 'SPOT_SELL', 'SPOT_TRANSFER_IN', 'SPOT_TRANSFER_OUT'])
      .gte('ts', oneDayAgo);

    if (!events || events.length === 0) return null;

    const trades = events.filter(e => e.event_type === 'SPOT_BUY' || e.event_type === 'SPOT_SELL');
    const transfers = events.filter(e => e.event_type === 'SPOT_TRANSFER_IN' || e.event_type === 'SPOT_TRANSFER_OUT');
    
    const volume24h = trades.reduce((sum, e) => sum + (e.volume_usd || 0), 0);
    const uniqueWallets = new Set(trades.map(e => e.wallet_id));

    // Get recent transfers with wallet addresses
    const walletIds = [...new Set(transfers.slice(0, 20).map(t => t.wallet_id))];
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, address')
      .in('id', walletIds);

    const walletMap = new Map((wallets || []).map(w => [w.id, w.address]));

    const recentTransfers = transfers.slice(0, 20).map(t => ({
      id: t.wallet_id + t.ts,
      timestamp: new Date(t.ts),
      type: t.event_type === 'SPOT_TRANSFER_IN' ? 'in' as const : 'out' as const,
      amount: t.qty || 0,
      wallet: walletMap.get(t.wallet_id) || t.wallet_id,
    }));

    return {
      volume24h,
      trades24h: trades.length,
      uniqueTraders24h: uniqueWallets.size,
      recentTransfers,
    };
  } catch (err) {
    console.error('Failed to fetch HyperCore stats:', err);
    return null;
  }
}

async function fetchTopTraders(symbol: string, days: number = 30): Promise<TopTrader[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  try {
    const { data: events } = await supabase
      .from('economic_events')
      .select('wallet_id, volume_usd')
      .eq('asset', symbol)
      .in('event_type', ['SPOT_BUY', 'SPOT_SELL'])
      .gte('ts', startDate);

    if (!events || events.length === 0) return [];

    // Aggregate by wallet
    const walletStats = new Map<string, { volume: number; trades: number }>();
    for (const event of events) {
      const existing = walletStats.get(event.wallet_id) || { volume: 0, trades: 0 };
      walletStats.set(event.wallet_id, {
        volume: existing.volume + (event.volume_usd || 0),
        trades: existing.trades + 1,
      });
    }

    // Get wallet addresses
    const walletIds = Array.from(walletStats.keys());
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, address')
      .in('id', walletIds);

    const walletMap = new Map((wallets || []).map(w => [w.id, w.address]));

    // Sort and return top 10
    return Array.from(walletStats.entries())
      .map(([walletId, stats]) => ({
        walletId,
        walletAddress: walletMap.get(walletId) || walletId,
        ...stats,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
      .map((trader, index) => ({
        rank: index + 1,
        walletAddress: trader.walletAddress,
        volume: trader.volume,
        trades: trader.trades,
      }));
  } catch (err) {
    console.error('Failed to fetch top traders:', err);
    return [];
  }
}

export function useTokenData(identifier: string) {
  return useQuery({
    queryKey: ['token-data', identifier],
    queryFn: async (): Promise<UnifiedTokenData | null> => {
      const identity = await resolveToken(identifier);
      if (!identity) return null;

      const [priceData, hypercoreStats] = await Promise.all([
        fetchTokenPrice(identity.symbol),
        identity.chains.hypercore ? fetchHypercoreStats(identity.symbol) : null,
      ]);

      const metadata = {
        description: getTokenDescription(identity.symbol),
        links: getTokenLinks(identity.symbol),
      };

      const data = aggregateTokenData(
        identity,
        priceData,
        hypercoreStats,
        identity.chains.hyperevm && identity.hyperevm_address 
          ? { address: identity.hyperevm_address, decimals: identity.decimals || 18, totalSupply: 0 }
          : null,
        metadata
      );

      data.type = getTokenType(identity.symbol);
      
      return data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useTokenIdentity(identifier: string) {
  return useQuery({
    queryKey: ['token-identity', identifier],
    queryFn: () => resolveToken(identifier),
    staleTime: 300000,
  });
}

export function useTopTokenTraders(symbol: string, days: number = 30) {
  return useQuery({
    queryKey: ['top-token-traders', symbol, days],
    queryFn: () => fetchTopTraders(symbol, days),
    staleTime: 60000,
    enabled: !!symbol,
  });
}

export function useHypercoreActivity(symbol: string) {
  return useQuery({
    queryKey: ['hypercore-activity', symbol],
    queryFn: () => fetchHypercoreStats(symbol),
    staleTime: 30000,
    enabled: !!symbol,
  });
}
