import { useState, useEffect } from 'react';
import { ArrowLeft, Coins, Copy, Check, ExternalLink, ChevronRight, Loader2, AlertTriangle, Users, TrendingUp, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getSpotMeta, 
  getSpotTokenDetails, 
  findSpotTokenByName,
  getSpotPairsForToken,
  type SpotToken, 
  type SpotTokenDetails, 
  type SpotPair 
} from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface SpotTokenDetailPageProps {
  tokenQuery: string; // Can be token name, tokenId, or partial match
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function SpotTokenDetailPage({ tokenQuery, onBack, onNavigate }: SpotTokenDetailPageProps) {
  const [token, setToken] = useState<SpotToken | null>(null);
  const [tokenDetails, setTokenDetails] = useState<SpotTokenDetails | null>(null);
  const [pairs, setPairs] = useState<SpotPair[]>([]);
  const [allTokens, setAllTokens] = useState<SpotToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const meta = await getSpotMeta();
        setAllTokens(meta.tokens);
        
        // Try to find token by various methods
        let foundToken: SpotToken | null = null;
        
        // Try exact name match first
        foundToken = meta.tokens.find(
          t => t.name.toUpperCase() === tokenQuery.toUpperCase() ||
               t.fullName?.toUpperCase() === tokenQuery.toUpperCase()
        ) || null;
        
        // Try tokenId match
        if (!foundToken && tokenQuery.startsWith('0x')) {
          foundToken = meta.tokens.find(t => t.tokenId.toLowerCase() === tokenQuery.toLowerCase()) || null;
        }
        
        // Try partial match
        if (!foundToken) {
          foundToken = meta.tokens.find(
            t => t.name.toUpperCase().includes(tokenQuery.toUpperCase()) ||
                 t.fullName?.toUpperCase()?.includes(tokenQuery.toUpperCase())
          ) || null;
        }
        
        if (foundToken) {
          setToken(foundToken);
          
          // Fetch detailed token info
          const details = await getSpotTokenDetails(foundToken.tokenId);
          setTokenDetails(details);
          
          // Get trading pairs
          const tokenPairs = await getSpotPairsForToken(foundToken.index);
          setPairs(tokenPairs);
        } else {
          setError(`Token "${tokenQuery}" not found`);
        }
      } catch (err) {
        console.error('[SpotTokenDetailPage] Error:', err);
        setError('Failed to fetch token data');
      }
      
      setIsLoading(false);
    };
    
    fetchToken();
  }, [tokenQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const truncateHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Loading token "{tokenQuery}"...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error || `Token "${tokenQuery}" not found`}</p>
          
          {/* Show available tokens */}
          {allTokens.length > 0 && (
            <div className="mt-8 max-w-2xl mx-auto">
              <p className="text-xs text-muted-foreground mb-4">Available tokens:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {allTokens.slice(0, 20).map(t => (
                  <button
                    key={t.tokenId}
                    onClick={() => window.location.reload()} // Simple reload, could be improved
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
                {allTokens.length > 20 && (
                  <span className="text-xs text-muted-foreground self-center">+{allTokens.length - 20} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const priceChange = tokenDetails ? (
    ((parseFloat(tokenDetails.midPx) - parseFloat(tokenDetails.prevDayPx)) / parseFloat(tokenDetails.prevDayPx) * 100)
  ) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Spot Token</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px]">Hypercore Spot</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Coins className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{token.name}</h1>
            {token.fullName && (
              <span className="text-sm text-muted-foreground">{token.fullName}</span>
            )}
            {token.isCanonical && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                Canonical
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground font-mono">{truncateHash(token.tokenId)}</span>
            <button
              onClick={() => handleCopy(token.tokenId, 'tokenId')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedId === 'tokenId' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Price Overview */}
      {tokenDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Price</span>
            </div>
            <p className="text-lg font-semibold">${parseFloat(tokenDetails.midPx).toFixed(4)}</p>
            <p className={cn("text-xs", priceChange >= 0 ? "text-emerald-400" : "text-red-400")}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coins className="h-4 w-4" />
              <span className="text-xs">Circulating Supply</span>
            </div>
            <p className="text-sm font-medium">{parseFloat(tokenDetails.circulatingSupply).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coins className="h-4 w-4" />
              <span className="text-xs">Total Supply</span>
            </div>
            <p className="text-sm font-medium">{parseFloat(tokenDetails.totalSupply).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coins className="h-4 w-4" />
              <span className="text-xs">Max Supply</span>
            </div>
            <p className="text-sm font-medium">{parseFloat(tokenDetails.maxSupply).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Token Details */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Token Details</h2>
        <div className="space-y-0">
          <DetailRow label="Token ID" value={token.tokenId} copyable onCopy={handleCopy} copiedId={copiedId} id="tokenIdFull" />
          <DetailRow label="Index" value={token.index.toString()} />
          <DetailRow label="Size Decimals" value={token.szDecimals.toString()} />
          <DetailRow label="Wei Decimals" value={token.weiDecimals.toString()} />
          {token.evmContract && (
            <DetailRow 
              label="EVM Contract" 
              value={token.evmContract} 
              copyable 
              onCopy={handleCopy} 
              copiedId={copiedId} 
              id="evmContract"
              onClick={() => onNavigate('wallet', token.evmContract!)}
              isLink
            />
          )}
          {tokenDetails && (
            <>
              <DetailRow 
                label="Deployer" 
                value={tokenDetails.deployer} 
                copyable 
                onCopy={handleCopy} 
                copiedId={copiedId} 
                id="deployer"
                onClick={() => onNavigate('wallet', tokenDetails.deployer)}
                isLink
              />
              <DetailRow label="Deploy Gas" value={`${tokenDetails.deployGas} HYPE`} />
              <DetailRow label="Deploy Time" value={new Date(tokenDetails.deployTime).toLocaleString()} />
              <DetailRow label="Seeded USDC" value={`$${parseFloat(tokenDetails.seededUsdc).toLocaleString()}`} />
            </>
          )}
        </div>
      </div>

      {/* Trading Pairs */}
      {pairs.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card/30 mb-6">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Trading Pairs ({pairs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Pair</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Index</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((pair) => (
                  <TableRow key={pair.index} className="border-b border-border/30 hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-foreground py-3 px-5">{pair.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground py-3 px-5">{pair.index}</TableCell>
                    <TableCell className="text-xs py-3 px-5">
                      {pair.isCanonical ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">Canonical</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">User Deployed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Genesis Holders (Top 10) */}
      {tokenDetails && tokenDetails.genesis.userBalances.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card/30">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Genesis Holders ({tokenDetails.genesis.userBalances.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Address</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenDetails.genesis.userBalances.slice(0, 10).map(([address, balance], idx) => (
                  <TableRow 
                    key={idx} 
                    className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                    onClick={() => onNavigate('wallet', address)}
                  >
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">{truncateAddress(address)}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground py-3 px-5 text-right">
                      {parseFloat(balance.replace(/,/g, '')).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {tokenDetails.genesis.userBalances.length > 10 && (
            <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground text-center">
              Showing 10 of {tokenDetails.genesis.userBalances.length} holders
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable detail row component
function DetailRow({ 
  label, 
  value, 
  copyable, 
  onCopy, 
  copiedId, 
  id, 
  onClick, 
  isLink 
}: { 
  label: string; 
  value: string; 
  copyable?: boolean; 
  onCopy?: (t: string, id: string) => void; 
  copiedId?: string | null; 
  id?: string;
  onClick?: () => void;
  isLink?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {isLink && onClick ? (
          <button 
            onClick={onClick}
            className="text-xs font-mono text-primary hover:underline truncate max-w-[300px]"
          >
            {value}
          </button>
        ) : (
          <span className="text-xs font-mono text-foreground truncate max-w-[300px]">{value}</span>
        )}
        {copyable && onCopy && id && (
          <button
            onClick={() => onCopy(value, id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedId === id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}