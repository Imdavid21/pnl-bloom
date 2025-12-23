import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Loader2, X, Coins, FileCode, Wallet, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { getTokenInfo, TOKEN_REGISTRY, type TokenInfo } from '@/lib/tokenLogos';
import { findSpotTokenByName } from '@/lib/hyperliquidApi';

export type EntityType = 'token' | 'contract' | 'wallet' | 'dapp';

export interface SearchResult {
  id: string;
  name: string;
  symbol?: string;
  type: EntityType;
  address?: string;
  logoUrl?: string;
  subtitle?: string;
}

interface TokenSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: SearchResult) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

// Known dApp contracts on HyperEVM
const KNOWN_DAPPS: Record<string, { name: string; type: 'dapp' | 'contract' }> = {
  '0x2222222222222222222222222222222222222222': { name: 'HyperLiquid Bridge', type: 'dapp' },
  '0x1111111111111111111111111111111111111111': { name: 'System Contract', type: 'contract' },
};

export function TokenSearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = 'Search address, tx, block, or token...',
  className,
  isLoading = false,
}: TokenSearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Memoized token search from registry
  const registryResults = useMemo(() => {
    if (!value || value.length < 1) return [];
    
    const lower = value.toLowerCase();
    const matches: SearchResult[] = [];
    
    Object.entries(TOKEN_REGISTRY).forEach(([key, info]) => {
      const symbolMatch = info.symbol.toLowerCase().includes(lower);
      const nameMatch = info.name.toLowerCase().includes(lower);
      
      if (symbolMatch || nameMatch) {
        matches.push({
          id: info.address || key,
          name: info.name,
          symbol: info.symbol,
          type: 'token',
          address: info.address,
          logoUrl: info.logoUrl,
          subtitle: info.address ? `${info.address.slice(0, 8)}...` : 'Hypercore Token',
        });
      }
    });
    
    return matches.slice(0, 6);
  }, [value]);

  // Search for tokens via API when registry doesn't have results
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (!value || value.length < 2) {
        setResults(registryResults);
        return;
      }

      // Check if it looks like a token name (not an address)
      const isLikelyTokenName = /^[A-Za-z][A-Za-z0-9]*$/i.test(value) && !value.startsWith('0x');
      
      if (isLikelyTokenName && registryResults.length === 0) {
        setIsSearching(true);
        try {
          const token = await findSpotTokenByName(value);
          if (token) {
            setResults([{
              id: token.tokenId,
              name: token.name,
              symbol: token.name,
              type: 'token',
              logoUrl: getTokenInfo(token.name)?.logoUrl,
              subtitle: 'Hypercore Spot Token',
            }]);
          } else {
            setResults([]);
          }
        } catch {
          setResults([]);
        }
        setIsSearching(false);
      } else {
        setResults(registryResults);
      }
    }, 150);

    return () => clearTimeout(searchTimer);
  }, [value, registryResults]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!results.length) {
      if (e.key === 'Enter') onSubmit();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onSelect(results[selectedIndex]);
        } else {
          onSubmit();
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  }, [results, selectedIndex, onSelect, onSubmit]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const getTypeIcon = (type: EntityType) => {
    switch (type) {
      case 'token': return Coins;
      case 'contract': return FileCode;
      case 'dapp': return FileCode;
      case 'wallet': return Wallet;
      default: return Coins;
    }
  };

  const getTypeLabel = (type: EntityType) => {
    switch (type) {
      case 'token': return 'Token';
      case 'contract': return 'Contract';
      case 'dapp': return 'dApp';
      case 'wallet': return 'Wallet';
      default: return 'Unknown';
    }
  };

  const showDropdown = isFocused && value.length >= 1 && (results.length > 0 || isSearching);

  return (
    <div className={cn("relative", className)}>
      {/* Search Input - no icon, parent handles it */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10 h-11 text-sm",
            "bg-transparent border-0 shadow-none",
            "transition-all duration-200",
            "placeholder:text-muted-foreground/40",
            "focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
        />
        {(value || isLoading || isSearching) && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            {isLoading || isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 top-full left-0 right-0 mt-2",
            "rounded-xl overflow-hidden",
            "bg-card/95 backdrop-blur-xl",
            "border border-border/40",
            "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
          )}
        >
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching tokens...</span>
            </div>
          ) : (
            <div className="py-1">
              {results.map((result, index) => {
                const TypeIcon = getTypeIcon(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => onSelect(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5",
                      "transition-all duration-150",
                      index === selectedIndex 
                        ? "bg-primary/10" 
                        : "hover:bg-muted/30",
                    )}
                  >
                    {/* Token/Entity Logo */}
                    <div className="relative">
                      {result.logoUrl ? (
                        <TokenLogo symbol={result.symbol || result.name} size="sm" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {result.symbol || result.name}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          result.type === 'token' && "bg-primary/10 text-primary",
                          result.type === 'dapp' && "bg-profit-3/10 text-profit-3",
                          result.type === 'contract' && "bg-warning/10 text-warning",
                          result.type === 'wallet' && "bg-info/10 text-info",
                        )}>
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {result.subtitle || result.name}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}