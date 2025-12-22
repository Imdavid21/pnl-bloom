import { useState, useEffect } from 'react';
import { Clock, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreshnessIndicatorProps {
  lastUpdated: Date | null;
  type?: 'live' | 'derived' | 'raw';
  label?: string;
  showAge?: boolean;
}

export function FreshnessIndicator({ lastUpdated, type = 'live', label, showAge = true }: FreshnessIndicatorProps) {
  const [age, setAge] = useState<string>('');
  const [status, setStatus] = useState<'fresh' | 'stale' | 'old'>('fresh');

  useEffect(() => {
    if (!lastUpdated) return;

    const updateAge = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastUpdated.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffSec < 60) {
        setAge(`${diffSec}s`);
        setStatus('fresh');
      } else if (diffMin < 5) {
        setAge(`${diffMin}m`);
        setStatus('stale');
      } else {
        setAge(`${diffMin}m`);
        setStatus('old');
      }
    };

    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const getStatusIndicator = () => {
    switch (status) {
      case 'fresh':
        return (
          <span className="relative flex h-2 w-2">
            {type === 'live' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-profit-3"></span>
          </span>
        );
      case 'stale':
        return <span className="h-2 w-2 rounded-full bg-yellow-500" />;
      case 'old':
        return <span className="h-2 w-2 rounded-full bg-loss-3" />;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'live':
        return <Zap className="h-3 w-3" />;
      case 'derived':
        return <Clock className="h-3 w-3" />;
      case 'raw':
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  if (!lastUpdated) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        <span>No data</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs",
      status === 'fresh' ? "text-muted-foreground" : status === 'stale' ? "text-yellow-500" : "text-loss-3"
    )}>
      {getStatusIndicator()}
      {label && <span className="text-muted-foreground">{label}</span>}
      {showAge && <span>{age}</span>}
      {getIcon()}
    </div>
  );
}

// Multi-source freshness panel
interface FreshnessSource {
  label: string;
  type: 'live' | 'derived' | 'raw';
  lastUpdated: Date | null;
}

export function FreshnessPanel({ sources }: { sources: FreshnessSource[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
      {sources.map((source, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{source.label}:</span>
          <FreshnessIndicator 
            lastUpdated={source.lastUpdated} 
            type={source.type}
            showAge={true}
          />
        </div>
      ))}
    </div>
  );
}
