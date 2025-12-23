import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink, Copy, Check, Coins, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TokenPriceChart } from '@/components/explorer/TokenPriceChart';
import { TokenLogo } from '@/components/explorer/TokenLogo';
import { useTokenDetails, useTokenCache } from '@/hooks/useTokenCache';

interface TokenData {
  symbol: string;
  name: string;
  address?: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  category: string;
  logoUrl?: string;
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  priceHistory?: { time: number; price: number }[];
  volumeHistory?: { time: number; volume: number }[];
}

export default function TokenDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const { getTokenBySymbol } = useTokenCache();
  const { data: detailedToken, isLoading, error } = useTokenDetails(symbol);
  const [copied, setCopied] = useState(false);

  // Get from cache first for instant display
  const cachedToken = symbol ? getTokenBySymbol(symbol) : undefined;
  const token: TokenData | null = detailedToken || cachedToken || null;

  const formatUsd = (value: number | undefined) => {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    if (value === 0) return '$0.00';
    return `$${value.toPrecision(4)}`;
  };

  const formatSupply = (value: number | undefined) => {
    if (!value) return '-';
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !cachedToken) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link to="/assets">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Token not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/assets">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <TokenLogo symbol={token.symbol} size="lg" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{token.symbol}</h1>
                <Badge variant="secondary">{token.category}</Badge>
                {token.change24h !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      token.change24h >= 0 ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
                    )}
                  >
                    {token.change24h >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{token.name}</p>
              {token.address && (
                <button 
                  onClick={() => handleCopy(token.address!)}
                  className="mt-1 flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {token.address.slice(0, 10)}...{token.address.slice(-8)}
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleCopy(token.symbol)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Symbol
            </Button>
            <a
              href={`https://app.hyperliquid.xyz/trade/${token.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm">
                Trade
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>

        {/* Price Card */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl font-bold font-mono">
                {formatPrice(token.price)}
              </span>
              {token.high24h && token.low24h && (
                <div className="text-sm text-muted-foreground">
                  <span className="text-green-500">H: {formatPrice(token.high24h)}</span>
                  {' / '}
                  <span className="text-red-500">L: {formatPrice(token.low24h)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {(detailedToken?.priceHistory || detailedToken?.volumeHistory) && (
          <TokenPriceChart
            priceHistory={detailedToken.priceHistory}
            volumeHistory={detailedToken.volumeHistory}
            symbol={token.symbol}
            className="mb-6"
          />
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                24h Volume
              </div>
              <p className="text-2xl font-bold font-mono">{formatUsd(token.volume24h)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                Open Interest
              </div>
              <p className="text-2xl font-bold font-mono">{formatUsd(token.openInterest)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Funding Rate</p>
              <p className={cn(
                "text-2xl font-bold font-mono",
                token.fundingRate > 0 ? "text-green-500" : token.fundingRate < 0 ? "text-red-500" : ""
              )}>
                {token.fundingRate > 0 ? '+' : ''}{token.fundingRate.toFixed(4)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
              <p className="text-2xl font-bold font-mono">{formatUsd(token.marketCap)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Supply Info */}
        {(token.circulatingSupply || token.totalSupply) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Supply Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {token.circulatingSupply && (
                  <div>
                    <p className="text-sm text-muted-foreground">Circulating Supply</p>
                    <p className="text-lg font-mono">{formatSupply(token.circulatingSupply)} {token.symbol}</p>
                  </div>
                )}
                {token.totalSupply && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total Supply</p>
                    <p className="text-lg font-mono">{formatSupply(token.totalSupply)} {token.symbol}</p>
                  </div>
                )}
                {token.circulatingSupply && token.totalSupply && (
                  <div>
                    <p className="text-sm text-muted-foreground">% Circulating</p>
                    <p className="text-lg font-mono">
                      {((token.circulatingSupply / token.totalSupply) * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade Link */}
        <Card>
          <CardContent className="flex items-center justify-between py-6 flex-wrap gap-4">
            <div>
              <p className="font-medium">Trade {token.symbol}</p>
              <p className="text-sm text-muted-foreground">Open a position on Hyperliquid</p>
            </div>
            <a
              href={`https://app.hyperliquid.xyz/trade/${token.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>
                Trade on Hyperliquid
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
