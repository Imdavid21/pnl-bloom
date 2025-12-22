import { useState, useCallback, useRef, useEffect } from 'react';
import type { LoadingStage } from '@/lib/explorer/types';

export type LoadingStageType = LoadingStage['stage'];

interface LoadingStageConfig {
  stage: LoadingStageType;
  message: string;
  duration?: number; // ms, if undefined means manual transition
  source?: string;
}

const DEFAULT_STAGES: Record<string, LoadingStageConfig[]> = {
  wallet: [
    { stage: 'searching', message: 'Resolving wallet address...', duration: 400 },
    { stage: 'fetching', message: 'Fetching Hypercore positions...', duration: 600, source: 'Hypercore L1' },
    { stage: 'fetching', message: 'Fetching HyperEVM balances...', duration: 500, source: 'HyperEVM' },
    { stage: 'reconciling', message: 'Cross-referencing chains...', duration: 400 },
    { stage: 'computing', message: 'Computing analytics...', duration: 300 },
  ],
  tx: [
    { stage: 'searching', message: 'Locating transaction...', duration: 300 },
    { stage: 'fetching', message: 'Fetching transaction details...', duration: 500 },
    { stage: 'reconciling', message: 'Analyzing asset flows...', duration: 400 },
    { stage: 'computing', message: 'Computing deltas...', duration: 200 },
  ],
  block: [
    { stage: 'searching', message: 'Locating block...', duration: 300 },
    { stage: 'fetching', message: 'Fetching block data...', duration: 600 },
    { stage: 'computing', message: 'Processing transactions...', duration: 300 },
  ],
  token: [
    { stage: 'searching', message: 'Searching token registry...', duration: 400 },
    { stage: 'fetching', message: 'Fetching token data...', duration: 500 },
    { stage: 'computing', message: 'Computing market stats...', duration: 300 },
  ],
};

/**
 * Hook for managing multi-stage loading states with automatic progression
 * Provides a "slow but thorough" UX that builds trust through transparency
 */
export function useLoadingStages(entityType: keyof typeof DEFAULT_STAGES = 'wallet') {
  const [currentStage, setCurrentStage] = useState<LoadingStage>({ stage: 'ready', message: '' });
  const [stageIndex, setStageIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  
  const stages = DEFAULT_STAGES[entityType] || DEFAULT_STAGES.wallet;
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Start loading sequence
  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStageIndex(0);
    
    const runStage = (index: number) => {
      if (index >= stages.length) {
        setCurrentStage({ stage: 'ready', message: '' });
        isRunningRef.current = false;
        return;
      }
      
      const config = stages[index];
      const progress = Math.round(((index + 0.5) / stages.length) * 100);
      
      setCurrentStage({
        stage: config.stage,
        message: config.message,
        source: config.source,
        progress,
      });
      setStageIndex(index);
      
      if (config.duration) {
        timeoutRef.current = setTimeout(() => {
          runStage(index + 1);
        }, config.duration);
      }
    };
    
    runStage(0);
  }, [stages]);
  
  // Complete loading (jump to ready)
  const complete = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCurrentStage({ stage: 'ready', message: '' });
    isRunningRef.current = false;
  }, []);
  
  // Set error state
  const setError = useCallback((message: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCurrentStage({ stage: 'error', message });
    isRunningRef.current = false;
  }, []);
  
  // Manual stage advance (for stages without duration)
  const advance = useCallback(() => {
    const nextIndex = stageIndex + 1;
    if (nextIndex >= stages.length) {
      complete();
    } else {
      const config = stages[nextIndex];
      const progress = Math.round(((nextIndex + 0.5) / stages.length) * 100);
      
      setCurrentStage({
        stage: config.stage,
        message: config.message,
        source: config.source,
        progress,
      });
      setStageIndex(nextIndex);
    }
  }, [stageIndex, stages, complete]);
  
  // Update message while keeping current stage
  const updateMessage = useCallback((message: string, source?: string) => {
    setCurrentStage(prev => ({
      ...prev,
      message,
      source: source ?? prev.source,
    }));
  }, []);
  
  return {
    stage: currentStage,
    isLoading: currentStage.stage !== 'ready' && currentStage.stage !== 'error',
    isError: currentStage.stage === 'error',
    start,
    complete,
    setError,
    advance,
    updateMessage,
  };
}
