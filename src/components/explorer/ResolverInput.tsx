import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X, Coins, FileCode, Wallet, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TokenLogo } from './TokenLogo';
import { getTokenInfo, TOKEN_REGISTRY } from '@/lib/tokenLogos';
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

type ResolveStage = 'idle' | 'format' | 'hypercore' | 'hyperevm' | 'resolved' | 'not-found';

interface ResolverInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: SearchResult) => void;
  onSubmit: () => void;
  className?: string;
}

export function ResolverInput({
  value,
  onChange,
  onSelect,
  onSubmit,
  className,
}: ResolverInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [stage, setStage] = useState<ResolveStage>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Registry search
  const searchRegistry = useCallback((query: string): SearchResult[] => {
    if (!query || query.length < 1) return [];
    const lower = query.toLowerCase();
    const matches: SearchResult[] = [];
    
    Object.entries(TOKEN_REGISTRY).forEach(([key, info]) => {
      if (info.symbol.toLowerCase().includes(lower) || info.name.toLowerCase().includes(lower)) {
        matches.push({
          id: info.address || key,
          name: info.name,
          symbol: info.symbol,
          type: 'token',
          address: info.address,
          logoUrl: info.logoUrl,
          subtitle: info.address ? `${info.address.slice(0, 8)}...` : 'Hypercore',
        });
      }
    });
    
    return matches.slice(0, 5);
  }, []);

  // Resolve with stage updates
  useEffect(() => {
    if (!value || value.length < 2) {
      setStage('idle');
      setResults([]);
      return;
    }

    const isLikelyToken = /^[A-Za-z][A-Za-z0-9]*$/i.test(value) && !value.startsWith('0x');
    const registryMatches = searchRegistry(value);

    if (registryMatches.length > 0) {
      setResults(registryMatches);
      setStage('resolved');
      return;
    }

    if (isLikelyToken) {
      setStage('format');
      const timer = setTimeout(async () => {
        setStage('hypercore');
        try {
          const token = await findSpotTokenByName(value);
          if (token) {
            setResults([{
              id: token.tokenId,
              name: token.name,
              symbol: token.name,
              type: 'token',
              logoUrl: getTokenInfo(token.name)?.logoUrl,
              subtitle: 'Hypercore Spot',
            }]);
            setStage('resolved');
          } else {
            setResults([]);
            setStage('not-found');
          }
        } catch {
          setResults([]);
          setStage('not-found');
        }
      }, 200);
      return () => clearTimeout(timer);
    }

    // Address or hash
    if (value.startsWith('0x')) {
      setStage('format');
      const timer = setTimeout(() => {
        if (value.length === 66) {
          setStage('hypercore');
        } else if (value.length === 42) {
          setStage('hyperevm');
        }
        // Let parent handle resolution via onSubmit
        setTimeout(() => setStage('idle'), 500);
      }, 150);
      return () => clearTimeout(timer);
    }

    // Block number
    if (/^\d+$/.test(value)) {
      setStage('format');
      setTimeout(() => setStage('idle'), 300);
    }
  }, [value, searchRegistry]);

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

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const getStageLabel = () => {
    switch (stage) {
      case 'format': return 'resolving format...';
      case 'hypercore': return 'probing Hypercore...';
      case 'hyperevm': return 'probing HyperEVM...';
      case 'resolved': return 'resolved';
      case 'not-found': return 'not found';
      default: return null;
    }
  };

  const isResolving = stage === 'format' || stage === 'hypercore' || stage === 'hyperevm';
  const showDropdown = isFocused && value.length >= 2 && results.length > 0;
  const stageLabel = getStageLabel();

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="address, tx hash, block, token..."
          className={cn(
            "h-9 text-sm font-mono pr-24",
            "bg-transparent border-0 shadow-none",
            "placeholder:text-muted-foreground/35",
            "focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
        />
        
        {/* Inline stage indicator */}
        <div className="absolute right-2 flex items-center gap-2">
          {stageLabel && (
            <span className={cn(
              "text-[10px] tabular-nums",
              isResolving && "text-primary/70",
              stage === 'resolved' && "text-profit/70",
              stage === 'not-found' && "text-muted-foreground/50"
            )}>
              {stageLabel}
            </span>
          )}
          {isResolving && (
            <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
          )}
          {value && !isResolving && (
            <button
              onClick={() => onChange('')}
              className="text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className={cn(
          "absolute z-50 top-full left-0 right-0 mt-1",
          "rounded-md overflow-hidden",
          "bg-popover border border-border",
          "shadow-md"
        )}>
          {results.map((result, index) => {
            const Icon = result.type === 'token' ? Coins : result.type === 'wallet' ? Wallet : FileCode;
            return (
              <button
                key={result.id}
                onClick={() => onSelect(result)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left",
                  "transition-colors duration-100",
                  index === selectedIndex ? "bg-accent" : "hover:bg-muted/50"
                )}
              >
                {result.logoUrl ? (
                  <TokenLogo symbol={result.symbol || result.name} size="sm" />
                ) : (
                  <div className="h-6 w-6 rounded bg-muted/50 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {result.symbol || result.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 uppercase">
                      {result.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/50 truncate">
                    {result.subtitle || result.name}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}