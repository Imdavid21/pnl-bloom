import { DailyPnl } from "@/data/mockPnlData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface HeatmapTooltipProps {
  data: DailyPnl;
  position: { x: number; y: number };
  viewMode?: 'total' | 'closed' | 'funding';
}

export function HeatmapTooltip({ data, position, viewMode = 'total' }: HeatmapTooltipProps) {
  const formatValue = (val: number, prefix = '$') => {
    const formatted = Math.abs(val).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    const sign = val >= 0 ? '+' : '-';
    return `${sign}${prefix}${formatted}`;
  };

  const realizedPnl = (data.perps_pnl || 0) - (data.fees || 0);
  const funding = data.funding || 0;
  const totalPnl = realizedPnl + funding;

  const rows = viewMode === 'total' 
    ? [
        { label: 'Total', value: totalPnl, highlight: true },
        { label: 'Realized', value: realizedPnl, highlight: false },
        { label: 'Funding', value: funding, highlight: false },
      ]
    : viewMode === 'closed'
    ? [
        { label: 'Realized', value: realizedPnl, highlight: true },
        { label: 'Fees', value: -(data.fees || 0), highlight: false },
      ]
    : [
        { label: 'Funding', value: funding, highlight: true },
      ];

  return (
    <div 
      className="pointer-events-none fixed z-50 rounded border border-border bg-popover p-3 shadow-md"
      style={{
        left: position.x + 12,
        top: position.y - 8,
      }}
    >
      <div className="mb-2 border-b border-border pb-2">
        <p className="text-sm font-medium text-foreground">
          {format(new Date(data.date), 'MMM d, yyyy')}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {data.trades_count} trades
        </p>
      </div>
      
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className={cn(
              row.highlight ? "text-foreground" : "text-muted-foreground"
            )}>{row.label}</span>
            <span 
              className={cn(
                "font-mono tabular-nums",
                row.value > 0 && "text-profit",
                row.value < 0 && "text-loss",
                row.value === 0 && "text-muted-foreground"
              )}
            >
              {formatValue(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
