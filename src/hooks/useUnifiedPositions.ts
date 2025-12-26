/**
 * Unified Positions Hook
 * Fetches all positions with auto-refresh
 */

import { useQuery } from '@tanstack/react-query';
import { fetchUnifiedPositions, type UnifiedPositions } from '@/lib/position-aggregator';

export function useUnifiedPositions(address: string | undefined) {
  return useQuery<UnifiedPositions | null>({
    queryKey: ['unified-positions', address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;
      return fetchUnifiedPositions(address);
    },
    enabled: !!address,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
  });
}
