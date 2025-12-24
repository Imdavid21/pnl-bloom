import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ViewModel, ViewModelMetadata } from '@/types/viewmodel';
import { useTemporalContext } from '@/contexts/TemporalContext';
import { TTL } from '@/config/cache';

export interface AnalyticsSummary {
  total_trading_pnl: number;
  total_funding_pnl: number;
  total_fees: number;
  net_pnl: number;
  funding_share: number;
  total_trades: number;
  win_rate: number;
  max_drawdown: number;
  avg_recovery_days: number;
  markets_traded: number;
}

export interface EquityCurvePoint {
  day: string;
  trading_pnl: number;
  funding_pnl: number;
  fees: number;
  cumulative_trading_pnl: number;
  cumulative_funding_pnl: number;
  cumulative_fees: number;
  cumulative_net_pnl: number;
  peak_equity: number;
  drawdown: number;
  drawdown_pct: number;
  deposits?: number;
  withdrawals?: number;
}

export interface ClosedTrade {
  market: string;
  side: string;
  entry_time: string;
  exit_time: string;
  size: number;
  notional_value: number;
  effective_leverage: number | null;
  realized_pnl: number;
  fees: number;
  funding: number;
  net_pnl: number;
  is_win: boolean;
  trade_duration_hours: number;
}

export interface MarketStat {
  market: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  total_volume: number;
  total_fees: number;
  total_funding: number;
  avg_trade_size: number;
  avg_leverage: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number | null;
}

export interface DrawdownEvent {
  peak_date: string;
  trough_date: string;
  recovery_date: string | null;
  peak_equity: number;
  trough_equity: number;
  drawdown_depth: number;
  drawdown_pct: number;
  recovery_days: number | null;
  is_recovered: boolean;
}

export interface TradeSizeLeverageItem {
  key: string;
  avg_trade_size: number;
  avg_pnl: number;
  trade_count: number;
}

export interface TradeSizeLeverageData {
  grouping: string;
  data: TradeSizeLeverageItem[];
}

export interface PositionData {
  market: string;
  position_size: number;
  avg_entry: number;
  liquidation_px: number;
  effective_leverage: number | null;
  margin_used: number | null;
  unrealized_pnl: number | null;
}

export interface AnalyticsData {
  summary?: AnalyticsSummary;
  equity_curve?: EquityCurvePoint[];
  closed_trades?: ClosedTrade[];
  market_stats?: MarketStat[];
  drawdowns?: DrawdownEvent[];
  trade_size_leverage?: TradeSizeLeverageData;
  positions?: PositionData[];
}

async function fetchAnalytics(
  wallet: string,
  dataset?: string,
  minTrades?: number
): Promise<ViewModel<AnalyticsData>> {
  const params = new URLSearchParams({ wallet });
  if (dataset) params.append('dataset', dataset);
  if (minTrades) params.append('min_trades', minTrades.toString());

  // Use fetch directly since we need GET with query params
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pnl-analytics?${params}`;
  const response = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  // Handle 404 (wallet not found) gracefully - return empty data
  if (response.status === 404) {
    return {
      data: {
        summary: undefined,
        equity_curve: [],
        closed_trades: [],
        market_stats: [],
        drawdowns: [],
        trade_size_leverage: undefined,
        positions: [],
      },
      metadata: {
        computed_at: new Date().toISOString(),
        source_watermark: {},
        consistency_level: 'eventual',
        confidence_score: 0,
        data_completeness: {
          trades: false,
          funding: false,
          positions: false
        }
      }
    };
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch analytics');
  }

  const data = await response.json();

  // Mock metadata for now
  const metadata: ViewModelMetadata = {
    computed_at: new Date().toISOString(),
    source_watermark: {},
    consistency_level: 'eventual',
    confidence_score: 95,
    data_completeness: {
      trades: true,
      funding: true,
      positions: true
    }
  };

  return { data, metadata };
}

async function computeAnalytics(wallet: string): Promise<{ success: boolean; summary: any }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compute-analytics`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ wallet }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to compute analytics');
  }

  return response.json();
}

export function useAnalytics(wallet: string | null, dataset?: string, minTrades?: number) {
  const { mode, range } = useTemporalContext();

  return useQuery({
    queryKey: ['analytics', wallet, dataset, minTrades, mode, range],
    queryFn: () => fetchAnalytics(wallet!, dataset, minTrades),
    enabled: !!wallet,
    staleTime: TTL.USER_ANALYTICS,
    retry: 1,
  });
}

export function useComputeAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: computeAnalytics,
    onMutate: async (wallet) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['analytics', wallet] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['analytics', wallet] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['analytics', wallet] }, (old: ViewModel<AnalyticsData> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          metadata: {
            ...old.metadata,
            consistency_level: 'synchronized',
            computed_at: new Date().toISOString(),
            // We can also boost confidence score optimistically
            confidence_score: Math.max(old.metadata.confidence_score, 99)
          }
        };
      });

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (_err, wallet, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, wallet) => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ['analytics', wallet] });
    },
  });
}