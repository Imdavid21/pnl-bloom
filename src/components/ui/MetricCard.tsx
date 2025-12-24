
import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { MetricConfig } from '@/config/metrics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    value: number;
    config: MetricConfig;
    className?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ value, config, className, trend }: MetricCardProps) {
    const formattedValue = config.format(value);
    const isBenchmarkPass = config.benchmark ? value >= config.benchmark : null;

    return (
        <div className={cn("p-4 rounded-lg bg-card border border-border shadow-sm flex flex-col gap-1", className)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {config.label}
                </span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                            {config.benchmark !== undefined && (
                                <div className="mt-2 pt-2 border-t text-xs">
                                    <span className="text-muted-foreground">Benchmark: </span>
                                    <span className="font-mono">{config.format(config.benchmark)}</span>
                                </div>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
                <span className={cn(
                    "text-2xl font-bold tracking-tight",
                    trend === 'up' && "text-green-500",
                    trend === 'down' && "text-red-500"
                )}>
                    {formattedValue}
                </span>
            </div>

            {config.benchmark !== undefined && (
                <div className="flex items-center gap-1.5 mt-2">
                    <div className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        isBenchmarkPass ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                    )}>
                        {isBenchmarkPass ? 'Good' : 'Below Avg'}
                    </div>
                </div>
            )}
        </div>
    );
}
