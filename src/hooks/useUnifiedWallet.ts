/**
 * React hook for fetching unified wallet data
 */

import { useQuery } from '@tanstack/react-query';
import { fetchUnifiedWalletData, type UnifiedWalletData } from '@/lib/wallet-aggregator';

export function useUnifiedWallet(address: string | undefined) {
  return useQuery({
    queryKey: ['wallet', 'unified', address?.toLowerCase()],
    queryFn: () => fetchUnifiedWalletData(address!),
    enabled: !!address && address.length === 42,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export type { UnifiedWalletData };
