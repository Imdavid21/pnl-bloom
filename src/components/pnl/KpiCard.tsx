import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'profit' | 'loss' | 'neutral';
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend = 'neutral', className }: KpiCardProps) {
  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    if (absVal >= 1000000) {
      return `${val >= 0 ? '' : '-'}$${(absVal / 1000000).toFixed(2)}M`;
    }
    if (absVal >= 1000) {
      return `${val >= 0 ? '' : '-'}$${(absVal / 1000).toFixed(1)}k`;
    }
    return `${val >= 0 ? '' : '-'}$${absVal.toFixed(0)}`;
  };

  return (
    <div 
      className={cn(
        "border border-border rounded bg-card",
        "transition-colors duration-150 hover:border-foreground/20",
        className
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Label */}
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            
            {/* Value */}
            <p 
              className={cn(
                "mt-1 font-mono text-base font-semibold tabular-nums",
                trend === 'profit' && "text-profit-3",
                trend === 'loss' && "text-loss-3",
                trend === 'neutral' && "text-foreground"
              )}
            >
              {typeof value === 'number' ? formatValue(value) : value}
            </p>
            
            {/* Subtitle */}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          {/* Icon */}
          <Icon 
            className={cn(
              "h-4 w-4 flex-shrink-0",
              trend === 'profit' && "text-profit-3",
              trend === 'loss' && "text-loss-3",
              trend === 'neutral' && "text-muted-foreground"
            )} 
          />
        </div>
      </div>
    </div>
  );
}
