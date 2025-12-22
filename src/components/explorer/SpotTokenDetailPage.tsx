import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Coins, Copy, Check, ExternalLink, ChevronRight, ChevronDown, Loader2, AlertTriangle, Users, TrendingUp, TrendingDown, Clock, FileText, Activity, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getSpotMeta, 
  getSpotTokenDetails, 
  getSpotPairsForToken,
  type SpotToken, 
  type SpotTokenDetails, 
  type SpotPair 
} from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';
import { ProvenanceIndicator } from './ProvenanceIndicator';
import { ExplorerActions } from './ExplorerActions';
import type { LoadingStage, Provenance } from '@/lib/explorer/types';

interface SpotTokenDetailPageProps {
  tokenQuery: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
}

const LOADING_STAGES: Array<{ stage: LoadingStage['stage']; message: string; duration: number }> = [
  { stage: 'searching', message: 'Searching token...', duration: 400 },
  { stage: 'fetching', message: 'Fetching token data...', duration: 500 },
  { stage: 'computing', message: 'Loading market data...', duration: 300 },
];

export function SpotTokenDetailPage({ tokenQuery, onBack, onNavigate }: SpotTokenDetailPageProps) {
  const [token, setToken] = useState<SpotToken | null>(null);
  const [tokenDetails, setTokenDetails] = useState<SpotTokenDetails | null>(null);
  const [pairs, setPairs] = useState<SpotPair[]>([]);
  const [allTokens, setAllTokens] = useState<SpotToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'searching', message: 'Searching token...' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details', 'pairs']));

  const simulateLoadingStages = useCallback(async () => {
    for (const { stage, message, duration } of LOADING_STAGES) {
      setLoadingStage({ stage, message });
      await new Promise(r => setTimeout(r, duration));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      
      const loadingPromise = simulateLoadingStages();

      try {
        const meta = await getSpotMeta();
        if (cancelled) return;
        setAllTokens(meta.tokens);
        
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
        
        await loadingPromise;
        if (cancelled) return;

        if (foundToken) {
          setToken(foundToken);
          
          const details = await getSpotTokenDetails(foundToken.tokenId);
          if (!cancelled) setTokenDetails(details);
          
          const tokenPairs = await getSpotPairsForToken(foundToken.index);
          if (!cancelled) setPairs(tokenPairs);
        } else {
          setError(`Token "${tokenQuery}" not found`);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to fetch token data');
        }
      } finally {
        if (!cancelled) {
          setLoadingStage({ stage: 'ready', message: '' });
          setIsLoading(false);
        }
      }
    };
    
    fetchToken();
    return () => { cancelled = true; };
  }, [tokenQuery, simulateLoadingStages]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const truncateHash = useCallback((hash: string | null | undefined) => {
    if (!hash) return '—';
    return hash.length > 16 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
  }, []);

  const truncateAddress = useCallback((addr: string | null | undefined) => {
    if (!addr) return '—';
    return addr.length > 14 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  }, []);

  // Get similar tokens for suggestions - must be defined before early returns
  const getSimilarTokens = useCallback(() => {
    if (!allTokens.length) return [];
    const query = tokenQuery.toLowerCase();
    
    // Score tokens by similarity
    const scored = allTokens.map(t => {
      const name = t.name.toLowerCase();
      const fullName = (t.fullName || '').toLowerCase();
      
      // Exact substring match gets high score
      if (name.includes(query) || fullName.includes(query)) return { token: t, score: 100 };
      if (query.includes(name)) return { token: t, score: 90 };
      
      // Check if first letters match
      if (name.startsWith(query[0])) return { token: t, score: 50 };
      
      // Levenshtein-like simple check: count matching chars
      let matches = 0;
      for (const char of query) {
        if (name.includes(char)) matches++;
      }
      return { token: t, score: matches * 10 };
    });
    
    return scored
      .filter(s => s.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(s => s.token);
  }, [allTokens, tokenQuery]);

  // Resolve pair name from @index format to actual token name
  const resolvePairName = useCallback((pairName: string): string => {
    // If it's already a readable name like "PURR/USDC", keep it
    if (!pairName.startsWith('@')) return pairName;
    
    // Extract the index from @107 format
    const indexStr = pairName.slice(1);
    const tokenIndex = parseInt(indexStr, 10);
    
    if (isNaN(tokenIndex)) return pairName;
    
    // Find the token by index
    const foundToken = allTokens.find(t => t.index === tokenIndex);
    if (foundToken) {
      return `${foundToken.name}/USDC`;
    }
    
    return pairName;
  }, [allTokens]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Coins className="h-8 w-8 text-warning animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">{loadingStage.message}</p>
            <p className="text-xs text-muted-foreground">"{tokenQuery}"</p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {LOADING_STAGES.map((s, i) => {
              const currentIdx = LOADING_STAGES.findIndex(ls => ls.stage === loadingStage.stage);
              const isComplete = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={s.stage}
                  className={cn(
                    "h-1.5 w-8 rounded-full transition-all duration-300",
                    isComplete ? "bg-profit-3" : isCurrent ? "bg-warning animate-pulse" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !token) {
    const suggestions = getSimilarTokens();
    
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Token Not Found</h2>
          <p className="text-muted-foreground mb-8">
            Could not find a token matching "{tokenQuery}"
          </p>
          
          {suggestions.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground mb-4">Did you mean one of these?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(t => (
                  <button
                    key={t.tokenId}
                    onClick={() => onNavigate('spot-token', t.name)}
                    className="px-4 py-2 rounded-lg bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors border border-warning/20"
                  >
                    {t.name}
                    {t.fullName && t.fullName !== t.name && (
                      <span className="text-warning/60 ml-1 text-xs">({t.fullName})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {allTokens.length > 0 && suggestions.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <p className="text-xs text-muted-foreground mb-4">Browse available tokens:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {allTokens.slice(0, 20).map(t => (
                  <button
                    key={t.tokenId}
                    onClick={() => onNavigate('spot-token', t.name)}
                    className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
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

  const marketCap = tokenDetails 
    ? parseFloat(tokenDetails.circulatingSupply) * parseFloat(tokenDetails.midPx)
    : 0;

  const provenance: Provenance = {
    source: 'hyperliquid_api',
    fetchedAt: Date.now(),
    finality: 'final',
  };

  return (
    <div className="mx-auto max-w-4xl">

      {/* Hero Section */}
      <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-warning/10 flex items-center justify-center">
              <Coins className="h-7 w-7 text-warning" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
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
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{truncateHash(token.tokenId)}</span>
                <button
                  onClick={() => handleCopy(token.tokenId, 'tokenId')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === 'tokenId' ? <Check className="h-3 w-3 text-profit-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Price & Market Summary */}
        {tokenDetails && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Price</span>
              </div>
              <p className="text-lg font-bold text-foreground">${parseFloat(tokenDetails.midPx).toFixed(4)}</p>
              <p className={cn(
                "text-xs flex items-center gap-1",
                priceChange >= 0 ? "text-profit-3" : "text-loss-3"
              )}>
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Market Cap</span>
              </div>
              <p className="text-sm font-medium">${marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Circulating</span>
              </div>
              <p className="text-sm font-medium">{parseFloat(tokenDetails.circulatingSupply).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Max Supply</span>
              </div>
              <p className="text-sm font-medium">{parseFloat(tokenDetails.maxSupply).toLocaleString()}</p>
            </div>
          </div>
        )}

        <ProvenanceIndicator provenance={provenance} />
      </div>

      {/* Token Details - Collapsible */}
      <CollapsibleSection
        title="Token Details"
        icon={<FileText className="h-4 w-4" />}
        isExpanded={expandedSections.has('details')}
        onToggle={() => toggleSection('details')}
      >
        <div className="space-y-0">
          <DetailRow label="Token ID" value={token.tokenId} copyable onCopy={() => handleCopy(token.tokenId, 'tokenIdFull')} copied={copiedId === 'tokenIdFull'} />
          <DetailRow label="Index" value={token.index.toString()} />
          <DetailRow label="Size Decimals" value={token.szDecimals.toString()} />
          <DetailRow label="Wei Decimals" value={token.weiDecimals.toString()} />
          {token.evmContract && (
            <DetailRow 
              label="EVM Contract" 
              value={truncateAddress(token.evmContract)} 
              onClick={() => onNavigate('wallet', token.evmContract!)}
              isLink
            />
          )}
          {tokenDetails && (
            <>
              <DetailRow 
                label="Deployer" 
                value={truncateAddress(tokenDetails.deployer)} 
                onClick={() => onNavigate('wallet', tokenDetails.deployer)}
                isLink
              />
              <DetailRow label="Deploy Gas" value={`${tokenDetails.deployGas} HYPE`} />
              <DetailRow label="Deploy Time" value={new Date(tokenDetails.deployTime).toLocaleString()} />
              <DetailRow label="Seeded USDC" value={`$${parseFloat(tokenDetails.seededUsdc).toLocaleString()}`} />
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Trading Pairs - Collapsible */}
      {pairs.length > 0 && (
        <CollapsibleSection
          title={`Trading Pairs (${pairs.length})`}
          icon={<Activity className="h-4 w-4" />}
          isExpanded={expandedSections.has('pairs')}
          onToggle={() => toggleSection('pairs')}
        >
          <div className="overflow-x-auto -mx-4">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs h-9 px-4">Pair</TableHead>
                  <TableHead className="text-xs h-9 px-4 text-right">Price</TableHead>
                  <TableHead className="text-xs h-9 px-4 text-right">24h Change</TableHead>
                  <TableHead className="text-xs h-9 px-4 text-right">24h Volume</TableHead>
                  <TableHead className="text-xs h-9 px-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((pair) => {
                  const price = pair.midPx ? parseFloat(pair.midPx) : null;
                  const prevPrice = pair.prevDayPx ? parseFloat(pair.prevDayPx) : null;
                  const volume = pair.dayNtlVlm ? parseFloat(pair.dayNtlVlm) : null;
                  const priceChange = price && prevPrice && prevPrice > 0 
                    ? ((price - prevPrice) / prevPrice) * 100 
                    : null;
                  
                  return (
                    <TableRow key={pair.index} className="border-b border-border/30 hover:bg-muted/20">
                      <TableCell className="text-xs font-mono py-2.5 px-4">
                        {pair.name.startsWith('@') ? (
                          <button
                            onClick={() => {
                              const tokenIndex = parseInt(pair.name.slice(1), 10);
                              const foundToken = allTokens.find(t => t.index === tokenIndex);
                              if (foundToken) {
                                onNavigate('spot-token', foundToken.name);
                              }
                            }}
                            className="text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            {resolvePairName(pair.name)}
                          </button>
                        ) : (
                          <span className="text-foreground">{resolvePairName(pair.name)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-right py-2.5 px-4">
                        {price !== null ? `$${price < 0.01 ? price.toFixed(6) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-xs font-mono text-right py-2.5 px-4",
                        priceChange !== null && priceChange > 0 && "text-emerald-400",
                        priceChange !== null && priceChange < 0 && "text-red-400"
                      )}>
                        {priceChange !== null ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground text-right py-2.5 px-4">
                        {volume !== null ? `$${volume >= 1000000 ? (volume / 1000000).toFixed(2) + 'M' : volume >= 1000 ? (volume / 1000).toFixed(1) + 'K' : volume.toFixed(0)}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-4">
                        {pair.isCanonical ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">Canonical</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">User Deployed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Genesis Holders - Collapsible */}
      {tokenDetails?.genesis?.userBalances && tokenDetails.genesis.userBalances.length > 0 && (
        <CollapsibleSection
          title={`Genesis Holders (${tokenDetails.genesis.userBalances.length})`}
          icon={<Users className="h-4 w-4" />}
          isExpanded={expandedSections.has('holders')}
          onToggle={() => toggleSection('holders')}
        >
          <div className="overflow-x-auto -mx-4">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs h-9 px-4">Address</TableHead>
                  <TableHead className="text-xs h-9 px-4 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenDetails.genesis.userBalances.slice(0, 10).map((holder, idx) => {
                  let address = '';
                  let balance = '0';
                  
                  if (typeof holder === 'string') {
                    address = holder;
                  } else if (Array.isArray(holder)) {
                    // Array format: [address, balance] or [[addressObj, balance]]
                    const first = holder[0];
                    if (first && typeof first === 'object' && !Array.isArray(first)) {
                      const firstObj = first as Record<string, unknown>;
                      address = String(firstObj.address ?? '');
                    } else {
                      address = String(first ?? '');
                    }
                    balance = String(holder[1] ?? '0');
                  } else if (typeof holder === 'object' && holder !== null) {
                    const holderObj = holder as Record<string, unknown>;
                    // Handle nested address object: { address: { address: "0x...", evm_extra_wei_decimals: 0 } }
                    if (typeof holderObj.address === 'object' && holderObj.address !== null) {
                      const addrObj = holderObj.address as Record<string, unknown>;
                      address = String(addrObj.address || '');
                    } else if (typeof holderObj.address === 'string') {
                      address = holderObj.address;
                    }
                    // Balance could be in various fields
                    balance = String(holderObj.balance || holderObj.amount || '0');
                  }
                  
                  if (!address) return null;
                  
                  return (
                    <TableRow 
                      key={idx} 
                      className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                      onClick={() => onNavigate('wallet', address)}
                    >
                      <TableCell className="text-xs font-mono text-primary py-2.5 px-4">{truncateAddress(address)}</TableCell>
                      <TableCell className="text-xs font-mono text-foreground py-2.5 px-4 text-right">
                        {balance !== '0' ? parseFloat(balance.replace(/,/g, '')).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {tokenDetails.genesis.userBalances.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border/30 mt-3">
              Showing 10 of {tokenDetails.genesis.userBalances.length} holders
            </p>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

// Collapsible Section
function CollapsibleSection({ title, icon, children, isExpanded, onToggle }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// Detail Row
function DetailRow({ label, value, copyable, onCopy, copied, onClick, isLink }: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  onClick?: () => void;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 min-w-[100px]">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isLink && onClick ? (
          <button onClick={onClick} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">
            {value}
          </button>
        ) : (
          <span className="text-sm font-mono text-foreground break-all">{value}</span>
        )}
        {copyable && onCopy && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground shrink-0">
            {copied ? <Check className="h-3.5 w-3.5 text-profit-3" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
