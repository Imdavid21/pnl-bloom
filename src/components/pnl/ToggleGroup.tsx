import { cn } from "@/lib/utils";

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleGroupProps {
  label: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ToggleGroup({ label, options, value, onChange, className }: ToggleGroupProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex rounded-md border border-border bg-secondary/50 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-all duration-200",
              value === option.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
