/**
 * HyperEVM Lending Proxy
 * Fetches lending positions from HyperEVM DeFi protocols
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HYPEREVM_RPC = 'https://api.hyperliquid.xyz/evm';

// Known lending protocol addresses on HyperEVM
// These would be updated as protocols launch
const LENDING_PROTOCOLS = {
  hyperlend: {
    comptroller: null, // Add when available
    poolLens: null,
  },
};

// ERC20 ABI for balance queries
const ERC20_ABI = {
  balanceOf: '0x70a08231',
};

interface LendingPosition {
  protocol: string;
  asset: string;
  type: 'supplied' | 'borrowed';
  amount: number;
  valueUsd: number;
  apy: number;
}

// Query ERC20 balance
async function getERC20Balance(tokenAddress: string, walletAddress: string): Promise<bigint> {
  try {
    const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
    const callData = ERC20_ABI.balanceOf + paddedAddress;
    
    const response = await fetch(HYPEREVM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: tokenAddress, data: callData }, 'latest'],
        id: 1,
      }),
    });
    
    const data = await response.json();
    if (data.error || !data.result || data.result === '0x') return 0n;
    
    return BigInt(data.result);
  } catch (error) {
    console.error('Failed to get ERC20 balance:', error);
    return 0n;
  }
}

// Fetch lending positions from protocols
async function fetchLendingPositions(address: string): Promise<LendingPosition[]> {
  const positions: LendingPosition[] = [];
  
  // Currently no major lending protocols deployed on HyperEVM
  // This infrastructure is ready for when they launch
  
  // Example of how to query a Compound-style lending protocol:
  /*
  if (LENDING_PROTOCOLS.hyperlend.comptroller) {
    // Query cToken balances
    // Query borrow balances
    // Calculate USD values
  }
  */
  
  console.log(`Querying lending positions for ${address}`);
  console.log('No lending protocols currently integrated on HyperEVM');
  
  return positions;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get('address');
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Missing address parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Fetching HyperEVM lending positions for ${address}`);
    
    const positions = await fetchLendingPositions(address);
    
    return new Response(
      JSON.stringify({ 
        positions,
        protocols: Object.keys(LENDING_PROTOCOLS),
        message: 'HyperEVM lending integration ready. Add protocol addresses as they launch.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching lending positions:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, positions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
