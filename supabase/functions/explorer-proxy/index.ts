import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";
const HYPEREVM_RPC = "https://rpc.hyperliquid.xyz/evm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Infer domain from input format
function inferTxDomain(input: string): 'hyperevm' | 'hypercore' | 'unknown' {
  // Standard EVM tx hash: 0x + 64 hex chars = 66 total
  if (input.startsWith("0x") && input.length === 66) {
    return "hyperevm";
  }
  // Shorter hashes are likely Hypercore L1
  if (input.startsWith("0x") && input.length < 66) {
    return "hypercore";
  }
  return "unknown";
}

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestType = url.searchParams.get("type");
    
    // Handle transaction lookups with multi-source resolution
    if (requestType === "tx") {
      const hash = url.searchParams.get("hash");
      if (!hash) {
        return new Response(
          JSON.stringify({ error: "Missing hash parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inferredDomain = inferTxDomain(hash);
      console.log(`[explorer-proxy] Tx ${hash} inferred domain: ${inferredDomain}`);

      const attempted: string[] = [];
      let result: { found: boolean; data?: any; source?: string } = { found: false };

      // Try sources in order based on inference
      if (inferredDomain === "hyperevm" || inferredDomain === "unknown") {
        attempted.push("hyperevm");
        const evmResult = await tryHyperEvmTx(hash);
        if (evmResult.found) {
          result = { found: true, data: evmResult.data, source: "hyperevm" };
        }
      }

      // If not found on EVM, try Hypercore
      if (!result.found) {
        attempted.push("hypercore");
        const coreResult = await tryHypercoreTx(hash);
        if (coreResult.found) {
          result = { found: true, data: coreResult.data, source: "hypercore" };
        }
      }

      // If inferred as hypercore but we haven't tried it yet
      if (!result.found && inferredDomain === "hypercore" && !attempted.includes("hypercore")) {
        attempted.push("hypercore");
        const coreResult = await tryHypercoreTx(hash);
        if (coreResult.found) {
          result = { found: true, data: coreResult.data, source: "hypercore" };
        }
      }

      if (!result.found) {
        // Return structured not-found response (not a 404!)
        return new Response(
          JSON.stringify({
            resolved: false,
            attempted,
            suggested: inferredDomain === "hyperevm" ? ["hypercore"] : ["hyperevm"],
            message: `Transaction not found on ${attempted.join(" or ")}`,
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

    // Handle block lookups
    if (requestType === "block") {
      const height = url.searchParams.get("height");
      if (!height) {
        return new Response(
          JSON.stringify({ error: "Missing height parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const body = { type: "blockDetails", height: parseInt(height, 10) };
      console.log(`[explorer-proxy] Fetching block ${height} from ${HYPERLIQUID_EXPLORER_API}`);

      const response = await fetch(HYPERLIQUID_EXPLORER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return new Response(
          JSON.stringify({ resolved: false, message: "Block not found", height }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = JSON.parse(responseText);
      const bd = data.blockDetails;
      if (!bd) {
        return new Response(
          JSON.stringify({ resolved: false, message: "Block not found", height }),
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

    // Handle user lookups
    if (requestType === "user") {
      const address = url.searchParams.get("address");
      if (!address) {
        return new Response(
          JSON.stringify({ error: "Missing address parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = { type: "userDetails", user: address };
      console.log(`[explorer-proxy] Fetching user ${address} from ${HYPERLIQUID_EXPLORER_API}`);

      const response = await fetch(HYPERLIQUID_EXPLORER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return new Response(
          JSON.stringify({ resolved: true, txs: [], address }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = JSON.parse(responseText);
      return new Response(JSON.stringify({
        resolved: true,
        txs: data.txs || [],
        address,
        source: "hypercore",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid type. Use: block, tx, or user" }),
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