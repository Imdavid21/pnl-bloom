/**
 * NavBar - Hyperliquid-inspired minimal navigation
 * Delta-4: Keyboard-first, instant access
 */

import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Activity, Menu, X, Command } from 'lucide-react';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NAV_LINKS = [
  { to: '/', label: 'Explorer', shortcut: 'E' },
  { to: '/market', label: 'Markets', shortcut: 'M' },
  { to: '/analytics', label: 'Analytics', shortcut: 'A' },
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
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-3">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-border/50 bg-card/50 group-hover:border-primary/50 transition-colors">
              <Activity className="h-3 w-3 text-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">HyperPNL</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={getLinkTo(link.to)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors relative",
                  isActive(link.to)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-px bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Command Palette trigger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openCommandPalette}
                  className="hidden md:flex items-center gap-2 h-8 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Command className="h-3.5 w-3.5" />
                  <span className="text-xs">Search</span>
                  <kbd className="kbd text-[10px]">⌘K</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Open command palette
              </TooltipContent>
            </Tooltip>
            
            <DarkModeToggle />
            
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
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
          <nav className="md:hidden py-3 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={getLinkTo(link.to)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "text-foreground bg-muted/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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
