import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/market-calculator';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TokenLogo } from './TokenLogo';

interface MarketHeaderProps {
  symbol: string;
  name: string;
  currentPrice: number;
  markPrice: number;
  indexPrice: number;
  change24h: {
    absolute: number;
    percentage: number;
  };
  priceDirection: 'up' | 'down' | 'none';
}

export function MarketHeader({
  symbol,
  name,
  currentPrice,
  markPrice,
  indexPrice,
  change24h,
  priceDirection
}: MarketHeaderProps) {
  const isPositive = change24h.percentage >= 0;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
      {/* Left: Market Info */}
      <div className="flex items-center gap-3">
        <TokenLogo symbol={symbol} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">{name}</h1>
            <Badge variant="secondary" className="text-xs">Perpetual</Badge>
          </div>
        </div>
      </div>

      {/* Center: Price (Hero) */}
      <div className="flex-1 flex flex-col items-start md:items-center">
        <div 
          className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-bold tabular-nums transition-all duration-300",
            priceDirection === 'up' && "text-green-500",
            priceDirection === 'down' && "text-red-500"
          )}
        >
          ${formatPrice(currentPrice)}
        </div>
        
        {/* 24h Change */}
        <div className={cn(
          "flex items-center gap-2 mt-2 text-lg md:text-xl font-medium",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          {isPositive ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
          <span>
            {isPositive ? '+' : ''}${Math.abs(change24h.absolute).toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </span>
          <span>
            ({isPositive ? '+' : ''}{change24h.percentage.toFixed(2)}%)
          </span>
        </div>

        {/* Secondary Prices */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>Mark: ${formatPrice(markPrice)}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>Index: ${formatPrice(indexPrice)}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-xs">Pyth Network</span>
        </div>
      </div>

      {/* Right: Spacer for balance on desktop */}
      <div className="hidden md:block w-[120px]" />
    </div>
  );
}
