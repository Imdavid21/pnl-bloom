import { useState, useEffect, useCallback } from 'react';

export interface ApiHealth {
  hyperevm: 'healthy' | 'degraded' | 'down' | 'checking';
  hypercore: 'healthy' | 'degraded' | 'down' | 'checking';
  spot: 'healthy' | 'degraded' | 'down' | 'checking';
  lastChecked: Date | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const HYPERLIQUID_INFO_API = 'https://api.hyperliquid.xyz/info';

export function useApiHealthCheck() {
  const [health, setHealth] = useState<ApiHealth>({
    hyperevm: 'checking',
    hypercore: 'checking',
    spot: 'checking',
    lastChecked: null,
  });

  const checkHealth = useCallback(async () => {
    setHealth(prev => ({
      ...prev,
      hyperevm: 'checking',
      hypercore: 'checking',
      spot: 'checking',
    }));

    const results: Partial<ApiHealth> = { lastChecked: new Date() };

    // Check HyperEVM (via edge function)
    try {
      const start = Date.now();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=latestBlock`, {
        method: 'GET',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      results.hyperevm = res.ok ? (latency < 2000 ? 'healthy' : 'degraded') : 'down';
    } catch {
      results.hyperevm = 'down';
    }

    // Check Hypercore L1 (perps via info API)
    try {
      const start = Date.now();
      const res = await fetch(HYPERLIQUID_INFO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      results.hypercore = res.ok ? (latency < 2000 ? 'healthy' : 'degraded') : 'down';
    } catch {
      results.hypercore = 'down';
    }

    // Check Spot API
    try {
      const start = Date.now();
      const res = await fetch(HYPERLIQUID_INFO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'spotMeta' }),
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      results.spot = res.ok ? (latency < 2000 ? 'healthy' : 'degraded') : 'down';
    } catch {
      results.spot = 'down';
    }

    setHealth(prev => ({ ...prev, ...results } as ApiHealth));
  }, []);

  useEffect(() => {
    checkHealth();
    // Re-check every 60 seconds
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, refresh: checkHealth };
}
