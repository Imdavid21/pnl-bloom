import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResolutionResult, ResolutionEntity } from '@/types/resolver';
import { detectInputType, guessDomain } from '@/lib/inputHeuristics';

// ============ VIEW MODEL TYPES ============

export interface TransactionViewModel { // ... existing code can stay or be updated if needed, but we focus on return type


export interface TransactionViewModel {
  id: string;
  domain: 'hyperevm' | 'hypercore';
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  block: number;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  assetDeltas: Array<{ asset: string; delta: string; direction: 'in' | 'out' }>;
  actionType: string;
  narrative: string;
  raw: any;
}

export interface WalletViewModel {
  address: string;
  domain: 'unified';
  summary: {
    totalTxCount: number;
    isContract: boolean;
    evmBalance: string;
    hasEvmActivity: boolean;
    hasCoreActivity: boolean;
  };
  evmActivity: {
    address: string;
    balance: string;
    balanceFormatted: string;
    txCount: number;
    isContract: boolean;
    hasCode: boolean;
  } | null;
  coreActivity: {
    address: string;
    txs: any[];
  } | null;
}

export interface BlockViewModel {
  number: number;
  domain: 'hyperevm' | 'hypercore';
  hash: string;
  timestamp: number;
  txCount: number;
  proposer?: string;
  gasUsed?: string;
  gasLimit?: string;
  transactions: any[];
  raw: any;
}

export type EntityViewModel = TransactionViewModel | WalletViewModel | BlockViewModel;

export type EntityViewModel = TransactionViewModel | WalletViewModel | BlockViewModel;


// ============ RESOLVER CLIENT ============

const RESOLVER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unified-resolver`;

async function fetchResolve(query: string): Promise<ResolutionResult> {
  const inputType = detectInputType(query);
  const domainGuess = guessDomain(inputType);

  // Construct params based on heuristics
  const params = new URLSearchParams({ q: query });
  if (domainGuess !== 'both') {
    params.append('domain', domainGuess);
  }

  // Use fetch directly since we need query params
  const res = await fetch(`${RESOLVER_URL}/resolve?${params.toString()}`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Resolver error: ${res.statusText}`);
  }

  return res.json();
}

async function fetchTransaction(hash: string): Promise<ResolutionResult> {
  const res = await fetch(`${RESOLVER_URL}/tx/${hash}`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Resolver error: ${res.statusText}`);
  }

  return res.json();
}

async function fetchWallet(address: string): Promise<ResolutionResult> {
  const res = await fetch(`${RESOLVER_URL}/wallet/${address}`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Resolver error: ${res.statusText}`);
  }

  return res.json();
}

async function fetchBlock(blockNumber: string): Promise<ResolutionResult> {
  const res = await fetch(`${RESOLVER_URL}/block/${blockNumber}`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Resolver error: ${res.statusText}`);
  }

  return res.json();
}

// ============ REACT QUERY HOOKS ============

/**
 * Generic resolve hook - automatically determines entity type
 */
export function useResolve(query: string | undefined) {
  return useQuery({
    queryKey: ['resolve', query?.toLowerCase()],
    queryFn: () => fetchResolve(query!),
    enabled: !!query && query.length > 0,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    retry: 1,
  });
}

/**
 * Transaction-specific hook
 */
export function useTransaction(hash: string | undefined) {
  return useQuery({
    queryKey: ['tx', hash?.toLowerCase()],
    queryFn: () => fetchTransaction(hash!),
    enabled: !!hash && hash.length > 0,
    staleTime: Infinity, // Transactions are immutable after finality
    gcTime: 30 * 60_000, // 30 minutes
    retry: 1,
  });
}

/**
 * Wallet-specific hook (always unified)
 */
export function useWallet(address: string | undefined) {
  return useQuery({
    queryKey: ['wallet', address?.toLowerCase()],
    queryFn: () => fetchWallet(address!),
    enabled: !!address && address.length > 0,
    staleTime: 10_000, // 10 seconds - wallet data can change
    gcTime: 5 * 60_000, // 5 minutes
    retry: 1,
  });
}

/**
 * Block-specific hook
 */
export function useBlock(blockNumber: string | undefined) {
  return useQuery({
    queryKey: ['block', blockNumber],
    queryFn: () => fetchBlock(blockNumber!),
    enabled: !!blockNumber && blockNumber.length > 0,
    staleTime: Infinity, // Blocks are immutable
    gcTime: 30 * 60_000, // 30 minutes
    retry: 1,
  });
}

/**
 * Prefetch utility for hover states
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  return {
    prefetchWallet: (address: string) => {
      queryClient.prefetchQuery({
        queryKey: ['wallet', address.toLowerCase()],
        queryFn: () => fetchWallet(address),
        staleTime: 10_000,
      });
    },
    prefetchTransaction: (hash: string) => {
      queryClient.prefetchQuery({
        queryKey: ['tx', hash.toLowerCase()],
        queryFn: () => fetchTransaction(hash),
        staleTime: Infinity,
      });
    },
    prefetchBlock: (blockNumber: string) => {
      queryClient.prefetchQuery({
        queryKey: ['block', blockNumber],
        queryFn: () => fetchBlock(blockNumber),
        staleTime: Infinity,
      });
    },
  };
}

/**
 * Get domain label for display
 */
export function getDomainLabel(domain: ResolutionEntity['domain'] | 'unified' | 'unknown'): string {
  switch (domain) {
    case 'hyperevm':
      return 'HyperEVM';
    case 'hypercore':
      return 'Hypercore';
    case 'unified':
      return 'All Chains';
    default:
      return '';
  }
}

/**
 * Get domain badge color classes
 */
export function getDomainBadgeClasses(domain: ResolutionEntity['domain'] | 'unified' | 'unknown'): string {
  switch (domain) {
    case 'hyperevm':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'hypercore':
      return 'bg-primary/20 text-primary';
    case 'unified':
      return 'bg-blue-500/20 text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
