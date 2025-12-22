import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis } from 'recharts';
import { ClosedTrade, PositionData } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getSymbol } from '@/lib/symbolMapping';

interface LiquidationProximityChartProps {
  trades: ClosedTrade[];
  positions: PositionData[];
  className?: string;
}

interface DataPoint {
  time: number;
  date: string;
  proximity: number;
  isLive: boolean;
  isHighRisk: boolean;
  market: string;
  side: string;
  pnl: number;
  size: number;
}

// Soft pastel colors
const COLORS = {
  profit: '#a7f3d0',    // mint green - for winning trades
  lossLight: '#fecaca', // light pastel red - small losses (<10%)
  lossWarning: '#fde68a', // pastel yellow - medium losses (10-15%)
  lossDanger: '#fca5a5', // pastel red - high losses (>15%)
  live: '#c4b5fd',      // pastel purple - live positions
  neutral: '#d1d5db',   // pastel gray
};

export function LiquidationProximityChart({ trades, positions, className }: LiquidationProximityChartProps) {
  const chartData = useMemo(() => {
    const dataPoints: DataPoint[] = [];

    // Process closed trades - filter out dust trades (< $1 notional)
    for (const trade of trades) {
      // Skip dust trades that would create unrealistic percentages
      if (trade.notional_value < 1) continue;
      
      const exitTime = new Date(trade.exit_time).getTime();
      
      // Calculate loss percentage relative to notional value
      // Cap at 100% to avoid extreme outliers from bad data
      const rawLossPercent = trade.notional_value > 0 
        ? Math.abs(Math.min(0, trade.net_pnl)) / trade.notional_value * 100 
        : 0;
      const lossPercent = Math.min(100, rawLossPercent);
      
      // Consider it high risk if loss > 15% of notional
      const isHighRisk = lossPercent > 15;
      
      dataPoints.push({
        time: exitTime,
        date: format(new Date(trade.exit_time), 'MMM dd'),
        proximity: lossPercent,
        isLive: false,
        isHighRisk,
        market: getSymbol(trade.market),
        side: trade.side,
        pnl: trade.net_pnl,
        size: trade.notional_value,
      });
    }

    // Add live positions
    for (const pos of positions) {
      if (pos.avg_entry > 0 && pos.position_size !== 0) {
        const isLong = pos.position_size > 0;
        const now = Date.now();
        const notional = Math.abs(pos.position_size * pos.avg_entry);
        
        // Calculate current drawdown for live position
        let proximityToLiq = 0;
        if (pos.unrealized_pnl && pos.unrealized_pnl < 0) {
          proximityToLiq = Math.abs(pos.unrealized_pnl) / notional * 100;
        }
        
        dataPoints.push({
          time: now,
          date: 'LIVE',
          proximity: proximityToLiq,
          isLive: true,
          isHighRisk: proximityToLiq > 15,
          market: getSymbol(pos.market),
          side: isLong ? 'long' : 'short',
          pnl: pos.unrealized_pnl || 0,
          size: notional,
        });
      }
    }

    return dataPoints.sort((a, b) => a.time - b.time);
  }, [trades, positions]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const closedTrades = chartData.filter(d => !d.isLive);
    const livePositions = chartData.filter(d => d.isLive);
    const highRiskTrades = chartData.filter(d => d.isHighRisk && !d.isLive);
    
    // Use original trades count (before dust filter) for accuracy
    const actualTradeCount = trades.length;
    
    return { 
      totalTrades: actualTradeCount,
      displayedTrades: closedTrades.length,
      liveCount: livePositions.length,
      highRiskCount: highRiskTrades.length,
    };
  }, [chartData, trades.length]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculate domains
  const { timeDomain, maxProximity } = useMemo(() => {
    if (chartData.length === 0) return { 
      timeDomain: [Date.now() - 86400000, Date.now()],
      maxProximity: 20
    };
    
    const times = chartData.map(d => d.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const padding = (maxTime - minTime) * 0.05 || 86400000;
    
    const maxP = Math.max(...chartData.map(d => d.proximity), 20);
    
    return { 
      timeDomain: [minTime - padding, maxTime + padding],
      maxProximity: Math.ceil(maxP / 5) * 5 + 5
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground text-sm", className)}>
        No trade data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-foreground">Liquidation Proximity</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{stats?.totalTrades} trades</span>
          {stats?.liveCount ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
              {stats.liveCount} LIVE
            </span>
          ) : null}
          {stats?.highRiskCount ? (
            <span className="text-destructive font-mono tabular-nums">
              {stats.highRiskCount} high-risk
            </span>
          ) : null}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.3} 
          />
          <XAxis 
            type="number"
            dataKey="time"
            domain={timeDomain}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={(v) => format(new Date(v), 'MMM dd')}
            tickLine={false}
          />
          <YAxis 
            type="number"
            dataKey="proximity"
            domain={[0, maxProximity]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            width={40}
          />
          <ZAxis type="number" dataKey="size" range={[30, 150]} />
          
          {/* Danger thresholds */}
          <ReferenceLine y={15} stroke="hsl(var(--destructive))" strokeDasharray="4 4" opacity={0.4} />
          <ReferenceLine y={10} stroke="hsl(var(--warning))" strokeDasharray="4 4" opacity={0.3} />
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--muted-foreground))' }}
            content={({ payload }) => {
              if (!payload?.[0]?.payload) return null;
              const d = payload[0].payload as DataPoint;
              return (
                <div className="p-2.5 rounded-lg border border-border bg-card shadow-lg text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">{d.market}</span>
                    <span className={cn(
                      "text-[10px] px-1 py-0.5 rounded font-medium",
                      d.side === 'long' ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                    )}>
                      {d.side.toUpperCase()}
                    </span>
                    {d.isLive && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Loss %:</span>
                      <span className={cn(
                        "font-mono tabular-nums",
                        d.proximity > 15 ? "text-destructive" : d.proximity > 10 ? "text-warning" : "text-foreground"
                      )}>
                        {d.proximity.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">PnL:</span>
                      <span className={cn(
                        "font-mono tabular-nums",
                        d.pnl >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {formatValue(d.pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-mono tabular-nums text-foreground">{formatValue(d.size)}</span>
                    </div>
                    {!d.isLive && (
                      <div className="text-muted-foreground pt-1 border-t border-border/50">
                        {d.date}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
          
          <Scatter name="Trades" data={chartData}>
            {chartData.map((entry, index) => {
              let fill = COLORS.neutral;
              let strokeWidth = 1;
              
              if (entry.isLive) {
                fill = COLORS.live;
                strokeWidth = 2;
              } else if (entry.pnl >= 0) {
                // Winning trade = green
                fill = COLORS.profit;
              } else if (entry.proximity > 15) {
                // Big loss (>15%) = red
                fill = COLORS.lossDanger;
              } else if (entry.proximity > 10) {
                // Medium loss (10-15%) = yellow
                fill = COLORS.lossWarning;
              } else {
                // Small loss (<10%) = light red/pink
                fill = COLORS.lossLight;
              }
              
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={fill}
                  stroke="hsl(var(--background))"
                  strokeWidth={strokeWidth}
                  opacity={0.85}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.lossDanger }} />
          <span>&gt;15% loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.lossWarning }} />
          <span>10-15%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.lossLight }} />
          <span>&lt;10% loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.profit }} />
          <span>Profit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.live }} />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
