import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";
const HYPERLIQUID_INFO_API = "https://api.hyperliquid.xyz/info";
const HYPEREVM_RPC = "https://rpc.hyperliquid.xyz/evm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ INPUT CLASSIFICATION (sync, zero cost) ============

type InputType = "evm_tx" | "address" | "block" | "token_name" | "unknown";

function classify(input: string): InputType {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  
  if (/^0x[a-fA-F0-9]{64}$/.test(lower)) return "evm_tx";
  if (/^0x[a-fA-F0-9]{40}$/.test(lower)) return "address";
  if (/^\d+$/.test(trimmed)) return "block";
  if (/^[a-zA-Z]/.test(trimmed)) return "token_name";
  return "unknown";
}

// ============ SUPABASE CLIENT ============

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ============ RESOLUTION CACHE ============

interface CacheEntry {
  id: string;
  input_type: string;
  domain: string;
  resolved_entity_type: string | null;
  metadata: any;
  resolved_at: string;
  expires_at: string | null;
  hit_count: number;
}

async function getCached(supabase: any, id: string): Promise<CacheEntry | null> {
  const { data, error } = await supabase
    .from("resolution_cache")
    .select("*")
    .eq("id", id.toLowerCase())
    .single();
  
  if (error || !data) return null;
  
  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }
  
  // Update hit count (fire and forget)
  supabase
    .from("resolution_cache")
    .update({ hit_count: data.hit_count + 1 })
    .eq("id", id.toLowerCase())
    .then(() => {});
  
  return data;
}

async function setCache(
  supabase: any, 
  id: string, 
  inputType: InputType, 
  domain: string, 
  entityType: string | null,
  metadata: any = null
): Promise<void> {
  const expires = domain === "unknown" 
    ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min for unknown
    : null; // Permanent for resolved
  
  await supabase
    .from("resolution_cache")
    .upsert({
      id: id.toLowerCase(),
      input_type: inputType,
      domain,
      resolved_entity_type: entityType,
      metadata,
      resolved_at: new Date().toISOString(),
      expires_at: expires,
      hit_count: 1,
    }, { onConflict: "id" });
}

// ============ UPSTREAM FETCHERS ============

async function tryEvmTx(hash: string): Promise<any | null> {
  try {
    console.log(`[resolver] Trying HyperEVM for tx ${hash}`);
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
      // Get receipt for status
      const receiptRes = await fetch(HYPEREVM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [hash],
          id: 2,
        }),
      });
      const receipt = await receiptRes.json();
      return { tx: result.result, receipt: receipt.result };
    }
    return null;
  } catch (e) {
    console.error(`[resolver] EVM tx error:`, e);
    return null;
  }
}

async function tryCoreTx(hash: string): Promise<any | null> {
  try {
    console.log(`[resolver] Trying Hypercore for tx ${hash}`);
    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "txDetails", hash }),
    });
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    const data = JSON.parse(text);
    if (data.tx || data.txDetails) return data.tx || data.txDetails;
    return null;
  } catch (e) {
    console.error(`[resolver] Core tx error:`, e);
    return null;
  }
}

async function tryEvmAddress(address: string): Promise<any | null> {
  try {
    console.log(`[resolver] Trying HyperEVM for address ${address}`);
    const [balanceRes, nonceRes, codeRes] = await Promise.all([
      fetch(HYPEREVM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
      }),
      fetch(HYPEREVM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionCount", params: [address, "latest"], id: 2 }),
      }),
      fetch(HYPEREVM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getCode", params: [address, "latest"], id: 3 }),
      }),
    ]);
    
    const [balance, nonce, code] = await Promise.all([
      balanceRes.json(),
      nonceRes.json(),
      codeRes.json(),
    ]);
    
    const isContract = code.result && code.result !== "0x";
    const balanceHex = balance.result || "0x0";
    const txCount = nonce.result ? parseInt(nonce.result, 16) : 0;
    
    return {
      address,
      balance: balanceHex,
      balanceFormatted: (parseInt(balanceHex, 16) / 1e18).toFixed(4),
      txCount,
      isContract,
      hasCode: isContract,
    };
  } catch (e) {
    console.error(`[resolver] EVM address error:`, e);
    return null;
  }
}

