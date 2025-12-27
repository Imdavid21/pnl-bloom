/**
 * Wallet Hero - Terminal style hero section
 */

import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/wallet-aggregator';
import { formatDistanceToNow } from 'date-fns';

interface WalletHeroProps {
  totalValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  domains: { hypercore: boolean; hyperevm: boolean };
  firstSeen: Date | null;
  lastActive: Date | null;
}

export function WalletHero({
  totalValue,
  pnl30d,
  pnlPercent30d,
  domains,
  firstSeen,
  lastActive,
}: WalletHeroProps) {
  const isPositive = pnl30d >= 0;

  return (
    <div className="panel p-4 sm:p-6 space-y-4">
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
      <div className="text-center space-y-2">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
          Total Net Worth
        </p>
        <p className="text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums text-foreground">
          {formatUsd(totalValue)}
        </p>
        
        {/* PnL Display */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-medium",
          isPositive 
            ? "bg-up/10 text-up border border-up/20" 
            : "bg-down/10 text-down border border-down/20"
        )}>
          <span className="tabular-nums">
            {isPositive ? '+' : ''}{formatUsd(pnl30d)}
          </span>
          <span className="text-[9px] opacity-70">
            ({formatPercent(pnlPercent30d)})
          </span>
          <span className="text-[9px] opacity-50 uppercase">30d</span>
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