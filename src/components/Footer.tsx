import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApiHealthCheck } from '@/hooks/useApiHealthCheck';

const LINKS = [
  { to: '/', label: 'PnL' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/assets', label: 'Assets' },
  { to: '/api', label: 'API' },
  { to: '/docs', label: 'Docs' },
];

type StatusType = 'healthy' | 'degraded' | 'down' | 'checking';

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'text-profit-3' },
  degraded: { icon: AlertCircle, color: 'text-warning' },
  down: { icon: XCircle, color: 'text-loss-3' },
  checking: { icon: Loader2, color: 'text-muted-foreground' },
};

function StatusDot({ status, label }: { status: StatusType; label: string }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const statusLabel = status === 'healthy' ? '●' : status === 'degraded' ? '◐' : status === 'down' ? '○' : '◌';
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('text-[10px]', config.color)}>{statusLabel}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
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
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-border bg-background">
              <Activity className="h-2.5 w-2.5 text-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              HyperPNL
            </p>
          </div>
          
          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* API Status - minimal */}
          <div className="flex items-center gap-3">
            <StatusDot status={health.hyperevm} label="EVM" />
            <StatusDot status={hypercoreStatus} label="Core" />
          </div>
        </div>
      </div>
    </footer>
  );
}