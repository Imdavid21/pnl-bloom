
import React from 'react';
import { cn } from '@/lib/utils';

interface WinLossChartProps {
    wins: number;
    losses: number;
    breakeven: number;
    total: number;
    className?: string;
}

export function WinLossChart({ wins, losses, breakeven, total, className }: WinLossChartProps) {
    if (total === 0) return null;

    const winPct = (wins / total) * 100;
    const lossPct = (losses / total) * 100;
    const bePct = (breakeven / total) * 100;

    return (
        <div className={cn("flex flex-col gap-2 w-full", className)}>
            {/* Bar */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/30">
                <div
                    className="bg-green-500 hover:bg-green-600 transition-all"
                    style={{ width: `${winPct}%` }}
                    title={`${wins} Wins`}
                />
                <div
                    className="bg-gray-400/50 hover:bg-gray-400 transition-all"
                    style={{ width: `${bePct}%` }}
                    title={`${breakeven} Break-even`}
                />
                <div
                    className="bg-red-500 hover:bg-red-600 transition-all"
                    style={{ width: `${lossPct}%` }}
                    title={`${losses} Losses`}
                />
            </div>

            {/* Legend */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>{wins} Wins ({winPct.toFixed(0)}%)</span>
                </div>
                {(breakeven > 0) && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span>{breakeven} BE</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>{losses} Losses ({lossPct.toFixed(0)}%)</span>
                </div>
            </div>
        </div>
    );
}
