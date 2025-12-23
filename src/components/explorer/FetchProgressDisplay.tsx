import { useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Clock, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type LoadingStatus = 'pending' | 'loading' | 'done' | 'empty' | 'error' | 'timeout';

export interface DataFetchState {
  status: LoadingStatus;
  count?: number;
  message?: string;
}

export interface FetchProgress {
  clearinghouse: DataFetchState;
  fills: DataFetchState;
  l1Txs: DataFetchState;
  evmData: DataFetchState;
  evmTxs: DataFetchState;
  tokens: DataFetchState;
  internalTxs: DataFetchState;
}

interface FetchProgressDisplayProps {
  progress: FetchProgress;
  onRetry?: (key: keyof FetchProgress) => void;
  className?: string;
}

const LABELS: Record<keyof FetchProgress, { name: string; chain: 'hypercore' | 'hyperevm' }> = {
  clearinghouse: { name: 'Positions', chain: 'hypercore' },
  fills: { name: 'Trade Fills', chain: 'hypercore' },
  l1Txs: { name: 'L1 Transactions', chain: 'hypercore' },
  evmData: { name: 'EVM Balance', chain: 'hyperevm' },
  evmTxs: { name: 'EVM Transactions', chain: 'hyperevm' },
  tokens: { name: 'Token Balances', chain: 'hyperevm' },
  internalTxs: { name: 'Internal Txs', chain: 'hyperevm' },
};

function StatusIcon({ status }: { status: LoadingStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case 'done':
      return <CheckCircle2 className="h-3 w-3 text-profit-3" />;
    case 'empty':
      return <Inbox className="h-3 w-3 text-muted-foreground/60" />;
    case 'error':
      return <XCircle className="h-3 w-3 text-loss-3" />;
    case 'timeout':
      return <Clock className="h-3 w-3 text-warning" />;
    default:
      return <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />;
  }
}

function StatusMessage({ status, count, name }: { status: LoadingStatus; count?: number; name: string }) {
  switch (status) {
    case 'loading':
      return <span className="text-muted-foreground">Fetching {name.toLowerCase()}...</span>;
    case 'done':
      return <span className="text-foreground">{count !== undefined ? `${count} found` : 'Loaded'}</span>;
    case 'empty':
      return <span className="text-muted-foreground/60">No {name.toLowerCase()} found</span>;
    case 'error':
      return <span className="text-loss-3/80">Failed to load</span>;
    case 'timeout':
      return <span className="text-warning">Request timed out</span>;
    default:
      return <span className="text-muted-foreground/40">Waiting...</span>;
  }
}

export function FetchProgressDisplay({ progress, onRetry, className }: FetchProgressDisplayProps) {
  const entries = Object.entries(progress) as [keyof FetchProgress, DataFetchState][];
  
  // Group by chain
  const hypercoreItems = entries.filter(([key]) => LABELS[key].chain === 'hypercore');
  const hyperevmItems = entries.filter(([key]) => LABELS[key].chain === 'hyperevm');
  
  // Calculate overall progress
  const totalItems = entries.length;
  const completedItems = entries.filter(([, state]) => 
    ['done', 'empty', 'error', 'timeout'].includes(state.status)
  ).length;
  const loadingItems = entries.filter(([, state]) => state.status === 'loading');
  const timedOutItems = entries.filter(([, state]) => state.status === 'timeout');
  const isComplete = completedItems === totalItems;
  const progressPercent = Math.round((completedItems / totalItems) * 100);
  
  // Check chain availability
  const hypercoreHasData = hypercoreItems.some(([, s]) => s.status === 'done' && (s.count ?? 0) > 0);
  const hyperevmHasData = hyperevmItems.some(([, s]) => s.status === 'done' && (s.count ?? 0) > 0);
  
  if (isComplete && timedOutItems.length === 0) {
    return null; // Hide when complete with no issues
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main progress bar (while loading) */}
      {!isComplete && (
        <div className="p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs font-medium text-foreground">
                Loading wallet data
              </span>
            </div>
            <span className="text-xs tabular-nums font-medium text-primary">
              {progressPercent}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {/* Parallel fetch items */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {entries.map(([key, state]) => (
              <div 
                key={key}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs",
                  "bg-background/50 border border-border/20",
                  state.status === 'loading' && "border-primary/30 bg-primary/5"
                )}
              >
                <StatusIcon status={state.status} />
                <span className={cn(
                  "truncate",
                  state.status === 'loading' ? "text-foreground" : "text-muted-foreground"
                )}>
                  {LABELS[key].name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeout/retry banner */}
      {timedOutItems.length > 0 && (
        <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-warning">
                  Some requests timed out
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {timedOutItems.map(([key]) => LABELS[key].name).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {timedOutItems.map(([key]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry?.(key)}
                  disabled={progress[key].status === 'loading'}
                  className="h-7 text-[11px] px-2.5 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
                >
                  {progress[key].status === 'loading' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state summary after loading */}
      {isComplete && (
        <ChainSummary 
          hypercoreHasData={hypercoreHasData}
          hyperevmHasData={hyperevmHasData}
          hypercoreItems={hypercoreItems}
          hyperevmItems={hyperevmItems}
        />
      )}
    </div>
  );
}

function ChainSummary({
  hypercoreHasData,
  hyperevmHasData,
  hypercoreItems,
  hyperevmItems,
}: {
  hypercoreHasData: boolean;
  hyperevmHasData: boolean;
  hypercoreItems: [keyof FetchProgress, DataFetchState][];
  hyperevmItems: [keyof FetchProgress, DataFetchState][];
}) {
  // Only show if there's something noteworthy
  const hypercoreAllEmpty = hypercoreItems.every(([, s]) => s.status === 'empty' || (s.status === 'done' && (s.count ?? 0) === 0));
  const hyperevmAllEmpty = hyperevmItems.every(([, s]) => s.status === 'empty' || (s.status === 'done' && (s.count ?? 0) === 0));
  
  if (!hypercoreAllEmpty && !hyperevmAllEmpty) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {hypercoreAllEmpty && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20 text-xs text-muted-foreground">
          <Inbox className="h-3 w-3" />
          <span>No Hypercore activity for this address</span>
        </div>
      )}
      {hyperevmAllEmpty && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20 text-xs text-muted-foreground">
          <Inbox className="h-3 w-3" />
          <span>No HyperEVM activity for this address</span>
        </div>
      )}
    </div>
  );
}