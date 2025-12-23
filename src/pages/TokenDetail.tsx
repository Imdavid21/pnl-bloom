import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { proxyRequest } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  category: string;
  markPrice?: number;
  indexPrice?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
}

export default function TokenDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setError('');
      
      try {
        const [metaData, midsData] = await Promise.all([
          proxyRequest({ type: 'metaAndAssetCtxs' }),
          proxyRequest({ type: 'allMids' }),
        ]);

        if (metaData && Array.isArray(metaData) && metaData.length >= 2) {
          const meta = metaData[0];
          const assetCtxs = metaData[1];

          const index = meta.universe?.findIndex(
            (a: any) => a.name.toLowerCase() === symbol.toLowerCase()
          );

          if (index !== undefined && index >= 0) {
            const asset = meta.universe[index];
            const ctx = assetCtxs[index];
            const midPrice = midsData?.[asset.name] ? parseFloat(midsData[asset.name]) : 0;

            setToken({
              symbol: asset.name,
              name: asset.name,
              price: midPrice,
              volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
              openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0,
              fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
              markPrice: ctx?.markPx ? parseFloat(ctx.markPx) : midPrice,
              category: categorizeToken(asset.name),
            });
          } else {
            setError('Token not found');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load token data');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [symbol]);

  const categorizeToken = (sym: string): string => {
    const lower = sym.toLowerCase();
    if (lower.startsWith('k')) return 'kAsset';
    if (['btc', 'eth', 'ltc', 'xrp'].includes(lower)) return 'Major';
    if (['sol', 'avax', 'bnb', 'ada', 'dot', 'atom', 'near', 'apt', 'sui', 'sei', 'ton'].includes(lower)) return 'L1';
    if (['arb', 'op', 'matic', 'strk', 'zk'].includes(lower)) return 'L2';
    if (['link', 'uni', 'aave', 'crv', 'dydx', 'ldo', 'jup', 'pendle', 'hype'].includes(lower)) return 'DeFi';
    if (['doge', 'pepe', 'wif', 'bonk', 'floki', 'meme', 'brett'].includes(lower)) return 'Meme';
    if (['ai16z', 'aixbt', 'virtual', 'render', 'io', 'act'].includes(lower)) return 'AI';
    return 'Other';
  };

  const formatUsd = (value: number) => {
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

  const handleCopy = () => {
    if (symbol) {
      navigator.clipboard.writeText(symbol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
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
              <p className="text-muted-foreground">{error || 'Token not found'}</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/assets">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl font-bold text-primary">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{token.symbol}</h1>
                <Badge variant="secondary">{token.category}</Badge>
              </div>
              <p className="text-muted-foreground">{token.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy Symbol
          </Button>
        </div>

        {/* Price Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono">
              {formatPrice(token.price)}
            </div>
            {token.markPrice && token.markPrice !== token.price && (
              <p className="mt-2 text-sm text-muted-foreground">
                Mark Price: {formatPrice(token.markPrice)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">24h Volume</p>
              <p className="text-2xl font-bold font-mono">{formatUsd(token.volume24h)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Open Interest</p>
              <p className="text-2xl font-bold font-mono">{formatUsd(token.openInterest)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Funding Rate</p>
              <p className={cn(
                "text-2xl font-bold font-mono",
                token.fundingRate > 0 ? "text-green-600" : token.fundingRate < 0 ? "text-red-600" : ""
              )}>
                {token.fundingRate > 0 ? '+' : ''}{token.fundingRate.toFixed(4)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline" className="mt-2 text-lg">
                {token.category}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Trade Link */}
        <Card className="mt-6">
          <CardContent className="flex items-center justify-between py-6">
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
