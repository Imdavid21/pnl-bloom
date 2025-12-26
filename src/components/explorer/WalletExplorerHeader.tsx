import { Copy, Check, Wallet, Layers, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WalletExplorerHeaderProps {
  address: string;
  hasHypercore: boolean;
  hasHyperevm: boolean;
  isContract?: boolean;
}

export function WalletExplorerHeader({
  address,
  hasHypercore,
  hasHyperevm,
  isContract,
}: WalletExplorerHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = address;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const truncatedAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        {/* Entity type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs font-medium">
            <Wallet className="h-3 w-3" />
            Wallet
          </Badge>
          
          {/* Chain badges */}
          {hasHypercore && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
              <Layers className="h-3 w-3" />
              HyperCore
            </Badge>
          )}
          {hasHyperevm && (
            <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 gap-1">
              <Box className="h-3 w-3" />
              HyperEVM
            </Badge>
          )}
          {isContract && (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Contract
            </Badge>
          )}
        </div>

        {/* Address with copy */}
        <div className="flex items-center gap-2">
          <code className="text-lg sm:text-xl font-mono font-medium text-foreground/90">
            {truncatedAddress}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              "h-8 w-8 p-0 transition-colors",
              copied && "text-green-500"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
