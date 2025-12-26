/**
 * Event Badge Component
 * Minimal colored pill showing event type
 */

import { cn } from '@/lib/utils';
import type { BadgeVariant } from '@/lib/format-activity';

interface EventBadgeProps {
  label: string;
  variant: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  trade: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  funding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  fee: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  transfer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  swap: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  lending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function EventBadge({ label, variant, size = 'md' }: EventBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center font-medium rounded-full",
      variantStyles[variant],
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
    )}>
      {label}
    </span>
  );
}

// Tiny domain badge (HC / EVM)
interface DomainBadgeProps {
  domain: 'hypercore' | 'hyperevm';
}

export function DomainBadge({ domain }: DomainBadgeProps) {
  const label = domain === 'hypercore' ? 'HC' : 'EVM';
  
  return (
    <span className="inline-flex items-center px-1 py-0.5 text-[10px] font-medium rounded bg-muted/50 text-muted-foreground/70">
      {label}
    </span>
  );
}
