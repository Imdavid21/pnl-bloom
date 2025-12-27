/**
 * Wallet Sync Hook
 * Auto-syncs wallets that don't exist in the database
 * Supports manual refresh for both HyperCore and HyperEVM
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SyncProgress {
  fills: number;
  funding: number;
  events: number;
  days: number;
  volume: number;
}

interface SyncStatus {
  needsSync: boolean;
  isSyncing: boolean;
  syncComplete: boolean;
  error: string | null;
  progress: SyncProgress | null;
  estimatedTime: number | null; // in seconds
  startedAt: number | null;
}

interface WalletAge {
  firstTradeTime: number | null;
  estimatedTrades: number;
}

async function checkWalletExists(address: string): Promise<boolean> {
  const { data } = await supabase
    .from('wallets')
    .select('id')
    .eq('address', address.toLowerCase())
    .maybeSingle();
  
  return !!data;
}

async function fetchWalletAge(address: string): Promise<WalletAge> {
  try {
    // Check first trade time from Hyperliquid API
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hyperliquid-proxy`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        type: 'userFillsByTime', 
        user: address.toLowerCase(),
        startTime: 0,
        endTime: Date.now(),
        aggregateByTime: false,
      }),
    });

    if (!response.ok) {
      return { firstTradeTime: null, estimatedTrades: 0 };
    }

    const fills = await response.json();
    if (!fills || fills.length === 0) {
      return { firstTradeTime: null, estimatedTrades: 0 };
    }

    // First fill is oldest (API returns newest first, so last item)
    const oldestFill = fills[fills.length - 1];
    const firstTradeTime = oldestFill?.time || null;
    
    // Estimate total trades based on sample
    // If we got 500 (max), there are likely more
    const estimatedTrades = fills.length >= 500 ? fills.length * 3 : fills.length;

    return { firstTradeTime, estimatedTrades };
  } catch (error) {
    console.error('Failed to fetch wallet age:', error);
    return { firstTradeTime: null, estimatedTrades: 0 };
  }
}

function estimateSyncTime(walletAge: WalletAge): number {
  if (!walletAge.firstTradeTime) return 10; // Default 10 seconds
  
  const daysSinceFirst = (Date.now() - walletAge.firstTradeTime) / (1000 * 60 * 60 * 24);
  const trades = walletAge.estimatedTrades;
  
  // Base: 5 seconds for API calls
  // + ~0.5 seconds per 100 trades
  // + ~1 second per 30 days of history (for funding)
  const baseTime = 5;
  const tradeTime = (trades / 100) * 0.5;
  const historyTime = (daysSinceFirst / 30) * 1;
  
  return Math.max(5, Math.min(120, Math.ceil(baseTime + tradeTime + historyTime)));
}

async function triggerSync(address: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-wallet`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wallet: address }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Sync failed');
  }

  return response.json();
}

export function useWalletSync(address: string | undefined) {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    needsSync: false,
    isSyncing: false,
    syncComplete: false,
    error: null,
    progress: null,
    estimatedTime: null,
    startedAt: null,
  });

  // Check if wallet exists in DB
  const { data: walletExists, isLoading: checkingWallet } = useQuery({
    queryKey: ['wallet-exists', address?.toLowerCase()],
    queryFn: () => checkWalletExists(address!),
    enabled: !!address && address.length === 42,
    staleTime: 60_000,
  });

  // Fetch wallet age for time estimation
  const { data: walletAge } = useQuery({
    queryKey: ['wallet-age', address?.toLowerCase()],
    queryFn: () => fetchWalletAge(address!),
    enabled: !!address && address.length === 42 && walletExists === false,
    staleTime: 5 * 60_000,
  });

  // Calculate estimated time when wallet age is available
  useEffect(() => {
    if (walletAge && !syncStatus.estimatedTime) {
      const estimate = estimateSyncTime(walletAge);
      setSyncStatus(prev => ({ ...prev, estimatedTime: estimate }));
    }
  }, [walletAge, syncStatus.estimatedTime]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onMutate: () => {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: true,
        error: null,
        startedAt: Date.now(),
      }));
    },
    onSuccess: (data) => {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncComplete: true,
        progress: {
          fills: data.sync?.fills || 0,
          funding: data.sync?.funding || 0,
          events: data.sync?.events || 0,
          days: data.sync?.days || 0,
          volume: data.sync?.volume || 0,
        },
        startedAt: null,
      }));
      
      // Invalidate all wallet-related queries
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-exists', address?.toLowerCase()] });
    },
    onError: (error: Error) => {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message,
        startedAt: null,
      }));
    },
  });

  // Auto-sync when wallet doesn't exist
  useEffect(() => {
    if (!checkingWallet && walletExists === false && address && !syncStatus.isSyncing && !syncStatus.syncComplete && !syncStatus.error) {
      setSyncStatus(prev => ({
        ...prev,
        needsSync: true,
      }));
      syncMutation.mutate(address);
    }
  }, [walletExists, checkingWallet, address, syncStatus.isSyncing, syncStatus.syncComplete, syncStatus.error]);

  // Manual sync function (avoid useCallback here to prevent stale mutation references)
  const triggerManualSync = () => {
    if (!address) {
      console.warn('triggerManualSync: No address provided');
      return;
    }

    if (syncMutation.isPending) {
      console.warn('triggerManualSync: Sync already in progress');
      return;
    }

    // Reset state and trigger sync
    setSyncStatus({
      needsSync: true,
      isSyncing: true,
      syncComplete: false,
      error: null,
      progress: null,
      estimatedTime: walletAge ? estimateSyncTime(walletAge) : 15,
      startedAt: Date.now(),
    });

    syncMutation.mutate(address);
  };

  return {
    ...syncStatus,
    isChecking: checkingWallet,
    walletExists,
    retrySync: () => {
      if (!address) {
        console.warn('retrySync: No address provided');
        return;
      }

      if (syncMutation.isPending) {
        console.warn('retrySync: Sync already in progress');
        return;
      }

      setSyncStatus(prev => ({
        ...prev,
        needsSync: true,
        isSyncing: true,
        startedAt: Date.now(),
        error: null,
        syncComplete: false,
      }));

      syncMutation.mutate(address);
    },
    triggerManualSync,
  };
}
