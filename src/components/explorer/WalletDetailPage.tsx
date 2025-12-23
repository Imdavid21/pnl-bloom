import { useState, useEffect, useMemo, useCallback } from 'react';
import { Copy, Check, ExternalLink, Loader2, TrendingUp, TrendingDown, Wallet, Layers, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Coins, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { proxyRequest, getL1UserDetails, type L1TransactionDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';
import { WalletTradingStats } from './WalletTradingStats';
import { SpotBalances } from './SpotBalances';
import { WalletSummaryHero } from './WalletSummaryHero';
import { WalletActivityTimeline, fillsToEpisodes } from './WalletActivityTimeline';
import { ExplorerActions } from './ExplorerActions';
import { ContractBadgeStack } from './ContractTypeBadge';
import { FetchProgressDisplay, type FetchProgress, type DataFetchState, type LoadingStatus } from './FetchProgressDisplay';

type ChainView = 'hypercore' | 'hyperevm';

interface WalletDetailPageProps {
  address: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
}

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  liquidationPx: string;
  leverage: { value: number };
}

interface Fill {
  coin: string;
  side: string;
  sz: string;
  px: string;
  time: number;
  hash: string;
  closedPnl: string;
  dir: string;
}

interface EvmData {
  balance: string;
  isContract: boolean;
  code: string | null;
}

interface EvmTx {
  hash: string;
  from: string;
  to: string | null;
  valueEth: string;
  blockNumber: number;
  timestamp: number;
  direction: 'in' | 'out';
  status: 'success' | 'failed' | 'pending';
  gasUsed: number | null;
  contractAddress: string | null;
}

interface TokenBalance {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
}

interface InternalTx {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  from: string;
  to: string;
  valueEth: string;
  direction: 'in' | 'out';
  depth: number;
}

interface ChainAvailability {
  hypercore: boolean;
  hyperevm: boolean;
  hasPerps: boolean;
  hasL1Txs: boolean;
  hasEvmBalance: boolean;
  hasEvmTxs: boolean;
  hasTokens: boolean;
  hasInternalTxs: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function WalletDetailPage({ address, onBack, onNavigate }: WalletDetailPageProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [accountValue, setAccountValue] = useState<string>('0');
  const [l1Txs, setL1Txs] = useState<L1TransactionDetails[]>([]);
  const [evmData, setEvmData] = useState<EvmData | null>(null);
  const [evmTxs, setEvmTxs] = useState<EvmTx[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [internalTxs, setInternalTxs] = useState<InternalTx[]>([]);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    clearinghouse: { status: 'pending' },
    fills: { status: 'pending' },
    l1Txs: { status: 'pending' },
    evmData: { status: 'pending' },
    evmTxs: { status: 'pending' },
    tokens: { status: 'pending' },
    internalTxs: { status: 'pending' },
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chainView, setChainView] = useState<ChainView>('hypercore');
  const [activeTab, setActiveTab] = useState<'positions' | 'fills' | 'l1-txs' | 'evm-txs' | 'tokens' | 'internal-txs'>('positions');
  const [chainAvailability, setChainAvailability] = useState<ChainAvailability>({
    hypercore: false,
    hyperevm: false,
    hasPerps: false,
    hasL1Txs: false,
    hasEvmBalance: false,
    hasEvmTxs: false,
    hasTokens: false,
    hasInternalTxs: false,
  });

  const updateProgress = (key: keyof FetchProgress, state: Partial<DataFetchState>) => {
    setFetchProgress(prev => ({ 
      ...prev, 
      [key]: { ...prev[key], ...state } 
    }));
  };

  const updateAvailability = (updates: Partial<ChainAvailability>) => {
    setChainAvailability(prev => {
      const next = { ...prev, ...updates };
      // Auto-switch to available chain if current view has no data
      if (next.hyperevm && !next.hypercore && chainView === 'hypercore') {
        setChainView('hyperevm');
        setActiveTab('evm-txs');
      } else if (next.hypercore && !next.hyperevm && chainView === 'hyperevm') {
        setChainView('hypercore');
        setActiveTab('positions');
      }
      return next;
    });
  };

  // Define fetch functions first (before useEffect that uses them)
  const fetchEvmData = useCallback(async (addr: string): Promise<{ data: EvmData | null; timedOut: boolean }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${addr}`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return { data: null, timedOut: false };
      return { data: await res.json(), timedOut: false };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      return { data: null, timedOut: isAbort };
    }
  }, []);

  const fetchEvmTxs = useCallback(async (addr: string): Promise<{ data: EvmTx[]; timedOut: boolean }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=addressTxs&address=${addr}&limit=25`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return { data: [], timedOut: false };
      const json = await res.json();
      return { data: json.transactions || [], timedOut: false };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      return { data: [], timedOut: isAbort };
    }
  }, []);

  const fetchTokenBalances = useCallback(async (addr: string): Promise<{ data: TokenBalance[]; timedOut: boolean }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=tokenBalances&address=${addr}&blocks=500`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return { data: [], timedOut: false };
      const json = await res.json();
      return { data: json.tokens || [], timedOut: false };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      return { data: [], timedOut: isAbort };
    }
  }, []);

  const fetchInternalTxs = useCallback(async (addr: string): Promise<{ data: InternalTx[]; timedOut: boolean }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=addressInternalTxs&address=${addr}&limit=20`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return { data: [], timedOut: false };
      const json = await res.json();
      return { data: json.internalTxs || [], timedOut: false };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      return { data: [], timedOut: isAbort };
    }
  }, []);

  // Main data loading effect
  useEffect(() => {
    // Reset state when address changes
    setPositions([]);
    setFills([]);
    setAccountValue('0');
    setL1Txs([]);
    setEvmData(null);
    setEvmTxs([]);
    setTokenBalances([]);
    setInternalTxs([]);
    setFetchProgress({
      clearinghouse: { status: 'loading' },
      fills: { status: 'loading' },
      l1Txs: { status: 'loading' },
      evmData: { status: 'loading' },
      evmTxs: { status: 'loading' },
      tokens: { status: 'loading' },
      internalTxs: { status: 'loading' },
    });
    setChainAvailability({
      hypercore: false,
      hyperevm: false,
      hasPerps: false,
      hasL1Txs: false,
      hasEvmBalance: false,
      hasEvmTxs: false,
      hasTokens: false,
      hasInternalTxs: false,
    });

    // Fetch clearinghouse state
    proxyRequest({ type: 'clearinghouseState', user: address })
      .then(stateRes => {
        let posCount = 0;
        if (stateRes?.marginSummary) {
          setAccountValue(stateRes.marginSummary.accountValue);
          if (parseFloat(stateRes.marginSummary.accountValue) > 0) {
            updateAvailability({ hasPerps: true, hypercore: true });
          }
        }
        if (stateRes?.assetPositions) {
          const pos = stateRes.assetPositions.map((ap: any) => ap.position).filter(Boolean);
          setPositions(pos);
          posCount = pos.length;
          if (pos.length > 0) {
            updateAvailability({ hasPerps: true, hypercore: true });
          }
        }
        updateProgress('clearinghouse', { 
          status: posCount > 0 ? 'done' : 'empty', 
          count: posCount 
        });
      })
      .catch(() => updateProgress('clearinghouse', { status: 'error' }));

    // Fetch fills
    proxyRequest({ type: 'userFills', user: address })
      .then(fillsData => {
        const data = Array.isArray(fillsData) ? fillsData.slice(0, 50) : [];
        setFills(data);
        if (data.length > 0) {
          updateAvailability({ hasPerps: true, hypercore: true });
        }
        updateProgress('fills', { 
          status: data.length > 0 ? 'done' : 'empty', 
          count: data.length 
        });
      })
      .catch(() => updateProgress('fills', { status: 'error' }));

    // Fetch L1 transactions
    getL1UserDetails(address)
      .then(result => {
        const txs = result?.txs || [];
        setL1Txs(txs);
        if (txs.length > 0) {
          updateAvailability({ hasL1Txs: true, hypercore: true });
        }
        updateProgress('l1Txs', { 
          status: txs.length > 0 ? 'done' : 'empty', 
          count: txs.length 
        });
      })
      .catch(() => updateProgress('l1Txs', { status: 'error' }));

    // Fetch EVM data
    fetchEvmData(address)
      .then(({ data, timedOut }) => {
        if (data) {
          setEvmData(data);
          const hasData = parseFloat(data.balance) > 0 || data.isContract;
          if (hasData) {
            updateAvailability({ hasEvmBalance: true, hyperevm: true });
          }
          updateProgress('evmData', { 
            status: timedOut ? 'timeout' : (hasData ? 'done' : 'empty'),
            count: hasData ? 1 : 0
          });
        } else {
          updateProgress('evmData', { status: timedOut ? 'timeout' : 'empty' });
        }
      })
      .catch(() => updateProgress('evmData', { status: 'error' }));

    // Fetch EVM transactions
    fetchEvmTxs(address)
      .then(({ data, timedOut }) => {
        setEvmTxs(data);
        if (data.length > 0) {
          updateAvailability({ hasEvmTxs: true, hyperevm: true });
        }
        updateProgress('evmTxs', { 
          status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
          count: data.length 
        });
      })
      .catch(() => updateProgress('evmTxs', { status: 'error' }));

    // Fetch token balances
    fetchTokenBalances(address)
      .then(({ data, timedOut }) => {
        setTokenBalances(data);
        if (data.length > 0) {
          updateAvailability({ hasTokens: true, hyperevm: true });
        }
        updateProgress('tokens', { 
          status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
          count: data.length 
        });
      })
      .catch(() => updateProgress('tokens', { status: 'error' }));

    // Fetch internal transactions
    fetchInternalTxs(address)
      .then(({ data, timedOut }) => {
        setInternalTxs(data);
        if (data.length > 0) {
          updateAvailability({ hasInternalTxs: true, hyperevm: true });
        }
        updateProgress('internalTxs', { 
          status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
          count: data.length 
        });
      })
      .catch(() => updateProgress('internalTxs', { status: 'error' }));
  }, [address, fetchEvmData, fetchEvmTxs, fetchTokenBalances, fetchInternalTxs]);

  // Retry functions for individual data types
  const retryEvmData = useCallback(async () => {
    updateProgress('evmData', { status: 'loading' });
    const { data, timedOut } = await fetchEvmData(address);
    if (data) {
      setEvmData(data);
      const hasData = parseFloat(data.balance) > 0 || data.isContract;
      if (hasData) {
        updateAvailability({ hasEvmBalance: true, hyperevm: true });
      }
      updateProgress('evmData', { 
        status: timedOut ? 'timeout' : (hasData ? 'done' : 'empty'),
        count: hasData ? 1 : 0
      });
    } else {
      updateProgress('evmData', { status: timedOut ? 'timeout' : 'empty' });
    }
  }, [address, fetchEvmData]);

  const retryEvmTxs = useCallback(async () => {
    updateProgress('evmTxs', { status: 'loading' });
    const { data, timedOut } = await fetchEvmTxs(address);
    setEvmTxs(data);
    if (data.length > 0) {
      updateAvailability({ hasEvmTxs: true, hyperevm: true });
    }
    updateProgress('evmTxs', { 
      status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
      count: data.length 
    });
  }, [address, fetchEvmTxs]);

  const retryTokenBalances = useCallback(async () => {
    updateProgress('tokens', { status: 'loading' });
    const { data, timedOut } = await fetchTokenBalances(address);
    setTokenBalances(data);
    if (data.length > 0) {
      updateAvailability({ hasTokens: true, hyperevm: true });
    }
    updateProgress('tokens', { 
      status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
      count: data.length 
    });
  }, [address, fetchTokenBalances]);

  const retryInternalTxs = useCallback(async () => {
    updateProgress('internalTxs', { status: 'loading' });
    const { data, timedOut } = await fetchInternalTxs(address);
    setInternalTxs(data);
    if (data.length > 0) {
      updateAvailability({ hasInternalTxs: true, hyperevm: true });
    }
    updateProgress('internalTxs', { 
      status: timedOut ? 'timeout' : (data.length > 0 ? 'done' : 'empty'), 
      count: data.length 
    });
  }, [address, fetchInternalTxs]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ' -');
  };

  const truncateHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;

  const verifyUrl = `https://app.hyperliquid.xyz/explorer/address/${address}`;
  const purrsecUrl = `https://purrsec.com/address/${address}`;

  // Handle retry callback
  const handleRetry = useCallback((key: keyof FetchProgress) => {
    const retryFunctions: Record<keyof FetchProgress, (() => void) | undefined> = {
      clearinghouse: undefined,
      fills: undefined,
      l1Txs: undefined,
      evmData: retryEvmData,
      evmTxs: retryEvmTxs,
      tokens: retryTokenBalances,
      internalTxs: retryInternalTxs,
    };
    retryFunctions[key]?.();
  }, [retryEvmData, retryEvmTxs, retryTokenBalances, retryInternalTxs]);

  // Calculate risk level based on positions
  const riskData = useMemo(() => {
    const maxLev = positions.reduce((max, p) => Math.max(max, p.leverage?.value || 0), 0);
    const factors: string[] = [];
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (maxLev > 50) { level = 'critical'; factors.push(`${maxLev.toFixed(0)}x leverage detected`); }
    else if (maxLev > 20) { level = 'high'; factors.push(`High leverage: ${maxLev.toFixed(0)}x`); }
    else if (maxLev > 10) { level = 'medium'; factors.push(`Moderate leverage: ${maxLev.toFixed(0)}x`); }
    
    if (positions.length > 5) factors.push(`${positions.length} open positions`);
    
    return { level, factors, maxLeverage: maxLev > 0 ? maxLev : undefined };
  }, [positions]);

  // Convert fills to episodes for timeline
  const episodes = useMemo(() => fillsToEpisodes(fills), [fills]);

  const handleCompare = useCallback((compareAddress: string) => {
    window.open(`${window.location.origin}/explorer?q=${compareAddress}&mode=wallet`, '_blank');
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Action Bar - no back button since ExplorerShell provides navigation */}
      <ExplorerActions
        entityType="wallet"
        entityId={address}
        title={`Wallet ${address.slice(0, 8)}...`}
        onCompare={handleCompare}
        externalUrl={`https://purrsec.com/address/${address}`}
        className="mb-4"
      />

      {/* Contract Type Badge - show prominently for contracts */}
      {evmData && (
        <div className="mb-4">
          <ContractBadgeStack 
            address={address}
            isContract={evmData.isContract}
            contractCode={evmData.code}
          />
        </div>
      )}

      {/* Enhanced Summary Hero */}
      <WalletSummaryHero
        address={address}
        isContract={evmData?.isContract || false}
        accountValue={accountValue}
        evmBalance={evmData?.balance || '0'}
        openPositions={positions.length}
        riskLevel={riskData.level}
        riskFactors={riskData.factors}
        maxLeverage={riskData.maxLeverage}
        onCopy={handleCopy}
        copiedId={copiedId}
        provenance={{
          source: 'hyperliquid_api',
          fetchedAt: Date.now(),
          finality: 'final',
        }}
      />

      {/* Activity Timeline */}
      {episodes.length > 0 && (
        <WalletActivityTimeline 
          episodes={episodes} 
          onNavigate={(type, id) => onNavigate(type, id)}
          maxItems={5}
        />
      )}

      {/* Fetch Progress Display - replaces old loading/timeout UI */}
      <FetchProgressDisplay 
        progress={fetchProgress}
        onRetry={handleRetry}
        className="mb-4"
      />

      {/* Chain View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">View:</span>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-background/50">
            {[
              { key: 'hypercore' as ChainView, label: 'Hypercore', icon: <Layers className="h-3 w-3" /> },
              { key: 'hyperevm' as ChainView, label: 'HyperEVM', icon: <Wallet className="h-3 w-3" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setChainView(key)}
                disabled={key === 'hypercore' && !chainAvailability.hypercore || key === 'hyperevm' && !chainAvailability.hyperevm}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  chainView === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  (key === 'hypercore' && !chainAvailability.hypercore || key === 'hyperevm' && !chainAvailability.hyperevm) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            {chainAvailability.hypercore ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-profit-3" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            <span className={cn(
              "text-xs font-medium",
              chainAvailability.hypercore ? "text-foreground" : "text-muted-foreground/50"
            )}>
              Hypercore
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            {chainAvailability.hyperevm ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-profit-3" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            <span className={cn(
              "text-xs font-medium",
              chainAvailability.hyperevm ? "text-foreground" : "text-muted-foreground/50"
            )}>
              HyperEVM
            </span>
          </div>
        </div>
      </div>


      {/* Trading Analytics - from PnL backend (Hypercore only) */}
      {chainView === 'hypercore' && (
        <WalletTradingStats 
          walletAddress={address} 
          onSyncRequest={() => window.open(`/?wallet=${address}`, '_blank')}
        />
      )}

      {/* Spot Token Holdings (Hypercore only) */}
      {chainView === 'hypercore' && (
        <SpotBalances 
          address={address} 
          onNavigate={(type, id) => onNavigate(type, id)}
        />
      )}

      {/* Hypercore Section */}
      {chainView === 'hypercore' && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Hypercore Activity</h2>
            <span className="text-xs text-muted-foreground">Perps & Transactions</span>
          </div>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('positions')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'positions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab('fills')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'fills' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Fills ({fills.length})
            </button>
            <button
              onClick={() => setActiveTab('l1-txs')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'l1-txs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Transactions ({l1Txs.length})
            </button>
          </div>
        </div>
      )}

      {/* HyperEVM Section */}
      {chainView === 'hyperevm' && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-foreground">HyperEVM Activity</h2>
            <span className="text-xs text-muted-foreground">EVM Transactions & Tokens</span>
          </div>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('evm-txs')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'evm-txs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Transactions ({evmTxs.length})
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'tokens' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tokens ({tokenBalances.length})
            </button>
            <button
              onClick={() => setActiveTab('internal-txs')}
              className={cn(
                "flex-1 px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === 'internal-txs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Internal ({internalTxs.length})
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'positions' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Market</TableHead>
                <TableHead className="text-xs h-9 px-4">Side</TableHead>
                <TableHead className="text-xs h-9 px-4">Size</TableHead>
                <TableHead className="text-xs h-9 px-4">Entry Price</TableHead>
                <TableHead className="text-xs h-9 px-4">Leverage</TableHead>
                <TableHead className="text-xs h-9 px-4">Unrealized PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((pos, i) => {
                const size = parseFloat(pos.szi);
                const isLong = size > 0;
                const pnl = parseFloat(pos.unrealizedPnl);
                return (
                  <TableRow key={i} className="border-b border-border/30">
                    <TableCell className="text-sm font-medium py-2.5 px-4">{pos.coin}</TableCell>
                    <TableCell className="py-2.5 px-4">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        isLong ? "bg-profit-3/20 text-profit" : "bg-loss-3/20 text-loss"
                      )}>
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">{Math.abs(size).toFixed(4)}</TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">${parseFloat(pos.entryPx).toFixed(2)}</TableCell>
                    <TableCell className="text-sm py-2.5 px-4">{pos.leverage?.value || '-'}x</TableCell>
                    <TableCell className={cn(
                      "text-sm font-mono py-2.5 px-4",
                      pnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {positions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No open positions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'fills' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Market</TableHead>
                <TableHead className="text-xs h-9 px-4">Direction</TableHead>
                <TableHead className="text-xs h-9 px-4">Size</TableHead>
                <TableHead className="text-xs h-9 px-4">Price</TableHead>
                <TableHead className="text-xs h-9 px-4">PnL</TableHead>
                <TableHead className="text-xs h-9 px-4">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fills.map((fill, i) => {
                const isBuy = fill.side === 'B';
                const pnl = parseFloat(fill.closedPnl || '0');
                return (
                  <TableRow 
                    key={i} 
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => fill.hash && onNavigate('tx', fill.hash)}
                  >
                    <TableCell className="text-sm font-medium py-2.5 px-4">{fill.coin}</TableCell>
                    <TableCell className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isBuy ? (
                          <TrendingUp className="h-3.5 w-3.5 text-profit" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-loss" />
                        )}
                        <span className="text-xs text-muted-foreground">{fill.dir}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">{fill.sz}</TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">${parseFloat(fill.px).toFixed(2)}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-mono py-2.5 px-4",
                      pnl === 0 ? "text-muted-foreground" : pnl > 0 ? "text-profit" : "text-loss"
                    )}>
                      {pnl !== 0 && (pnl > 0 ? '+' : '')}{pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5 px-4">
                      {formatTime(fill.time)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {fills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No recent fills
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'l1-txs' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Tx Hash</TableHead>
                <TableHead className="text-xs h-9 px-4">Block</TableHead>
                <TableHead className="text-xs h-9 px-4">Action</TableHead>
                <TableHead className="text-xs h-9 px-4">Status</TableHead>
                <TableHead className="text-xs h-9 px-4">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {l1Txs.slice(0, 50).map((tx, i) => (
                <TableRow 
                  key={i} 
                  className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                  onClick={() => onNavigate('tx', tx.hash)}
                >
                  <TableCell className="text-sm font-mono py-2.5 px-4 text-primary">
                    {truncateHash(tx.hash)}
                  </TableCell>
                  <TableCell className="text-sm font-mono py-2.5 px-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigate('block', String(tx.block)); }}
                      className="text-primary hover:underline"
                    >
                      {tx.block}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-muted">
                      {tx.action?.type || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 px-4">
                    {tx.error ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-loss-3/20 text-loss">Failed</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-profit-3/20 text-profit">Success</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2.5 px-4">
                    {formatTime(tx.time)}
                  </TableCell>
                </TableRow>
              ))}
              {l1Txs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No Hypercore transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'evm-txs' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Tx Hash</TableHead>
                <TableHead className="text-xs h-9 px-4">Block</TableHead>
                <TableHead className="text-xs h-9 px-4">Direction</TableHead>
                <TableHead className="text-xs h-9 px-4">From/To</TableHead>
                <TableHead className="text-xs h-9 px-4">Value</TableHead>
                <TableHead className="text-xs h-9 px-4">Status</TableHead>
                <TableHead className="text-xs h-9 px-4">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evmTxs.map((tx, i) => {
                const isOutgoing = tx.direction === 'out';
                const counterparty = isOutgoing ? tx.to : tx.from;
                return (
                  <TableRow 
                    key={i} 
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => onNavigate('tx', tx.hash)}
                  >
                    <TableCell className="text-sm font-mono py-2.5 px-4 text-primary">
                      {truncateHash(tx.hash)}
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate('block', String(tx.blockNumber)); }}
                        className="text-primary hover:underline"
                      >
                        {tx.blockNumber}
                      </button>
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isOutgoing ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-loss" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-profit" />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          isOutgoing ? "text-loss" : "text-profit"
                        )}>
                          {isOutgoing ? 'OUT' : 'IN'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      {counterparty ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate('wallet', counterparty); }}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {truncateHash(counterparty)}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {tx.contractAddress ? 'Contract Created' : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">
                      {parseFloat(tx.valueEth).toFixed(4)} ETH
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      {tx.status === 'success' ? (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-profit-3/20 text-profit">Success</span>
                      ) : tx.status === 'failed' ? (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-loss-3/20 text-loss">Failed</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5 px-4">
                      {formatTime(tx.timestamp * 1000)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {evmTxs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No EVM transactions found in recent blocks
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Token</TableHead>
                <TableHead className="text-xs h-9 px-4">Symbol</TableHead>
                <TableHead className="text-xs h-9 px-4">Balance</TableHead>
                <TableHead className="text-xs h-9 px-4">Contract</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenBalances.map((token, i) => (
                <TableRow key={i} className="border-b border-border/30">
                  <TableCell className="text-sm font-medium py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      {token.name || 'Unknown Token'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                      {token.symbol}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono py-2.5 px-4">
                    {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="py-2.5 px-4">
                    <button
                      onClick={() => onNavigate('wallet', token.address)}
                      className="text-xs font-mono text-primary hover:underline"
                    >
                      {truncateHash(token.address)}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {tokenBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No ERC-20 tokens found (scanning last 5000 blocks)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'internal-txs' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Parent Tx</TableHead>
                <TableHead className="text-xs h-9 px-4">Block</TableHead>
                <TableHead className="text-xs h-9 px-4">Type</TableHead>
                <TableHead className="text-xs h-9 px-4">Direction</TableHead>
                <TableHead className="text-xs h-9 px-4">From/To</TableHead>
                <TableHead className="text-xs h-9 px-4">Value</TableHead>
                <TableHead className="text-xs h-9 px-4">Depth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {internalTxs.map((tx, i) => {
                const isOutgoing = tx.direction === 'out';
                const counterparty = isOutgoing ? tx.to : tx.from;
                return (
                  <TableRow 
                    key={i} 
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => onNavigate('tx', tx.txHash)}
                  >
                    <TableCell className="text-sm font-mono py-2.5 px-4 text-primary">
                      {truncateHash(tx.txHash)}
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate('block', String(tx.blockNumber)); }}
                        className="text-primary hover:underline"
                      >
                        {tx.blockNumber}
                      </button>
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-muted font-mono">
                        {tx.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isOutgoing ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-loss" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-profit" />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          isOutgoing ? "text-loss" : "text-profit"
                        )}>
                          {isOutgoing ? 'OUT' : 'IN'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      {counterparty && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate('wallet', counterparty); }}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {truncateHash(counterparty)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">
                      {parseFloat(tx.valueEth).toFixed(6)} ETH
                    </TableCell>
                    <TableCell className="text-sm py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-muted">
                        {tx.depth}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {internalTxs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No internal transactions found (requires debug_traceTransaction support)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
