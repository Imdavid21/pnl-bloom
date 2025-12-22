import { cn } from '@/lib/utils';

export type ChainFilter = 'all' | 'hyperevm' | 'hypercore-perps' | 'hypercore-spot';

interface ChainToggleProps {
  value: ChainFilter;
  onChange: (filter: ChainFilter) => void;
}

const options: { value: ChainFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hyperevm', label: 'EVM' },
  { value: 'hypercore-perps', label: 'Perps' },
  { value: 'hypercore-spot', label: 'Spot' },
];

export function ChainToggle({ value, onChange }: ChainToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted/50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
