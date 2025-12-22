import { useState, useMemo } from "react";
import { DailyPnl } from "@/data/mockPnlData";
import { HeatmapTooltip } from "./HeatmapTooltip";
import { cn } from "@/lib/utils";
import { startOfYear, endOfYear, eachDayOfInterval, format, getDay, startOfWeek } from "date-fns";

interface HeatmapProps {
  data: DailyPnl[];
  year: number;
  viewMode: 'total' | 'closed' | 'funding';
  onDayClick: (date: string, data?: DailyPnl) => void;
}

export function Heatmap({ data, year, viewMode, onDayClick }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ data: DailyPnl; position: { x: number; y: number } } | null>(null);

  const dataMap = useMemo(() => {
    const map = new Map<string, DailyPnl>();
    data.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const getValue = (d: DailyPnl): number => {
    const realizedPnl = (d.perps_pnl || 0) - (d.fees || 0);
    const funding = d.funding || 0;
    
    switch (viewMode) {
      case 'total': return realizedPnl + funding;
      case 'closed': return realizedPnl;
      case 'funding': return funding;
      default: return realizedPnl + funding;
    }
  };

  // Quantile-based coloring
  const { positiveThresholds, negativeThresholds } = useMemo(() => {
    const values = data.map(getValue);
    const positive = values.filter(v => v > 0).sort((a, b) => a - b);
    const negative = values.filter(v => v < 0).sort((a, b) => a - b);

    const getQuantiles = (arr: number[]) => {
      if (arr.length === 0) return [0, 0, 0, 0];
      return [
        arr[Math.floor(arr.length * 0.25)] || arr[0],
        arr[Math.floor(arr.length * 0.5)] || arr[0],
        arr[Math.floor(arr.length * 0.75)] || arr[0],
        arr[arr.length - 1] || arr[0],
      ];
    };

    return {
      positiveThresholds: getQuantiles(positive),
      negativeThresholds: getQuantiles(negative),
    };
  }, [data, viewMode]);

  const getColorClass = (value: number): string => {
    if (value === 0) return 'bg-neutral';
    
    if (value > 0) {
      if (value >= positiveThresholds[3]) return 'bg-profit-4';
      if (value >= positiveThresholds[2]) return 'bg-profit-3';
      if (value >= positiveThresholds[1]) return 'bg-profit-2';
      return 'bg-profit-1';
    } else {
      if (value <= negativeThresholds[0]) return 'bg-loss-4';
      if (value <= negativeThresholds[1]) return 'bg-loss-3';
      if (value <= negativeThresholds[2]) return 'bg-loss-2';
      return 'bg-loss-1';
    }
  };

  const calendarData = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    const today = new Date();
    const endDate = yearEnd > today ? today : yearEnd;
    const calendarStart = startOfWeek(yearStart, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: endDate });
    
    const weeks: { date: Date; data?: DailyPnl }[][] = [];
    let currentWeek: { date: Date; data?: DailyPnl }[] = [];
    
    days.forEach((date, index) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = dataMap.get(dateStr);
      currentWeek.push({ date, data: dayData });
      
      if (getDay(date) === 6 || index === days.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeks;
  }, [year, dataMap]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; position: number }[] = [];
    let lastMonth = -1;
    
    calendarData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth && firstDayOfWeek.getFullYear() === year) {
          labels.push({
            month: format(firstDayOfWeek, 'MMM'),
            position: weekIndex,
          });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [calendarData, year]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleMouseEnter = (e: React.MouseEvent, dayData: DailyPnl) => {
    setTooltip({
      data: dayData,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip({
        ...tooltip,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  };

  return (
    <div className="relative w-full">
      {/* Month labels - compact */}
      <div className="mb-1 ml-6 flex text-[10px] text-muted-foreground relative h-4">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${label.position * 14 + 24}px` }}
          >
            {label.month}
          </div>
        ))}
      </div>
      
      <div className="flex mt-4 w-full">
        {/* Day labels - minimal */}
        <div className="mr-2 flex flex-col text-[9px] text-muted-foreground shrink-0" style={{ gap: '3px' }}>
          {dayLabels.map((day, i) => (
            <div key={`${day}-${i}`} className="flex h-3 w-3 items-center justify-end">
              {i % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>
        
        {/* Grid - full width */}
        <div className="flex flex-1 justify-between" style={{ gap: '3px' }}>
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col" style={{ gap: '3px' }}>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayEntry = week.find((d) => getDay(d.date) === dayIndex);
                const date = dayEntry?.date;
                const dayData = dayEntry?.data;
                const isCurrentYear = date && date.getFullYear() === year;
                const isFuture = date && date > new Date();
                
                if (!date || !isCurrentYear || isFuture) {
                  return (
                    <div
                      key={dayIndex}
                      className="h-3 w-3 rounded-[2px] bg-transparent"
                    />
                  );
                }
                
                const value = dayData ? getValue(dayData) : null;
                const colorClass = value !== null ? getColorClass(value) : 'bg-no-data';
                
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "h-3 w-3 cursor-pointer rounded-[2px] transition-micro hover:ring-1 hover:ring-foreground/30",
                      colorClass
                    )}
                    onClick={() => onDayClick(format(date, 'yyyy-MM-dd'), dayData)}
                    onMouseEnter={(e) => dayData && handleMouseEnter(e, dayData)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {tooltip && <HeatmapTooltip data={tooltip.data} position={tooltip.position} viewMode={viewMode} />}
    </div>
  );
}
