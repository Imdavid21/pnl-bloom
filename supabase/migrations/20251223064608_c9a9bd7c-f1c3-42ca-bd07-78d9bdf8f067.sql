-- Resolution cache table for storing domain resolution decisions
-- This prevents redundant lookups and enables fast routing
CREATE TABLE public.resolution_cache (
  id TEXT PRIMARY KEY, -- The input query (hash, address, block number)
  input_type TEXT NOT NULL, -- 'evm_tx' | 'address' | 'block' | 'unknown'
  domain TEXT NOT NULL, -- 'hyperevm' | 'hypercore' | 'unified' | 'unknown'
  resolved_entity_type TEXT, -- 'tx' | 'wallet' | 'block' | 'token'
  metadata JSONB, -- Additional context (e.g., contract type, token info)
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent cache, set for unknown
  hit_count INTEGER DEFAULT 1
);

-- Index for fast lookups
CREATE INDEX idx_resolution_cache_domain ON public.resolution_cache(domain);
CREATE INDEX idx_resolution_cache_expires ON public.resolution_cache(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.resolution_cache ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Resolution cache is publicly readable" 
ON public.resolution_cache 
FOR SELECT 
USING (true);

-- Allow inserts from edge functions (service role)
CREATE POLICY "Allow insert for resolution_cache" 
ON public.resolution_cache 
FOR INSERT 
WITH CHECK (true);

-- Allow updates for hit count and expiry
CREATE POLICY "Allow update for resolution_cache" 
ON public.resolution_cache 
FOR UPDATE 
USING (true);

-- Function to clean up expired cache entries (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_resolution_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.resolution_cache
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;