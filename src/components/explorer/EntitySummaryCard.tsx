import { Copy, Check, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EntitySummaryCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  statusBadge?: {
    label: string;
    variant: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  };
  chainBadge?: 'hyperevm' | 'hypercore';
  copyValue?: string;
  externalUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EntitySummaryCard({
  title,
  subtitle,
  icon,
  statusBadge,
  chainBadge,
  copyValue,
  externalUrl,
  children,
  className,
}: EntitySummaryCardProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (copyValue) {
      navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const badgeColors = {
    success: 'bg-profit-3/20 text-profit-3',
    error: 'bg-loss-3/20 text-loss-3',
    warning: 'bg-warning/20 text-warning',
    info: 'bg-info/20 text-info',
    neutral: 'bg-muted text-muted-foreground',
  };
  
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card/50 p-5",
      className
    )}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        
        {/* Title area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground truncate">
              {title}
            </h1>
            
            {statusBadge && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                badgeColors[statusBadge.variant]
              )}>
                {statusBadge.label}
              </span>
            )}
            
            {chainBadge && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                chainBadge === 'hyperevm'
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-primary/20 text-primary"
              )}>
                {chainBadge === 'hyperevm' ? 'HyperEVM' : 'Hypercore'}
              </span>
            )}
          </div>
          
          {subtitle && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono truncate">
                {subtitle}
              </span>
              
              {copyValue && (
                <button
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-profit-3" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Additional content */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Stat item for summary cards
interface StatItemProps {
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function StatItem({ label, value, change, prefix, suffix, className }: StatItemProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = change && change > 0;
  
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-foreground">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
        {hasChange && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-profit-3" : "text-loss-3"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Row of stats
export function StatsRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-4",
      className
    )}>
      {children}
    </div>
  );
}