async function tryCoreWallet(address: string): Promise<any | null> {
  try {
    console.log(`[resolver] Trying Hypercore for wallet ${address}`);
    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userDetails", user: address }),
    });
    const text = await response.text();
    if (!text || text.trim() === "") return { address, txs: [] };
    const data = JSON.parse(text);
    return { address, txs: data.txs || [] };
  } catch (e) {
    console.error(`[resolver] Core wallet error:`, e);
    return null;
  }
}

async function tryEvmBlock(blockNum: number): Promise<any | null> {
  try {
    console.log(`[resolver] Trying HyperEVM for block ${blockNum}`);
    const response = await fetch(HYPEREVM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: [`0x${blockNum.toString(16)}`, true],
        id: 1,
      }),
    });
    const result = await response.json();
    if (result.result) return result.result;
    return null;
  } catch (e) {
    console.error(`[resolver] EVM block error:`, e);
    return null;
  }
}

async function tryCoreBlock(blockNum: number): Promise<any | null> {
  try {
    console.log(`[resolver] Trying Hypercore for block ${blockNum}`);
    const response = await fetch(HYPERLIQUID_EXPLORER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "blockDetails", height: blockNum }),
    });
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    const data = JSON.parse(text);
    if (data.blockDetails) return data.blockDetails;
    return null;
  } catch (e) {
    console.error(`[resolver] Core block error:`, e);
    return null;
  }
}

// ============ VIEW MODEL NORMALIZERS ============

interface TransactionView {
  id: string;
  domain: "hyperevm" | "hypercore";
  status: "success" | "failed" | "pending";
  timestamp: number;
  block: number;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  assetDeltas: Array<{ asset: string; delta: string; direction: "in" | "out" }>;
  actionType: string;
  narrative: string;
  raw: any;
}

function normalizeTx(data: any, domain: "hyperevm" | "hypercore"): TransactionView {
  if (domain === "hyperevm") {
    const { tx, receipt } = data;
    const status = receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : "pending";
    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 0;
    const gasPrice = parseInt(tx.gasPrice || "0x0", 16);
    const fee = (gasUsed * gasPrice) / 1e18;
    const value = parseInt(tx.value || "0x0", 16) / 1e18;
    
    return {
      id: tx.hash,
      domain: "hyperevm",
      status,
      timestamp: Date.now(), // Would need block timestamp
      block: parseInt(tx.blockNumber, 16),
      from: tx.from,
      to: tx.to,
      value: value.toFixed(6),
      fee: fee.toFixed(8),
      assetDeltas: value > 0 ? [
        { asset: "HYPE", delta: `-${value.toFixed(6)}`, direction: "out" as const },
      ] : [],
      actionType: tx.to ? (tx.input === "0x" ? "Transfer" : "Contract Call") : "Contract Creation",
      narrative: tx.to ? `Sent ${value.toFixed(4)} HYPE` : "Created contract",
      raw: data,
    };
  } else {
    // Hypercore L1
    const action = data.action || {};
    const actionType = action.type || "Unknown";
    
    return {
      id: data.hash,
      domain: "hypercore",
      status: data.error ? "failed" : "success",
      timestamp: data.time ? new Date(data.time).getTime() : Date.now(),
      block: data.block || 0,
      from: data.user || "",
      to: null,
      value: "0",
      fee: "0",
      assetDeltas: [],
      actionType,
      narrative: `${actionType} on Hypercore`,
      raw: data,
    };
  }
}

interface WalletView {
  address: string;
  domain: "unified";
  summary: {
    totalTxCount: number;
    isContract: boolean;
    evmBalance: string;
    hasEvmActivity: boolean;
    hasCoreActivity: boolean;
  };
  evmActivity: any | null;
  coreActivity: any | null;
}

