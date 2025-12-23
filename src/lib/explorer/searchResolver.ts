import type { SearchResolution, EntityMode, ChainSource } from './types';

// Constants for detection
const L1_BLOCK_THRESHOLD = 100_000_000; // L1 blocks are 100M+
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const TOKEN_ID_REGEX = /^0x[a-fA-F0-9]{34}$/; // Spot token IDs

/**
 * Canonical input classification - deterministic, no network calls
 * This classifies input locally before any resolution attempts
 */
export type InputType = 'evm_tx_hash' | 'address' | 'block_number' | 'token_id' | 'token_name' | 'unknown';

export function classifyInput(input: string): InputType {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  
  if (!trimmed) return 'unknown';
  
  // 66 chars (0x + 64 hex) = EVM transaction hash
  if (TX_HASH_REGEX.test(lower)) {
    return 'evm_tx_hash';
  }
  
  // 42 chars (0x + 40 hex) = address (works on both EVM and L1)
  if (ADDRESS_REGEX.test(lower)) {
    return 'address';
  }
  
  // Pure numeric = block number
  if (/^\d+$/.test(trimmed)) {
    return 'block_number';
  }
  
  // 34-char hex = spot token ID
  if (TOKEN_ID_REGEX.test(lower)) {
    return 'token_id';
  }
  
  // Alphabetic or alphanumeric = likely token name search
  if (/^[a-zA-Z]/.test(trimmed)) {
    return 'token_name';
  }
  
  return 'unknown';
}

/**
 * Deterministic search resolution algorithm
 * Now uses classifyInput for cleaner classification
 * Chain hints are deprecated - resolution is automatic
 */
export function resolveSearch(query: string, _chainHint?: ChainSource): SearchResolution {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const inputType = classifyInput(trimmed);
  
  if (!trimmed) {
    return {
      mode: 'wallet',
      id: '',
      confidence: 'ambiguous',
    };
  }
  
  switch (inputType) {
    case 'address':
      // Addresses exist on both domains - unified resolution
      return {
        mode: 'wallet',
        id: lower,
        chain: 'both', // Signal unified resolution
        confidence: 'exact',
      };
      
    case 'evm_tx_hash':
      // EVM tx hashes - try both domains automatically
      return {
        mode: 'tx',
        id: lower,
        chain: 'both', // Will try EVM first, then L1
        confidence: 'exact',
      };
      
    case 'block_number':
      const blockNum = parseInt(trimmed, 10);
      // Heuristic: L1 blocks are 100M+, EVM blocks are smaller
      const inferredChain: ChainSource = blockNum >= L1_BLOCK_THRESHOLD 
        ? 'hypercore' 
        : 'hyperevm';
      
      return {
        mode: 'block',
        id: trimmed,
        chain: inferredChain,
        confidence: 'heuristic',
      };
      
    case 'token_id':
      return {
        mode: 'token',
        id: lower,
        chain: 'hypercore',
        confidence: 'exact',
      };
      
    case 'token_name':
      return {
        mode: 'token',
        id: trimmed,
        chain: 'hypercore',
        confidence: 'heuristic',
      };
      
    default:
      // Partial hex or unknown - try as token search
      if (lower.startsWith('0x') && lower.length > 10) {
        return {
          mode: 'tx',
          id: lower,
          chain: 'both',
          confidence: 'heuristic',
        };
      }
      
      return {
        mode: 'token',
        id: trimmed,
        chain: 'hypercore',
        confidence: 'heuristic',
      };
  }
}

/**
 * Generate placeholder text - simplified, no chain-specific text
 */
export function getSearchPlaceholder(_chain?: ChainSource): string {
  return 'Search address, transaction, block, or token...';
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

/**
 * Get human-readable chain label for display
 */
export function getChainLabel(chain?: ChainSource): string {
  switch (chain) {
    case 'hyperevm':
      return 'HyperEVM';
    case 'hypercore':
      return 'Hypercore';
    default:
      return '';
  }
}
