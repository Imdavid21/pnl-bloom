import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExplorerFilters as Filters, ExplorerMode } from '@/hooks/useExplorerState';

interface ExplorerFiltersProps {
  mode: ExplorerMode;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const TIME_RANGES = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' },
] as const;

const DIRECTIONS = [
  { value: 'all', label: 'All' },
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
] as const;

const PNL_SIGNS = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Profit' },
  { value: 'negative', label: 'Loss' },
] as const;

export function ExplorerFilters({ mode, filters, onFiltersChange }: ExplorerFiltersProps) {
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => 
    v !== 'all' && v !== undefined
  ).length;

  const clearFilters = () => {
    onFiltersChange({
      direction: 'all',
      pnlSign: 'all',
      timeRange: '24h',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
      </div>

      {/* Time Range */}
      <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/30 border border-border/50">
        {TIME_RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFiltersChange({ ...filters, timeRange: value })}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium transition-colors",
              filters.timeRange === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Direction Filter (for positions/activity) */}
      {(mode === 'positions' || mode === 'activity') && (
        <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/30 border border-border/50">
          {DIRECTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFiltersChange({ ...filters, direction: value })}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                filters.direction === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* PnL Sign Filter (for positions/drawdowns) */}
      {(mode === 'positions' || mode === 'drawdowns' || mode === 'activity') && (
        <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/30 border border-border/50">
          {PNL_SIGNS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFiltersChange({ ...filters, pnlSign: value })}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-colors",
                filters.pnlSign === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 text-xs gap-1 text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
