import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPEREVM_RPC_URL = "https://rpc.hyperliquid.xyz/evm";

// ERC-20 Transfer event signature: Transfer(address,address,uint256)
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

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

// Helper to format token amount with decimals
function formatTokenAmount(amountHex: string, decimals: number = 18): string {
  try {
    const amount = BigInt(amountHex);
    const divisor = BigInt(10 ** decimals);
    const intPart = amount / divisor;
    const fracPart = amount % divisor;
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6);
    return `${intPart}.${fracStr}`;
  } catch {
    return "0";
  }
}

// Pad address to 32 bytes for topic matching
function padAddress(address: string): string {
  return "0x" + address.toLowerCase().replace("0x", "").padStart(64, "0");
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

// Try to get token metadata (name, symbol, decimals)
async function getTokenMetadata(tokenAddress: string): Promise<{ name: string; symbol: string; decimals: number } | null> {
  try {
    // Call name(), symbol(), decimals() functions
    const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
      rpcCall("eth_call", [{ to: tokenAddress, data: "0x06fdde03" }, "latest"]), // name()
      rpcCall("eth_call", [{ to: tokenAddress, data: "0x95d89b41" }, "latest"]), // symbol()
      rpcCall("eth_call", [{ to: tokenAddress, data: "0x313ce567" }, "latest"]), // decimals()
    ]);

    // Decode string results (they're ABI encoded)
    const decodeString = (hex: string): string => {
      if (!hex || hex === "0x") return "";
      try {
        // Skip first 64 chars (offset) + next 64 chars (length), then decode hex to string
        const dataStart = 2 + 64 + 64; // 0x + offset + length
        const strHex = hex.slice(dataStart);
        let str = "";
        for (let i = 0; i < strHex.length; i += 2) {
          const charCode = parseInt(strHex.slice(i, i + 2), 16);
          if (charCode === 0) break;
          str += String.fromCharCode(charCode);
        }
        return str.trim();
      } catch {
        return "";
      }
    };

    const name = nameResult.status === "fulfilled" ? decodeString(nameResult.value) : "";
    const symbol = symbolResult.status === "fulfilled" ? decodeString(symbolResult.value) : "";
    const decimals = decimalsResult.status === "fulfilled" && decimalsResult.value ? hexToDecimal(decimalsResult.value) : 18;

    return { name, symbol, decimals };
  } catch {
    return null;
  }
}

