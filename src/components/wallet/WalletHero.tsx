/**
 * Wallet Hero - Terminal style hero section
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/wallet-aggregator';
import { useUnifiedPositions } from '@/hooks/useUnifiedPositions';
import { useAssetDistribution } from '@/hooks/useAssetDistribution';
import { formatDistanceToNow } from 'date-fns';

interface WalletHeroProps {
  totalValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  domains: { hypercore: boolean; hyperevm: boolean };
  firstSeen: Date | null;
  lastActive: Date | null;
  address: string;
}

export function WalletHero({
  totalValue,
  pnl30d,
  pnlPercent30d,
  domains,
  firstSeen,
  lastActive,
  address,
}: WalletHeroProps) {
  const isPositive = pnl30d >= 0;
  const { data: positions } = useUnifiedPositions(address);
  const { segments } = useAssetDistribution(positions);

  const handleSegmentClick = (key: string) => {
    const sectionMap: Record<string, string> = {
      perps: 'perp-positions',
      spot: 'spot-balances',
      lending: 'lending-positions',
      lp: 'lp-positions',
    };
    const sectionId = sectionMap[key];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

      {/* Total Value */}
      <div className="text-center space-y-2">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
          Portfolio Value
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

      {/* Asset Distribution Bar */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <div className="h-1 w-full rounded-full bg-muted/30 flex overflow-hidden">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="h-full transition-opacity hover:opacity-80"
                style={{ 
                  width: `${segment.percentage}%`, 
                  backgroundColor: segment.color,
                  minWidth: segment.percentage > 0 ? '2px' : '0'
                }}
                title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3">
            {segments.map((segment) => (
              <button
                key={segment.key}
                onClick={() => handleSegmentClick(segment.key)}
                className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span 
                  className="w-1.5 h-1.5 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="tabular-nums font-mono">{segment.percentage.toFixed(0)}%</span>
                <span className="uppercase tracking-wider">{segment.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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