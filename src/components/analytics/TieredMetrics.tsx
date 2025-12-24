
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { MetricCard } from '@/components/ui/MetricCard';
import { METRIC_GROUPS, ALL_METRICS, MetricConfig } from '@/config/metrics';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { AnalyticsSummary, ClosedTrade } from '@/hooks/useAnalytics';
import { WinRateConfig, WinRateSettings } from './WinRateConfig';
import { WinLossChart } from './WinLossChart';

interface TieredMetricsProps {
    summary: AnalyticsSummary;
    closedTrades?: ClosedTrade[];
    className?: string;
}

export function TieredMetrics({ summary, closedTrades = [], className }: TieredMetricsProps) {
    const [showTier2, setShowTier2] = useState(false);
    const [showExpert, setShowExpert] = useState(() => {
        return localStorage.getItem('pnl_expert_mode') === 'true';
    });

    // Win Rate Settings State
    const [winRateSettings, setWinRateSettings] = useState<WinRateSettings>({
        includeFees: true,
        minPnlThreshold: 0
    });

    // Recalculate Win Rate Logic
    const winRateStats = useMemo(() => {
        if (!closedTrades || closedTrades.length === 0) {
            return {
                winRate: summary.win_rate,
                wins: 0,
                losses: 0,
                breakeven: 0,
                total: 0
            };
        }

        let wins = 0;
        let losses = 0;
        let breakeven = 0;

        // Filter relevant trades based on threshold
        const relevantTrades = closedTrades.filter(t => {
            const pnlToCheck = winRateSettings.includeFees ? t.net_pnl : t.realized_pnl;
            return Math.abs(pnlToCheck) >= winRateSettings.minPnlThreshold;
        });

        relevantTrades.forEach(t => {
            const pnl = winRateSettings.includeFees ? t.net_pnl : t.realized_pnl;
            if (pnl > 0) wins++;
            else if (pnl < 0) losses++;
            else breakeven++;
        });

        const total = wins + losses + breakeven;
        // PnL Bloom specific rule: usually BE is ignored or counted as no-loss.
        // Standard: wins / total * 100
        const winRate = total > 0 ? (wins / total) * 100 : 0;

        return { winRate, wins, losses, breakeven, total };
    }, [closedTrades, winRateSettings, summary.win_rate]);

    // Create a modified summary object to pass to metrics
    // This allows us to "inject" the recalculated win rate into the existing generic renderer
    const displaySummary = useMemo(() => ({
        ...summary,
        win_rate: winRateStats.winRate
    }), [summary, winRateStats.winRate]);

    const toggleExpert = () => {
        const newVal = !showExpert;
        setShowExpert(newVal);
        localStorage.setItem('pnl_expert_mode', String(newVal));
    };

    const tier1Metrics = METRIC_GROUPS.tier1;
    const tier2Metrics = METRIC_GROUPS.tier2;
    const tier3Metrics = METRIC_GROUPS.tier3;

    return (
        <div className={`space - y - 4 ${className} `}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Key Metrics</h3>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                        <div className="flex items-center space-x-2">
                            <Switch id="expert-mode" checked={showExpert} onCheckedChange={toggleExpert} />
                            <Label htmlFor="expert-mode">Expert Mode</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Show advanced trading metrics and statistical analysis.
                        </p>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Tier 1 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tier1Metrics.map((key) => {
                    const config = ALL_METRICS[key];

                    // Special render for Win Rate to include Config Button and Chart
                    if (key === 'win_rate') {
                        return (
                            <div key={key} className="space-y-3">
                                <MetricCard
                                    label={config.label}
                                    value={config.format(displaySummary[key] || 0)}
                                    description={config.description}
                                    trend="neutral" // You could calculate trend if needed
                                    action={
                                        <WinRateConfig
                                            settings={winRateSettings}
                                            onSettingsChange={setWinRateSettings}
                                        />
                                    }
                                />
                                {winRateStats.total > 0 && (
                                    <WinLossChart
                                        wins={winRateStats.wins}
                                        losses={winRateStats.losses}
                                        breakeven={winRateStats.breakeven}
                                        total={winRateStats.total}
                                        className="px-1"
                                    />
                                )}
                            </div>
                        );
                    }

                    return (
                        <MetricCard
                            key={key}
                            label={config.label}
                            value={config.format(displaySummary[key as keyof AnalyticsSummary] || 0)}
                            description={config.description}
                            trend="neutral"
                        />
                    );
                })}
            </div>

            {/* Tier 2 & 3 Collapsible Section */}
            <div className="relative">
                key={key}
                value={data[key] || 0}
                config={config}
                        />
                    ))}

                {expertMode && tier3.map(([key, config]) => (
                    <MetricCard
                        key={key}
                        value={data[key] || 0}
                        config={config}
                        className="border-primary/20 bg-primary/5"
                    />
                ))}
            </div>

            <div className="flex justify-center mt-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMore(!showMore)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    {showMore ? (
                        <span className="flex items-center gap-1">
                            Show Less <ChevronUp className="w-3 h-3" />
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            Show More Metrics <ChevronDown className="w-3 h-3" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
        </div >
    );
}
