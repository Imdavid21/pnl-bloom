// Multi-chain USDC payment support
// Chain configurations with USDC contract addresses

import { defineChain } from 'viem';
import { mainnet, base, arbitrum, optimism } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  usdcContract: `0x${string}`;
  explorerUrl: string;
  explorerTxPath: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  icon?: string;
}

// Treasury recipient - same across all chains
export const TREASURY_ADDRESS = '0xDD590902CDAC0abB4861a6748a256e888aCB8D47' as `0x${string}`;
export const PAYMENT_AMOUNT = BigInt(100_000); // 0.1 USDC (6 decimals)
export const PAYMENT_AMOUNT_DISPLAY = '0.1';

// Chain configurations
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  hyperevm: {
    id: 999,
    name: 'HyperEVM',
    shortName: 'HYPE',
    rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    usdcContract: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    explorerUrl: 'https://explorer.hyperliquid.xyz',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorerUrl: 'https://etherscan.io',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  base: {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    rpcUrl: 'https://mainnet.base.org',
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://basescan.org',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    explorerUrl: 'https://arbiscan.io',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    shortName: 'OP',
    rpcUrl: 'https://mainnet.optimism.io',
    usdcContract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  mantle: {
    id: 5000,
    name: 'Mantle',
    shortName: 'MNT',
    rpcUrl: 'https://rpc.mantle.xyz',
    usdcContract: '0x09Bc4E0D10e52467dcd6a6a0B76d5A03cD65A6c0',
    explorerUrl: 'https://explorer.mantle.xyz',
    explorerTxPath: '/tx/',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  },
} as const;

// Chain key type
export type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

// Get chain config by ID
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

// Get chain key by ID
export function getChainKeyById(chainId: number): SupportedChainKey | undefined {
  const entry = Object.entries(SUPPORTED_CHAINS).find(([_, c]) => c.id === chainId);
  return entry ? entry[0] as SupportedChainKey : undefined;
}

// Get wagmi chain object by key
export function getWagmiChain(chainKey: SupportedChainKey) {
  switch (chainKey) {
    case 'hyperevm': return hyperEvm;
    case 'ethereum': return mainnet;
    case 'base': return base;
    case 'arbitrum': return arbitrum;
    case 'optimism': return optimism;
    case 'mantle': return mantle;
    default: return hyperEvm;
  }
}

// Define HyperEVM chain for wagmi
export const hyperEvm = defineChain({
  id: SUPPORTED_CHAINS.hyperevm.id,
  name: SUPPORTED_CHAINS.hyperevm.name,
  nativeCurrency: SUPPORTED_CHAINS.hyperevm.nativeCurrency,
  rpcUrls: {
    default: { http: [SUPPORTED_CHAINS.hyperevm.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'HyperEVM Explorer', url: SUPPORTED_CHAINS.hyperevm.explorerUrl },
  },
});

// Define Mantle chain for wagmi
export const mantle = defineChain({
  id: SUPPORTED_CHAINS.mantle.id,
  name: SUPPORTED_CHAINS.mantle.name,
  nativeCurrency: SUPPORTED_CHAINS.mantle.nativeCurrency,
  rpcUrls: {
    default: { http: [SUPPORTED_CHAINS.mantle.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Mantle Explorer', url: SUPPORTED_CHAINS.mantle.explorerUrl },
  },
});

// Export viem chain definitions for wagmi
export { mainnet, base, arbitrum, optimism };

// All wagmi-compatible chains
export const allChains = [hyperEvm, mainnet, base, arbitrum, optimism, mantle] as const;
