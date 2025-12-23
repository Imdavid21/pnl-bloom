import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { getSearchPlaceholder, getEntityLabel, getChainLabel } from '@/lib/explorer/searchResolver';
import { TokenSearchAutocomplete, type SearchResult } from './TokenSearchAutocomplete';
import type { LoadingStage } from '@/lib/explorer/types';

// Quick search chip - minimal 2026 style
function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-muted/10 border border-border/20",
        "text-muted-foreground/60 hover:text-foreground/80",
        "hover:bg-muted/20 hover:border-border/40",
        "transition-all duration-300 ease-out"
      )}
    >
      {label}
    </button>
  );
}

// Loading indicator
function LoadingIndicator({ stage }: { stage: LoadingStage }) {
  if (stage.stage === 'ready') return null;
  
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {stage.stage !== 'error' && (
        <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
      )}
      <p className="text-sm text-muted-foreground/60">
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
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 flex flex-col items-center w-full">
      {/* Hero section - only on home */}
      {showHeader && !hasActiveQuery && (
        <div className="text-center space-y-3 pt-8 pb-4 w-full">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground/90">
            Hyperliquid Explorer
          </h1>
          <p className="text-base text-muted-foreground/60 max-w-lg mx-auto">
            Search wallets, transactions, blocks, and tokens across L1 & EVM
          </p>
        </div>
      )}
      
      {/* Primary CTA: Search bar - 2026 minimal style */}
      <div className={cn(
        "relative w-full transition-all duration-500",
        hasActiveQuery ? "max-w-3xl" : "max-w-4xl"
      )}>
        <div className={cn(
          "relative flex gap-2 p-1.5",
          "rounded-2xl",
          "bg-card/40 backdrop-blur-xl",
          "border border-border/30",
          "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]",
          "dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]",
          "focus-within:border-primary/40 focus-within:shadow-[0_8px_50px_-12px_rgba(0,0,0,0.2)]",
          "transition-all duration-300"
        )}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
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
              "h-11 px-6 rounded-xl",
              "bg-primary/90 hover:bg-primary",
              "text-primary-foreground font-medium",
              "shadow-sm hover:shadow-md",
              "transition-all duration-300"
            )}
          >
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        
        {/* Quick search chips - only on home */}
        {!hasActiveQuery && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="text-[11px] text-muted-foreground/40 uppercase tracking-wider">Try</span>
            <QuickChip label="HYPE" onClick={() => handleQuickSearch('HYPE')} />
            <QuickChip label="PURR" onClick={() => handleQuickSearch('PURR')} />
            <QuickChip label="Block 1M" onClick={() => handleQuickSearch('1000000')} />
            <QuickChip label="Sample Wallet" onClick={() => handleQuickSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47')} />
          </div>
        )}
      </div>
      
      {/* Loading indicator */}
      {loadingStage && loadingStage.stage !== 'ready' && (
        <LoadingIndicator stage={loadingStage} />
      )}
      
      {/* Main content with spacing */}
      <div className={cn(
        "transition-all duration-500 w-full flex flex-col items-center",
        !hasActiveQuery && "pt-4"
      )}>
        {children}
      </div>
    </div>
  );
}