/**
 * Hyperliquid API Wrapper
 * Direct calls to Hyperliquid API
 */

const HYPERLIQUID_INFO_API = "https://api.hyperliquid.xyz/info";
const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'POST';
  description: string;
  requestBody: object;
  requiresUser?: boolean;
}

export const ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'clearinghouseState',
    name: 'Clearinghouse State',
    method: 'POST',
    description: 'Get account state including positions, margin, and account value.',
    requestBody: { type: 'clearinghouseState', user: '0x...' },
    requiresUser: true,
  },
  {
    id: 'userFills',
    name: 'User Fills',
    method: 'POST',
    description: 'Get recent trade fills for a user.',
    requestBody: { type: 'userFills', user: '0x...' },
    requiresUser: true,
  },
  {
    id: 'userFillsByTime',
    name: 'User Fills By Time',
    method: 'POST',
    description: 'Get fills within a time range. Times are in milliseconds.',
    requestBody: { type: 'userFillsByTime', user: '0x...', startTime: 0, endTime: Date.now() },
    requiresUser: true,
  },
  {
    id: 'userFunding',
    name: 'User Funding',
    method: 'POST',
    description: 'Get funding payments received/paid by user.',
    requestBody: { type: 'userFunding', user: '0x...', startTime: 0, endTime: Date.now() },
    requiresUser: true,
  },
  {
    id: 'allMids',
    name: 'All Mid Prices',
    method: 'POST',
    description: 'Get current mid prices for all markets.',
    requestBody: { type: 'allMids' },
  },
  {
    id: 'meta',
    name: 'Exchange Meta',
    method: 'POST',
    description: 'Get exchange metadata including all available markets.',
    requestBody: { type: 'meta' },
  },
  {
    id: 'metaAndAssetCtxs',
    name: 'Meta + Asset Contexts',
    method: 'POST',
    description: 'Get metadata with current funding rates and open interest.',
    requestBody: { type: 'metaAndAssetCtxs' },
  },
  {
    id: 'openOrders',
    name: 'Open Orders',
    method: 'POST',
    description: 'Get all open orders for a user.',
    requestBody: { type: 'openOrders', user: '0x...' },
    requiresUser: true,
  },
  {
    id: 'userRateLimit',
    name: 'User Rate Limit',
    method: 'POST',
    description: 'Check API rate limit status for a user.',
    requestBody: { type: 'userRateLimit', user: '0x...' },
    requiresUser: true,
  },
  {
    id: 'l2Book',
    name: 'L2 Order Book',
    method: 'POST',
    description: 'Get order book for a market.',
    requestBody: { type: 'l2Book', coin: 'BTC' },
  },
  {
    id: 'candleSnapshot',
    name: 'Candle Snapshot',
    method: 'POST',
    description: 'Get OHLCV candle data.',
    requestBody: { type: 'candleSnapshot', req: { coin: 'BTC', interval: '1h', startTime: Date.now() - 86400000, endTime: Date.now() } },
  },
  {
    id: 'fundingHistory',
    name: 'Funding History',
    method: 'POST',
    description: 'Get historical funding rates.',
    requestBody: { type: 'fundingHistory', coin: 'BTC', startTime: Date.now() - 86400000 * 7 },
  },
];

/**
 * Make a direct request to Hyperliquid API
 */
