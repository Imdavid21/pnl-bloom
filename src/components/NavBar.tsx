/**
 * NavBar - Terminal aesthetic navigation
 */

import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Menu, X, Command } from 'lucide-react';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { to: '/', label: 'Explorer' },
  { to: '/market', label: 'Markets' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

export function NavBar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentQuery = searchParams.get('q');
  const currentMode = searchParams.get('mode');
  const isWalletMode = currentMode === 'wallet' && currentQuery;

  const getLinkTo = (baseTo: string) => {
    if (baseTo === '/analytics' && isWalletMode && location.pathname === '/') {
      return `/analytics?wallet=${currentQuery}`;
    }
    return baseTo;
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const openCommandPalette = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-11">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
              HYPERPNL
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider hidden sm:inline">
              Explorer
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={getLinkTo(link.to)}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono font-medium transition-colors relative",
                  isActive(link.to)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-px bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* Command Palette trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openCommandPalette}
              className="hidden md:flex items-center gap-1.5 h-7 px-2 text-muted-foreground hover:text-foreground font-mono"
            >
              <Command className="h-3 w-3" />
              <span className="text-[10px]">Search</span>
              <kbd className="text-[9px] font-mono text-muted-foreground/50 bg-muted/30 px-1 py-0.5 rounded border border-border/50">
                K
              </kbd>
            </Button>
            
            <DarkModeToggle />
            
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-7 w-7"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-2 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={getLinkTo(link.to)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 text-xs font-mono font-medium transition-colors",
                    isActive(link.to)
                      ? "text-foreground bg-muted/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
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
