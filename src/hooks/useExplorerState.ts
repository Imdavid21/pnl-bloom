import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ExplorerMode = 'activity' | 'positions' | 'risk' | 'drawdowns' | 'funding' | 'assets' | 'wallet';
export type Engine = 'hypercore' | 'hyperevm' | 'both';

export interface ExplorerFilters {
  direction?: 'long' | 'short' | 'all';
  leverageMin?: number;
  leverageMax?: number;
  pnlSign?: 'positive' | 'negative' | 'all';
  market?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
}

export interface DrawerState {
  open: boolean;
  type: 'tx' | 'block' | 'fill' | 'position' | 'drawdown' | 'wallet' | 'asset' | null;
  id: string | null;
  data: any;
}

export function useExplorerState() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL-synced state
  const mode = (searchParams.get('view') as ExplorerMode) || 'activity';
  const selectedId = searchParams.get('id');
  const searchQuery = searchParams.get('q') || '';
  const engine = (searchParams.get('engine') as Engine) || 'hypercore';
  
  // Local state
  const [filters, setFilters] = useState<ExplorerFilters>({
    direction: 'all',
    pnlSign: 'all',
    timeRange: '24h',
  });
  
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    type: null,
    id: null,
    data: null,
  });
  
  const [wallet, setWallet] = useState<string | null>(searchParams.get('wallet'));
  
  // Sync drawer from URL
  useEffect(() => {
    if (selectedId) {
      setDrawer(prev => ({ ...prev, open: true, id: selectedId }));
    }
  }, [selectedId]);

  const setMode = useCallback((newMode: ExplorerMode) => {
    setSearchParams(prev => {
      prev.set('view', newMode);
      prev.delete('id');
      return prev;
    });
  }, [setSearchParams]);

  const setSearch = useCallback((query: string) => {
    setSearchParams(prev => {
      if (query) {
        prev.set('q', query);
      } else {
        prev.delete('q');
      }
      return prev;
    });
  }, [setSearchParams]);

  const setEngine = useCallback((newEngine: Engine) => {
    setSearchParams(prev => {
      prev.set('engine', newEngine);
      return prev;
    });
  }, [setSearchParams]);

  const setWalletParam = useCallback((address: string | null) => {
    setWallet(address);
    setSearchParams(prev => {
      if (address) {
        prev.set('wallet', address);
      } else {
        prev.delete('wallet');
      }
      return prev;
    });
  }, [setSearchParams]);

  const openDrawer = useCallback((type: DrawerState['type'], id: string, data?: any) => {
    setDrawer({ open: true, type, id, data });
    setSearchParams(prev => {
      if (id) prev.set('id', id);
      return prev;
    });
  }, [setSearchParams]);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, type: null, id: null, data: null });
    setSearchParams(prev => {
      prev.delete('id');
      return prev;
    });
  }, [setSearchParams]);

  return {
    mode,
    setMode,
    searchQuery,
    setSearch,
    engine,
    setEngine,
    filters,
    setFilters,
    drawer,
    openDrawer,
    closeDrawer,
    wallet,
    setWallet: setWalletParam,
    selectedId,
  };
}
