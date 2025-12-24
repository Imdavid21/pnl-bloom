
import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateAccountHealth } from '@/lib/riskHelper';
import { RiskGauge } from './RiskGauge';

interface RiskAnalysisProps {
    positions: any[]; // Using any temporarily for loose coupling, ideally strictly typed shared interface
    accountValue: number;
    className?: string;
}

export function RiskAnalysis({ positions, accountValue, className }: RiskAnalysisProps) {
    const analysis = useMemo(() => {
        return calculateAccountHealth(positions, accountValue);
    }, [positions, accountValue]);

    return (
        <div className={cn("rounded-xl border border-border bg-card shadow-sm p-4", className)}>
            <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-foreground">Risk Health</h3>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
                <RiskGauge analysis={analysis} className="flex-shrink-0" />

                <div className="flex-1 space-y-3 w-full">
                    {analysis.factors.length === 0 ? (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Excellent Condition</p>
                                <p className="text-xs opacity-90">No significant risk factors detected. Leverage and concentration are within safe limits.</p>
                            </div>
                        </div>
                    ) : (
                        analysis.factors.map(factor => (
                            <div
                                key={factor.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg text-sm transition-all",
                                    factor.severity === 'high' ? "bg-red-500/10 text-red-700 dark:text-red-300" :
                                        factor.severity === 'medium' ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" :
                                            "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                )}
                            >
                                <AlertTriangle className={cn(
                                    "w-4 h-4 flex-shrink-0 mt-0.5",
                                    factor.severity === 'high' && "animate-pulse"
                                )} />
                                <div>
                                    <p className="font-medium">{factor.title}</p>
                                    <p className="text-xs opacity-90">{factor.description}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
