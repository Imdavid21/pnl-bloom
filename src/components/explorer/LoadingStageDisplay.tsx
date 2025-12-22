import { Loader2, CheckCircle2, XCircle, Database, Search, GitCompare, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoadingStage } from '@/lib/explorer/types';

interface LoadingStageDisplayProps {
  stage: LoadingStage;
  variant?: 'inline' | 'card' | 'minimal';
  className?: string;
}

const stageIcons = {
  searching: Search,
  fetching: Database,
  reconciling: GitCompare,
  computing: Calculator,
  ready: CheckCircle2,
  error: XCircle,
};

const stageColors = {
  searching: 'text-blue-500',
  fetching: 'text-amber-500',
  reconciling: 'text-purple-500',
  computing: 'text-emerald-500',
  ready: 'text-green-500',
  error: 'text-red-500',
};

export function LoadingStageDisplay({ 
  stage, 
  variant = 'card',
  className 
}: LoadingStageDisplayProps) {
  if (stage.stage === 'ready') return null;
  
  const Icon = stageIcons[stage.stage];
  const color = stageColors[stage.stage];
  
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {stage.stage !== 'error' ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", color)} />
        ) : (
          <Icon className={cn("h-4 w-4", color)} />
        )}
        <span className="text-sm text-muted-foreground">{stage.message}</span>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
        "bg-muted/50 border border-border/50",
        className
      )}>
        {stage.stage !== 'error' ? (
          <Loader2 className={cn("h-3 w-3 animate-spin", color)} />
        ) : (
          <Icon className={cn("h-3 w-3", color)} />
        )}
        <span className="text-muted-foreground">{stage.message}</span>
        {stage.progress !== undefined && (
          <span className={cn("font-medium", color)}>{stage.progress}%</span>
        )}
      </div>
    );
  }
  
  // Card variant (default)
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg",
      "bg-gradient-to-r from-muted/30 to-muted/10",
      "border border-border/50",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full",
        "bg-background border border-border/50"
      )}>
        {stage.stage !== 'error' ? (
          <Loader2 className={cn("h-5 w-5 animate-spin", color)} />
        ) : (
          <Icon className={cn("h-5 w-5", color)} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{stage.message}</p>
        {stage.source && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Fetching from {stage.source}
          </p>
        )}
      </div>
      
      {stage.progress !== undefined && (
        <div className="flex flex-col items-end gap-1">
          <span className={cn("text-sm font-medium", color)}>{stage.progress}%</span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-300 rounded-full", {
                "bg-blue-500": stage.stage === 'searching',
                "bg-amber-500": stage.stage === 'fetching',
                "bg-purple-500": stage.stage === 'reconciling',
                "bg-emerald-500": stage.stage === 'computing',
              })}
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Multi-stage progress for showing all stages
interface MultiStageProgressProps {
  stages: { label: string; status: 'pending' | 'active' | 'complete' | 'error' }[];
  className?: string;
}

export function MultiStageProgress({ stages, className }: MultiStageProgressProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
            {
              "bg-muted/30 text-muted-foreground": stage.status === 'pending',
              "bg-primary/20 text-primary": stage.status === 'active',
              "bg-green-500/20 text-green-500": stage.status === 'complete',
              "bg-red-500/20 text-red-500": stage.status === 'error',
            }
          )}>
            {stage.status === 'active' && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {stage.status === 'complete' && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {stage.status === 'error' && (
              <XCircle className="h-3 w-3" />
            )}
            {stage.label}
          </div>
          {i < stages.length - 1 && (
            <div className={cn(
              "w-4 h-px mx-1",
              stage.status === 'complete' ? "bg-green-500/50" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
