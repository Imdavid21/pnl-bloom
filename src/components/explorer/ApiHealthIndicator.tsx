import { RefreshCw, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ApiHealth } from '@/hooks/useApiHealthCheck';

interface ApiHealthIndicatorProps {
  health: ApiHealth;
  onRefresh: () => void;
}

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'text-profit-3', bg: 'bg-profit-3/20', label: 'Operational' },
  degraded: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/20', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-loss-3', bg: 'bg-loss-3/20', label: 'Down' },
  checking: { icon: Loader2, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Checking' },
};

function StatusDot({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.bg)}>
      <Icon className={cn('h-3 w-3', config.color, status === 'checking' && 'animate-spin')} />
      <span className={config.color}>{config.label}</span>
    </div>
  );
}

export function ApiHealthIndicator({ health, onRefresh }: ApiHealthIndicatorProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return 'never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card/50">
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">HyperEVM</span>
                <StatusDot status={health.hyperevm} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>HyperEVM - EVM-compatible chain for smart contracts</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Perps</span>
                <StatusDot status={health.hypercore} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Hypercore - Perpetuals and spot trading</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Spot</span>
                <StatusDot status={health.spot} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Spot trading on Hypercore</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">
          Updated {formatTime(health.lastChecked)}
        </span>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 w-6 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
