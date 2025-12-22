import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ChainFilter = 'all' | 'hyperevm' | 'hypercore-perps' | 'hypercore-spot';

interface ExplorerSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit: () => void;
  isLoading?: boolean;
  chainFilter?: ChainFilter;
  onChainFilterChange?: (filter: ChainFilter) => void;
}

export function ExplorerSearch({
  searchQuery,
  onSearch,
  onSearchSubmit,
  isLoading,
  chainFilter = 'all',
  onChainFilterChange,
}: ExplorerSearchProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hyperliquid Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search wallet addresses, transaction hashes, or block numbers
          </p>
        </div>
        
        {/* Chain Filter Toggle */}
        {onChainFilterChange && (
          <ToggleGroup 
            type="single" 
            value={chainFilter} 
            onValueChange={(value) => value && onChainFilterChange(value as ChainFilter)}
            className="bg-muted/30 p-1 rounded-lg border border-border/50"
          >
            <ToggleGroupItem 
              value="all" 
              className="text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              All
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="hyperevm" 
              className="text-xs px-3 py-1.5 data-[state=on]:bg-emerald-500 data-[state=on]:text-white"
            >
              HyperEVM
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="hypercore-perps" 
              className="text-xs px-3 py-1.5 data-[state=on]:bg-blue-500 data-[state=on]:text-white"
            >
              Perps L1
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="hypercore-spot" 
              className="text-xs px-3 py-1.5 data-[state=on]:bg-amber-500 data-[state=on]:text-white"
            >
              Spot
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={getPlaceholder(chainFilter)}
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

      {/* Example searches - contextual based on filter */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Try:</span>
        {(chainFilter === 'all' || chainFilter === 'hyperevm' || chainFilter === 'hypercore-perps') && (
          <button 
            onClick={() => { onSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47'); }}
            className="font-mono px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
          >
            0xdd59...8d47
          </button>
        )}
        {(chainFilter === 'all' || chainFilter === 'hypercore-perps') && (
          <button 
            onClick={() => { onSearch('836176486'); }}
            className="font-mono px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
          >
            Block 836176486
          </button>
        )}
        {(chainFilter === 'all' || chainFilter === 'hyperevm') && (
          <button 
            onClick={() => { onSearch('1000000'); }}
            className="font-mono px-2 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
          >
            EVM Block 1M
          </button>
        )}
        {(chainFilter === 'all' || chainFilter === 'hypercore-spot') && (
          <>
            <button 
              onClick={() => { onSearch('PURR'); }}
              className="font-mono px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 transition-colors"
            >
              PURR
            </button>
            <button 
              onClick={() => { onSearch('HYPE'); }}
              className="font-mono px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 transition-colors"
            >
              HYPE
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function getPlaceholder(filter: ChainFilter): string {
  switch (filter) {
    case 'hyperevm':
      return 'Search EVM address, tx hash, or block number...';
    case 'hypercore-perps':
      return 'Search L1 address, tx hash, or block height...';
    case 'hypercore-spot':
      return 'Search token name, address, or token ID...';
    default:
      return 'Search by address, tx hash, block, or token...';
  }
}
