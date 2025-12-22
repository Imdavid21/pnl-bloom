import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ExplorerUrlState, EntityMode, ChainSource } from '@/lib/explorer/types';
import { resolveSearch } from '@/lib/explorer/searchResolver';

/**
 * Hook for managing explorer URL state
 * Provides deep-linkable state model: /explorer?q={query}&mode={entity}&tab={section}&view={detail}&chain={chain}&t={timestamp}
 */
export function useExplorerUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse current state from URL
  const state: ExplorerUrlState = useMemo(() => ({
    q: searchParams.get('q') || undefined,
    mode: searchParams.get('mode') as EntityMode | undefined,
    id: searchParams.get('id') || undefined,
    tab: searchParams.get('tab') || undefined,
    view: searchParams.get('view') || undefined,
    chain: searchParams.get('chain') as ChainSource | undefined,
    t: searchParams.get('t') ? parseInt(searchParams.get('t')!, 10) : undefined,
  }), [searchParams]);
  
  // Derived: resolve search query to determine entity mode
  const resolution = useMemo(() => {
    if (state.q) {
      return resolveSearch(state.q, state.chain);
    }
    return null;
  }, [state.q, state.chain]);
  
  // Set query and automatically resolve entity mode
  const setQuery = useCallback((query: string) => {
    setSearchParams(prev => {
      if (query) {
        prev.set('q', query);
        // Auto-resolve mode based on query
        const resolved = resolveSearch(query, state.chain);
        prev.set('mode', resolved.mode);
        // Clear tab when changing query
        prev.delete('tab');
        prev.delete('view');
      } else {
        prev.delete('q');
        prev.delete('mode');
        prev.delete('id');
        prev.delete('tab');
        prev.delete('view');
      }
      return prev;
    });
  }, [setSearchParams, state.chain]);
  
  // Set entity mode explicitly
  const setMode = useCallback((mode: EntityMode) => {
    setSearchParams(prev => {
      prev.set('mode', mode);
      return prev;
    });
  }, [setSearchParams]);
  
  // Set active tab
  const setTab = useCallback((tab: string | null) => {
    setSearchParams(prev => {
      if (tab) {
        prev.set('tab', tab);
      } else {
        prev.delete('tab');
      }
      return prev;
    });
  }, [setSearchParams]);
  
  // Set view detail level
  const setView = useCallback((view: string | null) => {
    setSearchParams(prev => {
      if (view) {
        prev.set('view', view);
      } else {
        prev.delete('view');
      }
      return prev;
    });
  }, [setSearchParams]);
  
  // Set chain preference
  const setChain = useCallback((chain: ChainSource | null) => {
    setSearchParams(prev => {
      if (chain && chain !== 'both') {
        prev.set('chain', chain);
      } else {
        prev.delete('chain');
      }
      return prev;
    });
  }, [setSearchParams]);
  
  // Navigate to a specific entity
  const navigateTo = useCallback((mode: EntityMode, id: string, chain?: ChainSource) => {
    setSearchParams(prev => {
      prev.set('q', id);
      prev.set('mode', mode);
      if (chain && chain !== 'both') {
        prev.set('chain', chain);
      }
      prev.delete('tab');
      prev.delete('view');
      // Add timestamp for shareable links
      prev.set('t', Date.now().toString());
      return prev;
    });
  }, [setSearchParams]);
  
  // Clear all state (go back to empty explorer)
  const clear = useCallback(() => {
    setSearchParams(prev => {
      prev.delete('q');
      prev.delete('mode');
      prev.delete('id');
      prev.delete('tab');
      prev.delete('view');
      prev.delete('chain');
      prev.delete('t');
      return prev;
    });
  }, [setSearchParams]);
  
  // Generate shareable URL
  const getShareableUrl = useCallback((): string => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    return url.toString();
  }, []);
  
  return {
    // State
    state,
    resolution,
    
    // Current values (convenience)
    query: state.q || '',
    mode: resolution?.mode || state.mode,
    entityId: state.q || state.id || '',
    tab: state.tab,
    view: state.view,
    chain: state.chain,
    
    // Actions
    setQuery,
    setMode,
    setTab,
    setView,
    setChain,
    navigateTo,
    clear,
    getShareableUrl,
  };
}
