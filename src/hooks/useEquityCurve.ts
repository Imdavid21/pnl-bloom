/**
 * Equity Curve Hook
 * Fetch portfolio value over time for charting
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TimeRange = '7d' | '30d' | '90d';

interface EquityDataPoint {
  day: string;
  endingEquity: number;
  tradingPnl: number;
  fundingPnl: number;
  netChange: number;
  cumulativePnl: number;
}

interface EquityCurveData {
  points: EquityDataPoint[];
  minValue: number;
  maxValue: number;
  startValue: number;
  endValue: number;
  totalChange: number;
  totalChangePct: number;
}

async function fetchEquityCurve(address: string, range: TimeRange): Promise<EquityCurveData> {
  // Calculate date range
  const now = new Date();
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[range];
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Get wallet ID
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('address', address.toLowerCase())
    .single();

  if (!wallet) {
    return {
      points: [],
      minValue: 0,
      maxValue: 0,
      startValue: 0,
      endValue: 0,
      totalChange: 0,
      totalChangePct: 0,
    };
  }

  // Fetch equity curve data
  const { data, error } = await supabase
    .from('equity_curve')
    .select('day, ending_equity, trading_pnl, funding_pnl, net_change, cumulative_net_pnl')
    .eq('wallet_id', wallet.id)
    .gte('day', startDate.toISOString().split('T')[0])
    .order('day', { ascending: true });

  if (error || !data || data.length === 0) {
    return {
      points: [],
      minValue: 0,
      maxValue: 0,
      startValue: 0,
      endValue: 0,
      totalChange: 0,
      totalChangePct: 0,
    };
  }

  const points: EquityDataPoint[] = data.map(row => ({
    day: row.day,
    endingEquity: row.ending_equity,
    tradingPnl: row.trading_pnl,
    fundingPnl: row.funding_pnl,
    netChange: row.net_change,
    cumulativePnl: row.cumulative_net_pnl,
  }));

  const equityValues = points.map(p => p.cumulativePnl);
  const minValue = Math.min(...equityValues);
  const maxValue = Math.max(...equityValues);
  const startValue = points[0]?.cumulativePnl || 0;
  const endValue = points[points.length - 1]?.cumulativePnl || 0;
  const totalChange = endValue - startValue;
  const totalChangePct = startValue !== 0 ? (totalChange / Math.abs(startValue)) * 100 : 0;

  return {
    points,
    minValue,
    maxValue,
    startValue,
    endValue,
    totalChange,
    totalChangePct,
  };
}

export function useEquityCurve(address: string | undefined, range: TimeRange = '30d') {
  return useQuery({
    queryKey: ['equity-curve', address, range],
    queryFn: () => fetchEquityCurve(address || '', range),
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
