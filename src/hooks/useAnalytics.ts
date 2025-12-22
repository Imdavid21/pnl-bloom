import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
): Promise<AnalyticsData> {
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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch analytics');
  }

  return response.json();
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
  return useQuery({
    queryKey: ['analytics', wallet, dataset, minTrades],
    queryFn: () => fetchAnalytics(wallet!, dataset, minTrades),
    enabled: !!wallet,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useComputeAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: computeAnalytics,
    onSuccess: (_, wallet) => {
      // Invalidate analytics queries for this wallet
      queryClient.invalidateQueries({ queryKey: ['analytics', wallet] });
    },
  });
}