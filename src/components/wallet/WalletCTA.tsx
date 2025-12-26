/**
 * Wallet CTA - Terminal style CTA section
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CTAConfig } from '@/lib/cta-selector';

interface WalletCTAProps {
  config: CTAConfig;
  address: string;
}

export function WalletCTA({ config, address }: WalletCTAProps) {
  return (
    <div className="panel p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="space-y-1">
            <h3 className="font-mono text-sm font-medium text-foreground">
              {config.title}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider max-w-xs">
              {config.description}
            </p>
          </div>
        </div>
        <Button size="sm" className="h-8 text-xs font-mono shrink-0" asChild>
          <Link to={config.link}>
            {config.action}
            <ArrowRight className="h-3 w-3 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}