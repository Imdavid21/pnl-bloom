import { Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { buildEntityLink, shortenAddress, shortenHash, type EntityType } from '@/lib/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EntityLinkProps {
  type: EntityType;
  identifier: string;
  children?: React.ReactNode;
  className?: string;
  showCopy?: boolean;
  truncate?: boolean;
  truncateChars?: number;
}

export function EntityLink({
  type,
  identifier,
  children,
  className,
  showCopy = false,
  truncate = true,
  truncateChars = 4,
}: EntityLinkProps) {
  const [copied, setCopied] = useState(false);
  const href = buildEntityLink(type, identifier);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed
    }
  };

  const displayText = children || (
    truncate 
      ? (type === 'wallet' || type === 'token' 
          ? shortenAddress(identifier, truncateChars)
          : type === 'tx' || type === 'trade'
            ? shortenHash(identifier, truncateChars + 2)
            : identifier)
      : identifier
  );

  return (
    <span className="inline-flex items-center gap-1 group">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={href}
            className={cn(
              "font-mono text-primary hover:underline transition-colors",
              className
            )}
          >
            {displayText}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{identifier}</p>
        </TooltipContent>
      </Tooltip>
      
      {showCopy && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
          title={copied ? 'Copied!' : 'Copy'}
        >
          {copied ? (
            <Check className="h-3 w-3 text-profit-3" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}
    </span>
  );
}

// Convenience components for common entity types
export function WalletLink({ 
  address, 
  children,
  ...props 
}: Omit<EntityLinkProps, 'type' | 'identifier'> & { address: string }) {
  return (
    <EntityLink type="wallet" identifier={address} {...props}>
      {children}
    </EntityLink>
  );
}

export function TransactionLink({ 
  hash, 
  children,
  ...props 
}: Omit<EntityLinkProps, 'type' | 'identifier'> & { hash: string }) {
  const type = /^0x[a-f0-9]{64}$/i.test(hash) ? 'tx' : 'trade';
  return (
    <EntityLink type={type} identifier={hash} {...props}>
      {children}
    </EntityLink>
  );
}

export function MarketLink({ 
  symbol, 
  children,
  ...props 
}: Omit<EntityLinkProps, 'type' | 'identifier'> & { symbol: string }) {
  return (
    <EntityLink type="market" identifier={symbol} {...props}>
      {children || symbol.replace(/-PERP$/i, '').toUpperCase()}
    </EntityLink>
  );
}

export function TokenLink({ 
  identifier, 
  children,
  ...props 
}: Omit<EntityLinkProps, 'type' | 'identifier'> & { identifier: string }) {
  return (
    <EntityLink type="token" identifier={identifier} {...props}>
      {children}
    </EntityLink>
  );
}

export function BlockLink({ 
  number, 
  children,
  ...props 
}: Omit<EntityLinkProps, 'type' | 'identifier'> & { number: number | string }) {
  return (
    <EntityLink type="block" identifier={String(number)} {...props}>
      {children || `#${Number(number).toLocaleString()}`}
    </EntityLink>
  );
}
