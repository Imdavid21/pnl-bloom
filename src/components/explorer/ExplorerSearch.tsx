import { Search, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChainFilter = 'all' | 'hyperevm' | 'hypercore-perps' | 'hypercore-spot';

interface ExplorerSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit: () => void;
  isLoading?: boolean;
  chainFilter?: ChainFilter;
  onChainFilterChange?: (filter: ChainFilter) => void;
}

const chainOptions: { value: ChainFilter; label: string; color: string; description: string }[] = [
  { value: 'all', label: 'All Chains', color: 'bg-primary', description: 'Search everywhere' },
  { value: 'hyperevm', label: 'HyperEVM', color: 'bg-emerald-500', description: 'Smart contracts' },
  { value: 'hypercore-perps', label: 'Perps L1', color: 'bg-blue-500', description: 'Perpetuals trading' },
  { value: 'hypercore-spot', label: 'Spot', color: 'bg-amber-500', description: 'Spot tokens' },
];

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hyperliquid Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore wallets, transactions, blocks, and spot tokens
        </p>
      </div>

      {/* Search Bar with integrated chain selector */}
      <div className="flex flex-col gap-3">
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

        {/* Chain Filter - Improved UX with cards */}
        {onChainFilterChange && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {chainOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onChainFilterChange(option.value)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left",
                  chainFilter === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                <div className={cn("h-2.5 w-2.5 rounded-full", option.color)} />
                <div className="min-w-0">
                  <p className={cn(
                    "text-xs font-medium truncate",
                    chainFilter === option.value ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick searches */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Quick:</span>
        {(chainFilter === 'all' || chainFilter === 'hyperevm' || chainFilter === 'hypercore-perps') && (
          <QuickSearchButton 
            label="0xdd59...8d47" 
            onClick={() => onSearch('0xdd590902cdac0abb4861a6748a256e888acb8d47')}
          />
        )}
        {(chainFilter === 'all' || chainFilter === 'hyperevm') && (
          <QuickSearchButton 
            label="EVM Block 1M" 
            onClick={() => onSearch('1000000')}
            variant="emerald"
          />
        )}
        {(chainFilter === 'all' || chainFilter === 'hypercore-spot') && (
          <>
            <QuickSearchButton label="PURR" onClick={() => onSearch('PURR')} variant="amber" />
            <QuickSearchButton label="HYPE" onClick={() => onSearch('HYPE')} variant="amber" />
          </>
        )}
      </div>
    </div>
  );
}

function QuickSearchButton({ 
  label, 
  onClick, 
  variant = 'default' 
}: { 
  label: string; 
  onClick: () => void; 
  variant?: 'default' | 'emerald' | 'amber';
}) {
  const variants = {
    default: 'bg-muted/50 hover:bg-muted text-foreground',
    emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500',
    amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500',
  };

  return (
    <button 
      onClick={onClick}
      className={cn("font-mono px-2 py-1 rounded transition-colors", variants[variant])}
    >
      {label}
    </button>
  );
}

function getPlaceholder(filter: ChainFilter): string {
  switch (filter) {
    case 'hyperevm':
      return 'Search EVM address, tx hash, or block number...';
    case 'hypercore-perps':
      return 'Search L1 address, tx hash, or block height...';
    case 'hypercore-spot':
      return 'Search token name (PURR, HYPE) or token ID...';
    default:
      return 'Search by address, tx hash, block, or token...';
  }
}
