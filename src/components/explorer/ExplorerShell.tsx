import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, Share2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { getSearchPlaceholder, formatEntityId, getEntityLabel } from '@/lib/explorer/searchResolver';
import { findSpotTokenByName } from '@/lib/hyperliquidApi';
import type { EntityMode, ChainSource, LoadingStage } from '@/lib/explorer/types';
import { toast } from 'sonner';
// Chain toggle component
function ChainToggle({ 
  value, 
  onChange 
}: { 
  value: ChainSource | undefined; 
  onChange: (v: ChainSource | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      {[
        { key: undefined, label: 'All' },
        { key: 'hyperevm' as ChainSource, label: 'EVM' },
        { key: 'hypercore' as ChainSource, label: 'L1' },
      ].map(({ key, label }) => (
        <button
          key={label}
          onClick={() => onChange(key)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Quick search suggestion button - now auto-submits
function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
    >
      {label}
    </button>
  );
}

// Loading stage indicator
function LoadingIndicator({ stage }: { stage: LoadingStage }) {
  if (stage.stage === 'ready') return null;
  
  const stageMessages: Record<string, string> = {
    searching: 'Searching...',
    fetching: 'Fetching data...',
    reconciling: 'Cross-referencing chains...',
    computing: 'Computing analytics...',
    error: 'Error occurred',
  };
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      {stage.stage !== 'error' && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {stage.message || stageMessages[stage.stage]}
        </p>
        {stage.source && (
          <p className="text-xs text-muted-foreground">
            Source: {stage.source}
          </p>
        )}
      </div>
      {stage.progress !== undefined && (
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${stage.progress}%` }}
          />
        </div>
      )}
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
    setChain, 
    clear,
    getShareableUrl,
    navigateTo,
  } = useExplorerUrl();
  
  const [localSearch, setLocalSearch] = useState(query);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  
  // Sync local search with URL query
  useEffect(() => {
    setLocalSearch(query);
  }, [query]);
  
  // Handle search with token name resolution
  const handleSearchSubmit = useCallback(async () => {
    const trimmed = localSearch.trim();
    if (!trimmed) return;
    
    // Check if it looks like a token name (all letters or alphanumeric, not a hex address)
    const isLikelyTokenName = /^[A-Za-z][A-Za-z0-9]*$/i.test(trimmed) && !trimmed.startsWith('0x');
    
    if (isLikelyTokenName) {
      setIsResolving(true);
      try {
        const token = await findSpotTokenByName(trimmed);
        if (token) {
          // Found token - navigate directly to token page
          navigateTo('token', token.tokenId, 'hypercore');
          setIsResolving(false);
          return;
        }
        // Token not found - setQuery anyway, let detail page handle error
      } catch (err) {
        console.error('Token lookup failed:', err);
      }
      setIsResolving(false);
    }
    
    setQuery(trimmed);
  }, [localSearch, setQuery, navigateTo]);
  
  // Quick search handler - auto-submits
  const handleQuickSearch = useCallback(async (value: string) => {
    setLocalSearch(value);
    
    // Check if it's a token name
    const isLikelyTokenName = /^[A-Za-z][A-Za-z0-9]*$/i.test(value) && !value.startsWith('0x');
    
    if (isLikelyTokenName) {
      setIsResolving(true);
      try {
        const token = await findSpotTokenByName(value);
        if (token) {
          navigateTo('token', token.tokenId, 'hypercore');
          setIsResolving(false);
          return;
        }
      } catch (err) {
        console.error('Token lookup failed:', err);
      }
      setIsResolving(false);
    }
    
    setQuery(value);
  }, [setQuery, navigateTo]);
  
  const handleClear = useCallback(() => {
    setLocalSearch('');
    clear();
  }, [clear]);

  const handleBack = useCallback(() => {
    // Use browser history for proper back navigation
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      clear();
    }
  }, [navigate, clear]);
  
  const handleShare = useCallback(() => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }, [getShareableUrl]);
  
  
  const hasActiveQuery = !!query;
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Always visible search header */}
      <div className="space-y-4">
        {/* Title row - only show on home */}
        {showHeader && !hasActiveQuery && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hyperliquid Explorer</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Search wallets, transactions, blocks, and tokens across Hypercore & HyperEVM
              </p>
          </div>
            <ChainToggle value={chain} onChange={(c) => setChain(c || null)} />
          </div>
        )}
        
        {/* Compact header when viewing entity */}
        {hasActiveQuery && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <button 
                onClick={handleBack}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Back
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{getEntityLabel(mode || 'wallet')}</span>
              {chain && (
                <span className={cn(
                  "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium",
                  chain === 'hyperevm' 
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-primary/20 text-primary"
                )}>
                  {chain === 'hyperevm' ? 'HyperEVM' : 'Hypercore'}
              </span>
              )}
            </div>
            <ChainToggle value={chain} onChange={(c) => setChain(c || null)} />
          </div>
        )}
        
        {/* Search bar - always visible */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={getSearchPlaceholder(chain)}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "pl-12 pr-10 h-12 text-base font-mono bg-muted/30 border-border/50 transition-all",
                isSearchFocused && "border-primary ring-1 ring-primary/20"
              )}
            />
            {(localSearch || isResolving) && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          <Button
            onClick={handleSearchSubmit}
            disabled={!localSearch.trim() || isResolving}
            className="h-12 px-6"
          >
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
          {hasActiveQuery && (
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-12 px-3"
              title="Copy shareable link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Quick searches - only on home */}
        {!hasActiveQuery && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Try:</span>
            <QuickButton label="Sample Wallet" onClick={() => handleQuickSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47')} />
            <QuickButton label="PURR" onClick={() => handleQuickSearch('PURR')} />
            <QuickButton label="HYPE" onClick={() => handleQuickSearch('HYPE')} />
            <QuickButton label="Block 1M" onClick={() => handleQuickSearch('1000000')} />
          </div>
        )}
      </div>
      
      {/* Loading indicator */}
      {loadingStage && loadingStage.stage !== 'ready' && (
        <LoadingIndicator stage={loadingStage} />
      )}
      
      {/* Main content */}
      {children}
    </div>
  );
}
