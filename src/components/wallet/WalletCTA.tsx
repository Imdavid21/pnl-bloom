/**
 * Wallet CTA - Call to action card
 */

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { CTAConfig } from '@/lib/cta-selector';

interface WalletCTAProps {
  config: CTAConfig;
  address: string;
}

export function WalletCTA({ config, address }: WalletCTAProps) {
  return (
    <Card className="bg-primary/5 border-primary/10">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">{config.icon}</span>
            <div>
              <h3 className="font-medium mb-1">{config.title}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to={config.link}>
              {config.action}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
