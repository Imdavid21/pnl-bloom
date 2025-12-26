/**
 * Copyable Text Component
 * Text with copy-to-clipboard functionality
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyableTextProps {
  text: string;
  displayText?: string;
  className?: string;
  showIcon?: boolean;
}

export function CopyableText({ 
  text, 
  displayText, 
  className,
  showIcon = true 
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 group hover:opacity-80 transition-opacity',
        className
      )}
      title="Click to copy"
    >
      <span className="font-mono">{displayText || text}</span>
      {showIcon && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      )}
    </button>
  );
}
