/**
 * Position History Timeline
 * Visual timeline of opened/closed positions with outcomes
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { usePositionHistory, type PositionHistoryItem } from '@/hooks/usePositionHistory';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react';

interface PositionHistoryTimelineProps {
  address: string;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function SkeletonItem() {
  return (
    <div className="flex gap-3">
      <div className="w-3 flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-muted/50 animate-pulse" />
        <div className="w-0.5 h-full bg-muted/30 animate-pulse" />
      </div>
      <div className="flex-1 pb-4">
        <div className="h-16 bg-muted/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

function TimelineItem({ position, isLast }: { position: PositionHistoryItem; isLast: boolean }) {
  const isPositive = position.pnl >= 0;
  
  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="w-3 flex flex-col items-center">
        <div className={cn(
          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
          isPositive ? "bg-up" : "bg-down"
        )} />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border/50" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-4">
        <div className={cn(
          "rounded border p-3 transition-colors hover:bg-muted/30",
          isPositive ? "border-up/20 bg-up/5" : "border-down/20 bg-down/5"
        )}>
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Link 
                to={`/explorer/market/${position.market}`}
                className="font-mono font-semibold text-sm hover:text-primary transition-colors"
              >
                {position.market}
              </Link>
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded",
                position.side === 'long' 
                  ? "bg-up/10 text-up" 
                  : "bg-down/10 text-down"
              )}>
                {position.side}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {position.leverage.toFixed(1)}x
              </span>
            </div>
            
            {/* PnL */}
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-up" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-down" />
              )}
              <span className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                isPositive ? "text-up" : "text-down"
              )}>
                {isPositive ? '+' : ''}{formatUsd(position.pnl)}
              </span>
              <span className={cn(
                "text-[10px] font-mono tabular-nums",
                isPositive ? "text-up/70" : "text-down/70"
              )}>
                ({isPositive ? '+' : ''}{position.pnlPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          {/* Details row */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums">
                ${position.entryPrice.toFixed(2)} <ArrowRight className="h-2.5 w-2.5 inline" /> ${position.exitPrice.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {position.duration}
              </span>
            </div>
            <span className="font-mono">
              {format(position.closeTime, 'MMM d, HH:mm')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PositionHistoryTimeline({ address }: PositionHistoryTimelineProps) {
  const { data, isLoading, isError } = usePositionHistory(address, 15);

  return (
    <div className="panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="panel-header mb-0">Position History</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
          Recent Trades
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </div>
        ) : isError || !data?.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              No closed positions yet
            </p>
          </div>
        ) : (
          <div>
            {data.map((position, index) => (
              <TimelineItem 
                key={position.id} 
                position={position} 
                isLast={index === data.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
