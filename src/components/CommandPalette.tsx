/**
 * Command Palette (Cmd+K)
 * Delta-4 efficiency: Instant navigation without mouse
 * Hyperliquid design: Clean, fast, keyboard-first
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  Wallet,
  BarChart3,
  Activity,
  FileText,
  Code,
  Layers,
  TrendingUp,
  Hash,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface RecentSearch {
  type: 'wallet' | 'tx' | 'block' | 'token';
  value: string;
  label: string;
  timestamp: number;
}

const NAVIGATION_ITEMS = [
  { label: 'Explorer', href: '/', icon: Search, keywords: ['home', 'search'] },
  { label: 'Markets', href: '/market', icon: BarChart3, keywords: ['trading', 'perps'] },
  { label: 'Analytics', href: '/analytics', icon: Activity, keywords: ['pnl', 'performance'] },
  { label: 'Assets', href: '/assets', icon: Layers, keywords: ['tokens', 'coins'] },
  { label: 'API', href: '/api', icon: Code, keywords: ['developer', 'integration'] },
  { label: 'Docs', href: '/docs', icon: FileText, keywords: ['documentation', 'help'] },
];

const QUICK_ACTIONS = [
  { label: 'Search wallet', action: 'search-wallet', icon: Wallet, shortcut: 'W' },
  { label: 'Search transaction', action: 'search-tx', icon: Hash, shortcut: 'T' },
  { label: 'Search block', action: 'search-block', icon: Layers, shortcut: 'B' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hyperpnl-recent-searches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(parsed.slice(0, 5));
      } catch {
        // ignore
      }
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      // Escape closes
      if (e.key === 'Escape') {
        setOpen(false);
      }
      // Quick nav shortcuts (when command palette is closed)
      if (!open) {
        if (e.key === '/' && !isTyping(e)) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  const isTyping = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  };

  const addToRecentSearches = useCallback((search: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.value !== search.value);
      const updated = [search, ...filtered].slice(0, 5);
      localStorage.setItem('hyperpnl-recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSelect = useCallback((value: string) => {
    setOpen(false);
    setSearchValue('');

    // Navigation items
    const navItem = NAVIGATION_ITEMS.find(item => item.href === value);
    if (navItem) {
      navigate(navItem.href);
      return;
    }

    // Theme toggle
    if (value === 'toggle-theme') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
      return;
    }

    // Search actions
    if (value === 'search-wallet' || value === 'search-tx' || value === 'search-block') {
      // Focus on main search after closing
      setTimeout(() => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }, 100);
      return;
    }

    // Recent searches or direct input
    if (value.startsWith('recent:')) {
      const recentValue = value.replace('recent:', '');
      const recent = recentSearches.find(s => s.value === recentValue);
      if (recent) {
        navigateToEntity(recent.type, recent.value);
      }
      return;
    }

    // Try to resolve direct input
    resolveAndNavigate(value);
  }, [navigate, theme, setTheme, recentSearches]);

  const navigateToEntity = useCallback((type: string, value: string) => {
    switch (type) {
      case 'wallet':
        navigate(`/wallet/${value.toLowerCase()}`);
        break;
      case 'tx':
        navigate(`/tx/${value}`);
        break;
      case 'block':
        navigate(`/block/${value}`);
        break;
      case 'token':
        navigate(`/token/${value}`);
        break;
    }
  }, [navigate]);

  const resolveAndNavigate = useCallback((input: string) => {
    const trimmed = input.trim();
    
    // Ethereum address
    if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) {
      addToRecentSearches({
        type: 'wallet',
        value: trimmed,
        label: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
        timestamp: Date.now(),
      });
      navigate(`/wallet/${trimmed.toLowerCase()}`);
      return;
    }

    // Transaction hash
    if (/^0x[a-fA-F0-9]{64}$/i.test(trimmed)) {
      addToRecentSearches({
        type: 'tx',
        value: trimmed,
        label: `${trimmed.slice(0, 10)}...${trimmed.slice(-6)}`,
        timestamp: Date.now(),
      });
      navigate(`/tx/${trimmed}`);
      return;
    }

    // Block number
    if (/^\d+$/.test(trimmed)) {
      addToRecentSearches({
        type: 'block',
        value: trimmed,
        label: `Block ${trimmed}`,
        timestamp: Date.now(),
      });
      navigate(`/block/${trimmed}`);
      return;
    }

    // Token symbol
    if (/^[A-Za-z]{2,10}$/i.test(trimmed)) {
      addToRecentSearches({
        type: 'token',
        value: trimmed.toUpperCase(),
        label: trimmed.toUpperCase(),
        timestamp: Date.now(),
      });
      navigate(`/token/${trimmed.toUpperCase()}`);
      return;
    }

    // Fallback: treat as wallet search
    navigate(`/?q=${encodeURIComponent(trimmed)}&mode=wallet`);
  }, [navigate, addToRecentSearches]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('hyperpnl-recent-searches');
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search or type a command..." 
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No results found.</p>
            <p className="text-xs mt-1">Try a wallet address, tx hash, or block number.</p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map(action => (
            <CommandItem
              key={action.action}
              value={action.action}
              onSelect={handleSelect}
            >
              <action.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{action.label}</span>
              <kbd className="ml-auto kbd">{action.shortcut}</kbd>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentSearches.map(search => (
                <CommandItem
                  key={search.value}
                  value={`recent:${search.value}`}
                  onSelect={handleSelect}
                >
                  {search.type === 'wallet' && <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {search.type === 'tx' && <Hash className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {search.type === 'block' && <Layers className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {search.type === 'token' && <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />}
                  <span className="font-mono text-sm">{search.label}</span>
                </CommandItem>
              ))}
              <CommandItem
                value="clear-recent"
                onSelect={clearRecentSearches}
                className="text-muted-foreground"
              >
                <span className="text-xs">Clear recent searches</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {NAVIGATION_ITEMS.map(item => (
            <CommandItem
              key={item.href}
              value={item.href}
              onSelect={handleSelect}
              keywords={item.keywords}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem value="toggle-theme" onSelect={handleSelect}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </CommandItem>
        </CommandGroup>

        {/* Direct search hint */}
        {searchValue && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Search">
              <CommandItem
                value={searchValue}
                onSelect={() => handleSelect(searchValue)}
              >
                <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Search for "{searchValue}"</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd>
            <span>Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">Esc</kbd>
            <span>Close</span>
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </div>
    </CommandDialog>
  );
}
