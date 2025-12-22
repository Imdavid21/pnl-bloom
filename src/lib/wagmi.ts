import { http, createConfig, createStorage } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { 
  SUPPORTED_CHAINS, 
  TREASURY_ADDRESS, 
  PAYMENT_AMOUNT, 
  allChains,
  hyperEvm,
  mainnet,
  base,
  arbitrum,
  optimism,
  mantle,
} from './chains';

// Re-export for backward compatibility
export { 
  SUPPORTED_CHAINS, 
  TREASURY_ADDRESS, 
  PAYMENT_AMOUNT,
  hyperEvm,
  type SupportedChainKey,
  type ChainConfig,
} from './chains';

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Build connectors array
const connectors = [
  // Injected wallets (MetaMask, Rabby, and any detected browser wallets)
  injected({
    shimDisconnect: true,
  }),
];

// Add WalletConnect if project ID is available
if (WALLETCONNECT_PROJECT_ID) {
  connectors.unshift(
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'HyperPNL',
        description: 'Hyperliquid PnL Analytics',
        url: window.location.origin,
        icons: ['https://hyperliquid.xyz/favicon.ico'],
      },
    })
  );
}

export const config = createConfig({
  chains: allChains,
  connectors,
  transports: {
    [hyperEvm.id]: http(SUPPORTED_CHAINS.hyperevm.rpcUrl),
    [mainnet.id]: http(SUPPORTED_CHAINS.ethereum.rpcUrl),
    [base.id]: http(SUPPORTED_CHAINS.base.rpcUrl),
    [arbitrum.id]: http(SUPPORTED_CHAINS.arbitrum.rpcUrl),
    [optimism.id]: http(SUPPORTED_CHAINS.optimism.rpcUrl),
    [mantle.id]: http(SUPPORTED_CHAINS.mantle.rpcUrl),
  },
  storage: createStorage({ storage: localStorage }),
});

// Legacy exports for backward compatibility
export const USDC_ADDRESS = SUPPORTED_CHAINS.hyperevm.usdcContract;

// ERC-20 ABI for transfer
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
