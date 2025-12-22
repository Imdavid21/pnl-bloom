/**
 * Hyperliquid API Wrapper
 * Direct calls to Hyperliquid API and Edge Function proxy
 */

const HYPERLIQUID_INFO_API = "https://api.hyperliquid.xyz/info";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
 * Make a direct request to Hyperliquid Info API
 */
export async function proxyRequest(body: object): Promise<any> {
  const response = await fetch(HYPERLIQUID_INFO_API, {
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
export function getApiUrl(): string {
  return HYPERLIQUID_INFO_API;
}

/**
 * Build cURL command for Hyperliquid API
 */
export function buildCurlCommand(body: object): string {
  return `curl -X POST "${HYPERLIQUID_INFO_API}" \\
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
}

export interface UserExplorerDetails {
  address: string;
  txs: TransactionDetails[];
}

/**
 * Call the explorer-proxy edge function
 */
async function callExplorerProxy(params: Record<string, string>): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/explorer-proxy`);
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
    console.error('[Explorer API] Error:', error);
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Get block details from Hyperliquid Explorer API
 */
export async function getBlockDetails(blockHeight: number): Promise<BlockDetails | null> {
  try {
    console.log(`[Explorer API] Fetching block ${blockHeight}`);
    const data = await callExplorerProxy({ type: 'block', height: String(blockHeight) });
    console.log('[Explorer API] Block response:', data);
    return data as BlockDetails;
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
    console.log(`[Explorer API] Fetching tx ${hash}`);
    const data = await callExplorerProxy({ type: 'tx', hash });
    console.log('[Explorer API] Tx response:', data);
    return data as TransactionDetails;
  } catch (err) {
    console.error('[Explorer API] getTxDetails error:', err);
    return null;
  }
}

/**
 * Get user/address details from Hyperliquid Explorer API
 */
export async function getUserDetails(userAddress: string): Promise<UserExplorerDetails | null> {
  try {
    console.log(`[Explorer API] Fetching user ${userAddress}`);
    const data = await callExplorerProxy({ type: 'user', address: userAddress });
    console.log('[Explorer API] User response:', data);
    return data as UserExplorerDetails;
  } catch (err) {
    console.error('[Explorer API] getUserDetails error:', err);
    return null;
  }
}
