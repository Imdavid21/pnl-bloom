/**
 * Wallet Hero - Total Net Worth with subtle domain breakdown and PnL timeframe selector
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/formatters';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type PnlTimeframe = '7d' | '30d' | 'ytd' | 'all';

interface WalletHeroProps {
  totalValue: number;
  hypercoreValue?: number;
  hyperevmValue?: number;
  pnl: number;
  pnlPercent: number;
  pnlTimeframe?: PnlTimeframe;
  onTimeframeChange?: (timeframe: PnlTimeframe) => void;
  domains: { hypercore: boolean; hyperevm: boolean };
  firstSeen: Date | null;
  lastActive: Date | null;
}

const TIMEFRAME_LABELS: Record<PnlTimeframe, string> = {
  '7d': '7D',
  '30d': '30D',
  'ytd': 'YTD',
  'all': 'All Time',
};

export function WalletHero({
  totalValue,
  hypercoreValue = 0,
  hyperevmValue = 0,
  pnl,
  pnlPercent,
  pnlTimeframe = 'ytd',
  onTimeframeChange,
  domains,
  firstSeen,
  lastActive,
}: WalletHeroProps) {
  const isPositive = pnl >= 0;
  const showBreakdown = domains.hypercore && domains.hyperevm && (hypercoreValue > 0 || hyperevmValue > 0);

  return (
    <div className="panel p-4 sm:p-6 space-y-3">
      {/* Domain badges */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {domains.hypercore && (
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-medium bg-prediction/10 text-prediction border border-prediction/20 rounded">
            HyperCore
          </span>
        )}
        {domains.hyperevm && (
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-medium bg-perpetual/10 text-perpetual border border-perpetual/20 rounded">
            HyperEVM
          </span>
        )}
      </div>

      {/* Total Net Worth */}
      <div className="text-center space-y-1">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
          Total Net Worth
        </p>
        <p className="text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums text-foreground">
          {formatUsd(totalValue)}
        </p>
        
        {/* Subtle breakdown - only when both domains have value */}
        {showBreakdown && (
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-prediction/50" />
              Core: {formatUsd(hypercoreValue, true)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-perpetual/50" />
              EVM: {formatUsd(hyperevmValue, true)}
            </span>
          </div>
        )}
        
        {/* PnL Display with Timeframe Selector */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-medium",
            isPositive 
              ? "bg-up/10 text-up border border-up/20" 
              : "bg-down/10 text-down border border-down/20"
          )}>
            <span className="tabular-nums">
              {isPositive ? '+' : ''}{formatUsd(pnl, true)}
            </span>
            <span className="text-[9px] opacity-70">
              ({formatPercent(pnlPercent)})
            </span>
          </div>
          
          {/* Timeframe Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
              {TIMEFRAME_LABELS[pnlTimeframe]}
              <ChevronDown className="h-2.5 w-2.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[80px]">
              {(Object.entries(TIMEFRAME_LABELS) as [PnlTimeframe, string][]).map(([key, label]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => onTimeframeChange?.(key)}
                  className={cn(
                    "text-xs font-mono",
                    pnlTimeframe === key && "bg-primary/10 text-primary"
                  )}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Activity timestamps */}
      {(firstSeen || lastActive) && (
        <p className="text-[9px] text-center text-muted-foreground/50 font-mono">
          {firstSeen && (
            <span>First seen {formatDistanceToNow(firstSeen, { addSuffix: true })}</span>
          )}
          {firstSeen && lastActive && <span className="mx-1.5 opacity-30">|</span>}
          {lastActive && (
            <span>Active {formatDistanceToNow(lastActive, { addSuffix: true })}</span>
          )}
        </p>
      )}
    </div>
  );
}
