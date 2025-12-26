/**
 * Universal Input Resolver
 * Detects entity type from user input and verifies existence across domains
 */

import { supabase } from '@/integrations/supabase/client';

// ============ TYPES ============

export type EntityType = 'wallet' | 'tx' | 'token' | 'block' | 'unknown';

export interface ResolverResult {
  type: EntityType;
  identifier: string;
  route: string;
  verified: boolean;
  domains: {
    hypercore: boolean;
    hyperevm: boolean;
  };
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  type: EntityType;
  cleaned: string;
}

// ============ DETECTION PATTERNS ============

const PATTERNS = {
  wallet: /^0x[a-fA-F0-9]{40}$/,
  tx: /^0x[a-fA-F0-9]{64}$/,
  block: /^\d+$/,
  token: /^[a-zA-Z]{2,10}$/,
};

// ============ FORMAT DETECTION ============

export function detectType(input: string): EntityType {
  const cleaned = input.trim();
  
  if (!cleaned) return 'unknown';
  
  // Wallet address: 0x + 40 hex chars
  if (PATTERNS.wallet.test(cleaned)) return 'wallet';
  
  // Transaction hash: 0x + 64 hex chars
  if (PATTERNS.tx.test(cleaned)) return 'tx';
  
  // Block number: pure digits
  if (PATTERNS.block.test(cleaned)) return 'block';
  
  // Token symbol: 2-10 letters
  if (PATTERNS.token.test(cleaned)) return 'token';
  
  return 'unknown';
}

export function validateInput(input: string): ValidationResult {
  const cleaned = input.trim().toLowerCase();
  const type = detectType(input.trim());
  
  return {
    isValid: type !== 'unknown',
    type,
    cleaned: type === 'token' ? cleaned.toUpperCase() : cleaned,
  };
}

// ============ VERIFICATION FUNCTIONS ============

async function checkHypercoreActivity(address: string): Promise<boolean> {
  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', address.toLowerCase())
      .maybeSingle();
    
    return !!wallet;
  } catch {
    return false;
  }
}

async function checkHyperevmActivity(address: string): Promise<boolean> {
  try {
    // Use direct fetch for query params (hyperevm-rpc expects `action` in the URL)
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${address}`;
    const res = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    // Has activity if balance > 0 or is contract
    return data.balance !== '0.000000' || data.isContract;
  } catch {
    return false;
  }
}

async function checkEvmTransaction(hash: string): Promise<boolean> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyperevm-rpc?action=tx&hash=${hash}`;
    const res = await fetch(url, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    return !!data.hash && !data.error;
  } catch {
    return false;
  }
}

async function checkHypercoreTrade(hash: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('economic_events')
      .select('id')
      .eq('tx_hash', hash)
      .maybeSingle();
    
    return !!data;
  } catch {
    return false;
  }
}

async function checkEvmBlock(blockNumber: string): Promise<boolean> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyperevm-rpc?action=block&block=${blockNumber}`;
    const res = await fetch(url, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    return !!data.number && !data.error;
  } catch {
    return false;
  }
}

async function checkTokenExists(symbol: string): Promise<{ perp: boolean; spot: boolean }> {
  try {
    // Check perp markets via hyperliquid-proxy
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyperliquid-proxy`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'meta' }),
    });
    
    if (!res.ok) return { perp: false, spot: false };
    
    const data = await res.json();
    const perpMarkets = data.universe || [];
    const hasPerp = perpMarkets.some((m: any) => 
      m.name?.toUpperCase() === symbol.toUpperCase()
    );
    
    return { perp: hasPerp, spot: false };
  } catch {
    return { perp: false, spot: false };
  }
}

// ============ ROUTE BUILDERS ============

function buildRoute(type: EntityType, identifier: string): string {
  switch (type) {
    case 'wallet':
      return `/wallet/${identifier}`;
    case 'tx':
      return `/tx/${identifier}`;
    case 'block':
      return `/block/${identifier}`;
    case 'token':
      return `/token/${identifier.toUpperCase()}`;
    default:
      return '/';
  }
}

// ============ MAIN RESOLVER ============

export async function resolveInput(input: string): Promise<ResolverResult> {
  const validation = validateInput(input);
  
  if (!validation.isValid) {
    return {
      type: 'unknown',
      identifier: input,
      route: '/explorer',
      verified: false,
      domains: { hypercore: false, hyperevm: false },
      error: 'Please enter a valid address, transaction, market, or token',
    };
  }
  
  const { type, cleaned } = validation;
  
  // Create a timeout promise
  const timeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
    ]);
  };
  
  let domains = { hypercore: false, hyperevm: false };
  let verified = false;
  let error: string | undefined;
  
  switch (type) {
    case 'wallet': {
      // Check both domains in parallel with timeout
      const [hasHypercore, hasHyperevm] = await Promise.all([
        timeout(checkHypercoreActivity(cleaned), 2000, false),
        timeout(checkHyperevmActivity(cleaned), 2000, false),
      ]);
      
      domains = { hypercore: hasHypercore, hyperevm: hasHyperevm };
      verified = hasHypercore || hasHyperevm;
      
      if (!verified) {
        error = 'No activity found for this address';
      }
      break;
    }
    
    case 'tx': {
      // Try EVM first (more common), then Hypercore
      const hasEvm = await timeout(checkEvmTransaction(cleaned), 2000, false);
      
      if (hasEvm) {
        domains = { hypercore: false, hyperevm: true };
        verified = true;
      } else {
        const hasHypercore = await timeout(checkHypercoreTrade(cleaned), 1000, false);
        domains = { hypercore: hasHypercore, hyperevm: false };
        verified = hasHypercore;
        
        if (!verified) {
          error = 'Transaction not found';
        }
      }
      break;
    }
    
    case 'block': {
      const exists = await timeout(checkEvmBlock(cleaned), 2000, false);
      domains = { hypercore: false, hyperevm: exists };
      verified = exists;
      
      if (!verified) {
        error = 'Block not found';
      }
      break;
    }
    
    case 'token': {
      const tokenCheck = await timeout(checkTokenExists(cleaned), 2000, { perp: false, spot: false });
      domains = { hypercore: tokenCheck.perp || tokenCheck.spot, hyperevm: false };
      verified = tokenCheck.perp || tokenCheck.spot;
      
      if (!verified) {
        error = 'Token not found';
      }
      break;
    }
  }
  
  return {
    type,
    identifier: cleaned,
    route: buildRoute(type, cleaned),
    verified,
    domains,
    error,
  };
}

// ============ RECENT SEARCHES (localStorage) ============

const RECENT_SEARCHES_KEY = 'hyperpnl-recent-searches';
const MAX_RECENT_SEARCHES = 5;

export interface RecentSearch {
  query: string;
  type: EntityType;
  timestamp: number;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string, type: EntityType): void {
  try {
    const searches = getRecentSearches();
    
    // Remove if already exists
    const filtered = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    
    // Add to front
    filtered.unshift({
      query,
      type,
      timestamp: Date.now(),
    });
    
    // Keep only max
    const trimmed = filtered.slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore localStorage errors
  }
}

export function removeRecentSearch(query: string): void {
  try {
    const searches = getRecentSearches();
    const filtered = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore localStorage errors
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore localStorage errors
  }
}
