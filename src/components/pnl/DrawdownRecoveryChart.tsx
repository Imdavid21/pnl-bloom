import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DrawdownEvent } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface DrawdownRecoveryChartProps {
  data: DrawdownEvent[];
  className?: string;
}

export function DrawdownRecoveryChart({ data, className }: DrawdownRecoveryChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter(d => d.is_recovered && d.recovery_days !== null)
      .map(d => ({
        depth: d.drawdown_depth,
        depthPct: d.drawdown_pct,
        recoveryDays: d.recovery_days,
        peakDate: d.peak_date,
        troughDate: d.trough_date,
        recoveryDate: d.recovery_date,
      }));
  }, [data]);

  const ongoingDrawdowns = useMemo(() => {
    return data.filter(d => !d.is_recovered);
  }, [data]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const avgRecoveryDays = chartData.reduce((sum, d) => sum + (d.recoveryDays || 0), 0) / chartData.length;
    const maxDrawdown = chartData.reduce((max, d) => Math.max(max, d.depth), 0);
    const avgDrawdown = chartData.reduce((sum, d) => sum + d.depth, 0) / chartData.length;
    return { avgRecoveryDays, maxDrawdown, avgDrawdown, count: chartData.length };
  }, [chartData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (chartData.length === 0 && ongoingDrawdowns.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No drawdown events detected
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Drawdown Depth vs Recovery</h3>
        {stats && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Avg Recovery: <span className="font-medium text-foreground">{stats.avgRecoveryDays.toFixed(0)} days</span></span>
            <span>Max DD: <span className="font-medium text-loss">{formatValue(stats.maxDrawdown)}</span></span>
          </div>
        )}
      </div>
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              type="number"
              dataKey="depth"
              name="Drawdown Depth"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
              tickFormatter={formatValue}
              label={{ value: 'Drawdown Depth', position: 'bottom', fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
              stroke="hsl(var(--border))"
            />
            <YAxis 
              type="number"
              dataKey="recoveryDays"
              name="Recovery Days"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
              tickFormatter={(v) => `${v}d`}
              width={50}
              stroke="hsl(var(--border))"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(var(--card-foreground))',
              }}
              content={({ payload }) => {
                if (!payload?.[0]?.payload) return null;
                const d = payload[0].payload;
                return (
                  <div className="p-2 space-y-1" style={{ color: 'hsl(var(--card-foreground))' }}>
                    <div className="font-medium">Drawdown Event</div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>Depth: {formatValue(d.depth)} ({d.depthPct.toFixed(1)}%)</div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>Recovery: {d.recoveryDays} days</div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }} className="text-xs">Peak: {d.peakDate}</div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }} className="text-xs">Trough: {d.troughDate}</div>
                  </div>
                );
              }}
            />
            <Scatter name="Recovered Drawdowns" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill="hsl(var(--loss))"
                  opacity={0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No recovered drawdowns to display
        </div>
      )}
      
      {ongoingDrawdowns.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-loss/10 border border-loss/20">
          <div className="h-2 w-2 rounded-full bg-loss animate-pulse" />
          <span className="text-xs text-loss">
            {ongoingDrawdowns.length} ongoing drawdown{ongoingDrawdowns.length > 1 ? 's' : ''} 
            (max: {formatValue(Math.max(...ongoingDrawdowns.map(d => d.drawdown_depth)))})
          </span>
        </div>
      )}
    </div>
  );
}