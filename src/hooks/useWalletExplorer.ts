import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  liquidationPx: string;
  leverage: { value: number };
}

interface MarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
  withdrawable: string;
}

interface LiveState {
  marginSummary: MarginSummary;
  assetPositions: Array<{ position: Position }>;
}

interface ActivitySummary {
  walletId: string;
  pnl30d: number;
  volume30d: number;
  trades30d: number;
  firstSeen: string | null;
  lastActive: string | null;
  marketsTraded: string[];
}

interface RecentEvent {
  id: string;
  eventType: string;
  ts: string;
  market: string | null;
  side: string | null;
  size: number | null;
  execPrice: number | null;
  realizedPnlUsd: number | null;
  feeUsd: number | null;
  fundingUsd: number | null;
  volumeUsd: number | null;
}

interface EvmData {
  balance: string;
  isContract: boolean;
  txCount: number;
}

export function useWalletExplorer(address: string) {
  // SOURCE 1: Live wallet state from hyperliquid-proxy
  const liveState = useQuery({
    queryKey: ['wallet-live', address],
    queryFn: async (): Promise<LiveState | null> => {
      const { data, error } = await supabase.functions.invoke('hyperliquid-proxy', {
        body: { type: 'clearinghouseState', user: address }
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
    enabled: !!address,
  });

  // SOURCE 2: Activity summary from database
  const activitySummary = useQuery({
    queryKey: ['wallet-activity', address],
    queryFn: async (): Promise<ActivitySummary | null> => {
      // First get wallet ID
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, created_at')
        .eq('address', address.toLowerCase())
        .maybeSingle();
      
      if (!wallet) return null;

      // Get 30-day stats from daily_pnl
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: stats } = await supabase
        .from('daily_pnl')
        .select('day, total_pnl, volume, trades_count')
        .eq('wallet_id', wallet.id)
        .gte('day', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get distinct markets from economic_events
      const { data: marketData } = await supabase
        .from('economic_events')
        .select('market')
        .eq('wallet_id', wallet.id)
        .not('market', 'is', null);

      const uniqueMarkets = [...new Set((marketData || []).map(m => m.market).filter(Boolean))] as string[];

      // Calculate aggregates
      const pnl30d = stats?.reduce((sum, d) => sum + Number(d.total_pnl || 0), 0) || 0;
      const volume30d = stats?.reduce((sum, d) => sum + Number(d.volume || 0), 0) || 0;
      const trades30d = stats?.reduce((sum, d) => sum + (d.trades_count || 0), 0) || 0;

      // Get first and last active dates
      const days = stats?.map(s => s.day).sort() || [];
      const firstSeen = wallet.created_at || (days.length > 0 ? days[0] : null);
      const lastActive = days.length > 0 ? days[days.length - 1] : null;

      return {
        walletId: wallet.id,
        pnl30d,
        volume30d,
        trades30d,
        firstSeen,
        lastActive,
        marketsTraded: uniqueMarkets,
      };
    },
    staleTime: 60000, // 1 minute
    enabled: !!address,
  });

  // SOURCE 3: Recent events from database
  const recentEvents = useQuery({
    queryKey: ['wallet-events', address],
    queryFn: async (): Promise<RecentEvent[]> => {
      // First get wallet ID
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('address', address.toLowerCase())
        .maybeSingle();
      
      if (!wallet) return [];

      const { data: events } = await supabase
        .from('economic_events')
        .select('id, event_type, ts, market, side, size, exec_price, realized_pnl_usd, fee_usd, funding_usd, volume_usd')
        .eq('wallet_id', wallet.id)
        .order('ts', { ascending: false })
        .limit(20);

      return (events || []).map(e => ({
        id: e.id,
        eventType: e.event_type,
        ts: e.ts,
        market: e.market,
        side: e.side,
        size: e.size ? Number(e.size) : null,
        execPrice: e.exec_price ? Number(e.exec_price) : null,
        realizedPnlUsd: e.realized_pnl_usd ? Number(e.realized_pnl_usd) : null,
        feeUsd: e.fee_usd ? Number(e.fee_usd) : null,
        fundingUsd: e.funding_usd ? Number(e.funding_usd) : null,
        volumeUsd: e.volume_usd ? Number(e.volume_usd) : null,
      }));
    },
    staleTime: 30000,
    enabled: !!address,
  });

  // BONUS: Check for EVM activity
  const evmData = useQuery({
    queryKey: ['wallet-evm', address],
    queryFn: async (): Promise<EvmData | null> => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${address}`;
      const res = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
    enabled: !!address,
  });

  // Computed values
  const hasHypercore = (liveState.data?.assetPositions?.length || 0) > 0 || 
                        Number(liveState.data?.marginSummary?.accountValue || 0) > 0;
  const hasHyperevm = Number(evmData.data?.balance || 0) > 0 || 
                       (evmData.data?.txCount || 0) > 0 ||
                       evmData.data?.isContract;

  const isLoading = liveState.isLoading || activitySummary.isLoading || recentEvents.isLoading;
  const isPartiallyLoaded = !liveState.isLoading || !activitySummary.isLoading;

  return {
    // Data
    liveState: liveState.data,
    activitySummary: activitySummary.data,
    recentEvents: recentEvents.data || [],
    evmData: evmData.data,
    
    // Chain detection
    hasHypercore,
    hasHyperevm,
    
    // Loading states
    isLoading,
    isPartiallyLoaded,
    liveStateLoading: liveState.isLoading,
    activityLoading: activitySummary.isLoading,
    eventsLoading: recentEvents.isLoading,
    
    // Errors
    error: liveState.error || activitySummary.error || recentEvents.error,
    
    // Refetch functions
    refetchLive: liveState.refetch,
    refetchAll: () => {
      liveState.refetch();
      activitySummary.refetch();
      recentEvents.refetch();
      evmData.refetch();
    },
  };
}
