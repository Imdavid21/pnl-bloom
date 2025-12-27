/**
 * Wallet Data Aggregator
 * Merges HyperCore + HyperEVM data into a unified view
 * Optimized for large accounts with caching and rate limit handling
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchWithRetry } from '@/lib/retry';
import { formatUsd as formatUsdLib, formatPercent as formatPercentLib, formatNumber as formatNumberLib } from '@/lib/formatters';

// Re-export formatters for backward compatibility
export const formatUsd = formatUsdLib;
export const formatPercent = formatPercentLib;
export const formatNumber = formatNumberLib;

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

export interface PnlData {
  pnl: number;
  pnlPercent: number;
  volume: number;
  trades: number;
}

export interface ActivitySummary {
  pnl30d: number;
  pnl7d: number;
  pnlYtd: number;
  pnlAll: number;
  volume30d: number;
  volume7d: number;
  volumeYtd: number;
  volumeAll: number;
  trades30d: number;
  trades7d: number;
  tradesYtd: number;
  tradesAll: number;
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
  hypercoreValue: number;
  hyperevmValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  pnlByTimeframe: {
    '7d': PnlData;
    '30d': PnlData;
    'ytd': PnlData;
    'all': PnlData;
  };
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

// Cache for API calls
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCached<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

async function fetchHypercoreState(address: string): Promise<HypercoreState | null> {
  const cacheKey = `hypercore:${address}`;
  const cached = getCached<HypercoreState>(cacheKey);
  if (cached) return cached;
  
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
      { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000 }
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
    
    const result: HypercoreState = {
      accountValue: parseFloat(marginSummary.accountValue || '0'),
      marginUsed: parseFloat(marginSummary.totalMarginUsed || '0'),
      positions,
      spotBalances: [],
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch Hypercore state:', error);
    return null;
  }
}

async function fetchHyperevmState(address: string): Promise<HyperevmState | null> {
  const cacheKey = `hyperevm:${address}`;
  const cached = getCached<HyperevmState>(cacheKey);
  if (cached) return cached;
  
  try {
    // Fetch address info and HYPE price in parallel with retry
    const [addressResponse, priceResponse] = await Promise.all([
      fetchWithRetry(
        `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${address}`,
        { headers: { 'apikey': SUPABASE_KEY } },
        { maxRetries: 2, initialDelayMs: 500 }
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
        { maxRetries: 2, initialDelayMs: 500 }
      ),
    ]);
    
    if (!addressResponse.ok) return null;
    
    const data = await addressResponse.json();
    if (data.error) return null;
    
    const balance = parseFloat(data.balance || '0');
    
    // Get HYPE price from allMids
    let hypePrice = 25;
    if (priceResponse.ok) {
      const prices = await priceResponse.json();
      if (prices?.HYPE) {
        hypePrice = parseFloat(prices.HYPE);
      }
    }
    
    const result: HyperevmState = {
      nativeBalance: balance,
      nativeValueUsd: balance * hypePrice,
      tokens: [],
      hasActivity: balance > 0 || data.isContract,
    };
    
    setCache(cacheKey, result);
    return result;
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
    
    // Dates for different timeframes
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Fetch all data in parallel
    const [marketStats, dailyStats, recentTrades, firstEvent, lastEvent] = await Promise.all([
      supabase
        .from('market_stats')
        .select('total_volume, total_trades, wins, losses')
        .eq('wallet_id', wallet.id),
      supabase
        .from('daily_pnl')
        .select('total_pnl, volume, trades_count, day')
        .eq('wallet_id', wallet.id)
        .order('day', { ascending: false }),
      supabase
        .from('closed_trades')
        .select('notional_value, is_win, exit_time')
        .eq('wallet_id', wallet.id),
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
    
    // Calculate totals from market_stats
    const ms = marketStats.data || [];
    const totalVolume = ms.reduce((sum, m) => sum + Number(m.total_volume || 0), 0);
    const totalTrades = ms.reduce((sum, m) => sum + (m.total_trades || 0), 0);
    const totalWins = ms.reduce((sum, m) => sum + (m.wins || 0), 0);
    const totalLosses = ms.reduce((sum, m) => sum + (m.losses || 0), 0);
    
    // Calculate PnL by timeframe from daily_pnl
    const days = dailyStats.data || [];
    
    const calc = (filterFn: (day: string) => boolean) => {
      const filtered = days.filter(d => filterFn(d.day));
      return {
        pnl: filtered.reduce((sum, d) => sum + Number(d.total_pnl || 0), 0),
        volume: filtered.reduce((sum, d) => sum + Number(d.volume || 0), 0),
        trades: filtered.reduce((sum, d) => sum + (d.trades_count || 0), 0),
      };
    };
    
    const stats7d = calc(day => new Date(day) >= sevenDaysAgo);
    const stats30d = calc(day => new Date(day) >= thirtyDaysAgo);
    const statsYtd = calc(day => new Date(day) >= startOfYear);
    const statsAll = calc(() => true);
    
    // Calculate win rate
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    // Fallback to wallet creation date if no events
    const firstSeenDate = firstEvent.data?.ts 
      ? new Date(firstEvent.data.ts) 
      : wallet.created_at 
        ? new Date(wallet.created_at) 
        : null;
    
    return {
      pnl7d: stats7d.pnl,
      pnl30d: stats30d.pnl,
      pnlYtd: statsYtd.pnl,
      pnlAll: statsAll.pnl,
      volume7d: stats7d.volume,
      volume30d: stats30d.volume,
      volumeYtd: statsYtd.volume,
      volumeAll: statsAll.volume,
      trades7d: stats7d.trades,
      trades30d: stats30d.trades,
      tradesYtd: statsYtd.trades,
      tradesAll: statsAll.trades,
      wins: totalWins,
      losses: totalLosses,
      winRate,
      firstSeen: firstSeenDate,
      lastActive: lastEvent.data?.ts ? new Date(lastEvent.data.ts) : null,
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
  
  // Build PnL by timeframe
  const calcPercent = (pnl: number) => {
    const start = totalValue - pnl;
    return start > 0 ? (pnl / start) * 100 : 0;
  };
  
  const pnlByTimeframe = {
    '7d': {
      pnl: activitySummary?.pnl7d || 0,
      pnlPercent: calcPercent(activitySummary?.pnl7d || 0),
      volume: activitySummary?.volume7d || 0,
      trades: activitySummary?.trades7d || 0,
    },
    '30d': {
      pnl: activitySummary?.pnl30d || 0,
      pnlPercent: pnlPercent30d,
      volume: activitySummary?.volume30d || 0,
      trades: activitySummary?.trades30d || 0,
    },
    'ytd': {
      pnl: activitySummary?.pnlYtd || 0,
      pnlPercent: calcPercent(activitySummary?.pnlYtd || 0),
      volume: activitySummary?.volumeYtd || 0,
      trades: activitySummary?.tradesYtd || 0,
    },
    'all': {
      pnl: activitySummary?.pnlAll || 0,
      pnlPercent: calcPercent(activitySummary?.pnlAll || 0),
      volume: activitySummary?.volumeAll || 0,
      trades: activitySummary?.tradesAll || 0,
    },
  };
  
  const openPositions = hypercoreState?.positions.length || 0;
  const marginUsed = hypercoreState?.marginUsed || 0;
  
  return {
    address: normalizedAddress,
    domains: {
      hypercore: !!hypercoreState && (hypercoreState.accountValue > 0 || hypercoreState.positions.length > 0),
      hyperevm: !!hyperevmState && hyperevmState.hasActivity,
    },
    totalValue,
    hypercoreValue,
    hyperevmValue,
    pnl30d,
    pnlPercent30d,
    pnlByTimeframe,
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
