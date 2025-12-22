import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Check, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePollHypercore } from "@/hooks/usePnlData";

interface SyncProgressProps {
  wallet: string;
  onSyncComplete?: () => void;
}

interface SyncState {
  status: 'idle' | 'syncing' | 'complete' | 'error';
  currentRound: number;
  totalFills: number;
  totalFunding: number;
  totalVolume: number;
  eventsInserted: number;
  estimatedSecondsRemaining: number | null;
  hasMore: boolean;
  error?: string;
  lastFillsFetched: number;
}

const FILLS_PER_ROUND = 5000;
const BASE_DELAY_MS = 3000;
const ESTIMATED_SECONDS_PER_ROUND = 40;

export function SyncProgress({ wallet, onSyncComplete }: SyncProgressProps) {
  const pollMutation = usePollHypercore();
  const autoSyncRef = useRef(false);
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    currentRound: 0,
    totalFills: 0,
    totalFunding: 0,
    totalVolume: 0,
    eventsInserted: 0,
    estimatedSecondsRemaining: null,
    hasMore: false,
    lastFillsFetched: 0,
  });

  const runSyncRound = useCallback(async (isFirstRound: boolean) => {
    try {
      const result = await pollMutation.mutateAsync({
        wallet,
        fullHistory: isFirstRound,
        maxFills: FILLS_PER_ROUND,
      });

      // hasMore is true if we fetched the maximum fills (meaning there could be more)
      const hasMore = result.fills_fetched >= FILLS_PER_ROUND;

      setSyncState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        totalFills: prev.totalFills + result.fills_fetched,
        totalFunding: prev.totalFunding + result.funding_fetched,
        totalVolume: prev.totalVolume + (result.total_volume || 0),
        eventsInserted: prev.eventsInserted + result.economic_events_inserted,
        status: hasMore && autoSyncRef.current ? 'syncing' : 'complete',
        estimatedSecondsRemaining: hasMore && autoSyncRef.current ? ESTIMATED_SECONDS_PER_ROUND : null,
        hasMore,
        lastFillsFetched: result.fills_fetched,
      }));

      return hasMore;
    } catch (err: any) {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: err?.message || 'Sync failed',
        hasMore: false,
      }));
      return false;
    }
  }, [wallet, pollMutation]);

  // Auto-continue effect with adaptive delay
  useEffect(() => {
    if (syncState.status === 'syncing' && syncState.hasMore && autoSyncRef.current && !pollMutation.isPending) {
      // Increase delay for larger syncs to avoid rate limiting
      const delay = BASE_DELAY_MS + (syncState.currentRound * 500);
      const timer = setTimeout(() => {
        runSyncRound(false);
      }, Math.min(delay, 10000)); // Cap at 10s
      return () => clearTimeout(timer);
    }
    
    if (syncState.status === 'complete') {
      onSyncComplete?.();
    }
  }, [syncState.status, syncState.hasMore, syncState.currentRound, pollMutation.isPending, runSyncRound, onSyncComplete]);

  // Countdown timer
  useEffect(() => {
    if (syncState.estimatedSecondsRemaining && syncState.estimatedSecondsRemaining > 0 && pollMutation.isPending) {
      const timer = setInterval(() => {
        setSyncState(prev => ({
          ...prev,
          estimatedSecondsRemaining: prev.estimatedSecondsRemaining ? Math.max(0, prev.estimatedSecondsRemaining - 1) : null,
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [syncState.estimatedSecondsRemaining, pollMutation.isPending]);

  const handleStartSync = async (fullHistory: boolean) => {
    autoSyncRef.current = fullHistory;
    setSyncState({
      status: 'syncing',
      currentRound: 0,
      totalFills: 0,
      totalFunding: 0,
      totalVolume: 0,
      eventsInserted: 0,
      estimatedSecondsRemaining: ESTIMATED_SECONDS_PER_ROUND,
      hasMore: true,
      lastFillsFetched: 0,
    });
    await runSyncRound(fullHistory);
  };

  const handleStop = () => {
    autoSyncRef.current = false;
    setSyncState(prev => ({ ...prev, status: 'complete', hasMore: false }));
  };

  if (syncState.status === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartSync(false)}
          disabled={pollMutation.isPending}
          className="gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sync</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleStartSync(true)}
          disabled={pollMutation.isPending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Full History
        </Button>
      </div>
    );
  }

  const progressPercent = syncState.status === 'complete' ? 100 : 
    pollMutation.isPending ? 50 : 75;

  // Estimate remaining based on if we're still hitting the fill limit
  const estimatedRemainingRounds = syncState.hasMore && syncState.lastFillsFetched >= FILLS_PER_ROUND 
    ? '∞' : '0';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {syncState.status === 'syncing' && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {syncState.status === 'complete' && (
            <Check className="h-4 w-4 text-profit" />
          )}
          {syncState.status === 'error' && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">
            {syncState.status === 'syncing' && `Syncing... Round ${syncState.currentRound + 1}`}
            {syncState.status === 'complete' && 'Sync Complete'}
            {syncState.status === 'error' && 'Sync Failed'}
          </span>
        </div>
        
        {syncState.status === 'syncing' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            className="h-7 text-xs"
          >
            Stop
          </Button>
        )}
        
        {syncState.status === 'complete' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSyncState(prev => ({ ...prev, status: 'idle' }))}
            className="h-7 text-xs"
          >
            Done
          </Button>
        )}
      </div>

      <Progress value={progressPercent} className="h-1.5" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Round</span>
          <span className="font-mono">{syncState.currentRound}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fills Fetched</span>
          <span className="font-mono">{syncState.totalFills.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Events Inserted</span>
          <span className="font-mono">{syncState.eventsInserted.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Volume</span>
          <span className="font-mono">${(syncState.totalVolume / 1000000).toFixed(2)}M</span>
        </div>
        {syncState.hasMore && syncState.status === 'syncing' && (
          <>
            <div className="flex justify-between col-span-2 pt-1 border-t border-border/30">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> More data available
              </span>
              <span className="font-mono text-primary">Continuing...</span>
            </div>
          </>
        )}
      </div>

      {syncState.status === 'syncing' && syncState.estimatedSecondsRemaining !== null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>~{syncState.estimatedSecondsRemaining}s per round</span>
          {autoSyncRef.current && (
            <span className="text-primary">• Auto-continuing until complete</span>
          )}
        </div>
      )}

      {syncState.status === 'error' && (
        <p className="text-xs text-destructive">{syncState.error}</p>
      )}
    </div>
  );
}
