import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  iconSize?: number;
}

export function ExternalLink({ 
  href, 
  children, 
  className,
  showIcon = true,
  iconSize = 12,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-primary hover:underline transition-colors",
        className
      )}
    >
      {children}
      {showIcon && (
        <ExternalLinkIcon 
          className="shrink-0 opacity-60" 
          style={{ width: iconSize, height: iconSize }} 
        />
      )}
    </a>
  );
}

// Pre-configured external links for common destinations
export function HyperliquidTradeLink({ 
  symbol, 
  children,
  className,
}: { 
  symbol: string; 
  children?: React.ReactNode;
  className?: string;
}) {
  const cleanSymbol = symbol.replace(/-PERP$/i, '').toUpperCase();
  const href = `https://app.hyperliquid.xyz/trade/${cleanSymbol}`;
  
  return (
    <ExternalLink href={href} className={className}>
      {children || `Trade ${cleanSymbol} on Hyperliquid`}
    </ExternalLink>
  );
}

export function BlockExplorerLink({
  type,
  identifier,
  children,
  className,
}: {
  type: 'tx' | 'block' | 'address';
  identifier: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const baseUrl = 'https://hypurrscan.io';
  const href = `${baseUrl}/${type === 'address' ? 'address' : type}/${identifier}`;
  
  return (
    <ExternalLink href={href} className={className}>
      {children || `View on Hypurrscan`}
    </ExternalLink>
  );
}
