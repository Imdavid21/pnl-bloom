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

// ============= L1 Explorer API (Hypercore - perps L1) =============

export interface L1BlockDetails {
  blockNumber: number;
  hash: string;
  time: number;
  txCount: number;
  proposer: string;
  txs: L1TransactionDetails[];
}

export interface L1TransactionDetails {
  hash: string;
  block: number;
  time: number;
  user: string;
  action: any;
  error: string | null;
}

export interface L1UserDetails {
  address: string;
  txs: L1TransactionDetails[];
}

/**
 * Call the explorer-proxy edge function (for Hypercore L1)
 */
async function callL1ExplorerProxy(params: Record<string, string>): Promise<any | null> {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/explorer-proxy`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    // 404 is expected - not all data exists on L1 explorer (e.g., EVM-only wallets)
    // Return null silently without logging errors
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      // Only log actual errors, not expected 404s
      console.warn('[L1 Explorer API] Non-OK response:', response.status);
      return null;
    }

    return response.json();
  } catch (err) {
    // Network errors are also expected in some cases, don't treat as critical
    console.warn('[L1 Explorer API] Request failed:', err);
    return null;
  }
}

/**
 * Get L1 block details from Hyperliquid Explorer API
 */
export async function getL1BlockDetails(blockHeight: number): Promise<L1BlockDetails | null> {
  try {
    console.log(`[L1 Explorer API] Fetching block ${blockHeight}`);
    const data = await callL1ExplorerProxy({ type: 'block', height: String(blockHeight) });
    console.log('[L1 Explorer API] Block response:', data);
    return data as L1BlockDetails;
  } catch (err) {
    console.error('[L1 Explorer API] getL1BlockDetails error:', err);
    return null;
  }
}

/**
 * Get L1 transaction details from Hyperliquid Explorer API
 */
export async function getL1TxDetails(hash: string): Promise<L1TransactionDetails | null> {
  try {
    console.log(`[L1 Explorer API] Fetching tx ${hash}`);
    const data = await callL1ExplorerProxy({ type: 'tx', hash });
    console.log('[L1 Explorer API] Tx response:', data);
    return data as L1TransactionDetails;
  } catch (err) {
    console.error('[L1 Explorer API] getL1TxDetails error:', err);
    return null;
  }
}

/**
 * Get L1 user/address details from Hyperliquid Explorer API
 */
export async function getL1UserDetails(userAddress: string): Promise<L1UserDetails | null> {
  try {
    console.log(`[L1 Explorer API] Fetching user ${userAddress}`);
    const data = await callL1ExplorerProxy({ type: 'user', address: userAddress });
    console.log('[L1 Explorer API] User response:', data);
    return data as L1UserDetails;
  } catch (err) {
    console.error('[L1 Explorer API] getL1UserDetails error:', err);
    return null;
  }
}

// ============= Deprecated aliases for backward compatibility =============
export type BlockDetails = L1BlockDetails;
export type TransactionDetails = L1TransactionDetails;
export type UserExplorerDetails = L1UserDetails;
export const getBlockDetails = getL1BlockDetails;
export const getTxDetails = getL1TxDetails;
export const getUserDetails = getL1UserDetails;

// ============= Hypercore Spot API =============

export interface SpotToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical: boolean;
  evmContract: string | null;
  fullName: string | null;
}

export interface SpotPair {
  name: string;
  tokens: [number, number];
  index: number;
  isCanonical: boolean;
}

export interface SpotMeta {
  tokens: SpotToken[];
  universe: SpotPair[];
}

export interface SpotAssetContext {
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
}

export interface SpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

export interface SpotClearinghouseState {
  balances: SpotBalance[];
}

export interface SpotTokenDetails {
  name: string;
  maxSupply: string;
  totalSupply: string;
  circulatingSupply: string;
  szDecimals: number;
  weiDecimals: number;
  midPx: string;
  markPx: string;
  prevDayPx: string;
  genesis: {
    userBalances: [string, string][];
    existingTokenBalances: [number, string][];
  };
  deployer: string;
  deployGas: string;
  deployTime: string;
  seededUsdc: string;
  nonCirculatingUserBalances: [string, string][];
  futureEmissions: string;
}

/**
 * Get spot metadata including all tokens and trading pairs
 */
export async function getSpotMeta(): Promise<SpotMeta> {
  const response = await proxyRequest({ type: 'spotMeta' });
  return response as SpotMeta;
}

/**
 * Get spot metadata with asset contexts (prices, volumes)
 */
export async function getSpotMetaAndAssetCtxs(): Promise<[SpotMeta, SpotAssetContext[]]> {
  const response = await proxyRequest({ type: 'spotMetaAndAssetCtxs' });
  return response as [SpotMeta, SpotAssetContext[]];
}

/**
 * Get a user's spot token balances
 */
export async function getSpotClearinghouseState(user: string): Promise<SpotClearinghouseState> {
  const response = await proxyRequest({ type: 'spotClearinghouseState', user });
  return response as SpotClearinghouseState;
}

/**
 * Get detailed information about a specific token
 */
export async function getSpotTokenDetails(tokenId: string): Promise<SpotTokenDetails | null> {
  try {
    const response = await proxyRequest({ type: 'tokenDetails', tokenId });
    return response as SpotTokenDetails;
  } catch (err) {
    console.error('[Spot API] getSpotTokenDetails error:', err);
    return null;
  }
}

/**
 * Find a token by name (case-insensitive search)
 */
export async function findSpotTokenByName(name: string): Promise<SpotToken | null> {
  try {
    const meta = await getSpotMeta();
    const upperName = name.toUpperCase();
    const token = meta.tokens.find(
      t => t.name.toUpperCase() === upperName || 
           t.fullName?.toUpperCase() === upperName
    );
    return token || null;
  } catch (err) {
    console.error('[Spot API] findSpotTokenByName error:', err);
    return null;
  }
}

/**
 * Get spot pairs for a specific token
 */
export async function getSpotPairsForToken(tokenIndex: number): Promise<SpotPair[]> {
  try {
    const meta = await getSpotMeta();
    return meta.universe.filter(pair => pair.tokens.includes(tokenIndex));
  } catch (err) {
    console.error('[Spot API] getSpotPairsForToken error:', err);
    return [];
  }
}
