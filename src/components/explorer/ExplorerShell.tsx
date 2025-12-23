import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { getSearchPlaceholder, getEntityLabel, getChainLabel } from '@/lib/explorer/searchResolver';
import { TokenSearchAutocomplete, type SearchResult } from './TokenSearchAutocomplete';
import type { LoadingStage } from '@/lib/explorer/types';

// Loading indicator - text label only
function LoadingIndicator({ stage }: { stage: LoadingStage }) {
  if (stage.stage === 'ready') return null;
  
  return (
    <div className="flex items-center justify-center gap-sm py-md">
      {stage.stage !== 'error' && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
      )}
      <p className="text-body text-muted-foreground">
        {stage.message || 'Loading...'}
      </p>
    </div>
  );
}

interface ExplorerShellProps {
  children: React.ReactNode;
  loadingStage?: LoadingStage;
  showHeader?: boolean;
}

export function ExplorerShell({ children, loadingStage, showHeader = true }: ExplorerShellProps) {
  const navigate = useNavigate();
  const { 
    query, 
    mode, 
    chain,
    setQuery, 
    clear,
    navigateTo,
  } = useExplorerUrl();
  
  const [localSearch, setLocalSearch] = useState(query);
  const [isResolving, setIsResolving] = useState(false);
  
  useEffect(() => {
    setLocalSearch(query);
  }, [query]);
  
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'token') {
      navigateTo('token', result.id);
    } else if (result.type === 'wallet') {
      navigateTo('wallet', result.address || result.id);
    } else if (result.type === 'contract' || result.type === 'dapp') {
      navigateTo('wallet', result.address || result.id);
    }
    setLocalSearch('');
  }, [navigateTo]);
  
  const handleSearchSubmit = useCallback(() => {
    const trimmed = localSearch.trim();
    if (!trimmed) return;
    setQuery(trimmed);
  }, [localSearch, setQuery]);
  
  const handleQuickSearch = useCallback((value: string) => {
    setLocalSearch(value);
    setQuery(value);
  }, [setQuery]);
  
  const handleClear = useCallback(() => {
    setLocalSearch('');
    clear();
  }, [clear]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      clear();
    }
  }, [navigate, clear]);
  
  const hasActiveQuery = !!query;
  const chainLabel = getChainLabel(chain);
  
  return (
    <div className="mx-auto max-w-[1280px] px-lg py-xl">
      {/* Hero section - only on home */}
      {showHeader && !hasActiveQuery && (
        <div className="text-center space-y-md pt-xxl pb-xl">
          <h1 className="text-h1 font-semibold tracking-tight text-foreground">
            Hyperliquid Explorer
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Search wallets, transactions, blocks, and tokens across the Hyperliquid L1 and EVM
          </p>
        </div>
      )}
      
      {/* Compact navigation when viewing entity */}
      {hasActiveQuery && (
        <div className="flex items-center gap-md mb-lg">
          <button 
            onClick={handleBack}
            className="flex items-center gap-xs text-body text-muted-foreground hover:text-foreground transition-state"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Back</span>
          </button>
          <span className="text-border">·</span>
          <span className="text-body text-muted-foreground">{getEntityLabel(mode || 'wallet')}</span>
          {chainLabel && (
            <span className="text-caption text-muted-foreground px-sm py-xs rounded border border-border bg-muted">
              {chainLabel}
            </span>
          )}
        </div>
      )}
      
      {/* Primary CTA: Search bar - 2026 minimal style */}
      <div className={cn(
        "mx-auto transition-state",
        hasActiveQuery ? "max-w-2xl mb-lg" : "max-w-2xl mb-xxl"
      )}>
        <div className={cn(
          "relative flex gap-sm p-xs",
          "rounded-lg",
          "bg-surface",
          "border border-border",
          "shadow-1",
          "focus-within:border-primary focus-within:shadow-2",
          "transition-state"
        )}>
          <div className="relative flex-1">
            <Search className="absolute left-md top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <TokenSearchAutocomplete
              value={localSearch}
              onChange={setLocalSearch}
              onSelect={handleSelect}
              onSubmit={handleSearchSubmit}
              placeholder={getSearchPlaceholder()}
              className="flex-1"
              isLoading={isResolving}
            />
          </div>
          <Button
            onClick={handleSearchSubmit}
            disabled={!localSearch.trim() || isResolving}
            className={cn(
              "h-11 px-lg rounded-md",
              "bg-primary hover:bg-primary/90",
              "text-primary-foreground font-medium",
              "shadow-1",
              "transition-state"
            )}
          >
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : 'Search'}
          </Button>
        </div>
        
        {/* Quick search suggestions - only on home */}
        {!hasActiveQuery && (
          <div className="flex flex-wrap items-center justify-center gap-sm mt-lg">
            <span className="text-caption text-muted-foreground">Try:</span>
            {['HYPE', 'PURR', '1000000', '0xdd590902...'].map((label) => (
              <button
                key={label}
                onClick={() => handleQuickSearch(label === '0xdd590902...' ? '0xdd590902cdac0abb4861a6748a256e888acb8d47' : label)}
                className={cn(
                  "px-sm py-xs rounded-md text-caption",
                  "text-muted-foreground hover:text-foreground",
                  "border border-border hover:border-border",
                  "bg-muted/50 hover:bg-muted",
                  "transition-state"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Loading indicator */}
      {loadingStage && loadingStage.stage !== 'ready' && (
        <LoadingIndicator stage={loadingStage} />
      )}
      
      {/* Main content */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
