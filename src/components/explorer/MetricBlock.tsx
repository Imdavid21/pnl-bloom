import { ReactNode, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricBlockProps {
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  icon: LucideIcon;
  delta?: {
    value: number;
    formatted: string;
  };
  className?: string;
  isLoading?: boolean;
}

// Check if value is a placeholder (contains dashes as placeholders)
function isPlaceholder(value: string): boolean {
  return /^[\$@\(\)]*[-]+[\.\-\,\s\w]*$/.test(value) || value.includes('--');
}

// Animated value that preserves previous state
function AnimatedValue({ 
  value, 
  className 
}: { 
  value: string; 
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);
  const prevRef = useRef(value);
  const placeholder = isPlaceholder(value);

  useEffect(() => {
    if (value !== prevRef.current && !isPlaceholder(value)) {
      setIsUpdating(true);
      setDisplayValue(value);
      prevRef.current = value;
      
      const timeout = setTimeout(() => setIsUpdating(false), 400);
      return () => clearTimeout(timeout);
    } else if (!isPlaceholder(value)) {
      setDisplayValue(value);
    } else if (isPlaceholder(prevRef.current)) {
      // Both are placeholders, update display
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <span 
      className={cn(
        "transition-all duration-400 ease-out",
        isUpdating && "text-foreground",
        placeholder && "animate-pulse text-muted-foreground/40",
        className
      )}
    >
      {displayValue || '-'}
    </span>
  );
}

export function MetricBlock({
  label,
  primaryValue,
  secondaryValue,
  icon: Icon,
  delta,
  className,
  isLoading = false,
}: MetricBlockProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-start gap-3.5 p-4", className)}>
        <div className="p-2.5 rounded-xl bg-muted/30 animate-pulse">
          <div className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
          <div className="h-6 w-28 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "group flex items-start gap-3.5 p-4",
        "transition-all duration-300 ease-out",
        "hover:bg-muted/5 rounded-xl",
        className
      )}
    >
      {/* Icon container */}
      <div className={cn(
        "p-2.5 rounded-xl",
        "bg-muted/10 border border-border/30",
        "transition-all duration-300",
        "group-hover:bg-muted/15 group-hover:border-border/50"
      )}>
        <Icon className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Label */}
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>

        {/* Primary value */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <AnimatedValue 
            value={primaryValue}
            className="text-xl font-semibold text-foreground tabular-nums tracking-tight"
          />
          
          {/* Delta badge */}
          {delta && (
            <span className={cn(
              "text-xs font-medium tabular-nums px-1.5 py-0.5 rounded",
              delta.value >= 0 
                ? "text-profit-3 bg-profit-3/10" 
                : "text-loss-3 bg-loss-3/10"
            )}>
              {delta.value >= 0 ? '+' : ''}{delta.formatted}
            </span>
          )}
        </div>

        {/* Secondary value */}
        {secondaryValue && (
          <p className="text-sm text-muted-foreground/50 tabular-nums">
            {secondaryValue}
          </p>
        )}
      </div>
    </div>
  );
}
