import { ExternalLink, Bell, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MarketSidebarProps {
  symbol: string;
  specs: {
    tickSize: number;
    minOrderSize: number;
    maxLeverage: number;
    makerFee: number;
    takerFee: number;
  };
  fundingRate: number;
}

export function MarketSidebar({ symbol, specs, fundingRate }: MarketSidebarProps) {
  const specsList = [
    { label: 'Tick Size', value: `$${specs.tickSize}` },
    { label: 'Min Order Size', value: `${specs.minOrderSize} ${symbol}` },
    { label: 'Max Leverage', value: `${specs.maxLeverage}x` },
    { label: 'Maker Fee', value: `${(specs.makerFee * 100).toFixed(2)}%` },
    { label: 'Taker Fee', value: `${(specs.takerFee * 100).toFixed(2)}%` },
  ];

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4 sticky top-4">
      {/* Market Specs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Market Specs
        </h3>
        <div className="space-y-2">
          {specsList.map((spec) => (
            <div key={spec.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{spec.label}</span>
              <span className="font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Funding History Mini Chart */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Funding (24h)
        </h3>
        <div className="h-16 flex items-end justify-between gap-1">
          {/* Simple bar representation of funding rates */}
          {Array.from({ length: 24 }).map((_, i) => {
            // Generate mock funding data for visualization
            const rate = Math.random() * 0.02 - 0.01;
            const isPositive = rate >= 0;
            const height = Math.abs(rate) * 2000;
            
            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${
                  isPositive ? 'bg-green-500/50' : 'bg-red-500/50'
                }`}
                style={{ height: `${Math.max(height, 4)}px` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>24h ago</span>
          <span>Now</span>
        </div>
      </div>

      <Separator />

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Links
        </h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={() => window.open(`https://app.hyperliquid.xyz/trade/${symbol}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Trade on Hyperliquid
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
            onClick={() => window.open('https://hyperliquid.gitbook.io/hyperliquid-docs/', '_blank')}
          >
            <BookOpen className="h-4 w-4" />
            API Docs
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2"
          >
            <Bell className="h-4 w-4" />
            Set Price Alert
          </Button>
        </div>
      </div>
    </div>
  );
}
