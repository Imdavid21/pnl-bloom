/**
 * React hook for fetching unified wallet data with fresh queries
 * Always fetches fresh data, uses cache for fast initial load
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { fetchUnifiedWalletData, type UnifiedWalletData, type PnlData } from '@/lib/wallet-aggregator';
import type { PnlTimeframe } from '@/components/wallet/WalletHero';

export function useUnifiedWallet(address: string | undefined) {
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState<PnlTimeframe>('ytd');
  
  const queryKey = ['wallet', 'unified', address?.toLowerCase()];
  
  const query = useQuery({
    queryKey,
    queryFn: () => fetchUnifiedWalletData(address!),
    enabled: !!address && address.length === 42,
    staleTime: 0, // Always fetch fresh
    gcTime: 5 * 60_000, // 5 minutes cache
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });
  
  // Trigger background refetch whenever address changes
  useEffect(() => {
    if (address && address.length === 42) {
      // Invalidate and refetch to get fresh data
      queryClient.invalidateQueries({ queryKey });
    }
  }, [address, queryClient, queryKey]);
  
  // Get PnL data for selected timeframe
  const pnlData: PnlData = query.data?.pnlByTimeframe?.[timeframe] || {
    pnl: query.data?.pnl30d || 0,
    pnlPercent: query.data?.pnlPercent30d || 0,
    volume: query.data?.volume30d || 0,
    trades: query.data?.trades30d || 0,
  };
  
  const refetchFresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);
  
  return {
    ...query,
    timeframe,
    setTimeframe,
    pnlData,
    refetchFresh,
  };
}

export type { UnifiedWalletData, PnlTimeframe };
