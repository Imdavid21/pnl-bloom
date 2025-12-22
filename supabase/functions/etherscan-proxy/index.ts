/**
 * Etherscan Proxy Edge Function
 * Rate limiting: 5 calls/sec per key, 3 keys for parallel requests
 * Monthly limit: 10K calls
 */

const HYPEREVM_ETHERSCAN_API = 'https://explorer.hyperliquid.xyz/api';

// API Keys for parallel requests
const API_KEYS = [
  Deno.env.get('ETHERSCAN_API_KEY_1'),
  Deno.env.get('ETHERSCAN_API_KEY_2'),
  Deno.env.get('ETHERSCAN_API_KEY_3'),
].filter(Boolean) as string[];

// Rate limiting state (per key)
const keyState: Map<string, { lastRequest: number; requestCount: number }> = new Map();

// Initialize state for each key
API_KEYS.forEach(key => {
  keyState.set(key, { lastRequest: 0, requestCount: 0 });
});

const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Get the next available API key that isn't rate limited
 */
function getAvailableKey(): string | null {
  const now = Date.now();
  
  for (const key of API_KEYS) {
    const state = keyState.get(key);
    if (!state) continue;
    
    // Reset counter if window has passed
    if (now - state.lastRequest > RATE_LIMIT_WINDOW_MS) {
      state.requestCount = 0;
      state.lastRequest = now;
    }
    
    // Check if under rate limit
    if (state.requestCount < MAX_REQUESTS_PER_WINDOW) {
      state.requestCount++;
      state.lastRequest = now;
      return key;
    }
  }
  
  return null;
}

/**
 * Wait for an available key
 */
async function waitForKey(maxWaitMs = 2000): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const key = getAvailableKey();
    if (key) return key;
    
    // Wait 100ms and try again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Rate limit exceeded - all API keys busy');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (API_KEYS.length === 0) {
      throw new Error('No Etherscan API keys configured');
    }

    const url = new URL(req.url);
    const module = url.searchParams.get('module');
    const action = url.searchParams.get('action');
    
    if (!module || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing module or action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get available API key (with rate limiting)
    const apiKey = await waitForKey();
    
    // Build Etherscan API URL
    const etherscanUrl = new URL(HYPEREVM_ETHERSCAN_API);
    
    // Copy all query params
    url.searchParams.forEach((value, key) => {
      etherscanUrl.searchParams.set(key, value);
    });
    
    // Add API key
    etherscanUrl.searchParams.set('apikey', apiKey);

    console.log(`[Etherscan Proxy] Request: ${module}/${action}`);
    
    const response = await fetch(etherscanUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Etherscan Proxy] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Etherscan API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Check for Etherscan API-level errors
    if (data.status === '0' && data.message === 'NOTOK') {
      console.error(`[Etherscan Proxy] API returned error:`, data.result);
      return new Response(
        JSON.stringify({ error: data.result || 'Etherscan API error', status: '0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Etherscan Proxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
