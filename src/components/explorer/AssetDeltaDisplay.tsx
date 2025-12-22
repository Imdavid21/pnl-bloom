import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetDelta } from '@/lib/explorer/types';

interface AssetDeltaDisplayProps {
  deltas: AssetDelta[];
  compact?: boolean;
  className?: string;
}

export function AssetDeltaDisplay({ deltas, compact = false, className }: AssetDeltaDisplayProps) {
  if (deltas.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        No asset changes
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {deltas.map((delta, idx) => (
        <DeltaRow key={`${delta.asset}-${idx}`} delta={delta} compact={compact} />
      ))}
    </div>
  );
}

function DeltaRow({ delta, compact }: { delta: AssetDelta; compact: boolean }) {
  const { symbol, before, after, delta: change, deltaUsd, direction, chain } = delta;
  
  const isPositive = direction === 'in';
  const isNeutral = direction === 'neutral';
  
  // Safe parse that handles placeholders like '—', '?', empty strings, and NaN
  const safeParse = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str || str === '—' || str === '-' || str === '?' || str === 'NaN') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };
  
  const absChange = Math.abs(safeParse(change));
  
  // Format value based on magnitude, with NaN protection
  const formatValue = (val: string | number | undefined | null): string => {
    const num = safeParse(val);
    if (num === 0 && (val === '—' || val === '?' || val === undefined || val === null)) {
      return '—';
    }
    if (Math.abs(num) >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    if (Math.abs(num) >= 1) {
      return num.toFixed(2);
    }
    if (Math.abs(num) >= 0.0001) {
      return num.toFixed(4);
    }
    if (num === 0) {
      return '0';
    }
    return num.toFixed(8);
  };
  
  // Check if USD value is valid and displayable
  const hasValidUsdValue = deltaUsd !== undefined && deltaUsd !== null && 
    deltaUsd !== '—' && deltaUsd !== '?' && !isNaN(safeParse(deltaUsd)) && safeParse(deltaUsd) !== 0;
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <DirectionIcon direction={direction} size="sm" />
        <span className={cn(
          "font-mono font-medium",
          isPositive && "text-profit-3",
          !isPositive && !isNeutral && "text-loss-3",
          isNeutral && "text-muted-foreground"
        )}>
          {absChange === 0 ? '—' : `${isPositive ? '+' : isNeutral ? '' : '-'}${formatValue(absChange)} ${symbol}`}
        </span>
        {hasValidUsdValue && (
          <span className="text-muted-foreground">
            (${formatValue(Math.abs(safeParse(deltaUsd)))})
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-3">
        <DirectionIcon direction={direction} size="md" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{symbol}</span>
            {chain !== 'unknown' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {chain === 'hyperevm' ? 'HyperEVM' : chain === 'hypercore' ? 'Hypercore' : chain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{formatValue(before)}</span>
            <span>→</span>
            <span>{formatValue(after)}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className={cn(
          "text-sm font-mono font-medium",
          isPositive && "text-profit-3",
          !isPositive && !isNeutral && "text-loss-3",
          isNeutral && "text-muted-foreground"
        )}>
          {absChange === 0 ? '—' : `${isPositive ? '+' : isNeutral ? '' : '-'}${formatValue(absChange)}`}
        </div>
        {hasValidUsdValue && (
          <div className={cn(
            "text-xs",
            isPositive && "text-profit-3/70",
            !isPositive && !isNeutral && "text-loss-3/70",
            isNeutral && "text-muted-foreground"
          )}>
            {isPositive ? '+' : '-'}${formatValue(Math.abs(safeParse(deltaUsd)))}
          </div>
        )}
      </div>
    </div>
  );
}

function DirectionIcon({ direction, size }: { direction: 'in' | 'out' | 'neutral'; size: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const bgClasses = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';
  
  if (size === 'sm') {
    if (direction === 'in') {
      return <ArrowUp className={cn(sizeClasses, "text-profit-3")} />;
    }
    if (direction === 'out') {
      return <ArrowDown className={cn(sizeClasses, "text-loss-3")} />;
    }
    return <Minus className={cn(sizeClasses, "text-muted-foreground")} />;
  }
  
  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center",
      bgClasses,
      direction === 'in' && "bg-profit-3/20",
      direction === 'out' && "bg-loss-3/20",
      direction === 'neutral' && "bg-muted"
    )}>
      {direction === 'in' && <ArrowUp className={cn(sizeClasses, "text-profit-3")} />}
      {direction === 'out' && <ArrowDown className={cn(sizeClasses, "text-loss-3")} />}
      {direction === 'neutral' && <Minus className={cn(sizeClasses, "text-muted-foreground")} />}
    </div>
  );
}

// Summary version for transaction headers
export function AssetDeltaSummary({ deltas }: { deltas: AssetDelta[] }) {
  if (deltas.length === 0) return null;
  
  const incoming = deltas.filter(d => d.direction === 'in');
  const outgoing = deltas.filter(d => d.direction === 'out');
  
  // Safe parse helper
  const safeParse = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str || str === '—' || str === '-' || str === '?' || str === 'NaN') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };
  
  const formatDeltaAmount = (d: AssetDelta) => {
    const val = safeParse(d.delta);
    if (val === 0) return `— ${d.symbol}`;
    return `${Math.abs(val).toFixed(4)} ${d.symbol}`;
  };
  
  return (
    <div className="flex items-center gap-4 text-sm">
      {outgoing.length > 0 && (
        <div className="flex items-center gap-1 text-loss-3">
          <ArrowDown className="h-4 w-4" />
          <span className="font-medium">
            {outgoing.map(formatDeltaAmount).join(', ')}
          </span>
        </div>
      )}
      {incoming.length > 0 && outgoing.length > 0 && (
        <span className="text-muted-foreground">→</span>
      )}
      {incoming.length > 0 && (
        <div className="flex items-center gap-1 text-profit-3">
          <ArrowUp className="h-4 w-4" />
          <span className="font-medium">
            {incoming.map(formatDeltaAmount).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
