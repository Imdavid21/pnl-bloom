import { useState } from 'react';
import { Lock, Search, TrendingUp, Hash, Type, Loader2, RefreshCw, ExternalLink, Check, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { TokenLogo } from '@/components/explorer/TokenLogo';

interface TokenInfo {
  symbol: string;
  name: string;
  address?: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  category: string;
  assetId?: string;
  logoUrl?: string;
  marketCap?: number;
  change24h?: number;
}

const ADMIN_PASSWORD = '1234';

export default function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchName, setSearchName] = useState('');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Invalid password');
    }
  };

  const fetchTokens = async (action: string, params: Record<string, string> = {}) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        password: ADMIN_PASSWORD,
        action,
        ...params,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-tokens?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tokens');
      }

      setTokens(Array.isArray(result.data) ? result.data : result.data ? [result.data] : []);
    } catch (err: any) {
      setError(err.message);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTopTokens = () => {
    fetchTokens('top-tokens', { timeframe });
  };

  const handleSearchByAddress = () => {
    if (!searchAddress.trim()) return;
    fetchTokens('by-address', { address: searchAddress.trim() });
  };

  const handleSearchByName = () => {
    if (!searchName.trim()) return;
    fetchTokens('by-name', { name: searchName.trim() });
  };

  const handleTokenClick = (symbol: string) => {
    navigate(`/assets/${symbol}`);
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

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedSymbol(text);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  if (!authenticated) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>Enter password to access admin panel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                <Button className="w-full" onClick={handleLogin}>
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Token Admin</h1>
          <p className="text-sm text-muted-foreground">
            Query and manage token data from Hyperliquid. Click any token to view details.
          </p>
        </div>

        <Tabs defaultValue="top" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="top" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Tokens
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              By Address
            </TabsTrigger>
            <TabsTrigger value="name" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              By Name
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Tokens by Volume</CardTitle>
                <CardDescription>Fetch top tokens ranked by trading volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleFetchTopTokens} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Fetch Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search by Token Address</CardTitle>
                <CardDescription>Find token details using contract address</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="0x..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    className="max-w-md font-mono"
                  />
                  <Button onClick={handleSearchByAddress} disabled={loading || !searchAddress.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="name" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search by Token Name</CardTitle>
                <CardDescription>Find all tokens matching a name (returns multiple if found)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Token name or symbol..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="max-w-md"
                  />
                  <Button onClick={handleSearchByName} disabled={loading || !searchName.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Results ({tokens.length})</h2>
              <Link to="/assets">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Assets
                </Button>
              </Link>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Token</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Price</th>
                    <th className="px-4 py-3 text-right font-medium">24h Change</th>
                    <th className="px-4 py-3 text-right font-medium">24h Volume</th>
                    <th className="px-4 py-3 text-right font-medium">Market Cap</th>
                    <th className="px-4 py-3 text-right font-medium">Funding</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tokens.map((token, idx) => (
                    <tr 
                      key={`${token.symbol}-${idx}`} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleTokenClick(token.symbol)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <TokenLogo symbol={token.symbol} size="sm" />
                          <div>
                            <p className="font-medium">{token.symbol}</p>
                            <p className="text-xs text-muted-foreground">{token.name}</p>
                            {token.address && (
                              <p className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                                {token.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {token.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatPrice(token.price)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-mono",
                        token.change24h && token.change24h > 0 ? "text-green-500" : 
                        token.change24h && token.change24h < 0 ? "text-red-500" : ""
                      )}>
                        {token.change24h !== undefined ? (
                          `${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%`
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatUsd(token.volume24h)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {token.marketCap ? formatUsd(token.marketCap) : '-'}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-mono",
                        token.fundingRate > 0 ? "text-green-500" : token.fundingRate < 0 ? "text-red-500" : ""
                      )}>
                        {token.fundingRate.toFixed(4)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCopy(e, token.symbol)}
                          >
                            {copiedSymbol === token.symbol ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTokenClick(token.symbol);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tokens.length === 0 && !error && (
          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-8 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Use the controls above to fetch token data
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
