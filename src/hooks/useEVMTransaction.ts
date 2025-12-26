/**
 * EVM Transaction Hook
 * Fetches HyperEVM transaction details
 */

import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface EVMTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed: number;
  gasPrice: string;
  blockNumber: number;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  inputData: string;
  nonce: number;
  logs: EVMLog[];
  tokenTransfers: TokenTransfer[];
}

export interface EVMLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  decoded?: {
    type: string;
    description: string;
  };
}

export interface TokenTransfer {
  tokenAddress: string;
  tokenSymbol: string;
  from: string;
  to: string;
  amount: string;
  direction: 'in' | 'out';
}

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function decodeTransferLog(log: EVMLog, userAddress: string): TokenTransfer | null {
  if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC.toLowerCase()) return null;
  if (log.topics.length < 3) return null;
  
  const from = '0x' + log.topics[1].slice(26).toLowerCase();
  const to = '0x' + log.topics[2].slice(26).toLowerCase();
  const amount = log.data !== '0x' ? BigInt(log.data).toString() : '0';
  
  const direction = to.toLowerCase() === userAddress.toLowerCase() ? 'in' : 'out';
  
  return {
    tokenAddress: log.address,
    tokenSymbol: 'TOKEN', // Would need token metadata lookup
    from,
    to,
    amount,
    direction,
  };
}

async function fetchEVMTransaction(hash: string): Promise<EVMTransaction | null> {
  try {
    // Fetch transaction - the edge function already includes receipt data in the tx response
    const txResponse = await fetch(`${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=tx&hash=${hash}`, {
      headers: { 'apikey': SUPABASE_KEY },
    });
    
    if (!txResponse.ok) return null;
    
    const txData = await txResponse.json();
    
    if (!txData || txData.error || !txData.hash) return null;
    
    // Parse logs from the tx response (receipt data is included)
    const logs: EVMLog[] = (txData.logs || []).map((log: any, i: number) => ({
      address: log.address,
      topics: log.topics || [],
      data: log.data || '0x',
      logIndex: log.logIndex ?? i,
    }));
    
    // Decode transfer logs
    const tokenTransfers: TokenTransfer[] = logs
      .map(log => decodeTransferLog(log, txData.from))
      .filter((t): t is TokenTransfer => t !== null);
    
    // Status is already normalized by the edge function
    const status: 'success' | 'failed' | 'pending' = 
      txData.status === 'success' ? 'success' :
      txData.status === 'failed' ? 'failed' : 'pending';
    
    return {
      hash: txData.hash,
      from: txData.from,
      to: txData.to,
      value: txData.value || '0x0',
      gasUsed: txData.gasUsed || 0,
      gasPrice: String(txData.gasPrice || 0),
      blockNumber: txData.blockNumber || 0,
      timestamp: Date.now(), // Would need block timestamp lookup
      status,
      inputData: txData.input || '0x',
      nonce: txData.nonce || 0,
      logs,
      tokenTransfers,
    };
  } catch (error) {
    console.error('Failed to fetch EVM transaction:', error);
    return null;
  }
}

export function useEVMTransaction(hash: string | undefined) {
  return useQuery({
    queryKey: ['evm-transaction', hash],
    queryFn: () => fetchEVMTransaction(hash!),
    enabled: !!hash,
    staleTime: 300_000, // 5 minutes (transactions don't change)
  });
}
