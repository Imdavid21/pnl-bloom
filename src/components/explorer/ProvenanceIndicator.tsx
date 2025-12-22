import { Clock, Database, Cpu, Cloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Provenance } from '@/lib/explorer/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProvenanceIndicatorProps {
  provenance: Provenance;
  className?: string;
  compact?: boolean;
}

export function ProvenanceIndicator({ provenance, className, compact = false }: ProvenanceIndicatorProps) {
  const { source, fetchedAt, finality, staleAfter } = provenance;
  
  const now = Date.now();
  const age = now - fetchedAt;
  const isStale = staleAfter ? age > staleAfter : age > 60000; // Default 1 min stale
  
  // Format age
  const formatAge = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  // Source label and icon
  const sourceConfig: Record<string, { label: string; icon: typeof Database }> = {
    hyperliquid_api: { label: 'Hyperliquid API', icon: Cloud },
    hyperevm_rpc: { label: 'HyperEVM RPC', icon: Database },
    supabase_cache: { label: 'Cached', icon: Database },
    computed: { label: 'Computed', icon: Cpu },
  };
  
  const { label: sourceLabel, icon: SourceIcon } = sourceConfig[source] || { 
    label: source, 
    icon: Cloud 
  };
  
  // Finality styling
  const finalityConfig = {
    final: { label: 'Final', color: 'text-profit-3', icon: CheckCircle2 },
    pending: { label: 'Pending', color: 'text-warning', icon: Clock },
    unconfirmed: { label: 'Unconfirmed', color: 'text-muted-foreground', icon: AlertCircle },
  };
  
  const { label: finalityLabel, color: finalityColor, icon: FinalityIcon } = 
    finalityConfig[finality] || finalityConfig.unconfirmed;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px]",
              isStale ? "text-warning" : "text-muted-foreground",
              className
            )}>
              <FinalityIcon className="h-3 w-3" />
              <span>{formatAge(age)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <p>Source: {sourceLabel}</p>
              <p>Status: {finalityLabel}</p>
              <p>Updated: {new Date(fetchedAt).toLocaleTimeString()}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className={cn(
      "flex items-center gap-3 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <SourceIcon className="h-3.5 w-3.5" />
        <span>{sourceLabel}</span>
      </div>
      <span className="text-border">•</span>
      <div className={cn("flex items-center gap-1.5", finalityColor)}>
        <FinalityIcon className="h-3.5 w-3.5" />
        <span>{finalityLabel}</span>
      </div>
      <span className="text-border">•</span>
      <div className={cn(
        "flex items-center gap-1.5",
        isStale && "text-warning"
      )}>
        <Clock className="h-3.5 w-3.5" />
        <span>{formatAge(age)}</span>
        {isStale && <span className="text-warning">(stale)</span>}
      </div>
    </div>
  );
}

// Simplified freshness dot for inline use
export function FreshnessDot({ 
  fetchedAt, 
  staleAfter = 60000,
  className 
}: { 
  fetchedAt: number; 
  staleAfter?: number;
  className?: string;
}) {
  const age = Date.now() - fetchedAt;
  const isFresh = age < staleAfter / 2;
  const isStale = age > staleAfter;
  
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        isFresh && "bg-profit-3",
        !isFresh && !isStale && "bg-warning",
        isStale && "bg-loss-3",
        className
      )}
      title={`Updated ${Math.floor(age / 1000)}s ago`}
    />
  );
}
