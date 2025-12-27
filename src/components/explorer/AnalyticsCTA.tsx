/**
 * Analytics CTA
 * Contextual call-to-action to convert explorer users to analytics
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type CTAConfig, isCTADismissed, dismissCTA } from '@/lib/cta-selector';

interface AnalyticsCTAProps {
  config: CTAConfig;
  address: string;
}

function getVariantStyles(variant: CTAConfig['variant']) {
  switch (variant) {
    case 'profitable_wallet':
      return {
        bg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
        border: 'border-emerald-500/30',
        button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      };
    case 'risk_alert':
      return {
        bg: 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
        border: 'border-amber-500/30',
        button: 'bg-amber-600 hover:bg-amber-700 text-white',
      };
    case 'active_trader':
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
        border: 'border-blue-500/30',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30',
        border: 'border-border',
        button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      };
  }
}

export function AnalyticsCTA({ config, address }: AnalyticsCTAProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const Icon = config.icon;

  useEffect(() => {
    // Check if dismissed on mount
    setIsDismissed(isCTADismissed(address, config.variant));
  }, [address, config.variant]);

  const handleDismiss = () => {
    dismissCTA(address, config.variant);
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  const styles = getVariantStyles(config.variant);

  return (
    <div className={cn(
      'relative rounded-xl border-2 p-6 transition-all',
      styles.bg,
      styles.border
    )}>
      {/* Dismiss Button */}
      {config.dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Icon */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 flex-shrink-0">
          <Icon className="h-8 w-8 text-primary" />
        </div>

        {/* Text */}
        <div className="flex-grow space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {config.description}
          </p>
        </div>

        {/* Button */}
        <Button asChild className={cn('flex-shrink-0', styles.button)}>
          <Link to={config.link}>
            {config.action}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
