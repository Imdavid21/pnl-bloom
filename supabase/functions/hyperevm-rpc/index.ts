import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPEREVM_RPC_URL = "https://rpc.hyperliquid.xyz/evm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to convert hex to decimal
function hexToDecimal(hex: string): number {
  return parseInt(hex, 16);
}

// Helper to format wei to ETH
function weiToEth(weiHex: string): string {
  const wei = BigInt(weiHex);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

// Make JSON-RPC call
async function rpcCall(method: string, params: any[]): Promise<any> {
  console.log(`[hyperevm-rpc] Calling ${method} with params:`, JSON.stringify(params));
  
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    console.error(`[hyperevm-rpc] RPC error:`, data.error);
    throw new Error(data.error.message || "RPC error");
  }
  
  return data.result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "latestBlock") {
      // Get latest block number
      const blockNumHex = await rpcCall("eth_blockNumber", []);
      const blockNum = hexToDecimal(blockNumHex);
      console.log(`[hyperevm-rpc] Latest block: ${blockNum}`);
      
      return new Response(JSON.stringify({ blockNumber: blockNum }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "block") {
      const blockParam = url.searchParams.get("block");
      const includeTxs = url.searchParams.get("full") === "true";
      
      if (!blockParam) {
        return new Response(JSON.stringify({ error: "Missing block parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Convert to hex if it's a number
      let blockId: string;
      if (blockParam.startsWith("0x")) {
        blockId = blockParam;
      } else {
        blockId = "0x" + parseInt(blockParam, 10).toString(16);
      }

      console.log(`[hyperevm-rpc] Fetching block ${blockParam} (${blockId})`);
      
      const block = await rpcCall("eth_getBlockByNumber", [blockId, includeTxs]);
      
      if (!block) {
        return new Response(JSON.stringify({ error: "Block not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize block data
      const normalized = {
        number: hexToDecimal(block.number),
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: hexToDecimal(block.timestamp),
        gasUsed: hexToDecimal(block.gasUsed),
        gasLimit: hexToDecimal(block.gasLimit),
        baseFeePerGas: block.baseFeePerGas ? hexToDecimal(block.baseFeePerGas) : null,
        miner: block.miner,
        nonce: block.nonce,
        difficulty: block.difficulty ? hexToDecimal(block.difficulty) : 0,
        size: block.size ? hexToDecimal(block.size) : null,
        extraData: block.extraData,
        logsBloom: block.logsBloom,
        mixHash: block.mixHash,
        receiptsRoot: block.receiptsRoot,
        sha3Uncles: block.sha3Uncles,
        stateRoot: block.stateRoot,
        transactionsRoot: block.transactionsRoot,
        txCount: block.transactions?.length || 0,
        transactions: includeTxs 
          ? block.transactions?.map((tx: any) => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              valueEth: weiToEth(tx.value),
              gas: hexToDecimal(tx.gas),
              gasPrice: tx.gasPrice ? hexToDecimal(tx.gasPrice) : null,
              maxFeePerGas: tx.maxFeePerGas ? hexToDecimal(tx.maxFeePerGas) : null,
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? hexToDecimal(tx.maxPriorityFeePerGas) : null,
              nonce: hexToDecimal(tx.nonce),
              transactionIndex: hexToDecimal(tx.transactionIndex),
              input: tx.input,
              type: tx.type ? hexToDecimal(tx.type) : 0,
              blockNumber: hexToDecimal(tx.blockNumber),
              blockHash: tx.blockHash,
            }))
          : block.transactions, // Just hashes if not full
      };

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "tx") {
      const hash = url.searchParams.get("hash");
      
      if (!hash) {
        return new Response(JSON.stringify({ error: "Missing hash parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[hyperevm-rpc] Fetching tx ${hash}`);

      // Fetch tx and receipt in parallel
      const [tx, receipt] = await Promise.all([
        rpcCall("eth_getTransactionByHash", [hash]),
        rpcCall("eth_getTransactionReceipt", [hash]),
      ]);

      if (!tx) {
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize transaction data
      const normalized = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        valueEth: weiToEth(tx.value),
        gas: hexToDecimal(tx.gas),
        gasPrice: tx.gasPrice ? hexToDecimal(tx.gasPrice) : null,
        maxFeePerGas: tx.maxFeePerGas ? hexToDecimal(tx.maxFeePerGas) : null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? hexToDecimal(tx.maxPriorityFeePerGas) : null,
        nonce: hexToDecimal(tx.nonce),
        transactionIndex: tx.transactionIndex ? hexToDecimal(tx.transactionIndex) : null,
        input: tx.input,
        type: tx.type ? hexToDecimal(tx.type) : 0,
        blockNumber: tx.blockNumber ? hexToDecimal(tx.blockNumber) : null,
        blockHash: tx.blockHash,
        // Receipt data
        status: receipt ? (receipt.status === "0x1" ? "success" : "failed") : "pending",
        gasUsed: receipt ? hexToDecimal(receipt.gasUsed) : null,
        effectiveGasPrice: receipt?.effectiveGasPrice ? hexToDecimal(receipt.effectiveGasPrice) : null,
        contractAddress: receipt?.contractAddress || null,
        cumulativeGasUsed: receipt ? hexToDecimal(receipt.cumulativeGasUsed) : null,
        logs: receipt?.logs?.map((log: any, index: number) => ({
          logIndex: hexToDecimal(log.logIndex),
          address: log.address,
          topics: log.topics,
          data: log.data,
          blockNumber: hexToDecimal(log.blockNumber),
          transactionHash: log.transactionHash,
          transactionIndex: hexToDecimal(log.transactionIndex),
          blockHash: log.blockHash,
          removed: log.removed || false,
        })) || [],
        logsBloom: receipt?.logsBloom,
      };

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "address") {
      const address = url.searchParams.get("address");
      
      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[hyperevm-rpc] Fetching address ${address}`);

      // Get balance and code (to check if contract)
      const [balanceHex, code] = await Promise.all([
        rpcCall("eth_getBalance", [address, "latest"]),
        rpcCall("eth_getCode", [address, "latest"]),
      ]);

      const isContract = code && code !== "0x";
      const balance = weiToEth(balanceHex);

      // Note: HyperEVM doesn't have a direct API to get transactions by address
      // We would need an indexer for that. For now, return basic info.
      const normalized = {
        address,
        balance,
        balanceWei: balanceHex,
        isContract,
        code: isContract ? code : null,
      };

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "logs") {
      const address = url.searchParams.get("address");
      const fromBlock = url.searchParams.get("fromBlock") || "0x0";
      const toBlock = url.searchParams.get("toBlock") || "latest";
      const topic0 = url.searchParams.get("topic0");

      const filter: any = {
        fromBlock,
        toBlock,
      };
      
      if (address) filter.address = address;
      if (topic0) filter.topics = [topic0];

      console.log(`[hyperevm-rpc] Fetching logs with filter:`, filter);

      const logs = await rpcCall("eth_getLogs", [filter]);

      const normalized = logs?.map((log: any) => ({
        logIndex: hexToDecimal(log.logIndex),
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: hexToDecimal(log.blockNumber),
        transactionHash: log.transactionHash,
        transactionIndex: hexToDecimal(log.transactionIndex),
        blockHash: log.blockHash,
        removed: log.removed || false,
      })) || [];

      return new Response(JSON.stringify({ logs: normalized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "recentBlocks") {
      const count = parseInt(url.searchParams.get("count") || "10", 10);
      
      // Get latest block number
      const latestHex = await rpcCall("eth_blockNumber", []);
      const latest = hexToDecimal(latestHex);
      
      // Fetch recent blocks in parallel
      const blockPromises = [];
      for (let i = 0; i < count && latest - i >= 0; i++) {
        const blockNum = "0x" + (latest - i).toString(16);
        blockPromises.push(rpcCall("eth_getBlockByNumber", [blockNum, false]));
      }
      
      const blocks = await Promise.all(blockPromises);
      
      const normalized = blocks.filter(Boolean).map(block => ({
        number: hexToDecimal(block.number),
        hash: block.hash,
        timestamp: hexToDecimal(block.timestamp),
        txCount: block.transactions?.length || 0,
        gasUsed: hexToDecimal(block.gasUsed),
        gasLimit: hexToDecimal(block.gasLimit),
        miner: block.miner,
      }));

      return new Response(JSON.stringify({ blocks: normalized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: latestBlock, block, tx, address, logs, recentBlocks" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[hyperevm-rpc] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
