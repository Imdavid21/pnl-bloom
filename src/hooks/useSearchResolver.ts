/**
 * React hook for Universal Search state management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  resolveInput, 
  validateInput, 
  detectType,
  getRecentSearches, 
  addRecentSearch,
  removeRecentSearch,
  type ResolverResult,
  type RecentSearch,
  type EntityType,
} from '@/lib/input-resolver';

export type SearchState = 'idle' | 'validating' | 'resolving' | 'success' | 'error';

export interface UseSearchResolverReturn {
  // State
  query: string;
  state: SearchState;
  isValid: boolean | null;
  detectedType: EntityType;
  result: ResolverResult | null;
  error: string | null;
  recentSearches: RecentSearch[];
  
  // Actions
  setQuery: (query: string) => void;
  submit: () => Promise<void>;
  clear: () => void;
  removeRecent: (query: string) => void;
  selectRecent: (search: RecentSearch) => void;
}

// Debounce timeout for validation
const VALIDATION_DEBOUNCE = 400;

// Cache for resolved results (5 minute TTL)
const resolveCache = new Map<string, { result: ResolverResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedResult(key: string): ResolverResult | null {
  const cached = resolveCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    resolveCache.delete(key);
    return null;
  }
  
  return cached.result;
}

function setCachedResult(key: string, result: ResolverResult): void {
  resolveCache.set(key, { result, timestamp: Date.now() });
}

export function useSearchResolver(): UseSearchResolverReturn {
  const navigate = useNavigate();
  
  const [query, setQueryState] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [detectedType, setDetectedType] = useState<EntityType>('unknown');
  const [result, setResult] = useState<ResolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const abortControllerRef = useRef<AbortController>();
  
  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);
  
  // Debounced validation as user types
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setIsValid(null);
      setDetectedType('unknown');
      setState('idle');
      return;
    }
    
    setState('validating');
    
    validationTimeoutRef.current = setTimeout(() => {
      const validation = validateInput(query);
      setIsValid(validation.isValid);
      setDetectedType(validation.type);
      setState('idle');
    }, VALIDATION_DEBOUNCE);
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [query]);
  
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setError(null);
    setResult(null);
  }, []);
  
  const submit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    // Cancel any pending resolution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Check cache first
    const cacheKey = trimmed.toLowerCase();
    const cached = getCachedResult(cacheKey);
    
    if (cached && cached.verified) {
      setResult(cached);
      addRecentSearch(cached.identifier, cached.type);
      setRecentSearches(getRecentSearches());
      navigate(cached.route);
      setState('success');
      return;
    }
    
    setState('resolving');
    setError(null);
    
    try {
      const resolveResult = await resolveInput(trimmed);
      
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) return;
      
      setResult(resolveResult);
      
      if (resolveResult.verified) {
        setCachedResult(cacheKey, resolveResult);
        addRecentSearch(resolveResult.identifier, resolveResult.type);
        setRecentSearches(getRecentSearches());
        navigate(resolveResult.route);
        setState('success');
      } else {
        setError(resolveResult.error || 'Not found');
        setState('error');
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return;
      
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  }, [query, navigate]);
  
  const clear = useCallback(() => {
    setQueryState('');
    setState('idle');
    setIsValid(null);
    setDetectedType('unknown');
    setResult(null);
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const removeRecent = useCallback((queryToRemove: string) => {
    removeRecentSearch(queryToRemove);
    setRecentSearches(getRecentSearches());
  }, []);
  
  const selectRecent = useCallback((search: RecentSearch) => {
    setQueryState(search.query);
    // Trigger submit after state update
    setTimeout(() => {
      const trimmed = search.query.trim();
      if (!trimmed) return;
      
      const cacheKey = trimmed.toLowerCase();
      const cached = getCachedResult(cacheKey);
      
      if (cached && cached.verified) {
        navigate(cached.route);
      } else {
        // Navigate optimistically based on type
        const route = search.type === 'wallet' ? `/wallet/${trimmed}` :
                      search.type === 'tx' ? `/tx/${trimmed}` :
                      search.type === 'block' ? `/block/${trimmed}` :
                      search.type === 'token' ? `/token/${trimmed.toUpperCase()}` :
                      '/explorer';
        navigate(route);
      }
    }, 0);
  }, [navigate]);
  
  return {
    query,
    state,
    isValid,
    detectedType,
    result,
    error,
    recentSearches,
    setQuery,
    submit,
    clear,
    removeRecent,
    selectRecent,
  };
}
