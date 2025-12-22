import { useState, useEffect, useCallback } from 'react';

export interface WatchlistItem {
  id: string;
  type: 'wallet' | 'token';
  address?: string;
  symbol?: string;
  name?: string;
  addedAt: number;
}

const STORAGE_KEY = 'hyperliquid_watchlist';

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load watchlist:', e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save watchlist:', e);
    }
  }, [items]);

  const addWallet = useCallback((address: string, name?: string) => {
    setItems(prev => {
      if (prev.some(i => i.type === 'wallet' && i.address === address.toLowerCase())) {
        return prev;
      }
      return [...prev, {
        id: `wallet-${address.toLowerCase()}`,
        type: 'wallet',
        address: address.toLowerCase(),
        name,
        addedAt: Date.now(),
      }];
    });
  }, []);

  const addToken = useCallback((symbol: string, address?: string) => {
    setItems(prev => {
      if (prev.some(i => i.type === 'token' && i.symbol === symbol.toUpperCase())) {
        return prev;
      }
      return [...prev, {
        id: `token-${symbol.toUpperCase()}`,
        type: 'token',
        symbol: symbol.toUpperCase(),
        address,
        addedAt: Date.now(),
      }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const isWatching = useCallback((type: 'wallet' | 'token', identifier: string) => {
    if (type === 'wallet') {
      return items.some(i => i.type === 'wallet' && i.address === identifier.toLowerCase());
    }
    return items.some(i => i.type === 'token' && i.symbol === identifier.toUpperCase());
  }, [items]);

  const wallets = items.filter(i => i.type === 'wallet');
  const tokens = items.filter(i => i.type === 'token');

  return {
    items,
    wallets,
    tokens,
    addWallet,
    addToken,
    remove,
    isWatching,
  };
}
