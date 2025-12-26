import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TokenLogo } from './TokenLogo';
import { CopyableText } from './CopyableText';
import { checkPegHealth } from '@/lib/token-aggregator';

interface TokenHeaderProps {
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: { absolute: number; percentage: number };
  priceDirection: 'up' | 'down' | 'none';
  priceSource: 'oracle' | 'dex' | 'spot';
  chains: { hypercore: boolean; hyperevm: boolean };
  hyperevmAddress?: string;
  type?: 'stablecoin' | 'governance' | 'utility' | 'wrapped' | null;
}

export function TokenHeader({
  symbol,
  name,
  currentPrice,
  change24h,
  priceDirection,
  priceSource,
  chains,
  hyperevmAddress,
  type,
}: TokenHeaderProps) {
  const isPositive = change24h.percentage >= 0;
  const pegHealth = type === 'stablecoin' ? checkPegHealth(symbol, currentPrice) : null;

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
      {/* Left: Token Info */}
      <div className="flex items-start gap-4">
        <TokenLogo symbol={symbol} size="lg" className="h-16 w-16" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg text-muted-foreground">{symbol}</span>
            {type && (
              <Badge variant="outline" className="text-xs capitalize">
                {type}
              </Badge>
            )}
          </div>
          
          {hyperevmAddress && (
            <div className="mt-2">
              <CopyableText 
                text={hyperevmAddress}
                displayText={`${hyperevmAddress.slice(0, 10)}...${hyperevmAddress.slice(-8)}`}
                className="text-sm font-mono text-muted-foreground"
              />
            </div>
          )}

          {/* Chain badges */}
          <div className="flex items-center gap-2 mt-3">
            {chains.hypercore && (
              <Badge variant="secondary" className="text-xs">
                HyperCore Spot
              </Badge>
            )}
            {chains.hyperevm && (
              <Badge variant="secondary" className="text-xs">
                HyperEVM ERC20
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Right: Price */}
      <div className="flex flex-col items-start md:items-end">
        <div
          className={cn(
            "text-3xl md:text-4xl font-bold tabular-nums transition-colors duration-300",
            priceDirection === 'up' && "text-green-500",
            priceDirection === 'down' && "text-red-500"
          )}
        >
          ${formatPrice(currentPrice)}
        </div>

        {/* 24h Change */}
        <div className={cn(
          "flex items-center gap-1 mt-1 text-base font-medium",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}${Math.abs(change24h.absolute).toFixed(
              currentPrice >= 1 ? 2 : 6
            )}
          </span>
          <span>
            ({isPositive ? '+' : ''}{change24h.percentage.toFixed(2)}%)
          </span>
        </div>

        {/* Price source */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {priceSource === 'oracle' ? 'Pyth Oracle' : priceSource === 'dex' ? 'DEX Price' : 'Spot Trade'}
          </Badge>
          
          {/* Peg health for stablecoins */}
          {pegHealth && (
            <Badge 
              variant={pegHealth.healthy ? "outline" : "destructive"} 
              className="text-xs"
            >
              {pegHealth.healthy ? '✓ Pegged' : `⚠ ${pegHealth.deviation.toFixed(2)}% off-peg`}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
