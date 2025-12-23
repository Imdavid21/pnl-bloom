import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApiHealthCheck } from '@/hooks/useApiHealthCheck';

const LINKS = [
  { to: '/', label: 'Explorer' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

type StatusType = 'healthy' | 'degraded' | 'down' | 'checking';

// Status indicator - text labels only per spec
function StatusLabel({ status, label }: { status: StatusType; label: string }) {
  const statusText = {
    healthy: 'Operational',
    degraded: 'Degraded',
    down: 'Offline',
    checking: 'Checking...',
  };
  
  return (
    <div className="flex items-center gap-xs">
      <span className={cn(
        "text-caption",
        status === 'healthy' && "text-success",
        status === 'degraded' && "text-warning",
        status === 'down' && "text-error",
        status === 'checking' && "text-muted-foreground"
      )}>
        {statusText[status]}
      </span>
      <span className="text-caption text-muted-foreground">{label}</span>
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
    <footer className="border-t border-border bg-surface/50 mt-auto">
      <div className="mx-auto max-w-[1280px] px-lg py-md">
        <div className="flex flex-col items-center gap-md sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-sm">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background">
              <span className="text-xs font-medium text-foreground">H</span>
            </div>
            <p className="text-caption text-muted-foreground">
              HyperPNL
            </p>
          </div>
          
          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-lg">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-caption text-muted-foreground hover:text-foreground transition-state"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* API Status - text labels only */}
          <div className="flex items-center gap-lg">
            <StatusLabel status={health.hyperevm} label="EVM" />
            <StatusLabel status={hypercoreStatus} label="Core" />
          </div>
        </div>
      </div>
    </footer>
  );
}
