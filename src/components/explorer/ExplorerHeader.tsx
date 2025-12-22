import { Search, Download, RefreshCw, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Engine } from '@/hooks/useExplorerState';

interface ExplorerHeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit: () => void;
  engine: Engine;
  onEngineChange: (engine: Engine) => void;
  isLoading?: boolean;
  lastUpdated?: Date | null;
}

export function ExplorerHeader({
  searchQuery,
  onSearch,
  onSearchSubmit,
  engine,
  onEngineChange,
  isLoading,
  lastUpdated,
}: ExplorerHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Search Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tx hash, wallet, position ID, fill ID..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
            className="pl-10 h-10 sm:h-11 font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onSearchSubmit} 
            disabled={isLoading}
            className="h-10 sm:h-11 px-4 sm:px-6"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
          <Button variant="outline" size="icon" className="h-10 sm:h-11 w-10 sm:w-11">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Engine Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
          {(['hypercore', 'hyperevm', 'both'] as Engine[]).map((e) => (
            <button
              key={e}
              onClick={() => onEngineChange(e)}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
                engine === e
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {e === 'both' ? 'Both' : e === 'hypercore' ? 'Hypercore' : 'HyperEVM'}
            </button>
          ))}
        </div>

        {/* Freshness Indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi className={cn("h-3 w-3", isLoading ? "text-info animate-pulse" : "text-profit-3")} />
          <span>
            {isLoading ? 'Syncing...' : lastUpdated 
              ? `Updated ${formatTimeAgo(lastUpdated)}`
              : 'Live'
            }
          </span>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
