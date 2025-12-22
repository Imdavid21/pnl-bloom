import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_CHAINS, type SupportedChainKey } from '@/lib/chains';
import { cn } from '@/lib/utils';

interface ChainSelectorProps {
  selectedChain: SupportedChainKey;
  onChainChange: (chain: SupportedChainKey) => void;
  disabled?: boolean;
}

// Chain icons as simple colored circles with initials
const chainColors: Record<SupportedChainKey, string> = {
  hyperevm: 'bg-emerald-500',
  ethereum: 'bg-blue-500',
  base: 'bg-blue-400',
  arbitrum: 'bg-sky-500',
  optimism: 'bg-red-500',
  mantle: 'bg-slate-700',
};

export function ChainSelector({ selectedChain, onChainChange, disabled }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedConfig = SUPPORTED_CHAINS[selectedChain];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4 rounded-full', chainColors[selectedChain])} />
            <span>{selectedConfig.name}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {(Object.keys(SUPPORTED_CHAINS) as SupportedChainKey[]).map((chainKey) => {
          const chain = SUPPORTED_CHAINS[chainKey];
          return (
            <DropdownMenuItem
              key={chainKey}
              onClick={() => {
                onChainChange(chainKey);
                setOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className={cn('h-4 w-4 rounded-full', chainColors[chainKey])} />
                <span>{chain.name}</span>
              </div>
              {selectedChain === chainKey && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
