import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { NetworkStateStrip } from './NetworkStateStrip';
import { ActivityPulse } from './ActivityPulse';
import { EntryPoints } from './EntryPoints';
import { ResolverInput, type SearchResult } from './ResolverInput';
import type { LoadingStage } from '@/lib/explorer/types';

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
  
  useEffect(() => {
    setLocalSearch(query);
  }, [query]);
  
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'token') {
      navigateTo('token', result.id);
    } else if (result.type === 'wallet' || result.type === 'contract' || result.type === 'dapp') {
      navigateTo('wallet', result.address || result.id);
    }
    setLocalSearch('');
  }, [navigateTo]);
  
  const handleSearchSubmit = useCallback(() => {
    const trimmed = localSearch.trim();
    if (!trimmed) return;
    setQuery(trimmed);
  }, [localSearch, setQuery]);
  
  const handleInspect = useCallback((type: string, example: string) => {
    if (type === 'wallet') {
      setLocalSearch(example);
      setQuery(example);
    } else if (type === 'block') {
      setLocalSearch(example);
      setQuery(example);
    }
  }, [setQuery]);
  
  const hasActiveQuery = !!query;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top bar: Resolver - always visible, left-aligned, full-width */}
      <div className="border-b border-border/50 bg-card/20">
        <div className="flex items-center px-4 py-2">
          <div className={cn(
            "flex-1 max-w-2xl",
            "rounded-md border border-border/50 bg-background/50",
            "focus-within:border-primary/50 focus-within:bg-background",
            "transition-colors duration-150"
          )}>
            <ResolverInput
              value={localSearch}
              onChange={setLocalSearch}
              onSelect={handleSelect}
              onSubmit={handleSearchSubmit}
            />
          </div>
        </div>
      </div>
      
      {/* Network state strip - single dense row */}
      {showHeader && !hasActiveQuery && (
        <NetworkStateStrip />
      )}
      
      {/* Activity pulse - mini histogram */}
      {showHeader && !hasActiveQuery && (
        <div className="border-b border-border/30">
          <ActivityPulse />
        </div>
      )}
      
      {/* Entry points - subtle inline examples */}
      {showHeader && !hasActiveQuery && (
        <div className="border-b border-border/30">
          <EntryPoints onInspect={handleInspect} />
        </div>
      )}
      
      {/* Loading stage indicator */}
      {loadingStage && loadingStage.stage !== 'ready' && (
        <div className="px-4 py-2 border-b border-border/30 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {loadingStage.message || 'Loading...'}
          </span>
        </div>
      )}
      
      {/* Main content - no hero, no cards, no empty space */}
      <div className={cn(
        "flex-1 px-4 py-4",
        hasActiveQuery && "pt-4"
      )}>
        {children}
      </div>
    </div>
  );
}