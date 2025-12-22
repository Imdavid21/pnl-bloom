import { useMemo } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { EquityCurvePoint } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface FundingTradingChartProps {
  data: EquityCurvePoint[];
  className?: string;
}

export function FundingTradingChart({ data, className }: FundingTradingChartProps) {
  const chartData = useMemo(() => {
    let cumulativeDeposits = 0;
    let cumulativeWithdrawals = 0;
    return data.map(d => {
      const deposits = d.deposits || 0;
      const withdrawals = d.withdrawals || 0;
      cumulativeDeposits += deposits;
      cumulativeWithdrawals += withdrawals;
      return {
        date: d.day,
        trading: d.cumulative_trading_pnl,
        funding: d.cumulative_funding_pnl,
        fees: d.cumulative_fees,
        net: d.cumulative_net_pnl,
        deposits: deposits,
        withdrawals: -withdrawals, // Negative for display below x-axis
        cumulativeDeposits,
        cumulativeWithdrawals,
        netFlow: deposits - withdrawals,
        hasDeposit: deposits > 0,
        hasWithdrawal: withdrawals > 0,
      };
    });
  }, [data]);

  const fundingShare = useMemo(() => {
    if (data.length === 0) return 0;
    const latest = data[data.length - 1];
    const total = latest.cumulative_trading_pnl + latest.cumulative_funding_pnl - latest.cumulative_fees;
    if (total === 0) return 0;
    return (latest.cumulative_funding_pnl / total) * 100;
  }, [data]);

  const totalDeposits = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.deposits || 0), 0);
  }, [data]);

  const totalWithdrawals = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.withdrawals || 0), 0);
  }, [data]);

  const hasFlows = totalDeposits > 0 || totalWithdrawals > 0;

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No equity curve data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-foreground">Account Value</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Funding: <span className={cn(
              "font-medium",
              fundingShare >= 0 ? "text-profit" : "text-loss"
            )}>{fundingShare.toFixed(1)}%</span>
          </span>
          {totalDeposits > 0 && (
            <span className="text-muted-foreground">
              In: <span className="font-medium text-profit">{formatValue(totalDeposits)}</span>
            </span>
          )}
          {totalWithdrawals > 0 && (
            <span className="text-muted-foreground">
              Out: <span className="font-medium text-loss">{formatValue(totalWithdrawals)}</span>
            </span>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tradingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fundingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--profit-3))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--profit-3))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => value.slice(5)}
            interval="preserveStartEnd"
            stroke="hsl(var(--border))"
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis 
            yAxisId="pnl"
            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
            tickFormatter={formatValue}
            width={60}
            stroke="hsl(var(--border))"
          />
          {hasFlows && (
            <YAxis 
              yAxisId="flows"
              orientation="right"
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))', opacity: 0.7 }}
              tickFormatter={formatValue}
              width={50}
              stroke="hsl(var(--border))"
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
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const dataPoint = payload[0]?.payload;
              if (!dataPoint) return null;
              
              return (
                <div className="p-2 space-y-1" style={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}>
                  <div className="font-medium text-sm" style={{ color: 'hsl(var(--card-foreground))' }}>
                    {label}
                  </div>
                  <div style={{ color: 'hsl(var(--primary))' }}>
                    Trading: {formatValue(dataPoint.trading)}
                  </div>
                  <div style={{ color: 'hsl(var(--profit-3))' }}>
                    Funding: {formatValue(dataPoint.funding)}
                  </div>
                  {dataPoint.hasDeposit && (
                    <div style={{ color: 'hsl(var(--profit))' }} className="font-medium">
                      Deposit: {formatValue(dataPoint.deposits)}
                    </div>
                  )}
                  {dataPoint.hasWithdrawal && (
                    <div style={{ color: 'hsl(var(--destructive))' }} className="font-medium">
                      Withdrawal: {formatValue(Math.abs(dataPoint.withdrawals))}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--foreground))' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                trading: 'Trading',
                funding: 'Funding',
                deposits: 'Deposits',
                withdrawals: 'Withdrawals',
              };
              return <span style={{ color: 'hsl(var(--foreground))' }}>{labels[value] || value}</span>;
            }}
          />
          
          {hasFlows && <ReferenceLine yAxisId="flows" y={0} stroke="hsl(var(--border))" />}
          
          {/* Deposit bars (positive) */}
          {hasFlows && (
            <Bar
              yAxisId="flows"
              dataKey="deposits"
              name="deposits"
              radius={[2, 2, 0, 0]}
              maxBarSize={8}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`deposit-${index}`}
                  fill="hsl(var(--profit-3))"
                  fillOpacity={entry.hasDeposit ? 0.9 : 0}
                />
              ))}
            </Bar>
          )}
          
          {/* Withdrawal bars (negative) */}
          {hasFlows && (
            <Bar
              yAxisId="flows"
              dataKey="withdrawals"
              name="withdrawals"
              radius={[0, 0, 2, 2]}
              maxBarSize={8}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`withdrawal-${index}`}
                  fill="hsl(var(--destructive))"
                  fillOpacity={entry.hasWithdrawal ? 0.9 : 0}
                />
              ))}
            </Bar>
          )}
          
          <Area
            yAxisId="pnl"
            type="monotone"
            dataKey="trading"
            stroke="hsl(var(--primary))"
            fill="url(#tradingGradient)"
            strokeWidth={2}
          />
          <Area
            yAxisId="pnl"
            type="monotone"
            dataKey="funding"
            stroke="hsl(var(--profit-3))"
            fill="url(#fundingGradient)"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
