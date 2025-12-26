/**
 * Explorer Shell - Terminal style
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { UniversalSearch } from './UniversalSearch';
import type { LoadingStage } from '@/lib/explorer/types';

function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-[10px] font-mono font-medium bg-muted/30 border border-border/30 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 hover:border-border/50 transition-all"
    >
      {label}
    </button>
  );
}

function LoadingIndicator({ stage }: { stage: LoadingStage }) {
  if (stage.stage === 'ready') return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {stage.stage !== 'error' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />}
      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{stage.message || 'Loading...'}</p>
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
  const { query, setQuery } = useExplorerUrl();
  
  const handleQuickSearch = useCallback((value: string) => {
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) navigate(`/wallet/${value}`);
    else if (/^\d+$/.test(value)) navigate(`/block/${value}`);
    else if (/^[A-Z]{2,10}$/i.test(value)) navigate(`/token/${value.toUpperCase()}`);
    else setQuery(value);
  }, [navigate, setQuery]);
  
  const hasActiveQuery = !!query;
  
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      {showHeader && !hasActiveQuery && (
        <div className="text-center space-y-3 pt-16 pb-8">
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-foreground">
            Hyperliquid Explorer
          </h1>
          <p className="text-[11px] text-muted-foreground/50 max-w-md mx-auto uppercase tracking-wider">
            Search wallets, transactions, blocks, and tokens across HyperCore & HyperEVM
          </p>
          <p className="text-[10px] text-muted-foreground/30 pt-1 font-mono">
            Press <kbd className="kbd">⌘K</kbd> for quick search
          </p>
        </div>
      )}
      
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <UniversalSearch autoFocus={!hasActiveQuery} size="large" />
        {!hasActiveQuery && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-[9px] text-muted-foreground/30 uppercase tracking-wider shrink-0">Try</span>
            <QuickChip label="HYPE" onClick={() => handleQuickSearch('HYPE')} />
            <QuickChip label="PURR" onClick={() => handleQuickSearch('PURR')} />
            <QuickChip label="Block 1M" onClick={() => handleQuickSearch('1000000')} />
          </div>
        )}
      </div>
      
      {loadingStage && loadingStage.stage !== 'ready' && <LoadingIndicator stage={loadingStage} />}
      
      <div className={cn("transition-all duration-200 w-full", !hasActiveQuery && "pt-4")}>
        {children}
      </div>
    </div>
  );
}