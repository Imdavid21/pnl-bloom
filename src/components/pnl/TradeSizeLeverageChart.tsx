import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface TradeSizePnlData {
  key: string;
  avg_trade_size: number;
  avg_pnl: number;
  trade_count: number;
}

interface TradeSizePnlChartProps {
  data: {
    grouping: string;
    data: TradeSizePnlData[];
  } | null;
  className?: string;
}

export function TradeSizeLeverageChart({ data, className }: TradeSizePnlChartProps) {
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.slice(0, 12).map(d => ({
      name: d.key.replace('-PERP', ''),
      avg_trade_size: d.avg_trade_size,
      avg_pnl: d.avg_pnl || 0,
      trade_count: d.trade_count,
      isProfitable: (d.avg_pnl || 0) >= 0,
    }));
  }, [data]);

  // Calculate domains for both axes
  const { pnlMin, pnlMax } = useMemo(() => {
    if (chartData.length === 0) return { pnlMin: 0, pnlMax: 0 };
    const pnlValues = chartData.map(d => d.avg_pnl);
    const min = Math.min(...pnlValues);
    const max = Math.max(...pnlValues);
    // Add padding to ensure the reference line at 0 is visible
    const padding = Math.max(Math.abs(min), Math.abs(max)) * 0.1;
    return {
      pnlMin: Math.min(min - padding, 0),
      pnlMax: Math.max(max + padding, 0),
    };
  }, [chartData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (!data?.data || data.data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No trade size data available
      </div>
    );
  }

  const hasNegativePnl = chartData.some(d => d.avg_pnl < 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Avg Trade Size & PnL Per Market</h3>
        <span className="text-xs text-muted-foreground">
          by {data.grouping}
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            yAxisId="size"
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
            tickFormatter={formatValue}
            width={60}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            yAxisId="pnl"
            orientation="right"
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
            tickFormatter={formatValue}
            width={50}
            stroke="hsl(var(--border))"
            domain={[pnlMin, pnlMax]}
          />
          
          {/* Reference line at 0 for PnL axis */}
          {hasNegativePnl && (
            <ReferenceLine 
              yAxisId="pnl" 
              y={0} 
              stroke="hsl(var(--foreground))" 
              strokeWidth={1} 
              strokeOpacity={0.5}
              strokeDasharray="3 3"
            />
          )}
          
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'hsl(var(--card-foreground))',
            }}
            labelStyle={{ color: 'hsl(var(--card-foreground))' }}
            formatter={(value: number, name: string) => {
              if (name === 'avg_trade_size') return [formatValue(value), 'Avg Size'];
              if (name === 'avg_pnl') {
                const color = value >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))';
                return [<span style={{ color }}>{formatValue(value)}</span>, 'Avg PnL'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                avg_trade_size: 'Avg Trade Size',
                avg_pnl: 'Avg PnL',
              };
              return <span style={{ color: 'hsl(var(--foreground))' }}>{labels[value] || value}</span>;
            }}
          />
          <Bar 
            yAxisId="size"
            dataKey="avg_trade_size" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-size-${index}`}
                fill="hsl(var(--primary))"
                fillOpacity={0.8}
              />
            ))}
          </Bar>
          <Line 
            yAxisId="pnl"
            type="monotone"
            dataKey="avg_pnl" 
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={3}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (cx === undefined || cy === undefined) return <g />;
              const color = payload.isProfitable ? 'hsl(var(--profit-3))' : 'hsl(var(--destructive))';
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={(props: any) => {
              const { cx, cy, payload } = props;
              if (cx === undefined || cy === undefined) return <g />;
              const color = payload.isProfitable ? 'hsl(var(--profit-3))' : 'hsl(var(--destructive))';
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill="hsl(var(--card))"
                  stroke={color}
                  strokeWidth={2}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span>Total Markets: {data.data.length}</span>
        <span>Total Trades: {data.data.reduce((sum, d) => sum + d.trade_count, 0)}</span>
      </div>
    </div>
  );
}
