import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from 'recharts';
import { ClosedTrade } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface LeverageOutcomeChartProps {
  data: ClosedTrade[];
  className?: string;
}

export function LeverageOutcomeChart({ data, className }: LeverageOutcomeChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter(t => t.effective_leverage !== null && t.effective_leverage > 0)
      .map(t => ({
        leverage: t.effective_leverage,
        pnl: t.net_pnl,
        market: t.market,
        side: t.side,
        isWin: t.is_win,
        size: Math.abs(t.notional_value),
      }));
  }, [data]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const avgLeverage = chartData.reduce((sum, d) => sum + (d.leverage || 0), 0) / chartData.length;
    const wins = chartData.filter(d => d.isWin).length;
    const winRate = (wins / chartData.length) * 100;
    return { avgLeverage, winRate, total: chartData.length };
  }, [chartData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (chartData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No leverage data available (requires margin info)
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Leverage vs Outcome</h3>
        {stats && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Avg Leverage: <span className="font-medium text-foreground">{stats.avgLeverage.toFixed(1)}x</span></span>
            <span>Win Rate: <span className="font-medium text-foreground">{stats.winRate.toFixed(0)}%</span></span>
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            type="number"
            dataKey="leverage"
            name="Leverage"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => `${v.toFixed(0)}x`}
            label={{ value: 'Leverage', position: 'bottom', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            type="number"
            dataKey="pnl"
            name="PnL"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatValue}
            width={60}
          />
          <ZAxis type="number" dataKey="size" range={[20, 200]} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Leverage') return [`${value.toFixed(1)}x`, name];
              if (name === 'PnL') return [formatValue(value), name];
              return [value, name];
            }}
            labelFormatter={(_, payload) => {
              if (payload?.[0]?.payload) {
                return `${payload[0].payload.market} (${payload[0].payload.side})`;
              }
              return '';
            }}
          />
          <Scatter name="Trades" data={chartData}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.isWin ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                opacity={0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-profit" />
          <span className="text-muted-foreground">Win</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-loss" />
          <span className="text-muted-foreground">Loss</span>
        </div>
      </div>
    </div>
  );
}