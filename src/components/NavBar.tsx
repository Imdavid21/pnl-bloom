import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { to: '/', label: 'Explorer' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

export function NavBar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get current wallet from explorer URL params
  const currentQuery = searchParams.get('q');
  const currentMode = searchParams.get('mode');
  const isWalletMode = currentMode === 'wallet' && currentQuery;

  // Build link with wallet param for Analytics if we're viewing a wallet in Explorer
  const getLinkTo = (baseTo: string) => {
    if (baseTo === '/analytics' && isWalletMode && location.pathname === '/') {
      return `/analytics?wallet=${currentQuery}`;
    }
    return baseTo;
  };

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-[1280px] px-lg">
        <div className="flex items-center justify-between h-14">
          {/* Logo - minimal, outline style */}
          <Link to="/" className="flex items-center gap-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
              <span className="text-sm font-semibold text-foreground">H</span>
            </div>
            <span className="font-medium text-foreground">HyperPNL</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-xl">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={getLinkTo(link.to)}
                className={cn(
                  "text-body font-medium transition-state",
                  location.pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-sm">
            <DarkModeToggle />
            
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-md border-t border-border animate-fade-in">
            <div className="flex flex-col gap-xs">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={getLinkTo(link.to)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-md py-sm rounded-md text-body font-medium transition-state",
                    location.pathname === link.to
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
