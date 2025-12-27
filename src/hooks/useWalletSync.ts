/**
 * Wallet Sync Hook
 * Auto-syncs wallets that don't exist in the database
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SyncStatus {
  needsSync: boolean;
  isSyncing: boolean;
  syncComplete: boolean;
  error: string | null;
  progress: {
    fills: number;
    funding: number;
    events: number;
  } | null;
}

async function checkWalletExists(address: string): Promise<boolean> {
  const { data } = await supabase
    .from('wallets')
    .select('id')
    .eq('address', address.toLowerCase())
    .maybeSingle();
  
  return !!data;
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
  });

  // Check if wallet exists in DB
  const { data: walletExists, isLoading: checkingWallet } = useQuery({
    queryKey: ['wallet-exists', address?.toLowerCase()],
    queryFn: () => checkWalletExists(address!),
    enabled: !!address && address.length === 42,
    staleTime: 60_000,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: (data) => {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncComplete: true,
        progress: {
          fills: data.sync?.fills || 0,
          funding: data.sync?.funding || 0,
          events: data.sync?.events || 0,
        },
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
      }));
    },
  });

  // Auto-sync when wallet doesn't exist
  useEffect(() => {
    if (!checkingWallet && walletExists === false && address && !syncStatus.isSyncing && !syncStatus.syncComplete) {
      setSyncStatus(prev => ({
        ...prev,
        needsSync: true,
        isSyncing: true,
      }));
      syncMutation.mutate(address);
    }
  }, [walletExists, checkingWallet, address, syncStatus.isSyncing, syncStatus.syncComplete]);

  return {
    ...syncStatus,
    isChecking: checkingWallet,
    walletExists,
    retrySync: () => {
      if (address) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: true,
          error: null,
        }));
        syncMutation.mutate(address);
      }
    },
  };
}