function normalizeWallet(evm: any | null, core: any | null): WalletView {
  const address = evm?.address || core?.address || "";
  
  return {
    address,
    domain: "unified",
    summary: {
      totalTxCount: (evm?.txCount || 0) + (core?.txs?.length || 0),
      isContract: evm?.isContract || false,
      evmBalance: evm?.balanceFormatted || "0",
      hasEvmActivity: !!(evm && (evm.txCount > 0 || parseFloat(evm.balanceFormatted) > 0)),
      hasCoreActivity: !!(core?.txs?.length > 0),
    },
    evmActivity: evm,
    coreActivity: core,
  };
}

interface BlockView {
  number: number;
  domain: "hyperevm" | "hypercore";
  hash: string;
  timestamp: number;
  txCount: number;
  proposer?: string;
  gasUsed?: string;
  gasLimit?: string;
  transactions: any[];
  raw: any;
}

function normalizeBlock(data: any, domain: "hyperevm" | "hypercore"): BlockView {
  if (domain === "hyperevm") {
    return {
      number: parseInt(data.number, 16),
      domain: "hyperevm",
      hash: data.hash,
      timestamp: parseInt(data.timestamp, 16) * 1000,
      txCount: data.transactions?.length || 0,
      gasUsed: data.gasUsed,
      gasLimit: data.gasLimit,
      transactions: data.transactions || [],
      raw: data,
    };
  } else {
    return {
      number: data.height,
      domain: "hypercore",
      hash: data.hash,
      timestamp: data.blockTime ? new Date(data.blockTime).getTime() : Date.now(),
      txCount: data.numTxs || 0,
      proposer: data.proposer,
      transactions: data.txs || [],
      raw: data,
    };
  }
}

// ============ UNIFIED RESOLVER ============

interface ResolveResult {
  resolved: boolean;
  inputType: InputType;
  entityType: "tx" | "wallet" | "block" | "token" | null;
  domain: "hyperevm" | "hypercore" | "unified" | "unknown";
  data: TransactionView | WalletView | BlockView | null;
  cached: boolean;
  checkedSources: string[];
}

