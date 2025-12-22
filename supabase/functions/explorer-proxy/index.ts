import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestType = url.searchParams.get("type");
    
    let body: Record<string, unknown>;
    
    if (requestType === "block") {
      const height = url.searchParams.get("height");
      if (!height) {
        return new Response(
          JSON.stringify({ error: "Missing height parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = { type: "blockDetails", height: parseInt(height, 10) };
      console.log(`[explorer-proxy] Fetching block ${height} from ${HYPERLIQUID_EXPLORER_API}`);
      console.log(`[explorer-proxy] Request body:`, JSON.stringify(body));
    } else if (requestType === "tx") {
      const hash = url.searchParams.get("hash");
      if (!hash) {
        return new Response(
          JSON.stringify({ error: "Missing hash parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = { type: "txDetails", hash };
      console.log(`[explorer-proxy] Fetching tx ${hash} from ${HYPERLIQUID_EXPLORER_API}`);
      console.log(`[explorer-proxy] Request body:`, JSON.stringify(body));
    } else if (requestType === "user") {
      const address = url.searchParams.get("address");
      if (!address) {
        return new Response(
          JSON.stringify({ error: "Missing address parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = { type: "userDetails", user: address };
      console.log(`[explorer-proxy] Fetching user ${address} from ${HYPERLIQUID_EXPLORER_API}`);
      console.log(`[explorer-proxy] Request body:`, JSON.stringify(body));
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use: block, tx, or user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log(`[explorer-proxy] Response status: ${response.status}, body preview: ${responseText.substring(0, 500)}`);
    
    // Handle empty response (404 from explorer typically returns empty body)
    if (!responseText || responseText.trim() === '') {
      console.error(`[explorer-proxy] Explorer API returned empty response`);
      return new Response(
        JSON.stringify({ error: "Not found on Hyperliquid L1 explorer" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      console.error(`[explorer-proxy] API error: ${responseText.substring(0, 500)}`);
      return new Response(
        JSON.stringify({ error: "Hyperliquid API error", details: responseText.substring(0, 500) }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[explorer-proxy] Non-JSON response:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid JSON from Hyperliquid API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[explorer-proxy] Parsed response type: ${data?.type}`);

    // Normalize response format
    let normalized;
    if (requestType === "block") {
      const bd = data.blockDetails;
      if (!bd) {
        console.error(`[explorer-proxy] No blockDetails in response:`, JSON.stringify(data).substring(0, 200));
        return new Response(
          JSON.stringify({ error: "Block not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      normalized = {
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
      };
    } else if (requestType === "tx") {
      // API returns "tx" not "txDetails" for the transaction object
      const tx = data.tx || data.txDetails;
      if (!tx) {
        console.error(`[explorer-proxy] No tx in response:`, JSON.stringify(data).substring(0, 200));
        return new Response(
          JSON.stringify({ error: "Transaction not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      normalized = {
        hash: tx.hash,
        block: tx.block,
        time: tx.time,
        user: tx.user,
        action: tx.action,
        error: tx.error,
      };
    } else if (requestType === "user") {
      normalized = {
        txs: data.txs || [],
        address: url.searchParams.get("address"),
      };
    }

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[explorer-proxy] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
