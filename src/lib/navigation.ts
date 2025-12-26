// Core navigation utilities for the explorer

export type EntityType = 'wallet' | 'tx' | 'trade' | 'market' | 'token' | 'block';

export interface NavigationContext {
  current_page: string;
  previous_page?: string;
  entry_point: string;
  journey: string[];
}

// Smart link builder - generates correct URL for any entity type
export function buildEntityLink(type: EntityType, identifier: string): string {
  if (!identifier) return '/';
  
  switch (type) {
    case 'wallet':
      return `/wallet/${identifier.toLowerCase()}`;
    case 'tx':
      // Auto-detect if HyperEVM tx (0x + 64 hex chars) or HyperCore trade
      if (/^0x[a-f0-9]{64}$/i.test(identifier)) {
        return `/tx/${identifier}`;
      }
      return `/trade/${identifier}`;
    case 'trade':
      return `/trade/${identifier}`;
    case 'market':
      // Remove -PERP suffix if present for cleaner URLs
      const symbol = identifier.replace(/-PERP$/i, '').toUpperCase();
      return `/market/${symbol}`;
    case 'token':
      // Could be symbol or contract address
      return `/token/${identifier}`;
    case 'block':
      return `/block/${identifier}`;
    default:
      return '/';
  }
}

// Shorten address for display
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Shorten hash for display
export function shortenHash(hash: string, chars: number = 6): string {
  if (!hash) return '';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// Get navigation context from sessionStorage
export function getNavigationContext(): NavigationContext {
  if (typeof window === 'undefined') {
    return { current_page: '/', entry_point: '/', journey: [] };
  }
  
  const stored = sessionStorage.getItem('nav_context');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid JSON, reset
    }
  }
  
  return {
    current_page: window.location.pathname,
    entry_point: window.location.pathname,
    journey: [window.location.pathname],
  };
}

// Track navigation - call this on each page load
export function trackNavigation(page: string): void {
  if (typeof window === 'undefined') return;
  
  const context = getNavigationContext();
  
  // Don't track duplicate consecutive pages
  if (context.current_page === page) return;
  
  context.previous_page = context.current_page;
  context.current_page = page;
  context.journey.push(page);
  
  // Keep journey to last 50 entries to prevent memory bloat
  if (context.journey.length > 50) {
    context.journey = context.journey.slice(-50);
  }
  
  sessionStorage.setItem('nav_context', JSON.stringify(context));
}

// Clear navigation context (e.g., on logout)
export function clearNavigationContext(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('nav_context');
  }
}

// Detect entity type from identifier
export function detectEntityType(identifier: string): EntityType | null {
  if (!identifier) return null;
  
  // Block number (all digits)
  if (/^\d+$/.test(identifier)) {
    return 'block';
  }
  
  // Ethereum address (0x + 40 hex chars)
  if (/^0x[a-f0-9]{40}$/i.test(identifier)) {
    return 'wallet';
  }
  
  // Transaction hash (0x + 64 hex chars)
  if (/^0x[a-f0-9]{64}$/i.test(identifier)) {
    return 'tx';
  }
  
  // Market symbol (2-10 uppercase letters, optionally with -PERP)
  if (/^[A-Z]{2,10}(-PERP)?$/i.test(identifier)) {
    return 'market';
  }
  
  // UUID (for HyperCore trades)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    return 'trade';
  }
  
  // Token symbol or contract address
  if (/^[A-Z]{2,10}$/i.test(identifier) || /^0x[a-f0-9]{40}$/i.test(identifier)) {
    return 'token';
  }
  
  return null;
}

// Build smart link by auto-detecting entity type
export function buildSmartLink(identifier: string): string {
  const type = detectEntityType(identifier);
  if (!type) return '/';
  return buildEntityLink(type, identifier);
}

// Check if URL is external
export function isExternalLink(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

// Generate Hyperliquid app link for trading
export function getHyperliquidTradeLink(symbol: string): string {
  const cleanSymbol = symbol.replace(/-PERP$/i, '').toUpperCase();
  return `https://app.hyperliquid.xyz/trade/${cleanSymbol}`;
}

// Generate block explorer link for verification
export function getBlockExplorerLink(type: 'tx' | 'block' | 'address', identifier: string): string {
  switch (type) {
    case 'tx':
      return `https://hypurrscan.io/tx/${identifier}`;
    case 'block':
      return `https://hypurrscan.io/block/${identifier}`;
    case 'address':
      return `https://hypurrscan.io/address/${identifier}`;
    default:
      return 'https://hypurrscan.io';
  }
}

// Keyboard shortcuts configuration
export const KEYBOARD_SHORTCUTS = {
  '/': 'Focus search box',
  'Escape': 'Clear search / close modals',
  'h': 'Go to home',
  'b': 'Go back',
  'c': 'Copy current page URL',
  '?': 'Show keyboard shortcuts help',
} as const;

// Page section IDs for deep linking
export const PAGE_SECTIONS = {
  wallet: {
    positions: 'positions',
    activity: 'activity',
    distribution: 'distribution',
  },
  market: {
    traders: 'top-traders',
    trades: 'recent-trades',
    chart: 'price-chart',
  },
  token: {
    overview: 'overview',
    trading: 'hypercore-trading',
    holders: 'holders',
  },
} as const;

// Scroll to section by ID
export function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
