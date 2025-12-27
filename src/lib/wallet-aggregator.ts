/**
 * Wallet Data Aggregator
 * Merges HyperCore + HyperEVM data into a unified view
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/retry';

// ============ TYPES ============

export interface HypercoreState {
  accountValue: number;
  marginUsed: number;
  positions: Array<{
    market: string;
    size: number;
    entryPrice: number;
    unrealizedPnl: number;
    leverage: number;
    side: 'long' | 'short';
  }>;
  spotBalances: Array<{
    asset: string;
    balance: number;
    valueUsd: number;
  }>;
}

export interface HyperevmState {
  nativeBalance: number;
  nativeValueUsd: number;
  tokens: Array<{
    address: string;
    symbol: string;
    balance: number;
    valueUsd: number;
  }>;
  hasActivity: boolean;
}

export interface ActivitySummary {
  pnl30d: number;
  volume30d: number;
  trades30d: number;
  wins: number;
  losses: number;
  winRate: number;
  firstSeen: Date | null;
  lastActive: Date | null;
}

export interface UnifiedWalletData {
  address: string;
  domains: {
    hypercore: boolean;
    hyperevm: boolean;
  };
  totalValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  openPositions: number;
  marginUsed: number;
  volume30d: number;
  trades30d: number;
  winRate: number;
  wins: number;
  totalTrades: number;
  firstSeen: Date | null;
  lastActive: Date | null;
  hypercoreState: HypercoreState | null;
  hyperevmState: HyperevmState | null;
  isLoading: boolean;
  error: string | null;
}

// ============ API CALLS ============

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchHypercoreState(address: string): Promise<HypercoreState | null> {
  try {
    const response = await fetchWithRetry(
      `${SUPABASE_URL}/functions/v1/hyperliquid-proxy`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'clearinghouseState', user: address }),
      },
      { maxRetries: 3, initialDelayMs: 1000 }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.error) return null;
    
    const marginSummary = data.marginSummary || {};
    const assetPositions = data.assetPositions || [];
    
    const positions = assetPositions.map((pos: any) => {
      const position = pos.position || pos;
      return {
        market: position.coin || pos.coin,
        size: Math.abs(parseFloat(position.szi || '0')),
        entryPrice: parseFloat(position.entryPx || '0'),
        unrealizedPnl: parseFloat(position.unrealizedPnl || '0'),
        leverage: parseFloat(position.leverage?.value || position.leverage || '1'),
        side: parseFloat(position.szi || '0') >= 0 ? 'long' as const : 'short' as const,
      };
    }).filter((p: any) => p.size > 0);
    
    return {
      accountValue: parseFloat(marginSummary.accountValue || '0'),
      marginUsed: parseFloat(marginSummary.totalMarginUsed || '0'),
      positions,
      spotBalances: [], // TODO: Fetch spot balances separately
    };
  } catch (error) {
    console.error('Failed to fetch Hypercore state:', error);
    return null;
  }
}

async function fetchHyperevmState(address: string): Promise<HyperevmState | null> {
  try {
    // Fetch address info and HYPE price in parallel with retry
    const [addressResponse, priceResponse] = await Promise.all([
      fetchWithRetry(
        `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${address}`,
        { headers: { 'apikey': SUPABASE_KEY } },
        { maxRetries: 2 }
      ),
      fetchWithRetry(
        `${SUPABASE_URL}/functions/v1/hyperliquid-proxy`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'allMids' }),
        },
        { maxRetries: 2 }
      ),
    ]);
    
    if (!addressResponse.ok) return null;
    
    const data = await addressResponse.json();
    if (data.error) return null;
    
    const balance = parseFloat(data.balance || '0');
    
    // Get HYPE price from allMids (HYPE is the native token on HyperEVM)
    let hypePrice = 25; // Fallback price
    if (priceResponse.ok) {
      const prices = await priceResponse.json();
      if (prices?.HYPE) {
        hypePrice = parseFloat(prices.HYPE);
      }
    }
    
    return {
      nativeBalance: balance,
      nativeValueUsd: balance * hypePrice,
      tokens: [],
      hasActivity: balance > 0 || data.isContract,
    };
  } catch (error) {
    console.error('Failed to fetch HyperEVM state:', error);
    return null;
  }
}

async function fetchActivitySummary(address: string): Promise<ActivitySummary | null> {
  try {
    // Get wallet ID
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, created_at')
      .eq('address', address.toLowerCase())
      .maybeSingle();
    
    if (!wallet) return null;
    
    // Fetch aggregated stats from market_stats (has correct volume and win rate)
    const { data: marketStats } = await supabase
      .from('market_stats')
      .select('total_volume, total_trades, wins, losses')
      .eq('wallet_id', wallet.id);
    
    // Calculate totals from market_stats
    const totalVolume = marketStats?.reduce((sum, m) => sum + Number(m.total_volume || 0), 0) || 0;
    const totalTrades = marketStats?.reduce((sum, m) => sum + (m.total_trades || 0), 0) || 0;
    const totalWins = marketStats?.reduce((sum, m) => sum + (m.wins || 0), 0) || 0;
    const totalLosses = marketStats?.reduce((sum, m) => sum + (m.losses || 0), 0) || 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Fetch 30-day PnL from daily_pnl
    const { data: dailyStats } = await supabase
      .from('daily_pnl')
      .select('total_pnl, day')
      .eq('wallet_id', wallet.id)
      .gte('day', thirtyDaysAgoStr)
      .order('day', { ascending: false });
    
    // Fetch 30-day trades from closed_trades
    const { data: recentTrades } = await supabase
      .from('closed_trades')
      .select('notional_value, is_win, exit_time')
      .eq('wallet_id', wallet.id)
      .gte('exit_time', thirtyDaysAgo.toISOString());
    
    // Get first and last active from economic_events
    const [{ data: firstEvent }, { data: lastEvent }] = await Promise.all([
      supabase
        .from('economic_events')
        .select('ts')
        .eq('wallet_id', wallet.id)
        .order('ts', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('economic_events')
        .select('ts')
        .eq('wallet_id', wallet.id)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    
    const pnl30d = dailyStats?.reduce((sum, d) => sum + Number(d.total_pnl || 0), 0) || 0;
    const volume30d = recentTrades?.reduce((sum, t) => sum + Number(t.notional_value || 0), 0) || 0;
    const trades30d = recentTrades?.length || 0;
    
    // Use overall stats for win rate (more accurate than 30d sample)
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    // Fallback to wallet creation date if no events
    const firstSeenDate = firstEvent?.ts 
      ? new Date(firstEvent.ts) 
      : wallet.created_at 
        ? new Date(wallet.created_at) 
        : null;
    
    return {
      pnl30d,
      volume30d,
      trades30d,
      wins: totalWins,
      losses: totalLosses,
      winRate,
      firstSeen: firstSeenDate,
      lastActive: lastEvent?.ts ? new Date(lastEvent.ts) : null,
    };
  } catch (error) {
    console.error('Failed to fetch activity summary:', error);
    return null;
  }
}

// ============ MAIN AGGREGATOR ============

export async function fetchUnifiedWalletData(address: string): Promise<UnifiedWalletData> {
  const normalizedAddress = address.toLowerCase();
  
  // Fetch all data in parallel
  const [hypercoreState, hyperevmState, activitySummary] = await Promise.all([
    fetchHypercoreState(normalizedAddress),
    fetchHyperevmState(normalizedAddress),
    fetchActivitySummary(normalizedAddress),
  ]);
  
  // Calculate totals
  const hypercoreValue = hypercoreState?.accountValue || 0;
  const hyperevmValue = hyperevmState?.nativeValueUsd || 0;
  const totalValue = hypercoreValue + hyperevmValue;
  
  const pnl30d = activitySummary?.pnl30d || 0;
  const startingValue = totalValue - pnl30d;
  const pnlPercent30d = startingValue > 0 ? (pnl30d / startingValue) * 100 : 0;
  
  const openPositions = hypercoreState?.positions.length || 0;
  const marginUsed = hypercoreState?.marginUsed || 0;
  
  return {
    address: normalizedAddress,
    domains: {
      hypercore: !!hypercoreState && (hypercoreState.accountValue > 0 || hypercoreState.positions.length > 0),
      hyperevm: !!hyperevmState && hyperevmState.hasActivity,
    },
    totalValue,
    pnl30d,
    pnlPercent30d,
    openPositions,
    marginUsed,
    volume30d: activitySummary?.volume30d || 0,
    trades30d: activitySummary?.trades30d || 0,
    winRate: activitySummary?.winRate || 0,
    wins: activitySummary?.wins || 0,
    totalTrades: (activitySummary?.wins || 0) + (activitySummary?.losses || 0),
    firstSeen: activitySummary?.firstSeen || null,
    lastActive: activitySummary?.lastActive || null,
    hypercoreState,
    hyperevmState,
    isLoading: false,
    error: null,
  };
}

// ============ FORMATTERS ============

export function formatUsd(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US').format(value);
}
