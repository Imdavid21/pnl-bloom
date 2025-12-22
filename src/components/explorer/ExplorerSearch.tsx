import { Search, RefreshCw, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ExplorerSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit: () => void;
  isLoading?: boolean;
}

export function ExplorerSearch({
  searchQuery,
  onSearch,
  onSearchSubmit,
  isLoading,
}: ExplorerSearchProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hyperliquid Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search wallet addresses, transaction hashes, or block numbers
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-profit-3/10 border border-profit-3/20">
          <Zap className="h-3.5 w-3.5 text-profit-3" />
          <span className="text-xs font-medium text-profit-3">200k TPS</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by address, tx hash, or block number..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
            className="pl-12 h-12 text-base font-mono bg-muted/30 border-border/50 focus:border-primary"
          />
        </div>
        <Button 
          onClick={onSearchSubmit} 
          disabled={isLoading || !searchQuery.trim()}
          className="h-12 px-8"
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Example searches */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Examples:</span>
        <button 
          onClick={() => onSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47')}
          className="font-mono px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
        >
          0xdd59...8d47
        </button>
        <button 
          onClick={() => onSearch('836176486')}
          className="font-mono px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
        >
          836176486
        </button>
      </div>
    </div>
  );
}
