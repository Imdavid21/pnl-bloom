import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { UniversalSearch } from './UniversalSearch';
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
    setQuery, 
    clear,
    navigateTo,
  } = useExplorerUrl();
  
  const handleQuickSearch = useCallback((value: string) => {
    // Navigate directly based on type
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
      navigate(`/wallet/${value}`);
    } else if (/^\d+$/.test(value)) {
      navigate(`/block/${value}`);
    } else if (/^[A-Z]{2,10}$/i.test(value)) {
      navigate(`/token/${value.toUpperCase()}`);
    } else {
      setQuery(value);
    }
  }, [navigate, setQuery]);
  
  const hasActiveQuery = !!query;
  
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6 flex flex-col items-center">
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
      
      {/* Primary CTA: Universal Search - Steve Jobs simplicity */}
      <div className="relative w-full max-w-2xl transition-all duration-500">
        <UniversalSearch 
          autoFocus={!hasActiveQuery} 
          size="large"
        />
        
        {/* Quick search chips - only on home */}
        {!hasActiveQuery && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 pt-4">
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