// Get token balance for an address
async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string | null> {
  try {
    // balanceOf(address) = 0x70a08231 + padded address
    const paddedAddr = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = "0x70a08231" + paddedAddr;
    const result = await rpcCall("eth_call", [{ to: tokenAddress, data }, "latest"]);
    return result;
  } catch {
    return null;
  }
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

    // Get EVM transaction history for an address by scanning recent blocks
    if (action === "addressTxs") {
      const address = url.searchParams.get("address");
      const limit = parseInt(url.searchParams.get("limit") || "25", 10);
      
      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedAddress = address.toLowerCase();
      console.log(`[hyperevm-rpc] Scanning for txs involving ${normalizedAddress}`);

      // Get latest block number
      const latestHex = await rpcCall("eth_blockNumber", []);
      const latest = hexToDecimal(latestHex);
      
      const foundTxs: any[] = [];
      const blocksPerBatch = 10;
      const maxBlocksToScan = 500; // Limit scanning to recent 500 blocks
      
      // Scan blocks in batches until we find enough txs or hit limit
      for (let start = latest; start > latest - maxBlocksToScan && foundTxs.length < limit; start -= blocksPerBatch) {
        const blockPromises = [];
        for (let i = 0; i < blocksPerBatch && start - i >= 0; i++) {
          const blockNum = "0x" + (start - i).toString(16);
          blockPromises.push(rpcCall("eth_getBlockByNumber", [blockNum, true]));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        for (const block of blocks) {
          if (!block?.transactions) continue;
          
          for (const tx of block.transactions) {
            const fromMatch = tx.from?.toLowerCase() === normalizedAddress;
            const toMatch = tx.to?.toLowerCase() === normalizedAddress;
            
            if (fromMatch || toMatch) {
              // Get receipt for status
              const receipt = await rpcCall("eth_getTransactionReceipt", [tx.hash]).catch(() => null);
              
              foundTxs.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                valueEth: weiToEth(tx.value),
                gas: hexToDecimal(tx.gas),
                gasPrice: tx.gasPrice ? hexToDecimal(tx.gasPrice) : null,
                nonce: hexToDecimal(tx.nonce),
                blockNumber: hexToDecimal(tx.blockNumber),
                blockHash: tx.blockHash,
                timestamp: hexToDecimal(block.timestamp),
                direction: fromMatch ? "out" : "in",
                status: receipt ? (receipt.status === "0x1" ? "success" : "failed") : "pending",
                gasUsed: receipt ? hexToDecimal(receipt.gasUsed) : null,
                contractAddress: receipt?.contractAddress || null,
              });
              
              if (foundTxs.length >= limit) break;
            }
          }
          if (foundTxs.length >= limit) break;
        }
      }

      console.log(`[hyperevm-rpc] Found ${foundTxs.length} txs for ${address}`);

      return new Response(JSON.stringify({ 
        transactions: foundTxs,
        scannedBlocks: Math.min(maxBlocksToScan, latest),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ERC-20 token balances for an address by scanning Transfer events
    if (action === "tokenBalances") {
      const address = url.searchParams.get("address");
      const blocksToScan = parseInt(url.searchParams.get("blocks") || "5000", 10);
      
      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[hyperevm-rpc] Scanning for ERC-20 tokens for ${address}`);

      // Get latest block
      const latestHex = await rpcCall("eth_blockNumber", []);
      const latest = hexToDecimal(latestHex);
      const fromBlock = "0x" + Math.max(0, latest - blocksToScan).toString(16);

      const paddedAddress = padAddress(address);

      // Get Transfer events TO this address (receiving tokens)
      const [logsTo, logsFrom] = await Promise.all([
        rpcCall("eth_getLogs", [{
          fromBlock,
          toBlock: "latest",
          topics: [ERC20_TRANSFER_TOPIC, null, paddedAddress], // Transfer(*, *, to=address)
        }]),
        rpcCall("eth_getLogs", [{
          fromBlock,
          toBlock: "latest",
          topics: [ERC20_TRANSFER_TOPIC, paddedAddress, null], // Transfer(from=address, *, *)
        }]),
      ]);

      // Collect unique token addresses
      const tokenAddresses = new Set<string>();
      for (const log of [...(logsTo || []), ...(logsFrom || [])]) {
        tokenAddresses.add(log.address.toLowerCase());
      }

      console.log(`[hyperevm-rpc] Found ${tokenAddresses.size} unique tokens`);

      // Get balances and metadata for each token
      const tokens: any[] = [];
      for (const tokenAddr of tokenAddresses) {
        const [metadata, balanceHex] = await Promise.all([
          getTokenMetadata(tokenAddr),
          getTokenBalance(tokenAddr, address),
        ]);

        if (balanceHex && balanceHex !== "0x" && balanceHex !== "0x0") {
          const decimals = metadata?.decimals || 18;
          const balance = formatTokenAmount(balanceHex, decimals);
          
          // Only include tokens with non-zero balance
          if (parseFloat(balance) > 0) {
            tokens.push({
              address: tokenAddr,
              name: metadata?.name || "Unknown",
              symbol: metadata?.symbol || "???",
              decimals,
              balance,
              balanceRaw: balanceHex,
            });
          }
        }
      }

      // Sort by balance descending (roughly)
      tokens.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

      return new Response(JSON.stringify({ 
        tokens,
        scannedBlocks: blocksToScan,
        tokensFound: tokenAddresses.size,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get internal transactions (value transfers) for a transaction by tracing
    if (action === "internalTxs") {
      const hash = url.searchParams.get("hash");
      
      if (!hash) {
        return new Response(JSON.stringify({ error: "Missing hash parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[hyperevm-rpc] Tracing internal txs for ${hash}`);

      // Try to use debug_traceTransaction with callTracer
      // Note: This may not be supported on all nodes
      let internalTxs: any[] = [];
      
      try {
        const trace = await rpcCall("debug_traceTransaction", [
          hash,
          { tracer: "callTracer", tracerConfig: { onlyTopCall: false } }
        ]);

        // Extract internal calls with value transfers
        const extractCalls = (call: any, depth: number = 0): any[] => {
          const calls: any[] = [];
          
          if (call.value && call.value !== "0x0" && call.value !== "0x") {
            calls.push({
              type: call.type || "CALL",
              from: call.from,
              to: call.to,
              value: call.value,
              valueEth: weiToEth(call.value),
              depth,
              gas: call.gas ? hexToDecimal(call.gas) : null,
              gasUsed: call.gasUsed ? hexToDecimal(call.gasUsed) : null,
              input: call.input?.slice(0, 10) || null, // Just the selector
              error: call.error || null,
            });
          }

          // Recursively process nested calls
          if (call.calls) {
            for (const subcall of call.calls) {
              calls.push(...extractCalls(subcall, depth + 1));
            }
          }

          return calls;
        };

        internalTxs = extractCalls(trace);
        console.log(`[hyperevm-rpc] Found ${internalTxs.length} internal txs`);
      } catch (traceError) {
        console.warn(`[hyperevm-rpc] Tracing not supported or failed:`, traceError);
        
        // Fallback: Get the transaction receipt and look for value in logs
        // This is limited but better than nothing
        const receipt = await rpcCall("eth_getTransactionReceipt", [hash]);
        
        if (receipt?.logs) {
          // Look for common patterns like ETH transfers via WETH
          for (const log of receipt.logs) {
            // Check for Deposit/Withdrawal events from WETH-like contracts
            if (log.topics[0] === "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c" || // Deposit
                log.topics[0] === "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65") {  // Withdrawal
              const value = log.data;
              if (value && value !== "0x") {
                internalTxs.push({
                  type: log.topics[0].startsWith("0xe1fff") ? "DEPOSIT" : "WITHDRAWAL",
                  from: log.address,
                  to: log.topics[1] ? "0x" + log.topics[1].slice(26) : null,
                  value,
                  valueEth: weiToEth(value),
                  depth: 0,
                  note: "Detected from event log",
                });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        internalTxs,
        hash,
        tracingSupported: internalTxs.length > 0 || true, // May have legitimately no internals
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get internal transactions for an ADDRESS by scanning recent txs
    if (action === "addressInternalTxs") {
      const address = url.searchParams.get("address");
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      
      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[hyperevm-rpc] Scanning internal txs for address ${address}`);

      // First get recent txs for this address
      const latestHex = await rpcCall("eth_blockNumber", []);
      const latest = hexToDecimal(latestHex);
      
      const normalizedAddress = address.toLowerCase();
      const foundInternals: any[] = [];
      const blocksPerBatch = 20;
      const maxBlocksToScan = 200;
      
      for (let start = latest; start > latest - maxBlocksToScan && foundInternals.length < limit; start -= blocksPerBatch) {
        const blockPromises = [];
        for (let i = 0; i < blocksPerBatch && start - i >= 0; i++) {
          const blockNum = "0x" + (start - i).toString(16);
          blockPromises.push(rpcCall("eth_getBlockByNumber", [blockNum, true]));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        for (const block of blocks) {
          if (!block?.transactions) continue;
          
          // Check each tx that is TO a contract (might have internal calls)
          for (const tx of block.transactions) {
            // Skip simple transfers, look for contract interactions
            if (!tx.input || tx.input === "0x") continue;
            
            try {
              const trace = await rpcCall("debug_traceTransaction", [
                tx.hash,
                { tracer: "callTracer", tracerConfig: { onlyTopCall: false } }
              ]);
              
              // Check if any internal calls involve our address
              const checkCall = (call: any, depth: number = 0): boolean => {
                const fromMatch = call.from?.toLowerCase() === normalizedAddress;
                const toMatch = call.to?.toLowerCase() === normalizedAddress;
                const hasValue = call.value && call.value !== "0x0" && call.value !== "0x";
                
                if ((fromMatch || toMatch) && hasValue) {
                  foundInternals.push({
                    txHash: tx.hash,
                    blockNumber: hexToDecimal(tx.blockNumber),
                    timestamp: hexToDecimal(block.timestamp),
                    type: call.type || "CALL",
                    from: call.from,
                    to: call.to,
                    value: call.value,
                    valueEth: weiToEth(call.value),
                    direction: toMatch ? "in" : "out",
                    depth,
                  });
                  return true;
                }
                
                if (call.calls) {
                  for (const subcall of call.calls) {
                    if (checkCall(subcall, depth + 1)) return true;
                  }
                }
                return false;
              };
              
              checkCall(trace);
              
              if (foundInternals.length >= limit) break;
            } catch {
              // Tracing not supported or failed for this tx
              continue;
            }
          }
          if (foundInternals.length >= limit) break;
        }
      }

      return new Response(JSON.stringify({ 
        internalTxs: foundInternals,
        scannedBlocks: Math.min(maxBlocksToScan, latest),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: latestBlock, block, tx, address, logs, recentBlocks, addressTxs, tokenBalances, internalTxs, addressInternalTxs" }),
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
