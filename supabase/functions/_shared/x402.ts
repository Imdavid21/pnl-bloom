// x402 Payment Verification for Multi-Chain USDC
// HTTP 402 Payment Required implementation

import { getAddress } from "https://esm.sh/viem@2.43.2";

// ============================================================
// SUPPORTED CHAINS CONFIG
// ============================================================
export const SUPPORTED_CHAINS = {
  hyperevm: {
    chainId: 999,
    rpcUrl: "https://rpc.hyperliquid.xyz/evm",
    usdcContract: "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
  },
  ethereum: {
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    usdcContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  base: {
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    usdcContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    usdcContract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  optimism: {
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    usdcContract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  mantle: {
    chainId: 5000,
    rpcUrl: "https://rpc.mantle.xyz",
    usdcContract: "0x09Bc4E0D10e52467dcd6a6a0B76d5A03cD65A6c0",
  },
} as const;

export type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

// Treasury recipient - same across all chains
export const TREASURY_ADDRESS = "0xDD590902CDAC0abB4861a6748a256e888aCB8D47";
export const PAYMENT_AMOUNT = "0.1";
export const PAYMENT_AMOUNT_BASE_UNITS = BigInt(100_000); // 0.1 * 1e6

const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const EXPECTED_RECIPIENT = getAddress(TREASURY_ADDRESS);

// ============================================================
// Address normalization
// ============================================================
function normalizeAddress(address: string): string | null {
  try {
    return getAddress(address);
  } catch {
    return null;
  }
}

function addressEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  return !!na && !!nb && na === nb;
}

// ============================================================
// Interfaces
// ============================================================
export interface X402PaymentMeta {
  amount: string;
  asset: string;
  chain: string;
  recipient: string;
  memo: string;
}

export interface X402Response {
  valid: boolean;
  error?: string;
  txHash?: string;
  amount?: number;
  from?: string;
  chain?: string;
}

// ============================================================
// Create 402 Payment Required response
// ============================================================
export function create402Response(
  purpose: 'wallet_sync' | 'pnl_recompute', 
  corsHeaders: Record<string, string>
): Response {
  const paymentMeta: X402PaymentMeta = {
    amount: PAYMENT_AMOUNT,
    asset: "USDC",
    chain: "multi", // Indicate multi-chain support
    recipient: EXPECTED_RECIPIENT,
    memo: purpose,
  };

  const responseBody = JSON.stringify({
    error: "Payment Required",
    payment: paymentMeta,
    supportedChains: Object.keys(SUPPORTED_CHAINS),
    instructions: {
      step1: `Send ${PAYMENT_AMOUNT} USDC to ${TREASURY_ADDRESS} on any supported chain`,
      step2: "Include the transaction hash and chain in your retry request as x-payment-tx header (format: txHash:chainKey)",
    },
  });

  return new Response(responseBody, {
    status: 402,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Payment-Required": "true",
      "X-Payment-Amount": PAYMENT_AMOUNT,
      "X-Payment-Asset": "USDC",
      "X-Payment-Recipient": EXPECTED_RECIPIENT,
    },
  });
}

// ============================================================
// Parse payment header (txHash:chainKey format)
// ============================================================
export function parsePaymentHeader(header: string): { txHash: string; chainKey: SupportedChainKey } | null {
  const parts = header.split(':');
  if (parts.length === 2) {
    const [txHash, chainKey] = parts;
    if (chainKey in SUPPORTED_CHAINS) {
      return { txHash, chainKey: chainKey as SupportedChainKey };
    }
  }
  // Fallback: assume hyperevm if no chain specified
  if (/^0x[a-f0-9]{64}$/i.test(header)) {
    return { txHash: header, chainKey: 'hyperevm' };
  }
  return null;
}

// ============================================================
// Verify payment on any supported chain
// ============================================================
export async function verifyPayment(
  txHash: string,
  chainKey: SupportedChainKey,
  purpose: 'wallet_sync' | 'pnl_recompute',
  supabase: any
): Promise<X402Response> {
  console.log(`[x402] Verifying payment tx: ${txHash} on ${chainKey}`);

  const chainConfig = SUPPORTED_CHAINS[chainKey];
  if (!chainConfig) {
    return { valid: false, error: `Unsupported chain: ${chainKey}` };
  }

  const expectedUsdcContract = getAddress(chainConfig.usdcContract);

  // Normalize tx hash
  const normalizedTxHash = txHash.toLowerCase().trim();
  if (!/^0x[a-f0-9]{64}$/.test(normalizedTxHash)) {
    return { valid: false, error: "Invalid transaction hash format" };
  }

  // Check if already used
  const { data: existingReceipt } = await supabase
    .from("payment_receipts")
    .select("id")
    .eq("tx_hash", normalizedTxHash)
    .maybeSingle();

  if (existingReceipt) {
    return { valid: false, error: "Payment already used" };
  }

  // Fetch transaction receipt
  let receipt;
  try {
    const receiptResponse = await fetch(chainConfig.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [normalizedTxHash],
      }),
    });

    const receiptData = await receiptResponse.json();
    
    if (receiptData.error) {
      return { valid: false, error: `RPC error: ${receiptData.error.message}` };
    }

    receipt = receiptData.result;

    if (!receipt) {
      return { valid: false, error: `Transaction not found on ${chainKey}. It may still be pending.` };
    }

    if (receipt.status !== "0x1") {
      return { valid: false, error: "Transaction failed on chain" };
    }
  } catch (e) {
    console.error("[x402] Error fetching receipt:", e);
    return { valid: false, error: `Failed to verify transaction on ${chainKey}` };
  }

  // Find USDC Transfer event to treasury
  const transferLog = receipt.logs?.find((log: any) => {
    const logAddress = log.address || null;
    if (!addressEquals(logAddress, expectedUsdcContract)) return false;

    const eventSig = log.topics?.[0]?.toLowerCase();
    if (eventSig !== TRANSFER_EVENT_SIGNATURE.toLowerCase()) return false;

    const toAddressHex = log.topics?.[2];
    if (!toAddressHex) return false;

    const toAddress = "0x" + toAddressHex.slice(-40);
    return addressEquals(toAddress, EXPECTED_RECIPIENT);
  });

  if (!transferLog) {
    return { valid: false, error: "No USDC transfer to treasury found in transaction" };
  }

  // Parse amount
  const amountHex = transferLog.data;
  const amountBaseUnits = BigInt(amountHex);
  
  if (amountBaseUnits < PAYMENT_AMOUNT_BASE_UNITS) {
    const amountUsdc = Number(amountBaseUnits) / 1_000_000;
    return { valid: false, error: `Insufficient payment: ${amountUsdc} USDC (required: ${PAYMENT_AMOUNT})` };
  }

  const amountUsdc = Number(amountBaseUnits) / 1_000_000;
  const fromAddress = "0x" + transferLog.topics?.[1]?.slice(-40).toLowerCase();

  return {
    valid: true,
    txHash: normalizedTxHash,
    amount: amountUsdc,
    from: fromAddress,
    chain: chainKey,
  };
}

// ============================================================
// Record payment receipt
// ============================================================
export async function recordPaymentReceipt(
  supabase: any,
  txHash: string,
  wallet: string,
  amount: number,
  chain: string,
  purpose: 'wallet_sync' | 'pnl_recompute'
): Promise<void> {
  const { error } = await supabase.from("payment_receipts").insert({
    tx_hash: txHash.toLowerCase(),
    wallet: wallet.toLowerCase(),
    amount,
    asset: "USDC",
    chain,
    purpose,
  });

  if (error && !error.message?.includes("duplicate")) {
    throw new Error(`Failed to record payment receipt: ${error.message}`);
  }
}
