/**
 * Equity Curve Chart - Portfolio value over time
 */

import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useEquityCurve, type TimeRange } from '@/hooks/useEquityCurve';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EquityCurveChartProps {
  address: string;
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function SkeletonChart() {
  return (
    <div className="h-40 w-full flex items-center justify-center">
      <div className="h-full w-full bg-muted/20 rounded animate-pulse" />
    </div>
  );
}

export function EquityCurveChart({ address }: EquityCurveChartProps) {
  const [range, setRange] = useState<TimeRange>('30d');
  const { data, isLoading, isError } = useEquityCurve(address, range);

  const isPositive = (data?.totalChange ?? 0) >= 0;
  const lineColor = isPositive ? 'hsl(var(--up))' : 'hsl(var(--down))';

  // Transform data for chart
  const chartData = data?.points.map(point => ({
    date: point.day,
    value: point.cumulativePnl,
    label: format(parseISO(point.day), 'MMM d'),
  })) || [];

  return (
    <div className="panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="panel-header mb-0">Equity Curve</span>
        <div className="flex items-center gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setRange(tr.key)}
              className={cn(
                "px-2 py-1 text-[10px] uppercase tracking-wider font-mono rounded transition-colors",
                range === tr.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <SkeletonChart />
        ) : isError || chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            <p className="text-[10px] uppercase tracking-wider">No equity data available</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-up" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-down" />
                )}
                <span className={cn(
                  "font-mono text-lg font-semibold tabular-nums",
                  isPositive ? "text-up" : "text-down"
                )}>
                  {isPositive ? '+' : ''}{formatUsd(data?.totalChange || 0)}
                </span>
                <span className={cn(
                  "text-[10px] font-mono tabular-nums",
                  isPositive ? "text-up/70" : "text-down/70"
                )}>
                  ({isPositive ? '+' : ''}{(data?.totalChangePct || 0).toFixed(1)}%)
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {range} PnL
              </span>
            </div>

            {/* Chart */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatUsd(v)}
                    width={50}
                    domain={['auto', 'auto']}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload;
                      return (
                        <div className="bg-background/95 border border-border rounded px-2 py-1.5 shadow-lg">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{point.label}</p>
                          <p className={cn(
                            "font-mono text-xs font-semibold tabular-nums",
                            point.value >= 0 ? "text-up" : "text-down"
                          )}>
                            {formatUsd(point.value)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: lineColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
