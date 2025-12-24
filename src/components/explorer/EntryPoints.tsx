import { cn } from '@/lib/utils';

interface EntryPointsProps {
  onInspect: (type: string, example: string) => void;
}

const examples = [
  { type: 'wallet', label: 'Inspect a wallet', example: '0xdd590902cdac0abb4861a6748a256e888acb8d47' },
  { type: 'tx', label: 'Inspect a transaction', example: '0x...' },
  { type: 'block', label: 'Inspect a block', example: '1000000' },
];

export function EntryPoints({ onInspect }: EntryPointsProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2">
      {examples.map((item, i) => (
        <button
          key={item.type}
          onClick={() => onInspect(item.type, item.example)}
          className={cn(
            "text-xs text-muted-foreground/50 hover:text-muted-foreground",
            "transition-colors duration-150",
            "underline-offset-2 hover:underline decoration-muted-foreground/30"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}