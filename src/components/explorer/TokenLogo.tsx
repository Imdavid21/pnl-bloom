import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getTokenLogoUrl, FALLBACK_TOKEN_LOGO } from '@/lib/tokenLogos';

interface TokenLogoProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackIcon?: boolean;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

export function TokenLogo({ 
  symbol, 
  size = 'md', 
  className,
  showFallbackIcon = true 
}: TokenLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const logoUrl = getTokenLogoUrl(symbol);
  
  if (imgError && showFallbackIcon) {
    // Fallback to symbol initial
    return (
      <div 
        className={cn(
          "rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground font-medium",
          sizeClasses[size],
          className
        )}
      >
        <span className="text-[0.6em] uppercase">{symbol.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {isLoading && (
        <div className={cn(
          "absolute inset-0 rounded-full bg-muted/30 animate-pulse",
          sizeClasses[size]
        )} />
      )}
      <img
        src={imgError ? FALLBACK_TOKEN_LOGO : logoUrl}
        alt={`${symbol} logo`}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          isLoading && "opacity-0"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setImgError(true);
        }}
      />
    </div>
  );
}

// Multi-token stack display (for pools, pairs, etc.)
interface TokenLogoStackProps {
  symbols: string[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  className?: string;
}

export function TokenLogoStack({ 
  symbols, 
  size = 'sm', 
  maxDisplay = 3,
  className 
}: TokenLogoStackProps) {
  const displaySymbols = symbols.slice(0, maxDisplay);
  const remaining = symbols.length - maxDisplay;
  
  const overlapClasses = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  return (
    <div className={cn("flex items-center", className)}>
      {displaySymbols.map((symbol, index) => (
        <TokenLogo
          key={symbol}
          symbol={symbol}
          size={size}
          className={cn(
            "ring-2 ring-background",
            index > 0 && overlapClasses[size]
          )}
        />
      ))}
      {remaining > 0 && (
        <div 
          className={cn(
            "rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground text-[0.6em] font-medium ring-2 ring-background",
            sizeClasses[size],
            overlapClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
