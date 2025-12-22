/**
 * HyperEVM API - EVM JSON-RPC Wrapper
 * For block explorer functionality on HyperEVM
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ============= Types =============

export interface EVMBlock {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGas: number | null;
  miner: string;
  nonce: string;
  size: number | null;
  txCount: number;
  transactions: EVMTransaction[] | string[];
  extraData?: string;
  stateRoot?: string;
  transactionsRoot?: string;
  receiptsRoot?: string;
}

export interface EVMTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  valueEth: string;
  gas: number;
  gasPrice: number | null;
  maxFeePerGas: number | null;
  maxPriorityFeePerGas: number | null;
  nonce: number;
  transactionIndex: number | null;
  input: string;
  type: number;
  blockNumber: number | null;
  blockHash: string | null;
  // Receipt fields
  status?: 'success' | 'failed' | 'pending';
  gasUsed?: number | null;
  effectiveGasPrice?: number | null;
  contractAddress?: string | null;
  cumulativeGasUsed?: number | null;
  logs?: EVMLog[];
}

export interface EVMLog {
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  removed: boolean;
  // Decoded fields (if known event)
  decoded?: {
    eventName: string;
    args: Record<string, any>;
  };
}

export interface EVMAddress {
  address: string;
  balance: string;
  balanceWei: string;
  isContract: boolean;
  code: string | null;
}

export interface BlockSummary {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: number;
  gasLimit: number;
  miner: string;
}

// ============= API Functions =============

async function callHyperEVMProxy(params: Record<string, string>): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/hyperevm-rpc`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Get the latest block number
 */
export async function getLatestBlockNumber(): Promise<number> {
  const data = await callHyperEVMProxy({ action: 'latestBlock' });
  return data.blockNumber;
}

/**
 * Get block by number or hash
 */
export async function getEVMBlock(blockId: string | number, includeTxs = true): Promise<EVMBlock | null> {
  try {
    const data = await callHyperEVMProxy({
      action: 'block',
      block: String(blockId),
      full: String(includeTxs),
    });
    return data as EVMBlock;
  } catch (err) {
    console.error('[HyperEVM] getEVMBlock error:', err);
    return null;
  }
}

/**
 * Get transaction by hash
 */
export async function getEVMTransaction(hash: string): Promise<EVMTransaction | null> {
  try {
    const data = await callHyperEVMProxy({
      action: 'tx',
      hash,
    });
    return data as EVMTransaction;
  } catch (err) {
    console.error('[HyperEVM] getEVMTransaction error:', err);
    return null;
  }
}

/**
 * Get address information
 */
export async function getEVMAddress(address: string): Promise<EVMAddress | null> {
  try {
    const data = await callHyperEVMProxy({
      action: 'address',
      address,
    });
    return data as EVMAddress;
  } catch (err) {
    console.error('[HyperEVM] getEVMAddress error:', err);
    return null;
  }
}

/**
 * Get logs with filter
 */
export async function getEVMLogs(params: {
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  topic0?: string;
}): Promise<EVMLog[]> {
  try {
    const queryParams: Record<string, string> = { action: 'logs' };
    if (params.address) queryParams.address = params.address;
    if (params.fromBlock) queryParams.fromBlock = params.fromBlock;
    if (params.toBlock) queryParams.toBlock = params.toBlock;
    if (params.topic0) queryParams.topic0 = params.topic0;

    const data = await callHyperEVMProxy(queryParams);
    return data.logs || [];
  } catch (err) {
    console.error('[HyperEVM] getEVMLogs error:', err);
    return [];
  }
}

/**
 * Get recent blocks
 */
export async function getRecentBlocks(count = 10): Promise<BlockSummary[]> {
  try {
    const data = await callHyperEVMProxy({
      action: 'recentBlocks',
      count: String(count),
    });
    return data.blocks || [];
  } catch (err) {
    console.error('[HyperEVM] getRecentBlocks error:', err);
    return [];
  }
}

// ============= Helper Functions =============

/**
 * Format gas price from wei to gwei
 */
export function formatGwei(wei: number | null): string {
  if (!wei) return '0';
  return (wei / 1e9).toFixed(2);
}

/**
 * Format timestamp to date string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(',', ' -');
}

/**
 * Calculate time ago
 */
export function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, start = 6, end = 4): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Detect common ERC20/721 events
 */
export function decodeKnownEvent(log: EVMLog): EVMLog {
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  
  if (log.topics[0] === TRANSFER_TOPIC) {
    // ERC20 Transfer or ERC721 Transfer
    const from = log.topics[1] ? '0x' + log.topics[1].slice(26) : null;
    const to = log.topics[2] ? '0x' + log.topics[2].slice(26) : null;
    
    // If 4 topics, it's ERC721 (tokenId in topic[3])
    // If 3 topics + data, it's ERC20 (amount in data)
    if (log.topics.length === 4) {
      return {
        ...log,
        decoded: {
          eventName: 'Transfer (ERC721)',
          args: {
            from,
            to,
            tokenId: log.topics[3],
          },
        },
      };
    } else {
      const amount = log.data !== '0x' ? BigInt(log.data).toString() : '0';
      return {
        ...log,
        decoded: {
          eventName: 'Transfer (ERC20)',
          args: {
            from,
            to,
            amount,
          },
        },
      };
    }
  }
  
  if (log.topics[0] === APPROVAL_TOPIC) {
    const owner = log.topics[1] ? '0x' + log.topics[1].slice(26) : null;
    const spender = log.topics[2] ? '0x' + log.topics[2].slice(26) : null;
    const amount = log.data !== '0x' ? BigInt(log.data).toString() : '0';
    
    return {
      ...log,
      decoded: {
        eventName: 'Approval (ERC20)',
        args: {
          owner,
          spender,
          amount,
        },
      },
    };
  }
  
  return log;
}
