
import React from 'react';
import { cn } from '@/lib/utils';
import { RiskAnalysisResult } from '@/lib/riskHelper';

interface RiskGaugeProps {
    analysis: RiskAnalysisResult;
    className?: string;
}

export function RiskGauge({ analysis, className }: RiskGaugeProps) {
    const { score, level } = analysis;

    // Angle calculations for a 180-degree semi-circle gauge
    // Score 0 = Red (Left) -> Score 100 = Green (Right)
    // 0% -> -90deg, 100% -> 90deg
    const rotation = (score / 100) * 180 - 180;

    const getColor = () => {
        if (score >= 85) return 'text-green-500';
        if (score >= 70) return 'text-yellow-500';
        if (score >= 50) return 'text-orange-500';
        return 'text-red-500';
    };

    const getBgColor = () => {
        if (score >= 85) return 'bg-green-500';
        if (score >= 70) return 'bg-yellow-500';
        if (score >= 50) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className={cn("relative flex flex-col items-center justify-center p-4", className)}>
            {/* Gauge Background Track */}
            <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-muted" />
            </div>

            {/* Rotating Needle/Fill (Simplified using visual CSS trick or SVG) */}
            {/* For simplicity/reliability in this stack, let's use an SVG approach */}
            <div className="absolute top-4">
                <svg width="128" height="64" viewBox="0 0 128 64" className="overflow-visible">
                    {/* Track */}
                    <path d="M 4 64 A 60 60 0 0 1 124 64" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" strokeLinecap="round" />

                    {/* Progress */}
                    <path
                        d="M 4 64 A 60 60 0 0 1 124 64"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className={cn("transition-all duration-1000 ease-out", getColor())}
                        strokeLinecap="round"
                        strokeDasharray="188.5" // approx length of arc r=60
                        strokeDashoffset={188.5 - (188.5 * score / 100)}
                    />
                </svg>
            </div>

            {/* Score Text */}
            <div className="flex flex-col items-center mt-[-10px] z-10">
                <span className={cn("text-3xl font-bold tabular-nums", getColor())}>
                    {score}
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {level}
                </span>
            </div>
        </div>
    );
}
