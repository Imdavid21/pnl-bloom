// x402 Payment Required handling for frontend
// Uses chain configs from chains.ts as single source of truth

import { SUPPORTED_CHAINS, TREASURY_ADDRESS, PAYMENT_AMOUNT_DISPLAY } from './chains';

export interface X402PaymentInfo {
  amount: string;
  asset: string;
  chain: string;
  recipient: string;
  memo: string;
}

export interface X402Response {
  error: string;
  payment: X402PaymentInfo;
  instructions?: {
    step1: string;
    step2: string;
    usdcContract: string;
    chainId: number;
    rpcUrl: string;
  };
}

export function isX402Response(response: Response): boolean {
  return response.status === 402;
}

export function parseX402Response(data: unknown): X402PaymentInfo | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'payment' in data
  ) {
    return (data as X402Response).payment;
  }
  return null;
}

// Call an endpoint with x402 payment support
export async function callWithPayment<T>(
  url: string,
  options: RequestInit,
  txHash?: string
): Promise<{ data?: T; paymentRequired?: X402PaymentInfo; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(options.headers as Record<string, string>),
  };

  if (txHash) {
    headers['x-payment-tx'] = txHash;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 402 Payment Required - this is expected, not an error
    if (response.status === 402) {
      const data = await response.json();
      const paymentInfo = parseX402Response(data);
      if (paymentInfo) {
        // Normalize to use our config values for consistency
        return { 
          paymentRequired: {
            ...paymentInfo,
            // Ensure we use the correct addresses from config
            recipient: paymentInfo.recipient || TREASURY_ADDRESS.toLowerCase(),
          }
        };
      }
      // 402 but couldn't parse payment info
      return { error: data.error || 'Payment required but invalid response format' };
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { error: errorData.error || errorData.details || `Request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (err: any) {
    // Network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return { error: 'Network error. Please check your connection.' };
    }
    return { error: err.message || 'Request failed' };
  }
}

// Sync wallet with x402 payment
export async function syncWalletWithPayment(
  wallet: string,
  txHash?: string
): Promise<{ data?: any; paymentRequired?: X402PaymentInfo; error?: string }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-wallet`;
  return callWithPayment(
    url,
    {
      method: 'POST',
      body: JSON.stringify({ wallet }),
    },
    txHash
  );
}

// Recompute PnL with x402 payment
export async function recomputePnlWithPayment(
  wallet: string,
  txHash?: string
): Promise<{ data?: any; paymentRequired?: X402PaymentInfo; error?: string }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recompute-pnl`;
  return callWithPayment(
    url,
    {
      method: 'POST',
      body: JSON.stringify({ wallet }),
    },
    txHash
  );
}

// Free sync for testing (bypasses x402)
export async function syncWalletFree(
  wallet: string
): Promise<{ data?: any; error?: string }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-wallet`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'x-bypass-payment': 'true', // Special header to bypass payment
      },
      body: JSON.stringify({ wallet }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { error: errorData.error || `Request failed with status ${response.status}` };
    }
    
    return await response.json();
  } catch (err: any) {
    return { error: err.message || 'Request failed' };
  }
}
