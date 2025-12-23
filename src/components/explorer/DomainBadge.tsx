import { cn } from '@/lib/utils';
import { getDomainLabel, getDomainBadgeClasses, type ResolveResult } from '@/hooks/useUnifiedResolver';

interface DomainBadgeProps {
  domain: ResolveResult['domain'];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Domain badge component - displays which chain(s) the entity belongs to
 * Used in detail pages to indicate "This activity occurred on X"
 */
export function DomainBadge({ domain, size = 'sm', className }: DomainBadgeProps) {
  const label = getDomainLabel(domain);
  if (!label) return null;
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-3 py-1 text-xs';
  
  return (
    <span className={cn(
      "inline-flex items-center rounded font-medium",
      getDomainBadgeClasses(domain),
      sizeClasses,
      className
    )}>
      {label}
    </span>
  );
}

interface DomainIndicatorProps {
  domain: ResolveResult['domain'];
  className?: string;
}

/**
 * Domain indicator - shows "This activity occurred on X" message
 */
export function DomainIndicator({ domain, className }: DomainIndicatorProps) {
  const label = getDomainLabel(domain);
  if (!label || domain === 'unknown') return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground",
      className
    )}>
      <span>This activity occurred on</span>
      <DomainBadge domain={domain} size="sm" />
    </div>
  );
}

interface DomainSectionProps {
  title: string;
  domain: 'hyperevm' | 'hypercore';
  children: React.ReactNode;
  className?: string;
  isEmpty?: boolean;
}

/**
 * Domain section wrapper - for unified wallet views with separate EVM/Core sections
 */
export function DomainSection({ title, domain, children, className, isEmpty }: DomainSectionProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/50", className)}>
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <DomainBadge domain={domain} size="sm" />
      </div>
      <div className="p-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity on {getDomainLabel(domain)}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
