/**
 * Transaction Resolver Hook
 * Detects whether identifier is HyperEVM tx or HyperCore trade
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TransactionType = 'hyperevm_tx' | 'hypercore_trade' | 'not_found';

export interface ResolvedTransaction {
  type: TransactionType;
  identifier: string;
  data?: any;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchEVMTransaction(hash: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=tx&hash=${hash}`, {
      headers: { 'apikey': SUPABASE_KEY },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.error || !data.hash) return null;
    
    return data;
  } catch {
    return null;
  }
}

async function fetchHyperCoreTrade(identifier: string) {
  // Try by ID first
  const { data: byId } = await supabase
    .from('economic_events')
    .select('*, wallets!inner(address)')
    .eq('id', identifier)
    .maybeSingle();
  
  if (byId) return byId;
  
  // Try by dedupe_key
  const { data: byDedupeKey } = await supabase
    .from('economic_events')
    .select('*, wallets!inner(address)')
    .eq('dedupe_key', identifier)
    .maybeSingle();
  
  return byDedupeKey;
}

async function resolveTransaction(identifier: string): Promise<ResolvedTransaction> {
  const cleanId = identifier.trim().toLowerCase();
  
  // Check if it looks like an EVM transaction hash (0x + 64 hex chars)
  if (/^0x[a-f0-9]{64}$/i.test(cleanId)) {
    const evmTx = await fetchEVMTransaction(cleanId);
    if (evmTx) {
      return { type: 'hyperevm_tx', identifier: cleanId, data: evmTx };
    }
  }
  
  // Try HyperCore trade (UUID or dedupe_key)
  const trade = await fetchHyperCoreTrade(identifier);
  if (trade) {
    return { type: 'hypercore_trade', identifier, data: trade };
  }
  
  return { type: 'not_found', identifier };
}

export function useTransactionResolver(identifier: string | undefined) {
  return useQuery({
    queryKey: ['transaction-resolver', identifier],
    queryFn: () => resolveTransaction(identifier!),
    enabled: !!identifier,
    staleTime: 60_000,
  });
}
