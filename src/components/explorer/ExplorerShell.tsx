import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Share2, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { getSearchPlaceholder, getEntityLabel } from '@/lib/explorer/searchResolver';
import { findSpotTokenByName } from '@/lib/hyperliquidApi';
import type { ChainSource, LoadingStage } from '@/lib/explorer/types';
import { toast } from 'sonner';
import { TokenSearchAutocomplete, type SearchResult } from './TokenSearchAutocomplete';

// Chain toggle component
function ChainToggle({ 
  value, 
  onChange 
}: { 
  value: ChainSource | undefined; 
  onChange: (v: ChainSource | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/30">
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
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
      className={cn(
        "px-2.5 py-1 rounded-lg text-xs",
        "bg-secondary/30 border border-border/20",
        "text-muted-foreground/70 hover:text-foreground",
        "hover:bg-secondary/50 hover:border-primary/30",
        "transition-all duration-200"
      )}
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
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl",
      "bg-gradient-to-r from-secondary/40 to-secondary/20",
      "border border-border/30"
    )}>
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
        <div className="w-20 h-1.5 bg-muted/50 rounded-full overflow-hidden">
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

  // Handle autocomplete selection
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'token') {
      navigateTo('token', result.id, 'hypercore');
    } else if (result.type === 'wallet') {
      navigateTo('wallet', result.address || result.id);
    } else if (result.address) {
      setQuery(result.address);
    } else {
      setQuery(result.id);
    }
  }, [navigateTo, setQuery]);
  
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
              <div className="flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Hyperlens</h1>
              </div>
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
                    ? "bg-profit/20 text-profit"
                    : "bg-primary/20 text-primary"
                )}>
                  {chain === 'hyperevm' ? 'HyperEVM' : 'Hypercore'}
              </span>
              )}
            </div>
            <ChainToggle value={chain} onChange={(c) => setChain(c || null)} />
          </div>
        )}
        
        {/* Search bar with autocomplete */}
        <div className="flex gap-2">
          <TokenSearchAutocomplete
            value={localSearch}
            onChange={setLocalSearch}
            onSelect={handleSelect}
            onSubmit={handleSearchSubmit}
            placeholder={getSearchPlaceholder(chain)}
            isLoading={isResolving}
            className="flex-1"
          />
          <Button
            onClick={handleSearchSubmit}
            disabled={!localSearch.trim() || isResolving}
            className="h-12 px-6 bg-primary hover:bg-primary/90"
          >
            {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
          {hasActiveQuery && (
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-12 px-3 border-border/40 hover:bg-secondary/50"
              title="Copy shareable link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Quick searches - only on home */}
        {!hasActiveQuery && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground/60">Try:</span>
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
