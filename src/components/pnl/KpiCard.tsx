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
        "panel transition-micro hover:border-foreground/20",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Label - muted, secondary */}
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            
            {/* Value - monospace, large, primary signal */}
            <p 
              className={cn(
                "mt-1.5 font-mono text-xl font-semibold tabular-nums",
                trend === 'profit' && "text-profit",
                trend === 'loss' && "text-loss",
                trend === 'neutral' && "text-foreground"
              )}
            >
              {typeof value === 'number' ? formatValue(value) : value}
            </p>
            
            {/* Subtitle - context */}
            {subtitle && (
              <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          {/* Icon - subtle */}
          <div 
            className={cn(
              "flex-shrink-0 rounded p-1.5",
              trend === 'profit' && "text-profit-3",
              trend === 'loss' && "text-destructive",
              trend === 'neutral' && "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
