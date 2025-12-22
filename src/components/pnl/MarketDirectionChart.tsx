import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface MarketDirectionData {
  market: string;
  long_trades: number;
  short_trades: number;
  total_trades: number;
  long_share: number;
  short_share: number;
}

interface MarketDirectionChartProps {
  trades: Array<{
    market: string;
    side: string;
  }> | null;
  minTrades?: number;
  className?: string;
}

export function MarketDirectionChart({ trades, minTrades = 1, className }: MarketDirectionChartProps) {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Group by market and direction
    const marketMap = new Map<string, { long: number; short: number }>();

    for (const trade of trades) {
      const market = trade.market.replace('-PERP', '');
      const current = marketMap.get(market) || { long: 0, short: 0 };
      
      if (trade.side === 'long') {
        current.long++;
      } else {
        current.short++;
      }
      
      marketMap.set(market, current);
    }

    // Convert to array and calculate metrics
    const data: MarketDirectionData[] = [];
    for (const [market, counts] of marketMap.entries()) {
      const total = counts.long + counts.short;
      if (total >= minTrades) {
        data.push({
          market,
          long_trades: counts.long,
          short_trades: counts.short,
          total_trades: total,
          long_share: total > 0 ? counts.long / total : 0,
          short_share: total > 0 ? counts.short / total : 0,
        });
      }
    }

    // Sort by total trades descending, take top 12
    return data.sort((a, b) => b.total_trades - a.total_trades).slice(0, 12);
  }, [trades, minTrades]);

  if (chartData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No market direction data available
      </div>
    );
  }

  const totalLong = chartData.reduce((sum, d) => sum + d.long_trades, 0);
  const totalShort = chartData.reduce((sum, d) => sum + d.short_trades, 0);
  const totalTrades = totalLong + totalShort;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Market × Direction</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-profit" />
            Long {((totalLong / totalTrades) * 100).toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-loss" />
            Short {((totalShort / totalTrades) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
          <XAxis 
            type="number"
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            type="category"
            dataKey="market"
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
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
            labelStyle={{ color: 'hsl(var(--card-foreground))' }}
            formatter={(value: number, name: string) => {
              if (name === 'long_trades') return [value, 'Long'];
              if (name === 'short_trades') return [value, 'Short'];
              return [value, name];
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                long_trades: 'Long',
                short_trades: 'Short',
              };
              return <span style={{ color: 'hsl(var(--foreground))' }}>{labels[value] || value}</span>;
            }}
          />
          <Bar 
            dataKey="long_trades" 
            stackId="a"
            fill="hsl(var(--profit-3))"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="short_trades" 
            stackId="a"
            fill="hsl(var(--destructive))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span>{chartData.length} Markets</span>
        <span>{totalTrades} Trades</span>
      </div>
    </div>
  );
}
