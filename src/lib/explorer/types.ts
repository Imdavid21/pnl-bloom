// Core entity types for the Explorer
export type EntityMode = 'wallet' | 'tx' | 'block' | 'token' | 'position' | 'contract';
export type ChainSource = 'hypercore' | 'hyperevm' | 'both' | 'unknown';

// Search resolution result
export interface SearchResolution {
  mode: EntityMode;
  id: string;
  chain?: ChainSource;
  confidence: 'exact' | 'heuristic' | 'ambiguous';
  alternatives?: Array<{ mode: EntityMode; id: string; chain?: ChainSource }>;
}

// Asset delta representation
export interface AssetDelta {
  asset: string;
  symbol: string;
  before: string;
  after: string;
  delta: string;
  deltaUsd: string;
  direction: 'in' | 'out' | 'neutral';
  chain: ChainSource;
}

// Episode grouping for timeline
export interface Episode {
  id: string;
  type: 'trade' | 'transfer' | 'swap' | 'funding' | 'liquidation' | 'deposit' | 'withdrawal' | 'contract_interaction';
  timestamp: number;
  summary: string;
  narrative?: string;
  deltas: AssetDelta[];
  txHashes: string[];
  chain: ChainSource;
  relatedEntities: Array<{ type: EntityMode; id: string }>;
}

// Provenance metadata for trust indicators
export interface Provenance {
  source: 'hyperliquid_api' | 'hyperevm_rpc' | 'supabase_cache' | 'computed';
  fetchedAt: number;
  finality: 'final' | 'pending' | 'unconfirmed';
  staleAfter?: number;
  blockHeight?: number;
}

// Loading stage for multi-stage fetch
export interface LoadingStage {
  stage: 'searching' | 'fetching' | 'reconciling' | 'computing' | 'ready' | 'error';
  message: string;
  source?: string;
  progress?: number;
}

// Transaction View Model
export interface TransactionView {
  hash: string;
  chain: ChainSource;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  blockNumber: number;
  
  // Narrative
  narrative: string;
  actionType: string;
  
  // Parties
  from: string;
  to: string | null;
  counterparty?: string;
  
  // Values
  valueNative: string;
  valueUsd?: string;
  fee: string;
  feeUsd?: string;
  
  // Asset deltas
  deltas: AssetDelta[];
  
  // L1-specific
  l1Action?: {
    type: string;
    market?: string;
    size?: string;
    price?: string;
    side?: string;
    closedPnl?: string;
  };
  
  // EVM-specific
  evmDetails?: {
    gasUsed: number;
    gasLimit: number;
    gasPrice: number;
    nonce: number;
    input: string;
    logs: any[];
    contractAddress?: string;
  };
  
  provenance: Provenance;
}

// Wallet View Model
export interface WalletView {
  address: string;
  chains: ChainSource[];
  
  // Summary
  totalValueUsd: string;
  pnl24h?: string;
  pnl24hPct?: string;
  
  // Risk snapshot
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  maxLeverage?: number;
  liquidationProximity?: number;
  
  // Balances
  balances: {
    hypercore: {
      accountValue: string;
      margin: string;
      withdrawable: string;
    };
    hyperevm: {
      nativeBalance: string;
      tokenCount: number;
    };
  };
  
  // Positions summary
  openPositions: number;
  largestPosition?: {
    market: string;
    size: string;
    pnl: string;
  };
  
  // Activity
  isContract: boolean;
  lastActivity?: number;
  txCount24h?: number;
  
  provenance: Provenance;
}

// Block View Model
export interface BlockView {
  number: number;
  hash: string;
  chain: ChainSource;
  timestamp: number;
  
  // Summary
  txCount: number;
  narrative: string;
  
  // Chain-specific
  l1Details?: {
    proposer: string;
    time: number;
  };
  
  evmDetails?: {
    gasUsed: number;
    gasLimit: number;
    baseFee?: number;
    miner: string;
    size: number;
  };
  
  // Highlights
  highlights: string[];
  topTransactions: Array<{
    hash: string;
    type: string;
    value?: string;
  }>;
  
  provenance: Provenance;
}

// Token View Model
export interface TokenView {
  tokenId: string;
  name: string;
  fullName?: string;
  symbol: string;
  
  // Price
  price: string;
  priceChange24h: number;
  
  // Supply
  circulatingSupply: string;
  totalSupply: string;
  maxSupply?: string;
  marketCap?: string;
  
  // Metadata
  deployer: string;
  deployTime: number;
  isCanonical: boolean;
  evmContract?: string;
  
  // Trading
  pairs: Array<{
    name: string;
    volume24h?: string;
  }>;
  
  provenance: Provenance;
}

// Position View Model  
export interface PositionView {
  id: string;
  walletAddress: string;
  market: string;
  
  // State
  isOpen: boolean;
  direction: 'long' | 'short';
  size: string;
  notionalValue: string;
  
  // Entry/Exit
  entryPrice: string;
  currentPrice?: string;
  exitPrice?: string;
  liquidationPrice?: string;
  
  // PnL
  unrealizedPnl: string;
  realizedPnl: string;
  fundingPnl: string;
  fees: string;
  netPnl: string;
  
  // Risk
  leverage: number;
  marginUsed: string;
  liquidationProximity?: number;
  
  // Timeline
  openTime: number;
  closeTime?: number;
  durationHours?: number;
  
  // Journey (for episode-based view)
  events: Episode[];
  
  provenance: Provenance;
}

// URL state model
export interface ExplorerUrlState {
  q?: string;           // Search query
  mode?: EntityMode;    // Current entity mode
  id?: string;          // Entity ID (derived from q usually)
  tab?: string;         // Active tab within entity view
  view?: string;        // Sub-view or detail level
  chain?: ChainSource;  // Chain preference
  t?: number;           // Timestamp for shareable views
}
