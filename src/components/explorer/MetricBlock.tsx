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

// Check if value is a placeholder
function isPlaceholder(value: string): boolean {
  return /^[\$@\(\)]*[-]+[\.\-\,\s\w]*$/.test(value) || value.includes('--');
}

// Animated value - minimal transition
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
      
      const timeout = setTimeout(() => setIsUpdating(false), 150);
      return () => clearTimeout(timeout);
    } else if (!isPlaceholder(value)) {
      setDisplayValue(value);
    } else if (isPlaceholder(prevRef.current)) {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <span 
      className={cn(
        "transition-opacity duration-150",
        isUpdating && "text-foreground",
        placeholder && "animate-pulse text-muted-foreground",
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
      <div className={cn("flex items-start gap-3 py-3 border-b border-border last:border-0", className)}>
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-3 py-3 border-b border-border last:border-0",
      className
    )}>
      {/* Icon */}
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.5} />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
        {/* Label */}
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>

        {/* Values */}
        <div className="flex items-baseline gap-2">
          <AnimatedValue 
            value={primaryValue}
            className="text-sm font-medium font-mono tabular-nums text-foreground"
          />
          
          {/* Delta */}
          {delta && (
            <span className={cn(
              "text-[11px] font-medium tabular-nums",
              delta.value >= 0 ? "text-profit-3" : "text-loss-3"
            )}>
              {delta.value >= 0 ? '+' : ''}{delta.formatted}
            </span>
          )}

          {/* Secondary value */}
          {secondaryValue && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {secondaryValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
