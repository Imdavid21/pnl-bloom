import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const LINKS = [
  { to: '/', label: 'PnL' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background">
              <Activity className="h-3 w-3 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              HyperPNL • Hyperliquid Analytics
            </p>
          </div>
          
          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}