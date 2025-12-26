/**
 * Footer - Terminal aesthetic minimal footer
 */

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApiHealthCheck } from '@/hooks/useApiHealthCheck';

const LINKS = [
  { to: '/', label: 'Explorer' },
  { to: '/market', label: 'Markets' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

type StatusType = 'healthy' | 'degraded' | 'down' | 'checking';

function StatusDot({ status, label }: { status: StatusType; label: string }) {
  const colors = {
    healthy: 'bg-up',
    degraded: 'bg-warning',
    down: 'bg-down',
    checking: 'bg-muted-foreground animate-pulse',
  };
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', colors[status])} />
      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function combineStatus(a: StatusType, b: StatusType): StatusType {
  if (a === 'down' || b === 'down') return 'down';
  if (a === 'degraded' || b === 'degraded') return 'degraded';
  if (a === 'checking' || b === 'checking') return 'checking';
  return 'healthy';
}

export function Footer() {
  const { health } = useApiHealthCheck();
  const hypercoreStatus = combineStatus(health.hypercore, health.spot);

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              HYPERPNL
            </span>
            <span className="text-[9px] text-muted-foreground/40 font-mono">
              v1.0
            </span>
          </div>
          
          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-3">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[9px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors uppercase tracking-wider"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* API Status */}
          <div className="flex items-center gap-3">
            <StatusDot status={health.hyperevm} label="EVM" />
            <StatusDot status={hypercoreStatus} label="Core" />
          </div>
        </div>
      </div>
    </footer>
  );
}
