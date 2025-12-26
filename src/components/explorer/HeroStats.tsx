/**
 * Hero Stats Component
 * Shows total account value prominently with 30d change
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUsd, formatPercent } from '@/lib/wallet-aggregator';
import { Skeleton } from '@/components/ui/skeleton';

interface HeroStatsProps {
  totalValue: number;
  pnl30d: number;
  pnlPercent30d: number;
  isLoading?: boolean;
}

export function HeroStats({ 
  totalValue, 
  pnl30d, 
  pnlPercent30d,
  isLoading = false,
}: HeroStatsProps) {
  const isPositive = pnl30d >= 0;
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-7 w-40" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      {/* Total Value - Hero */}
      <span className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
        {formatUsd(totalValue)}
      </span>
      
      {/* 30d Change */}
      <div className={cn(
        "flex items-center gap-1.5 text-lg md:text-xl font-medium",
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      )}>
        {isPositive ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        )}
        <span>
          {isPositive ? '+' : ''}{formatUsd(pnl30d)} ({formatPercent(pnlPercent30d)})
        </span>
      </div>
    </div>
  );
}
