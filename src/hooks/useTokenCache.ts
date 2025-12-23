import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CachedToken {
  symbol: string;
  name: string;
  address?: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  category: string;
  logoUrl?: string;
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  change24h?: number;
  priceHistory?: { time: number; price: number }[];
  volumeHistory?: { time: number; volume: number }[];
}

const CACHE_KEY = 'hyperlens_token_cache';
const CACHE_EXPIRY_KEY = 'hyperlens_token_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get cached tokens from localStorage
function getCachedTokens(): CachedToken[] | null {
  try {
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry)) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }
    
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// Set cached tokens in localStorage
function setCachedTokens(tokens: CachedToken[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tokens));
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
  } catch {
    // Ignore storage errors
  }
}

async function fetchAllTokens(): Promise<CachedToken[]> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-tokens?password=1234&action=all-tokens`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch tokens');
  }
  
  const result = await response.json();
  return result.data || [];
}

async function fetchTokenDetails(symbol: string): Promise<CachedToken | null> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-tokens?password=1234&action=token-details&symbol=${encodeURIComponent(symbol)}`
  );
  
  if (!response.ok) {
    return null;
  }
  
  const result = await response.json();
  return result.data || null;
}

// Hook to get all tokens with caching
export function useTokenCache() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['token-cache-all'],
    queryFn: async () => {
      // Try cache first
      const cached = getCachedTokens();
      if (cached && cached.length > 0) {
        // Return cached immediately but refetch in background
        fetchAllTokens().then(tokens => {
          setCachedTokens(tokens);
          queryClient.setQueryData(['token-cache-all'], tokens);
        });
        return cached;
      }
      
      const tokens = await fetchAllTokens();
      setCachedTokens(tokens);
      return tokens;
    },
    staleTime: CACHE_DURATION,
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: getCachedTokens() || undefined,
  });

  // Fast search from cache
  const searchTokens = useCallback((query: string): CachedToken[] => {
    const tokens = queryClient.getQueryData<CachedToken[]>(['token-cache-all']) || [];
    if (!query || query.length < 1) return tokens.slice(0, 20);
    
    const lower = query.toLowerCase();
    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(lower) ||
      t.name.toLowerCase().includes(lower) ||
      t.address?.toLowerCase().includes(lower)
    ).slice(0, 20);
  }, [queryClient]);

  // Get token by symbol from cache
  const getTokenBySymbol = useCallback((symbol: string): CachedToken | undefined => {
    const tokens = queryClient.getQueryData<CachedToken[]>(['token-cache-all']) || [];
    return tokens.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
  }, [queryClient]);

  return {
    tokens: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    searchTokens,
    getTokenBySymbol,
    refetch: query.refetch,
  };
}

// Hook to get detailed token info with charts
export function useTokenDetails(symbol: string | undefined) {
  return useQuery({
    queryKey: ['token-details', symbol],
    queryFn: () => symbol ? fetchTokenDetails(symbol) : null,
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to prefetch tokens on app load
export function usePrefetchTokens() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Prefetch on mount if cache is stale
    const cached = getCachedTokens();
    if (!cached || cached.length === 0) {
      queryClient.prefetchQuery({
        queryKey: ['token-cache-all'],
        queryFn: fetchAllTokens,
      });
    }
  }, [queryClient]);
}
