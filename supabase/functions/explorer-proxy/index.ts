import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";
const HYPEREVM_RPC = "https://rpc.hyperliquid.xyz/evm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Try to fetch tx from HyperEVM RPC
async function tryHyperEvmTx(hash: string): Promise<{ found: boolean; data?: any }> {
  try {
    console.log(`[explorer-proxy] Trying HyperEVM RPC for tx ${hash}`);
    const response = await fetch(HYPEREVM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [hash],
        id: 1,
      }),
    });
    const result = await response.json();
    if (result.result) {
      console.log(`[explorer-proxy] Found tx on HyperEVM`);
      return { found: true, data: result.result };
    }
    console.log(`[explorer-proxy] Tx not found on HyperEVM`);
    return { found: false };
  } catch (error) {
    console.error(`[explorer-proxy] HyperEVM RPC error:`, error);
    return { found: false };
  }
}

// Try to fetch tx from Hypercore L1 explorer
async function tryHypercoreTx(hash: string): Promise<{ found: boolean; data?: any }> {
  try {
    console.log(`[explorer-proxy] Trying Hypercore L1 for tx ${hash}`);
    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "txDetails", hash }),
    });
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.log(`[explorer-proxy] Tx not found on Hypercore L1`);
      return { found: false };
    }
    const data = JSON.parse(responseText);
    if (data.tx || data.txDetails) {
      console.log(`[explorer-proxy] Found tx on Hypercore L1`);
      return { found: true, data: data.tx || data.txDetails };
    }
    return { found: false };
  } catch (error) {
    console.error(`[explorer-proxy] Hypercore L1 error:`, error);
    return { found: false };
  }
}

// Try to fetch wallet from HyperEVM
async function tryHyperEvmAddress(address: string): Promise<{ found: boolean; data?: any }> {
  try {
    console.log(`[explorer-proxy] Trying HyperEVM for address ${address}`);
    // Get balance
    const balanceResponse = await fetch(HYPEREVM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const balanceResult = await balanceResponse.json();
    
    // Get transaction count
    const nonceResponse = await fetch(HYPEREVM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 2,
      }),
    });
    const nonceResult = await nonceResponse.json();
    
    // Get code to check if contract
    const codeResponse = await fetch(HYPEREVM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
        id: 3,
      }),
    });
    const codeResult = await codeResponse.json();
    
    const balance = balanceResult.result || "0x0";
    const txCount = nonceResult.result ? parseInt(nonceResult.result, 16) : 0;
    const isContract = codeResult.result && codeResult.result !== "0x";
    
    return {
      found: true,
      data: {
        address,
        balance,
        txCount,
        isContract,
        code: isContract ? codeResult.result : null,
      },
    };
  } catch (error) {
    console.error(`[explorer-proxy] HyperEVM address error:`, error);
    return { found: false };
  }
}

