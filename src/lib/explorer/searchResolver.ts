import type { SearchResolution, EntityMode, ChainSource } from './types';

// Constants for detection
const L1_BLOCK_THRESHOLD = 100_000_000; // L1 blocks are 100M+
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const TOKEN_ID_REGEX = /^0x[a-fA-F0-9]{34}$/; // Spot token IDs

/**
 * Deterministic search resolution algorithm
 * Priority order:
 * 1. Exact 42-char hex → Wallet
 * 2. Exact 66-char hex → Transaction
 * 3. Pure integer → Block (chain heuristic based on magnitude)
 * 4. 34-char hex → Spot Token
 * 5. Alphabetic/mixed → Token name search
 */
export function resolveSearch(query: string, chainHint?: ChainSource): SearchResolution {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  
  if (!trimmed) {
    return {
      mode: 'wallet',
      id: '',
      confidence: 'ambiguous',
    };
  }
  
  // 1. Check for 42-char address (0x + 40 hex chars)
  if (ADDRESS_REGEX.test(lower)) {
    return {
      mode: 'wallet',
      id: lower,
      chain: chainHint || 'both',
      confidence: 'exact',
    };
  }
  
  // 2. Check for 66-char transaction hash (0x + 64 hex chars)
  if (TX_HASH_REGEX.test(lower)) {
    return {
      mode: 'tx',
      id: lower,
      chain: chainHint,
      confidence: 'exact',
    };
  }
  
  // 3. Check for pure integer (block number)
  if (/^\d+$/.test(trimmed)) {
    const blockNum = parseInt(trimmed, 10);
    // Heuristic: L1 blocks are 100M+, EVM blocks are smaller
    const inferredChain: ChainSource = blockNum >= L1_BLOCK_THRESHOLD 
      ? 'hypercore' 
      : chainHint || 'hyperevm';
    
    return {
      mode: 'block',
      id: trimmed,
      chain: inferredChain,
      confidence: 'heuristic',
      alternatives: [{
        mode: 'block',
        id: trimmed,
        chain: inferredChain === 'hypercore' ? 'hyperevm' : 'hypercore',
      }],
    };
  }
  
  // 4. Check for 34-char hex (spot token ID)
  if (TOKEN_ID_REGEX.test(lower)) {
    return {
      mode: 'token',
      id: lower,
      chain: 'hypercore',
      confidence: 'exact',
    };
  }
  
  // 5. Partial hex string - could be truncated hash, try as tx
  if (lower.startsWith('0x') && lower.length > 10 && lower.length < 66) {
    return {
      mode: 'tx',
      id: lower,
      chain: chainHint,
      confidence: 'heuristic',
      alternatives: [
        { mode: 'token', id: lower, chain: 'hypercore' },
      ],
    };
  }
  
  // 6. Default: treat as token/asset name search
  return {
    mode: 'token',
    id: trimmed,
    chain: 'hypercore',
    confidence: 'heuristic',
  };
}

/**
 * Generate placeholder text based on current context
 */
export function getSearchPlaceholder(chain?: ChainSource): string {
  switch (chain) {
    case 'hyperevm':
      return 'Search EVM address, tx hash, or block...';
    case 'hypercore':
      return 'Search L1 address, tx hash, block, or token...';
    default:
      return 'Search address, tx, block, or token...';
  }
}

/**
 * Validate and normalize an address
 */
export function normalizeAddress(address: string): string {
  const trimmed = address.trim().toLowerCase();
  if (!ADDRESS_REGEX.test(trimmed)) {
    throw new Error('Invalid address format');
  }
  return trimmed;
}

/**
 * Validate and normalize a transaction hash
 */
export function normalizeTxHash(hash: string): string {
  const trimmed = hash.trim().toLowerCase();
  if (!TX_HASH_REGEX.test(trimmed)) {
    throw new Error('Invalid transaction hash format');
  }
  return trimmed;
}

/**
 * Format entity ID for display
 */
export function formatEntityId(id: string, mode: EntityMode): string {
  if (mode === 'block') {
    return `#${parseInt(id).toLocaleString()}`;
  }
  
  if (id.length > 16) {
    return `${id.slice(0, 8)}...${id.slice(-6)}`;
  }
  
  return id;
}

/**
 * Get entity icon name
 */
export function getEntityIcon(mode: EntityMode): string {
  const icons: Record<EntityMode, string> = {
    wallet: 'User',
    tx: 'ArrowRightLeft',
    block: 'Box',
    token: 'Coins',
    position: 'TrendingUp',
    contract: 'Code',
  };
  return icons[mode] || 'Search';
}

/**
 * Get entity label for display
 */
export function getEntityLabel(mode: EntityMode): string {
  const labels: Record<EntityMode, string> = {
    wallet: 'Wallet',
    tx: 'Transaction',
    block: 'Block',
    token: 'Token',
    position: 'Position',
    contract: 'Contract',
  };
  return labels[mode] || 'Entity';
}
