import { useState } from 'react';
import { Scale, Plus, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EntityCompareProps {
  currentType: 'wallet' | 'tx' | 'block' | 'token';
  currentId: string;
  onCompare?: (id: string) => void;
}

export function EntityCompare({ currentType, currentId, onCompare }: EntityCompareProps) {
  const [open, setOpen] = useState(false);
  const [compareId, setCompareId] = useState('');
  
  const handleCompare = () => {
    if (compareId.trim() && onCompare) {
      onCompare(compareId.trim());
      setOpen(false);
      setCompareId('');
    }
  };
  
  const getPlaceholder = () => {
    switch (currentType) {
      case 'wallet': return 'Enter wallet address to compare...';
      case 'tx': return 'Enter transaction hash to compare...';
      case 'block': return 'Enter block number to compare...';
      case 'token': return 'Enter token symbol to compare...';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Scale className="h-4 w-4" />
          Compare
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compare {currentType}s</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Current entity */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Current {currentType}</p>
              <p className="font-mono text-sm truncate">{currentId}</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>
          
          {/* Compare entity */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Compare with</p>
            <div className="flex gap-2">
              <Input
                placeholder={getPlaceholder()}
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                className="font-mono text-sm"
              />
              <Button onClick={handleCompare} disabled={!compareId.trim()}>
                Compare
              </Button>
            </div>
          </div>
          
          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Open both entities side by side to compare their details
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact comparison badge for entity cards
interface CompareableProps {
  isSelected: boolean;
  onToggle: () => void;
  className?: string;
}

export function CompareToggle({ isSelected, onToggle, className }: CompareableProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
    >
      {isSelected ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
    </button>
  );
}
