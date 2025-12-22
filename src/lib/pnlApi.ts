import { supabase } from "@/integrations/supabase/client";

export interface DailyPnlData {
  date: string;
  pnl: number;  // closed_pnl - the only PnL we track
  funding: number;
  fees: number;
  perps_pnl: number;
  trades_count: number;
}

export interface MonthlySummary {
  month: string;
  pnl: number;  // closed_pnl
  funding: number;
  profitable_days: number;
  trading_days: number;
}

export interface CalendarResponse {
  year: number;
  wallet: string;
  daily: DailyPnlData[];
  monthly_summary: MonthlySummary[];
  total_volume: number;
  closed_trades_count: number;
  meta: {
    view: string;
    product: string;
    tz: string;
    last_updated_at: string;
  };
}

export interface PerpsFill {
  id: string;
  timestamp: string;
  market: string;
  side: string;
  size: number;
  exec_price: number;
  realized_pnl: number;
  fee: number;
  tx_hash?: string;
}


export interface Transfer {
  id: string;
  timestamp: string;
  type: 'in' | 'out';
  asset: string;
  qty: number;
  usd_value: number;
  tx_hash?: string;
}

export interface FundingEvent {
  id: string;
  timestamp: string;
  type: string;
  market: string;
  amount: number;
}

export interface DayDetailsResponse {
  date: string;
  wallet: string;
  summary: DailyPnlData | null;
  perps_fills: PerpsFill[];
  funding: FundingEvent[];
  meta: {
    tz: string;
    events_count: number;
  };
}

export async function fetchCalendar(
  wallet: string,
  year: number,
  view: string = 'total',
  product: string = 'perps',
  tz: string = 'utc'
): Promise<CalendarResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pnl-calendar?wallet=${encodeURIComponent(wallet)}&year=${year}&view=${view}&product=${product}&tz=${tz}`;
  console.log('[pnlApi] fetchCalendar request:', { url, wallet, year, view, product, tz });
  
  const response = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[pnlApi] fetchCalendar error:', errorData);
    throw new Error(errorData.error || 'Failed to fetch calendar');
  }

  const data = await response.json();
  console.log('[pnlApi] fetchCalendar response:', {
    year: data.year,
    wallet: data.wallet,
    dailyCount: data.daily?.length,
    monthlySummaryCount: data.monthly_summary?.length,
    sampleDaily: data.daily?.slice(0, 3),
    totals: {
      pnl: data.daily?.reduce((sum: number, d: any) => sum + (d.pnl || 0), 0),
      funding: data.daily?.reduce((sum: number, d: any) => sum + (d.funding || 0), 0),
    }
  });
  return data;
}

export async function fetchDayDetails(
  wallet: string,
  date: string,
  tz: string = 'utc'
): Promise<DayDetailsResponse> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pnl-day?wallet=${encodeURIComponent(wallet)}&date=${date}&tz=${tz}`,
    {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch day details');
  }

  return response.json();
}

export async function triggerBackfill(
  wallet: string,
  start: string,
  end: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-backfill`,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet, start, end }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to trigger backfill');
  }

  return response.json();
}

export async function pollHypercore(
  wallet: string,
  startTime?: number,
  endTime?: number,
  fullHistory?: boolean,
  maxFills?: number
): Promise<{ 
  success: boolean; 
  fills_fetched: number; 
  funding_fetched: number;
  economic_events_inserted: number;
  total_volume?: number;
  affected_days?: string[];
  positions_fetched?: number;
  mark_prices_fetched?: number;
}> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poll-hypercore`;
  console.log('[pnlApi] pollHypercore request:', { wallet, startTime, endTime, fullHistory, maxFills });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      wallet, 
      start_time: startTime,
      end_time: endTime,
      full_history: fullHistory,
      max_fills: maxFills,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[pnlApi] pollHypercore error:', errorData);
    throw new Error(errorData.error || 'Failed to poll Hypercore');
  }

  const data = await response.json();
  console.log('[pnlApi] pollHypercore response:', data);
  return data;
}

export async function triggerRecompute(
  wallet: string,
  start_day: string,
  end_day: string
): Promise<{ success: boolean; days_processed: number }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-recompute`,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet, start_day, end_day }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to trigger recompute');
  }

  return response.json();
}