async function resolve(input: string, supabase: any): Promise<ResolveResult> {
  const inputType = classify(input);
  const normalizedInput = input.toLowerCase().trim();
  const checkedSources: string[] = [];
  
  // Check cache first
  const cached = await getCached(supabase, normalizedInput);
  if (cached && cached.domain !== "unknown") {
    console.log(`[resolver] Cache hit for ${normalizedInput}: ${cached.domain}`);
    // Re-fetch data using cached domain info
    // (For now, we still fetch fresh data but know which domain to use)
  }
  
  // EVM Transaction
  if (inputType === "evm_tx") {
    checkedSources.push("hyperevm");
    const evmData = await tryEvmTx(normalizedInput);
    if (evmData) {
      await setCache(supabase, normalizedInput, inputType, "hyperevm", "tx");
      return {
        resolved: true,
        inputType,
        entityType: "tx",
        domain: "hyperevm",
        data: normalizeTx(evmData, "hyperevm"),
        cached: false,
        checkedSources,
      };
    }
    
    checkedSources.push("hypercore");
    const coreData = await tryCoreTx(normalizedInput);
    if (coreData) {
      await setCache(supabase, normalizedInput, inputType, "hypercore", "tx");
      return {
        resolved: true,
        inputType,
        entityType: "tx",
        domain: "hypercore",
        data: normalizeTx(coreData, "hypercore"),
        cached: false,
        checkedSources,
      };
    }
    
    await setCache(supabase, normalizedInput, inputType, "unknown", null);
    return {
      resolved: false,
      inputType,
      entityType: null,
      domain: "unknown",
      data: null,
      cached: false,
      checkedSources,
    };
  }
  
  // Address (unified - fetch from both)
  if (inputType === "address") {
    checkedSources.push("hyperevm", "hypercore");
    const [evmData, coreData] = await Promise.all([
      tryEvmAddress(normalizedInput),
      tryCoreWallet(normalizedInput),
    ]);
    
    const walletView = normalizeWallet(evmData, coreData);
    await setCache(supabase, normalizedInput, inputType, "unified", "wallet", {
      hasEvm: walletView.summary.hasEvmActivity,
      hasCore: walletView.summary.hasCoreActivity,
      isContract: walletView.summary.isContract,
    });
    
    return {
      resolved: true,
      inputType,
      entityType: "wallet",
      domain: "unified",
      data: walletView,
      cached: false,
      checkedSources,
    };
  }
  
  // Block number
  if (inputType === "block") {
    const blockNum = parseInt(input, 10);
    
    // Try EVM first for smaller block numbers
    if (blockNum < 100_000_000) {
      checkedSources.push("hyperevm");
      const evmBlock = await tryEvmBlock(blockNum);
      if (evmBlock) {
        await setCache(supabase, normalizedInput, inputType, "hyperevm", "block");
        return {
          resolved: true,
          inputType,
          entityType: "block",
          domain: "hyperevm",
          data: normalizeBlock(evmBlock, "hyperevm"),
          cached: false,
          checkedSources,
        };
      }
    }
    
    checkedSources.push("hypercore");
    const coreBlock = await tryCoreBlock(blockNum);
    if (coreBlock) {
      await setCache(supabase, normalizedInput, inputType, "hypercore", "block");
      return {
        resolved: true,
        inputType,
        entityType: "block",
        domain: "hypercore",
        data: normalizeBlock(coreBlock, "hypercore"),
        cached: false,
        checkedSources,
      };
    }
    
    // If high block number failed on Hypercore, try EVM
    if (blockNum >= 100_000_000 && !checkedSources.includes("hyperevm")) {
      checkedSources.push("hyperevm");
      const evmBlock = await tryEvmBlock(blockNum);
      if (evmBlock) {
        await setCache(supabase, normalizedInput, inputType, "hyperevm", "block");
        return {
          resolved: true,
          inputType,
          entityType: "block",
          domain: "hyperevm",
          data: normalizeBlock(evmBlock, "hyperevm"),
          cached: false,
          checkedSources,
        };
      }
    }
    
    await setCache(supabase, normalizedInput, inputType, "unknown", null);
    return {
      resolved: false,
      inputType,
      entityType: null,
      domain: "unknown",
      data: null,
      cached: false,
      checkedSources,
    };
  }
  
  // Token name - search Hyperliquid spot tokens
  if (inputType === "token_name") {
    // For now, return as unresolved token search
    // The frontend handles token search via autocomplete
    return {
      resolved: false,
      inputType,
      entityType: "token",
      domain: "hypercore",
      data: null,
      cached: false,
      checkedSources: ["hypercore"],
    };
  }
  
  // Unknown
  return {
    resolved: false,
    inputType,
    entityType: null,
    domain: "unknown",
    data: null,
    cached: false,
    checkedSources: [],
  };
}

// ============ HTTP HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/unified-resolver", "");
    const supabase = getSupabaseClient();
    
    // GET /resolve?q=<input>
    if (path === "/resolve" || path === "" || path === "/") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing q parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`[resolver] Resolving: ${query}`);
      const result = await resolve(query, supabase);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // GET /tx/<hash>
    if (path.startsWith("/tx/")) {
      const hash = path.replace("/tx/", "");
      const result = await resolve(hash, supabase);
      
      if (!result.resolved || result.entityType !== "tx") {
        return new Response(JSON.stringify({
          resolved: false,
          error: "Transaction not found",
          checkedSources: result.checkedSources,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // GET /wallet/<address>
    if (path.startsWith("/wallet/")) {
      const address = path.replace("/wallet/", "");
      const result = await resolve(address, supabase);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // GET /block/<number>
    if (path.startsWith("/block/")) {
      const blockNum = path.replace("/block/", "");
      const result = await resolve(blockNum, supabase);
      
      if (!result.resolved || result.entityType !== "block") {
        return new Response(JSON.stringify({
          resolved: false,
          error: "Block not found",
          checkedSources: result.checkedSources,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid endpoint. Use: /resolve, /tx/<hash>, /wallet/<address>, /block/<number>" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[resolver] Error:", error);
    return new Response(
      JSON.stringify({ resolved: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
