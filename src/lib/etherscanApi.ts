/**
 * Etherscan API for HyperEVM - Rate Limited Client
 * 5 calls/sec, 10K calls/month, 3 keys for parallel requests
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ============= Types =============

export interface EtherscanTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  nonce: string;
  input: string;
  contractAddress: string;
  isError: string;
  txreceipt_status: string;
  methodId?: string;
  functionName?: string;
}

export interface EtherscanTokenTransfer {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export interface EtherscanInternalTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  isError: string;
  errCode: string;
}

export interface EtherscanBalance {
  account: string;
  balance: string;
}

export interface EtherscanBlock {
  blockNumber: string;
  timeStamp: string;
  blockMiner: string;
  blockReward: string;
}

// ============= API Client =============

async function callEtherscanProxy(params: Record<string, string>): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/etherscan-proxy`);
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
    throw new Error(error.error || 'Etherscan API request failed');
  }

  return response.json();
}

// ============= Account Methods =============

/**
 * Get transactions for an address
 */
export async function getTransactions(
  address: string,
  options?: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<EtherscanTransaction[]> {
  try {
    const params: Record<string, string> = {
      module: 'account',
      action: 'txlist',
      address,
    };
    if (options?.startBlock) params.startblock = String(options.startBlock);
    if (options?.endBlock) params.endblock = String(options.endBlock);
    if (options?.page) params.page = String(options.page);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.sort) params.sort = options.sort;

    const data = await callEtherscanProxy(params);
    return data.result || [];
  } catch (err) {
    console.error('[Etherscan] getTransactions error:', err);
    return [];
  }
}

/**
 * Get internal transactions for an address
 */
export async function getInternalTransactions(
  address: string,
  options?: {
    startBlock?: number;
    endBlock?: number;
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<EtherscanInternalTransaction[]> {
  try {
    const params: Record<string, string> = {
      module: 'account',
      action: 'txlistinternal',
      address,
    };
    if (options?.startBlock) params.startblock = String(options.startBlock);
    if (options?.endBlock) params.endblock = String(options.endBlock);
    if (options?.page) params.page = String(options.page);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.sort) params.sort = options.sort;

    const data = await callEtherscanProxy(params);
    return data.result || [];
  } catch (err) {
    console.error('[Etherscan] getInternalTransactions error:', err);
    return [];
  }
}

/**
 * Get ERC20 token transfers for an address
 */
export async function getTokenTransfers(
  address: string,
  options?: {
    contractAddress?: string;
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<EtherscanTokenTransfer[]> {
  try {
    const params: Record<string, string> = {
      module: 'account',
      action: 'tokentx',
      address,
    };
    if (options?.contractAddress) params.contractaddress = options.contractAddress;
    if (options?.page) params.page = String(options.page);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.sort) params.sort = options.sort;

    const data = await callEtherscanProxy(params);
    return data.result || [];
  } catch (err) {
    console.error('[Etherscan] getTokenTransfers error:', err);
    return [];
  }
}

/**
 * Get balance for an address
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const data = await callEtherscanProxy({
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    });
    return data.result || '0';
  } catch (err) {
    console.error('[Etherscan] getBalance error:', err);
    return '0';
  }
}

/**
 * Get balances for multiple addresses (batch)
 */
export async function getMultiBalance(addresses: string[]): Promise<EtherscanBalance[]> {
  try {
    const data = await callEtherscanProxy({
      module: 'account',
      action: 'balancemulti',
      address: addresses.join(','),
      tag: 'latest',
    });
    return data.result || [];
  } catch (err) {
    console.error('[Etherscan] getMultiBalance error:', err);
    return [];
  }
}

// ============= Block Methods =============

/**
 * Get block rewards for miner
 */
export async function getBlockRewards(
  address: string,
  options?: {
    page?: number;
    offset?: number;
  }
): Promise<EtherscanBlock[]> {
  try {
    const params: Record<string, string> = {
      module: 'account',
      action: 'getminedblocks',
      address,
      blocktype: 'blocks',
    };
    if (options?.page) params.page = String(options.page);
    if (options?.offset) params.offset = String(options.offset);

    const data = await callEtherscanProxy(params);
    return data.result || [];
  } catch (err) {
    console.error('[Etherscan] getBlockRewards error:', err);
    return [];
  }
}

// ============= Contract Methods =============

/**
 * Get contract ABI
 */
export async function getContractABI(address: string): Promise<string | null> {
  try {
    const data = await callEtherscanProxy({
      module: 'contract',
      action: 'getabi',
      address,
    });
    if (data.status === '1') {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error('[Etherscan] getContractABI error:', err);
    return null;
  }
}

/**
 * Get contract source code
 */
export async function getContractSourceCode(address: string): Promise<any | null> {
  try {
    const data = await callEtherscanProxy({
      module: 'contract',
      action: 'getsourcecode',
      address,
    });
    if (data.status === '1' && data.result?.[0]) {
      return data.result[0];
    }
    return null;
  } catch (err) {
    console.error('[Etherscan] getContractSourceCode error:', err);
    return null;
  }
}

// ============= Helpers =============

/**
 * Format wei to ETH
 */
export function formatWeiToEth(wei: string): string {
  const value = BigInt(wei);
  const eth = Number(value) / 1e18;
  return eth.toFixed(6);
}

/**
 * Format timestamp
 */
export function formatEtherscanTimestamp(ts: string): string {
  const date = new Date(parseInt(ts) * 1000);
  return date.toLocaleString();
}
