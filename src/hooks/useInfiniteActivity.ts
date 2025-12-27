/**
 * Infinite Activity Hook
 * Fetches and merges events from HyperCore and HyperEVM with infinite scroll
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  formatHypercoreEvent, 
  formatHyperevmEvent,
  type UnifiedEvent 
} from '@/lib/format-activity';

const PAGE_SIZE = 30;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ActivityPage {
  events: UnifiedEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchHypercoreEvents(
  walletId: string, 
  address: string,
  cursor?: string,
  limit = PAGE_SIZE
): Promise<UnifiedEvent[]> {
  let query = supabase
    .from('economic_events')
    .select('*')
    .eq('wallet_id', walletId)
    .order('ts', { ascending: false })
    .limit(limit);
  
  if (cursor) {
    query = query.lt('ts', cursor);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch Hypercore events:', error);
    return [];
  }
  
  return (data || []).map(event => formatHypercoreEvent(event, address));
}

async function fetchHypePrice(): Promise<number> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hyperliquid-proxy`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'allMids' }),
    });
    
    if (!response.ok) return 25;
    const prices = await response.json();
    return prices?.HYPE ? parseFloat(prices.HYPE) : 25;
  } catch {
    return 25;
  }
}

async function fetchHyperevmEvents(
  address: string,
  limit = 20,
  hypePrice = 25
): Promise<UnifiedEvent[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=addressTxs&address=${address}&limit=${limit}`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    if (data.error || !data.transactions) return [];
    
    return data.transactions.map((tx: any) => formatHyperevmEvent(tx, address, hypePrice));
  } catch (error) {
    console.error('Failed to fetch HyperEVM events:', error);
    return [];
  }
}

async function getWalletId(address: string): Promise<string | null> {
  const { data } = await supabase
    .from('wallets')
    .select('id')
    .eq('address', address.toLowerCase())
    .maybeSingle();
  
  return data?.id || null;
}

async function fetchActivityPage(
  address: string,
  cursor?: string
): Promise<ActivityPage> {
  // Fetch wallet ID and HYPE price in parallel
  const [walletId, hypePrice] = await Promise.all([
    getWalletId(address),
    !cursor ? fetchHypePrice() : Promise.resolve(25), // Only fetch price on first page
  ]);
  
  // Fetch from both sources
  const [hypercoreEvents, hyperevmEvents] = await Promise.all([
    walletId ? fetchHypercoreEvents(walletId, address, cursor, PAGE_SIZE) : Promise.resolve([]),
    // Only fetch EVM on first page (limited by RPC scanning)
    !cursor ? fetchHyperevmEvents(address, 20, hypePrice) : Promise.resolve([]),
  ]);
  
  // Merge and sort chronologically
  const merged = [...hypercoreEvents, ...hyperevmEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Determine next cursor from oldest hypercore event
  const oldestHypercore = hypercoreEvents[hypercoreEvents.length - 1];
  const nextCursor = oldestHypercore?.timestamp.toISOString() || null;
  const hasMore = hypercoreEvents.length === PAGE_SIZE;
  
  return {
    events: merged,
    nextCursor,
    hasMore,
  };
}

export function useInfiniteActivity(address: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['activity', 'infinite', address?.toLowerCase()],
    queryFn: ({ pageParam }) => fetchActivityPage(address!, pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!address && address.length === 42,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    initialPageParam: undefined as string | undefined,
  });
}

// Simple hook for limited activity (for wallet page preview)
export function useRecentActivity(address: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['activity', 'recent', address?.toLowerCase(), limit],
    queryFn: async () => {
      if (!address) return [];
      
      const walletId = await getWalletId(address);
      if (!walletId) return [];
      
      const events = await fetchHypercoreEvents(walletId, address, undefined, limit);
      return events;
    },
    enabled: !!address && address.length === 42,
    staleTime: 30_000,
  });
}

export type { UnifiedEvent };
