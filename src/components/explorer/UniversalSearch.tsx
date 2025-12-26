/**
 * Universal Search Component - Hyperliquid Design
 * Clean, fast, keyboard-first
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Check, Loader2, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchResolver, type SearchState } from '@/hooks/useSearchResolver';
import type { EntityType, RecentSearch } from '@/lib/input-resolver';

function StatusIndicator({ 
  state, 
  isValid 
}: { 
  state: SearchState; 
  isValid: boolean | null;
}) {
  if (state === 'resolving') {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
      </div>
    );
  }
  
  if (state === 'success') {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <Check className="h-4 w-4 text-profit" />
      </div>
    );
  }
  
  if (isValid === true && state === 'idle') {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <Check className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
    );
  }
  
  return null;
}

function RecentSearchPill({ 
  search, 
  onSelect, 
  onRemove 
}: { 
  search: RecentSearch;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [showRemove, setShowRemove] = useState(false);
  
  const displayQuery = search.query.length > 20 
    ? `${search.query.slice(0, 8)}...${search.query.slice(-6)}`
    : search.query;
  
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
      className={cn(
        "group relative px-2.5 py-1 rounded-md text-xs",
        "bg-muted/30 text-muted-foreground/60",
        "hover:bg-muted/50 hover:text-foreground",
        "transition-all duration-150",
        "flex items-center gap-1.5"
      )}
    >
      <span className="font-mono">{displayQuery}</span>
      {showRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded hover:bg-muted/80 transition-colors"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </button>
  );
}

function ErrorMessage({ 
  error, 
  type 
}: { 
  error: string; 
  type: EntityType;
}) {
  const subtext = type === 'wallet' 
    ? "This wallet hasn't traded on Hyperliquid"
    : type === 'tx'
    ? "Check the hash and try again"
    : type === 'token'
    ? "Available: BTC, ETH, SOL, HYPE, PURR..."
    : type === 'block'
    ? "Enter a valid block number"
    : "Try an address, transaction, or token symbol";
  
  return (
    <div className="absolute top-full left-0 right-0 pt-2 text-left">
      <p className="text-xs text-destructive font-medium">{error}</p>
      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtext}</p>
    </div>
  );
}

interface UniversalSearchProps {
  autoFocus?: boolean;
  size?: 'default' | 'large';
  className?: string;
  onResolve?: (route: string) => void;
}

export function UniversalSearch({ 
  autoFocus = false,
  size = 'large',
  className,
  onResolve,
}: UniversalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const {
    query,
    state,
    isValid,
    detectedType,
    error,
    recentSearches,
    setQuery,
    submit,
    clear,
    removeRecent,
    selectRecent,
  } = useSearchResolver();
  
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      clear();
      inputRef.current?.blur();
    }
  };
  
  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 150);
  };
  
  const showRecent = isFocused && !query && recentSearches.length > 0;
  const isLarge = size === 'large';
  
  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative w-full">
        <Search className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40",
          isLarge ? "h-5 w-5" : "h-4 w-4"
        )} />
        
        <input
          ref={inputRef}
          type="text"
          data-search-input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="Search address, tx, block, or token..."
          className={cn(
            "w-full",
            "bg-card/80 backdrop-blur-md",
            "text-foreground placeholder:text-muted-foreground/40",
            "rounded-lg",
            "border border-border/50",
            "outline-none",
            "transition-all duration-150",
            "focus:border-primary/50 focus:bg-card",
            "focus:shadow-glow",
            isLarge ? "h-12 pl-12 pr-12 text-base" : "h-10 pl-10 pr-10 text-sm",
            state === 'error' && "border-destructive/30",
          )}
          disabled={state === 'resolving'}
        />
        
        <StatusIndicator state={state} isValid={isValid} />
      </div>
      
      {/* Error Message */}
      {state === 'error' && error && (
        <ErrorMessage error={error} type={detectedType} />
      )}
      
      {/* Recent Searches */}
      {showRecent && (
        <div className="absolute top-full left-0 right-0 pt-3">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {recentSearches.map((search) => (
              <RecentSearchPill
                key={search.query}
                search={search}
                onSelect={() => selectRecent(search)}
                onRemove={() => removeRecent(search.query)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UniversalSearch;
