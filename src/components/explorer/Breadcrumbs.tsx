import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shortenAddress, shortenHash } from '@/lib/navigation';

export interface Breadcrumb {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto", className)}
    >
      <Link 
        to="/" 
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only md:not-sr-only">Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast || !item.href ? (
              <span className={cn(
                "truncate max-w-[150px] md:max-w-[200px]",
                isLast && "font-medium text-foreground"
              )}>
                {item.icon}
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.href}
                className="hover:text-foreground transition-colors truncate max-w-[150px] md:max-w-[200px]"
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Helper function to generate breadcrumbs for common page types
export function generateBreadcrumbs(
  pageType: 'wallet' | 'tx' | 'trade' | 'market' | 'token' | 'block',
  identifier: string,
  previousContext?: { type: string; identifier: string }
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];

  // Add previous context if navigated from another entity
  if (previousContext) {
    switch (previousContext.type) {
      case 'wallet':
        crumbs.push({
          label: `Wallet ${shortenAddress(previousContext.identifier)}`,
          href: `/wallet/${previousContext.identifier}`,
        });
        break;
      case 'market':
        crumbs.push({
          label: `${previousContext.identifier} Market`,
          href: `/market/${previousContext.identifier}`,
        });
        break;
      case 'block':
        crumbs.push({
          label: `Block #${previousContext.identifier}`,
          href: `/block/${previousContext.identifier}`,
        });
        break;
    }
  }

  // Add current page
  switch (pageType) {
    case 'wallet':
      crumbs.push({
        label: `Wallet ${shortenAddress(identifier)}`,
      });
      break;
    case 'tx':
      crumbs.push({
        label: `Transaction ${shortenHash(identifier)}`,
      });
      break;
    case 'trade':
      crumbs.push({
        label: `Trade ${shortenHash(identifier, 4)}`,
      });
      break;
    case 'market':
      crumbs.push({
        label: `${identifier.toUpperCase()} Market`,
      });
      break;
    case 'token':
      crumbs.push({
        label: identifier.startsWith('0x') 
          ? `Token ${shortenAddress(identifier)}` 
          : `${identifier.toUpperCase()} Token`,
      });
      break;
    case 'block':
      crumbs.push({
        label: `Block #${Number(identifier).toLocaleString()}`,
      });
      break;
  }

  return crumbs;
}
