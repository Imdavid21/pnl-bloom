/**
 * Wallet Hero - Clean minimal hero section
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-5">
        {/* Domain badges */}
        <div className="flex items-center justify-center gap-2">
          {domains.hypercore && (
            <Badge variant="secondary" className="text-xs font-normal">
              HyperCore
            </Badge>
          )}
          {domains.hyperevm && (
            <Badge variant="secondary" className="text-xs font-normal">
              HyperEVM
            </Badge>
          )}
        </div>

        {/* Total Value */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Portfolio Value
          </p>
          <p className="text-4xl font-bold tracking-tight tabular-nums">
            {formatUsd(totalValue)}
          </p>
          
          {/* PnL Badge */}
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
            isPositive 
              ? "bg-green-500/10 text-green-500" 
              : "bg-red-500/10 text-red-500"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="tabular-nums">
              {isPositive ? '+' : ''}{formatUsd(pnl30d)} ({formatPercent(pnlPercent30d)})
            </span>
            <span className="text-muted-foreground">30d</span>
          </div>
        </div>

        {/* Asset Distribution */}
        {segments.length > 0 && (
          <div className="space-y-3">
            {/* Bar */}
            <div className="h-1.5 w-full rounded-full bg-muted flex overflow-hidden">
              {segments.map((segment) => (
                <button
                  key={segment.key}
                  onClick={() => handleSegmentClick(segment.key)}
                  className="h-full transition-opacity hover:opacity-80"
                  style={{ 
                    width: `${segment.percentage}%`, 
                    backgroundColor: segment.color,
                    minWidth: segment.percentage > 0 ? '3px' : '0'
                  }}
                  title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4">
              {segments.map((segment) => (
                <button
                  key={segment.key}
                  onClick={() => handleSegmentClick(segment.key)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="tabular-nums font-medium">{segment.percentage.toFixed(0)}%</span>
                  <span>{segment.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity timestamps */}
        {(firstSeen || lastActive) && (
          <p className="text-xs text-center text-muted-foreground">
            {firstSeen && (
              <span>First seen {formatDistanceToNow(firstSeen, { addSuffix: true })}</span>
            )}
            {firstSeen && lastActive && <span className="mx-2">•</span>}
            {lastActive && (
              <span>Active {formatDistanceToNow(lastActive, { addSuffix: true })}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