export async function proxyRequest(body: object, endpoint: 'info' | 'explorer' = 'info'): Promise<any> {
  const targetUrl = endpoint === 'explorer' ? HYPERLIQUID_EXPLORER_API : HYPERLIQUID_INFO_API;
  
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the API URL for display
 */
export function getApiUrl(endpoint: 'info' | 'explorer' = 'info'): string {
  return endpoint === 'explorer' ? HYPERLIQUID_EXPLORER_API : HYPERLIQUID_INFO_API;
}

/**
 * Build cURL command for Hyperliquid API
 */
export function buildCurlCommand(body: object, endpoint: 'info' | 'explorer' = 'info'): string {
  const targetUrl = endpoint === 'explorer' ? HYPERLIQUID_EXPLORER_API : HYPERLIQUID_INFO_API;
  return `curl -X POST "${targetUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body)}'`;
}

// ============= Explorer API Functions =============

export interface BlockDetails {
  blockNumber: number;
  hash: string;
  time: number;
  txCount: number;
  proposer: string;
  txs: TransactionDetails[];
}

export interface TransactionDetails {
  hash: string;
  block: number;
  time: number;
  user: string;
  action: any;
  error: string | null;
  type?: string;
}

/**
 * Get block details from Hyperliquid Explorer API
 */
export async function getBlockDetails(blockHeight: number): Promise<BlockDetails | null> {
  try {
    // Hyperliquid explorer API expects 'height' not 'blockHeight'
    const response = await proxyRequest({ type: 'blockDetails', height: blockHeight }, 'explorer');
    console.log('[Explorer API] Block response:', response);
    
    if (response?.blockDetails) {
      const bd = response.blockDetails;
      return {
        blockNumber: bd.height,
        hash: bd.hash,
        time: bd.blockTime,
        txCount: bd.numTxs,
        proposer: bd.proposer,
        txs: (bd.txs || []).map((tx: any) => ({
          hash: tx.hash,
          block: tx.block,
          time: tx.time,
          user: tx.user,
          action: tx.action,
          error: tx.error,
          type: tx.action?.type,
        })),
      };
    }
    return null;
  } catch (err) {
    console.error('[Explorer API] getBlockDetails error:', err);
    return null;
  }
}

/**
 * Get transaction details from Hyperliquid Explorer API
 */
export async function getTxDetails(hash: string): Promise<TransactionDetails | null> {
  try {
    const response = await proxyRequest({ type: 'txDetails', hash }, 'explorer');
    if (response?.txDetails) {
      const tx = response.txDetails;
      return {
        hash: tx.hash,
        block: tx.block,
        time: tx.time,
        user: tx.user,
        action: tx.action,
        error: tx.error,
        type: tx.action?.type,
      };
    }
    return null;
  } catch (err) {
    console.error('[Explorer API] getTxDetails error:', err);
    return null;
  }
}

/**
 * Get user/address details from Hyperliquid Explorer API
 */
export async function getUserDetails(userAddress: string): Promise<any> {
  try {
    const response = await proxyRequest({ type: 'userDetails', user: userAddress }, 'explorer');
    return response?.userDetails || null;
  } catch (err) {
    console.error('[Explorer API] getUserDetails error:', err);
    return null;
  }
}

/**
 * Get recent blocks by fetching the latest block and working backwards
 */
export async function getRecentBlocks(count: number = 10): Promise<BlockDetails[]> {
  try {
    // First get the latest block to know the current height
    // We'll estimate based on time - Hyperliquid produces ~2.5 blocks/second
    const estimatedHeight = Math.floor(Date.now() / 400); // Rough estimate
    
    // Try to get the most recent blocks
    const blocks: BlockDetails[] = [];
    let currentHeight = 836200000; // Start from a known recent range
    
    // Get multiple blocks in parallel
    const promises = Array.from({ length: count }, (_, i) => 
      getBlockDetails(currentHeight - i)
    );
    
    const results = await Promise.all(promises);
    for (const block of results) {
      if (block) blocks.push(block);
    }
    
    return blocks.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err) {
    console.error('[Explorer API] getRecentBlocks error:', err);
    return [];
  }
}

/**
 * Find the latest block by binary search or estimate
 */
export async function findLatestBlock(): Promise<number> {
  // Start with an estimated height based on time
  // Hyperliquid produces blocks every ~400ms, started around a specific time
  // For now use a known recent height and adjust
  let low = 836000000;
  let high = 837000000;
  
  // Binary search to find the latest block
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    const block = await getBlockDetails(mid);
    if (block) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return low;
}
