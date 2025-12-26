/**
 * Universal Search Component
 * Steve Jobs-level simplicity: One box, zero clutter, instant feedback
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchResolver, type SearchState } from '@/hooks/useSearchResolver';
import type { EntityType, RecentSearch } from '@/lib/input-resolver';

// ============ SUBCOMPONENTS ============

function StatusIndicator({ 
  state, 
  isValid 
}: { 
  state: SearchState; 
  isValid: boolean | null;
}) {
  if (state === 'resolving') {
    return (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
      </div>
    );
  }
  
  if (state === 'success') {
    return (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <Check className="h-5 w-5 text-emerald-500" />
      </div>
    );
  }
  
  if (isValid === true && state === 'idle') {
    return (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <Check className="h-4 w-4 text-muted-foreground/40" />
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
        "group relative px-3 py-1.5 rounded-full text-xs",
        "bg-muted/30 text-muted-foreground/70",
        "hover:bg-muted/50 hover:text-foreground/80",
        "transition-all duration-200",
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
          className="p-0.5 rounded-full hover:bg-muted/80 transition-colors"
        >
          <X className="h-3 w-3" />
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
    <div className="absolute top-full left-0 right-0 pt-3 text-left">
      <p className="text-sm text-destructive/90 font-medium">{error}</p>
      <p className="text-xs text-muted-foreground/60 mt-0.5">{subtext}</p>
    </div>
  );
}

// ============ MAIN COMPONENT ============

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
  
  // Auto-focus on mount if requested
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
    // Delay to allow click on recent searches
    setTimeout(() => setIsFocused(false), 150);
  };
  
  const showRecent = isFocused && !query && recentSearches.length > 0;
  const isLarge = size === 'large';
  
  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div 
        className={cn(
          "relative w-full",
          "transition-all duration-300 ease-out",
          isFocused && "scale-[1.01]"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="Search address, transaction, market, or token..."
          className={cn(
            "w-full",
            "bg-background/60 backdrop-blur-xl",
            "text-foreground placeholder:text-muted-foreground/50",
            "rounded-2xl",
            "border-2 border-transparent",
            "outline-none",
            "transition-all duration-300 ease-out",
            // Focus state
            "focus:border-foreground/90 focus:bg-background/80",
            "focus:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)]",
            "dark:focus:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]",
            // Size variants
            isLarge ? [
              "h-16 px-6 text-lg font-medium",
            ] : [
              "h-12 px-5 text-base",
            ],
            // Error state - no red border, just text below
            state === 'error' && "border-transparent",
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
        <div className="absolute top-full left-0 right-0 pt-4">
          <div className="flex flex-wrap gap-2 justify-center">
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
