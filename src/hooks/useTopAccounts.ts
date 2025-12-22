import { useState, useEffect, useCallback, useRef } from 'react';
import { TOP_ACCOUNTS, type TopAccount } from '@/data/topAccounts';
import { getBalance } from '@/lib/etherscanApi';

const CACHE_KEY = 'top_accounts_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface CachedAccountData {
  address: string;
  balance: string | null;
  lastUpdated: number;
}

interface CacheData {
  accounts: Record<string, CachedAccountData>;
  lastFullRefresh: number;
}

export interface TopAccountWithData extends TopAccount {
  liveBalance: string | null;
  lastUpdated: number | null;
  isLoading: boolean;
}

function loadCache(): CacheData {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('[TopAccounts] Cache load error:', err);
  }
  return { accounts: {}, lastFullRefresh: 0 };
}

function saveCache(data: CacheData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[TopAccounts] Cache save error:', err);
  }
}

export function useTopAccounts() {
  const [accounts, setAccounts] = useState<TopAccountWithData[]>(() => 
    TOP_ACCOUNTS.map(a => ({
      ...a,
      liveBalance: null,
      lastUpdated: null,
      isLoading: false,
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cacheRef = useRef<CacheData>(loadCache());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if cache needs refresh (hourly)
  const needsRefresh = useCallback(() => {
    const now = Date.now();
    return now - cacheRef.current.lastFullRefresh > CACHE_DURATION_MS;
  }, []);

  // Refresh a single account's balance
  const refreshAccount = useCallback(async (address: string) => {
    setAccounts(prev => prev.map(a => 
      a.address.toLowerCase() === address.toLowerCase() 
        ? { ...a, isLoading: true }
        : a
    ));

    try {
      const balance = await getBalance(address);
      const now = Date.now();
      
      // Update cache
      cacheRef.current.accounts[address.toLowerCase()] = {
        address,
        balance,
        lastUpdated: now,
      };
      saveCache(cacheRef.current);

      // Update state
      setAccounts(prev => prev.map(a => 
        a.address.toLowerCase() === address.toLowerCase() 
          ? { ...a, liveBalance: balance, lastUpdated: now, isLoading: false }
          : a
      ));

      return balance;
    } catch (err) {
      console.error('[TopAccounts] Refresh error for', address, err);
      setAccounts(prev => prev.map(a => 
        a.address.toLowerCase() === address.toLowerCase() 
          ? { ...a, isLoading: false }
          : a
      ));
      return null;
    }
  }, []);

  // Refresh all accounts (rate-limited)
  const refreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // Process in batches to respect rate limits (5 req/sec × 3 keys = 15 req/sec)
      // But to be safe, do 5 at a time with slight delay
      const batchSize = 5;
      for (let i = 0; i < TOP_ACCOUNTS.length; i += batchSize) {
        const batch = TOP_ACCOUNTS.slice(i, i + batchSize);
        await Promise.all(batch.map(a => refreshAccount(a.address)));
        
        // Small delay between batches
        if (i + batchSize < TOP_ACCOUNTS.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      cacheRef.current.lastFullRefresh = Date.now();
      saveCache(cacheRef.current);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshAccount]);

  // Load from cache on mount
  useEffect(() => {
    const cache = cacheRef.current;
    
    // Apply cached data to state
    setAccounts(prev => prev.map(a => {
      const cached = cache.accounts[a.address.toLowerCase()];
      if (cached) {
        return {
          ...a,
          liveBalance: cached.balance,
          lastUpdated: cached.lastUpdated,
        };
      }
      return a;
    }));

    // Check if we need a refresh
    if (needsRefresh()) {
      refreshAll();
    }
  }, [needsRefresh, refreshAll]);

  // Set up hourly refresh
  useEffect(() => {
    const checkAndRefresh = () => {
      if (needsRefresh()) {
        refreshAll();
      }
    };

    // Check every 5 minutes if we need to refresh
    refreshTimerRef.current = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [needsRefresh, refreshAll]);

  // Handler for when user clicks on an account - refresh its data
  const onAccountClick = useCallback((address: string) => {
    const cached = cacheRef.current.accounts[address.toLowerCase()];
    const now = Date.now();
    
    // Only refresh if data is older than 5 minutes
    if (!cached || now - cached.lastUpdated > 5 * 60 * 1000) {
      refreshAccount(address);
    }
  }, [refreshAccount]);

  return {
    accounts,
    isRefreshing,
    refreshAll,
    refreshAccount,
    onAccountClick,
    lastFullRefresh: cacheRef.current.lastFullRefresh,
  };
}
