import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
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
    <header className="border-b border-border bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background">
              <Activity className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="font-semibold text-foreground">HyperPNL</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={getLinkTo(link.to)}
                className={cn(
                  "text-sm font-medium transition-colors",
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
          <div className="flex items-center gap-2">
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
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={getLinkTo(link.to)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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