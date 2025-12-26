/**
 * HyperCore Trade Hook
 * Fetches trade details from our database
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HyperCoreTrade {
  id: string;
  walletAddress: string;
  walletId: string;
  market: string;
  side: 'long' | 'short' | null;
  size: number;
  execPrice: number;
  notionalValue: number;
  feeUsd: number;
  realizedPnlUsd: number | null;
  fundingUsd: number | null;
  timestamp: Date;
  eventType: string;
  venue: string;
  meta: any;
}

export interface RelatedTrade {
  id: string;
  timestamp: Date;
  eventType: string;
  size: number | null;
  execPrice: number | null;
  realizedPnlUsd: number | null;
  fundingUsd: number | null;
}

async function fetchHyperCoreTrade(identifier: string): Promise<{
  trade: HyperCoreTrade | null;
  relatedTrades: RelatedTrade[];
}> {
  // Try by ID first
  let query = supabase
    .from('economic_events')
    .select('*, wallets!inner(address)')
    .eq('id', identifier)
    .maybeSingle();
  
  let { data: trade } = await query;
  
  // Try by dedupe_key if not found
  if (!trade) {
    const { data: byDedupeKey } = await supabase
      .from('economic_events')
      .select('*, wallets!inner(address)')
      .eq('dedupe_key', identifier)
      .maybeSingle();
    trade = byDedupeKey;
  }
  
  if (!trade) {
    return { trade: null, relatedTrades: [] };
  }
  
  // Fetch related trades (same wallet, same market, within 7 days)
  const tradeTime = new Date(trade.ts);
  const sevenDaysBefore = new Date(tradeTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAfter = new Date(tradeTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const { data: relatedData } = await supabase
    .from('economic_events')
    .select('id, ts, event_type, size, exec_price, realized_pnl_usd, funding_usd')
    .eq('wallet_id', trade.wallet_id)
    .eq('market', trade.market)
    .neq('id', trade.id)
    .gte('ts', sevenDaysBefore.toISOString())
    .lte('ts', sevenDaysAfter.toISOString())
    .order('ts', { ascending: true })
    .limit(10);
  
  const relatedTrades: RelatedTrade[] = (relatedData || []).map(r => ({
    id: r.id,
    timestamp: new Date(r.ts),
    eventType: r.event_type,
    size: r.size,
    execPrice: r.exec_price,
    realizedPnlUsd: r.realized_pnl_usd,
    fundingUsd: r.funding_usd,
  }));
  
  // Format trade data
  const formattedTrade: HyperCoreTrade = {
    id: trade.id,
    walletAddress: (trade.wallets as any).address,
    walletId: trade.wallet_id,
    market: trade.market || '',
    side: trade.side as 'long' | 'short' | null,
    size: trade.size || 0,
    execPrice: trade.exec_price || 0,
    notionalValue: (trade.size || 0) * (trade.exec_price || 0),
    feeUsd: trade.fee_usd || 0,
    realizedPnlUsd: trade.realized_pnl_usd,
    fundingUsd: trade.funding_usd,
    timestamp: new Date(trade.ts),
    eventType: trade.event_type,
    venue: trade.venue,
    meta: trade.meta,
  };
  
  return { trade: formattedTrade, relatedTrades };
}

export function useHyperCoreTrade(identifier: string | undefined) {
  return useQuery({
    queryKey: ['hypercore-trade', identifier],
    queryFn: () => fetchHyperCoreTrade(identifier!),
    enabled: !!identifier,
    staleTime: 300_000,
  });
}
