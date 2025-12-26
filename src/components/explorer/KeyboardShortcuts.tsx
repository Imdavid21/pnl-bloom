import { X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KEYBOARD_SHORTCUTS } from '@/lib/navigation';

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {Object.entries(KEYBOARD_SHORTCUTS).map(([key, description]) => (
            <div 
              key={key}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-medium">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">?</kbd> to toggle this dialog
        </p>
      </div>
    </div>
  );
}
