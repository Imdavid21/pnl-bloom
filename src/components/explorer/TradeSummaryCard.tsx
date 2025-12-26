/**
 * Trade Summary Card
 * Hero card showing trade action and PnL
 */

import { TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeSummaryCardProps {
  eventType: string;
  market: string;
  side: 'long' | 'short' | null;
  size: number;
  execPrice: number;
  realizedPnl: number | null;
  fundingUsd: number | null;
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(decimals);
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${formatNumber(value, 0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export function TradeSummaryCard({
  eventType,
  market,
  side,
  size,
  execPrice,
  realizedPnl,
  fundingUsd,
}: TradeSummaryCardProps) {
  const isFunding = eventType === 'PERP_FUNDING';
  const isTrade = eventType === 'PERP_FILL';
  const isLong = side === 'long';
  const hasRealized = realizedPnl !== null && realizedPnl !== 0;

  // Determine action text
  let actionText = '';
  let actionIcon = <DollarSign className="h-8 w-8" />;
  
  if (isFunding) {
    const fundingAmount = fundingUsd || 0;
    actionText = fundingAmount >= 0 
      ? `Received funding on ${market}` 
      : `Paid funding on ${market}`;
    actionIcon = <Zap className="h-8 w-8" />;
  } else if (isTrade) {
    if (hasRealized) {
      actionText = `Closed ${formatNumber(size)} ${market} ${side || 'position'}`;
    } else {
      actionText = `Opened ${formatNumber(size)} ${market} ${side || 'position'}`;
    }
    actionIcon = isLong ? <TrendingUp className="h-8 w-8" /> : <TrendingDown className="h-8 w-8" />;
  } else {
    actionText = `${eventType} on ${market}`;
  }

  // Background color based on event type
  const bgClass = isFunding
    ? 'bg-purple-500/10 border-purple-500/20'
    : isLong
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : 'bg-red-500/10 border-red-500/20';

  const iconClass = isFunding
    ? 'text-purple-500'
    : isLong
    ? 'text-emerald-500'
    : 'text-red-500';

  return (
    <div className={cn(
      'rounded-xl border p-6 md:p-8 text-center space-y-4',
      bgClass
    )}>
      {/* Icon */}
      <div className={cn('flex justify-center', iconClass)}>
        {actionIcon}
      </div>

      {/* Action Text */}
      <h2 className="text-xl md:text-2xl font-semibold uppercase tracking-wide">
        {actionText}
      </h2>

      {/* Price */}
      {execPrice > 0 && !isFunding && (
        <p className="text-lg text-muted-foreground">
          at {formatPrice(execPrice)}
        </p>
      )}

      {/* PnL (if closing trade) */}
      {hasRealized && (
        <div className={cn(
          'text-3xl md:text-4xl font-bold pt-2',
          realizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
        )}>
          {realizedPnl >= 0 ? '+' : ''}${formatNumber(Math.abs(realizedPnl))}
        </div>
      )}

      {/* Funding amount */}
      {isFunding && fundingUsd !== null && (
        <div className={cn(
          'text-2xl md:text-3xl font-bold',
          fundingUsd >= 0 ? 'text-emerald-500' : 'text-red-500'
        )}>
          {fundingUsd >= 0 ? '+' : ''}${Math.abs(fundingUsd).toFixed(4)}
        </div>
      )}
    </div>
  );
}
