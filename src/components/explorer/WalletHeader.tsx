/**
 * Wallet Header Component
 * Minimal: Address + domain badges + actions
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface WalletHeaderProps {
  address: string;
  domains: {
    hypercore: boolean;
    hyperevm: boolean;
  };
  firstSeen: Date | null;
  lastActive: Date | null;
  tradesCount?: number;
}

export function WalletHeader({ 
  address, 
  domains, 
  firstSeen, 
  lastActive,
  tradesCount = 0,
}: WalletHeaderProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const showAnalytics = tradesCount > 10;
  
  return (
    <div className="w-full space-y-2">
      {/* Main row: Address + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Address with copy */}
        <div className="flex items-center gap-2 group">
          <span className="font-mono text-base md:text-lg font-medium text-foreground/90 tracking-tight">
            {address}
          </span>
          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded-md transition-all duration-200",
              "text-muted-foreground/40 hover:text-foreground/70",
              "hover:bg-muted/30",
              "opacity-0 group-hover:opacity-100"
            )}
            aria-label="Copy address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Domain badges + Actions */}
        <div className="flex items-center gap-3">
          {/* Domain badges */}
          <div className="flex items-center gap-1.5">
            {domains.hypercore && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted/40 text-muted-foreground/70">
                HyperCore
              </span>
            )}
            {domains.hyperevm && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted/40 text-muted-foreground/70">
                HyperEVM
              </span>
            )}
          </div>
          
          {/* Analytics button */}
          {showAnalytics && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs"
            >
              <Link to={`/analytics/${address}`}>
                View Analytics →
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      {/* Activity timestamps */}
      {(firstSeen || lastActive) && (
        <p className="text-xs text-muted-foreground/50">
          {firstSeen && (
            <span>First seen {formatDistanceToNow(firstSeen, { addSuffix: true })}</span>
          )}
          {firstSeen && lastActive && <span> • </span>}
          {lastActive && (
            <span>Last active {formatDistanceToNow(lastActive, { addSuffix: true })}</span>
          )}
        </p>
      )}
    </div>
  );
}
