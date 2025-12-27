/**
 * Domain Breakdown Cards - Shows HyperCore and HyperEVM breakdown
 * Now uses compact formatters for large values
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatTokenBalance } from '@/lib/formatters';
import { Activity, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import type { HypercoreState, HyperevmState } from '@/lib/wallet-aggregator';

interface DomainBreakdownProps {
  domains: { hypercore: boolean; hyperevm: boolean };
  hypercoreState: HypercoreState | null;
  hyperevmState: HyperevmState | null;
  compact?: boolean;
}

function HypercoreCard({ 
  state, 
  compact 
}: { 
  state: HypercoreState | null; 
  compact?: boolean;
}) {
  if (!state) return null;
  
  const hasPositions = state.positions.length > 0;
  const longCount = state.positions.filter(p => p.side === 'long').length;
  const shortCount = state.positions.filter(p => p.side === 'short').length;
  const totalUnrealizedPnl = state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  return (
    <div className={cn(
      "panel border-prediction/20 bg-prediction/5",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-prediction/20 flex items-center justify-center">
          <Activity className="w-3 h-3 text-prediction" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono text-prediction font-medium">
          HyperCore
        </span>
      </div>
      
      <div className={cn("space-y-2", compact && "space-y-1.5")}>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Account Value</span>
          <span className={cn(
            "font-mono font-semibold tabular-nums",
            compact ? "text-sm" : "text-base"
          )}>
            {formatUsd(state.accountValue)}
          </span>
        </div>
        
        {state.marginUsed > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Margin Used</span>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {formatUsd(state.marginUsed, true)}
            </span>
          </div>
        )}
        
        {hasPositions && (
          <>
            <div className="h-px bg-border/50 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Open Positions</span>
              <div className="flex items-center gap-2">
                {longCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-up font-mono">
                    <TrendingUp className="w-3 h-3" />
                    {longCount}L
                  </span>
                )}
                {shortCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-down font-mono">
                    <TrendingDown className="w-3 h-3" />
                    {shortCount}S
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Unrealized PnL</span>
              <span className={cn(
                "text-xs font-mono tabular-nums font-medium",
                totalUnrealizedPnl >= 0 ? "text-up" : "text-down"
              )}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUsd(totalUnrealizedPnl, true)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HyperevmCard({ 
  state, 
  compact 
}: { 
  state: HyperevmState | null; 
  compact?: boolean;
}) {
  if (!state) return null;
  
  return (
    <div className={cn(
      "panel border-perpetual/20 bg-perpetual/5",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-perpetual/20 flex items-center justify-center">
          <Layers className="w-3 h-3 text-perpetual" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono text-perpetual font-medium">
          HyperEVM
        </span>
      </div>
      
      <div className={cn("space-y-2", compact && "space-y-1.5")}>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Native HYPE</span>
          <div className="text-right">
            <span className={cn(
              "font-mono font-semibold tabular-nums block",
              compact ? "text-sm" : "text-base"
            )}>
              {formatTokenBalance(state.nativeBalance)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ≈ {formatUsd(state.nativeValueUsd)}
            </span>
          </div>
        </div>
        
        {state.tokens.length > 0 && (
          <>
            <div className="h-px bg-border/50 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ERC-20 Tokens</span>
              <span className="text-xs font-mono tabular-nums">
                {state.tokens.length} tokens
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DomainBreakdown({ 
  domains, 
  hypercoreState, 
  hyperevmState,
  compact = false
}: DomainBreakdownProps) {
  const hasBoth = domains.hypercore && domains.hyperevm;
  const hasNone = !domains.hypercore && !domains.hyperevm;
  
  // Don't render if no activity
  if (hasNone) {
    return null;
  }
  
  // Single domain - full width
  if (!hasBoth) {
    return (
      <div>
        {domains.hypercore && <HypercoreCard state={hypercoreState} compact={compact} />}
        {domains.hyperevm && <HyperevmCard state={hyperevmState} compact={compact} />}
      </div>
    );
  }
  
  // Both domains - side by side (compact)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <HypercoreCard state={hypercoreState} compact />
      <HyperevmCard state={hyperevmState} compact />
    </div>
  );
}