// Try to fetch wallet from Hypercore L1
async function tryHypercoreWallet(address: string): Promise<{ found: boolean; data?: any }> {
  try {
    console.log(`[explorer-proxy] Trying Hypercore L1 for user ${address}`);
    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userDetails", user: address }),
    });
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return { found: true, data: { txs: [], address } };
    }
    const data = JSON.parse(responseText);
    return {
      found: true,
      data: {
        txs: data.txs || [],
        address,
      },
    };
  } catch (error) {
    console.error(`[explorer-proxy] Hypercore L1 user error:`, error);
    return { found: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestType = url.searchParams.get("type");
    
    // Handle transaction lookups with UNIFIED multi-source resolution
    if (requestType === "tx") {
      const hash = url.searchParams.get("hash");
      if (!hash) {
        return new Response(
          JSON.stringify({ error: "Missing hash parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[explorer-proxy] Unified tx resolution for ${hash}`);
      const attempted: string[] = [];
      let result: { found: boolean; data?: any; source?: string } = { found: false };

      // ALWAYS try both sources - EVM first, then Hypercore
      attempted.push("hyperevm");
      const evmResult = await tryHyperEvmTx(hash);
      if (evmResult.found) {
        result = { found: true, data: evmResult.data, source: "hyperevm" };
      }

      // If not found on EVM, try Hypercore
      if (!result.found) {
        attempted.push("hypercore");
        const coreResult = await tryHypercoreTx(hash);
        if (coreResult.found) {
          result = { found: true, data: coreResult.data, source: "hypercore" };
        }
      }

      if (!result.found) {
        // Return unified not-found response - NO suggestions to switch chains
        return new Response(
          JSON.stringify({
            resolved: false,
            attempted,
            message: `Transaction not found on HyperEVM or Hypercore`,
            hash,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalize response based on source
      let normalized;
      if (result.source === "hyperevm") {
        const tx = result.data;
        normalized = {
          hash: tx.hash,
          block: parseInt(tx.blockNumber, 16),
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          input: tx.input,
          source: "hyperevm",
        };
      } else {
        const tx = result.data;
        normalized = {
          hash: tx.hash,
          block: tx.block,
          time: tx.time,
          user: tx.user,
          action: tx.action,
          error: tx.error,
          source: "hypercore",
        };
      }

      return new Response(JSON.stringify({ resolved: true, ...normalized }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle UNIFIED wallet/address lookups
    if (requestType === "user" || requestType === "address") {
      const address = url.searchParams.get("address");
      if (!address) {
        return new Response(
          JSON.stringify({ error: "Missing address parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[explorer-proxy] Unified address resolution for ${address}`);
      
      // Fetch from BOTH sources in parallel for wallets
      const [evmResult, coreResult] = await Promise.all([
        tryHyperEvmAddress(address),
        tryHypercoreWallet(address),
      ]);

      return new Response(JSON.stringify({
        resolved: true,
        domain: "unified",
        address,
        evm: evmResult.found ? evmResult.data : null,
        core: coreResult.found ? coreResult.data : null,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle block lookups
    if (requestType === "block") {
      const height = url.searchParams.get("height");
      if (!height) {
        return new Response(
          JSON.stringify({ error: "Missing height parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const blockNum = parseInt(height, 10);
      const attempted: string[] = [];
      
      // Try HyperEVM first for smaller block numbers
      if (blockNum < 100_000_000) {
        attempted.push("hyperevm");
        try {
          const evmResponse = await fetch(HYPEREVM_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getBlockByNumber",
              params: [`0x${blockNum.toString(16)}`, true],
              id: 1,
            }),
          });
          const evmResult = await evmResponse.json();
          if (evmResult.result) {
            const block = evmResult.result;
            return new Response(JSON.stringify({
              resolved: true,
              blockNumber: parseInt(block.number, 16),
              hash: block.hash,
              time: parseInt(block.timestamp, 16) * 1000,
              txCount: block.transactions?.length || 0,
              gasUsed: block.gasUsed,
              gasLimit: block.gasLimit,
              source: "hyperevm",
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error(`[explorer-proxy] EVM block fetch error:`, e);
        }
      }
      
      // Try Hypercore
      attempted.push("hypercore");
      const body = { type: "blockDetails", height: blockNum };
      console.log(`[explorer-proxy] Fetching block ${height} from ${HYPERLIQUID_EXPLORER_API}`);

      const response = await fetch(HYPERLIQUID_EXPLORER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return new Response(
          JSON.stringify({ resolved: false, message: "Block not found", height, attempted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = JSON.parse(responseText);
      const bd = data.blockDetails;
      if (!bd) {
        return new Response(
          JSON.stringify({ resolved: false, message: "Block not found", height, attempted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalized = {
        resolved: true,
        blockNumber: bd.height,
        hash: bd.hash,
        time: bd.blockTime,
        txCount: bd.numTxs,
        proposer: bd.proposer,
        txs: (bd.txs || []).map((tx: any) => ({
          hash: tx.hash,
          block: tx.block,
          time: tx.time,
          user: tx.user,
          action: tx.action,
          error: tx.error,
        })),
        source: "hypercore",
      };

      return new Response(JSON.stringify(normalized), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid type. Use: block, tx, user, or address" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[explorer-proxy] Error:", error);
    return new Response(
      JSON.stringify({ 
        resolved: false, 
        error: error.message || "Internal server error",
        attempted: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
