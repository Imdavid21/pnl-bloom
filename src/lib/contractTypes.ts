// Contract type detection and classification for HyperEVM
// Differentiates between tokens, dApps, and generic contracts

export type ContractType = 
  | 'erc20_token' 
  | 'erc721_nft' 
  | 'dapp_protocol' 
  | 'bridge' 
  | 'dex' 
  | 'lending' 
  | 'staking'
  | 'system'
  | 'unknown';

export interface ContractInfo {
  address: string;
  type: ContractType;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  isVerified?: boolean;
}

// Known protocol contracts on HyperEVM
export const KNOWN_CONTRACTS: Record<string, ContractInfo> = {
  // System Contracts
  '0x0000000000000000000000000000000000000000': {
    address: '0x0000000000000000000000000000000000000000',
    type: 'system',
    name: 'Zero Address',
    description: 'Burn/null address',
  },
  
  // Wrapped HYPE
  '0x5555555555555555555555555555555555555555': {
    address: '0x5555555555555555555555555555555555555555',
    type: 'erc20_token',
    name: 'Wrapped HYPE',
    description: 'ERC20 wrapped version of native HYPE',
    logoUrl: 'https://app.hyperliquid.xyz/icons/tokens/hype.svg',
  },
  
  // USDC
  '0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2': {
    address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
    type: 'erc20_token',
    name: 'USDC',
    description: 'USD Coin stablecoin on HyperEVM',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  
  // USDT
  '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb': {
    address: '0xB8CE59FC3717ada4C02eaDF9682A9E934F625ebb',
    type: 'erc20_token',
    name: 'USD₮0',
    description: 'Tether USD on HyperEVM',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  },

  // Major dApps
  '0x6d411e0a54382ed43f02410ce1c7a7c122afa6e1': {
    address: '0x6D411e0A54382eD43F02410Ce1c7A7c122aFA6E1',
    type: 'dex',
    name: 'HyperSwap',
    description: 'Decentralized exchange on HyperEVM',
  },
  
  '0x2a2f7c87b2a1e4b6b8c7f4e0c8d4f9a7e6c5b3a1': {
    address: '0x2a2f7c87b2a1e4b6b8c7f4e0c8d4f9a7e6c5b3a1',
    type: 'lending',
    name: 'Relend',
    description: 'Lending protocol on HyperEVM',
  },
  
  '0x3d5320821bfca19fb0b5428f2c79d63bd5246f89': {
    address: '0x3D5320821BfcA19fb0B5428F2C79D63bd5246f89',
    type: 'staking',
    name: 'Kinetiq Staking',
    description: 'Liquid staking for HYPE',
    logoUrl: 'https://raw.githubusercontent.com/kinetiq-protocol/brand-assets/main/khype.png',
  },
};

// ERC20 Transfer event signature
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ERC721_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Get contract info by address
 */
export function getContractInfo(address: string): ContractInfo | null {
  const lower = address.toLowerCase();
  return KNOWN_CONTRACTS[lower] || null;
}

/**
 * Check if an address is a known token contract
 */
export function isTokenContract(address: string): boolean {
  const info = getContractInfo(address);
  return info?.type === 'erc20_token' || info?.type === 'erc721_nft';
}

/**
 * Check if an address is a known dApp/protocol
 */
export function isDAppContract(address: string): boolean {
  const info = getContractInfo(address);
  return ['dapp_protocol', 'dex', 'lending', 'bridge', 'staking'].includes(info?.type || '');
}

/**
 * Detect contract type from bytecode patterns
 */
export function detectContractType(code: string | null): ContractType {
  if (!code || code === '0x') return 'unknown';
  
  // Common ERC20 method signatures
  const hasTransfer = code.includes('a9059cbb'); // transfer(address,uint256)
  const hasBalanceOf = code.includes('70a08231'); // balanceOf(address)
  const hasApprove = code.includes('095ea7b3'); // approve(address,uint256)
  
  // ERC721 signatures
  const hasOwnerOf = code.includes('6352211e'); // ownerOf(uint256)
  const hasSafeTransferFrom = code.includes('42842e0e'); // safeTransferFrom
  
  // DEX/AMM signatures
  const hasSwap = code.includes('022c0d9f'); // swap
  const hasAddLiquidity = code.includes('e8e33700'); // addLiquidity
  
  // Lending signatures  
  const hasDeposit = code.includes('d0e30db0'); // deposit
  const hasBorrow = code.includes('c5ebeaec'); // borrow
  
  if (hasOwnerOf && hasSafeTransferFrom) return 'erc721_nft';
  if (hasTransfer && hasBalanceOf && hasApprove) return 'erc20_token';
  if (hasSwap || hasAddLiquidity) return 'dex';
  if (hasDeposit && hasBorrow) return 'lending';
  
  return 'unknown';
}

/**
 * Get contract type display label
 */
export function getContractTypeLabel(type: ContractType): string {
  const labels: Record<ContractType, string> = {
    erc20_token: 'ERC-20 Token',
    erc721_nft: 'NFT Collection',
    dapp_protocol: 'dApp',
    bridge: 'Bridge',
    dex: 'DEX',
    lending: 'Lending',
    staking: 'Staking',
    system: 'System',
    unknown: 'Contract',
  };
  return labels[type];
}

/**
 * Get contract type color class
 */
export function getContractTypeColor(type: ContractType): string {
  const colors: Record<ContractType, string> = {
    erc20_token: 'text-primary bg-primary/10',
    erc721_nft: 'text-pink-400 bg-pink-400/10',
    dapp_protocol: 'text-profit-3 bg-profit-3/10',
    bridge: 'text-info bg-info/10',
    dex: 'text-profit-3 bg-profit-3/10',
    lending: 'text-warning bg-warning/10',
    staking: 'text-primary bg-primary/10',
    system: 'text-muted-foreground bg-muted/30',
    unknown: 'text-muted-foreground bg-muted/30',
  };
  return colors[type];
}