import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChainToggle, type ChainFilter } from './ChainToggle';

export type { ChainFilter } from './ChainToggle';

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
      {/* Header with title and chain toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hyperliquid Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search wallets, transactions, blocks, and tokens
          </p>
        </div>
        {onChainFilterChange && (
          <ChainToggle value={chainFilter} onChange={onChainFilterChange} />
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
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
          className="h-12 px-6"
        >
          Search
        </Button>
      </div>

      {/* Quick searches */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Try:</span>
        <QuickButton label="Sample Wallet" onClick={() => onSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47')} />
        <QuickButton label="PURR" onClick={() => onSearch('PURR')} />
        <QuickButton label="HYPE" onClick={() => onSearch('HYPE')} />
        <QuickButton label="Block 1M" onClick={() => onSearch('1000000')} />
      </div>
    </div>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
    </button>
  );
}

function getPlaceholder(filter: ChainFilter): string {
  switch (filter) {
    case 'hyperevm':
      return 'Search EVM address, tx hash, or block...';
    case 'hypercore-perps':
      return 'Search Hypercore address, tx hash, or block...';
    case 'hypercore-spot':
      return 'Search token (PURR, HYPE) or address...';
    default:
      return 'Search address, tx, block, or token...';
  }
}
