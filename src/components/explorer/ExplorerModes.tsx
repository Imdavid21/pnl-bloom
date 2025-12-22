import { Activity, BarChart3, AlertTriangle, TrendingDown, Banknote, Coins, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExplorerMode } from '@/hooks/useExplorerState';

interface ExplorerModesProps {
  mode: ExplorerMode;
  onModeChange: (mode: ExplorerMode) => void;
  counts?: Partial<Record<ExplorerMode, number>>;
}

const MODES: { key: ExplorerMode; label: string; icon: typeof Activity }[] = [
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'positions', label: 'Positions', icon: BarChart3 },
  { key: 'risk', label: 'Risk', icon: AlertTriangle },
  { key: 'drawdowns', label: 'Drawdowns', icon: TrendingDown },
  { key: 'funding', label: 'Funding', icon: Banknote },
  { key: 'assets', label: 'Assets', icon: Coins },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
];

export function ExplorerModes({ mode, onModeChange, counts }: ExplorerModesProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1 -mb-1">
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onModeChange(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
            mode === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{label}</span>
          {counts?.[key] !== undefined && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              mode === key ? "bg-primary-foreground/20" : "bg-muted"
            )}>
              {counts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
