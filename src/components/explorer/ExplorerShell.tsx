import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { getSearchPlaceholder } from '@/lib/explorer/searchResolver';
import { TokenSearchAutocomplete, type SearchResult } from './TokenSearchAutocomplete';
import type { LoadingStage } from '@/lib/explorer/types';

// Quick search chip - functional only
function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded text-xs font-medium",
        "border border-border",
        "text-muted-foreground hover:text-foreground",
        "hover:border-foreground/20",
        "transition-colors duration-150"
      )}
    >
      {label}
    </button>
  );
}

// Loading indicator - inline stage display
function LoadingIndicator({ stage }: { stage: LoadingStage }) {
  if (stage.stage === 'ready') return null;
  
  return (
    <div className="flex items-center gap-2 py-2">
      {stage.stage !== 'error' && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <p className="text-xs text-muted-foreground">
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
  
  const hasActiveQuery = !!query;
  
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Title row - left aligned, not hero */}
      {showHeader && !hasActiveQuery && (
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Hyperliquid Explorer
          </h1>
          <p className="text-xs text-muted-foreground">
            Search wallets, transactions, blocks, and tokens
          </p>
        </div>
      )}
      
      {/* Search input - functional, not decorative */}
      <div className="space-y-2">
        <div className={cn(
          "flex gap-2 p-1",
          "rounded border border-border",
          "bg-card",
          "focus-within:border-foreground/30",
          "transition-colors duration-150"
        )}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            size="sm"
            className="h-9 px-4"
          >
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        
        {/* Quick chips - only on home */}
        {!hasActiveQuery && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Try</span>
            <QuickChip label="HYPE" onClick={() => handleQuickSearch('HYPE')} />
            <QuickChip label="PURR" onClick={() => handleQuickSearch('PURR')} />
            <QuickChip label="Block 1M" onClick={() => handleQuickSearch('1000000')} />
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
