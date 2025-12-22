import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell, ReferenceLine } from 'recharts';
import { MarketStat } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface MarketSkillChartProps {
  data: MarketStat[];
  minTrades?: number;
  className?: string;
}

export function MarketSkillChart({ data, minTrades = 5, className }: MarketSkillChartProps) {
  const chartData = useMemo(() => {
    return data.map(m => ({
      market: m.market.replace('-PERP', ''),
      winRate: m.win_rate * 100,
      pnl: m.total_pnl,
      trades: m.total_trades,
      volume: m.total_volume,
      lowSample: m.total_trades < minTrades,
    }));
  }, [data, minTrades]);

  const avgWinRate = useMemo(() => {
    if (chartData.length === 0) return 50;
    return chartData.reduce((sum, d) => sum + d.winRate, 0) / chartData.length;
  }, [chartData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No market data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Market Skill Matrix</h3>
        <div className="text-xs text-muted-foreground">
          {chartData.filter(d => d.lowSample).length > 0 && (
            <span className="text-yellow-500">⚠ Hollow dots: &lt;{minTrades} trades</span>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            type="number"
            dataKey="winRate"
            name="Win Rate"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Win Rate', position: 'bottom', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            type="number"
            dataKey="pnl"
            name="Total PnL"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatValue}
            width={60}
          />
          <ZAxis type="number" dataKey="trades" range={[40, 300]} />
          <ReferenceLine x={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            content={({ payload }) => {
              if (!payload?.[0]?.payload) return null;
              const d = payload[0].payload;
              return (
                <div className="p-2 space-y-1">
                  <div className="font-medium">{d.market}</div>
                  <div className="text-muted-foreground">Win Rate: {d.winRate.toFixed(1)}%</div>
                  <div className="text-muted-foreground">PnL: {formatValue(d.pnl)}</div>
                  <div className="text-muted-foreground">Trades: {d.trades}</div>
                  {d.lowSample && <div className="text-yellow-500 text-xs">Low sample size</div>}
                </div>
              );
            }}
          />
          <Scatter name="Markets" data={chartData}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                stroke={entry.lowSample ? 'hsl(var(--muted-foreground))' : undefined}
                strokeWidth={entry.lowSample ? 2 : 0}
                fillOpacity={entry.lowSample ? 0.3 : 0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {chartData.slice(0, 5).map(d => (
          <div key={d.market} className="flex items-center gap-1.5">
            <div className={cn(
              "h-2 w-2 rounded-full",
              d.pnl >= 0 ? "bg-profit" : "bg-loss"
            )} />
            <span className="text-muted-foreground">{d.market}</span>
          </div>
        ))}
        {chartData.length > 5 && (
          <span className="text-muted-foreground">+{chartData.length - 5} more</span>
        )}
      </div>
    </div>
  );
}