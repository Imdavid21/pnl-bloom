import { useState, useEffect } from 'react';
import { ArrowLeft, User, Copy, Check, ExternalLink, ChevronRight, Loader2, TrendingUp, TrendingDown, Wallet, Code, Layers, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { proxyRequest, getL1UserDetails, type L1TransactionDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';
import { WalletInsights } from './WalletInsights';
import { SpotBalances } from './SpotBalances';

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

interface ChainAvailability {
  hypercore: boolean;
  hyperevm: boolean;
  hasPerps: boolean;
  hasL1Txs: boolean;
  hasEvmBalance: boolean;
  hasEvmTxs: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'fills' | 'l1-txs' | 'evm-txs'>('positions');
  const [chainAvailability, setChainAvailability] = useState<ChainAvailability>({
    hypercore: false,
    hyperevm: false,
    hasPerps: false,
    hasL1Txs: false,
    hasEvmBalance: false,
    hasEvmTxs: false,
  });

  useEffect(() => {
    const fetchWalletData = async () => {
      setIsLoading(true);
      
      // Fetch from all sources in parallel
      const results = await Promise.allSettled([
        // Hypercore Perps - clearinghouse state
        proxyRequest({ type: 'clearinghouseState', user: address }),
        // Hypercore Perps - user fills
        proxyRequest({ type: 'userFills', user: address }),
        // Hypercore L1 - user transactions
        getL1UserDetails(address),
        // HyperEVM - balance and contract info
        fetchEvmData(address),
        // HyperEVM - transaction history
        fetchEvmTxs(address),
      ]);

      const availability: ChainAvailability = {
        hypercore: false,
        hyperevm: false,
        hasPerps: false,
        hasL1Txs: false,
        hasEvmBalance: false,
        hasEvmTxs: false,
      };

      // Process Hypercore clearinghouse state
      if (results[0].status === 'fulfilled' && results[0].value) {
        const stateRes = results[0].value;
        if (stateRes.marginSummary) {
          setAccountValue(stateRes.marginSummary.accountValue);
          if (parseFloat(stateRes.marginSummary.accountValue) > 0) {
            availability.hasPerps = true;
            availability.hypercore = true;
          }
        }
        if (stateRes.assetPositions) {
          const pos = stateRes.assetPositions.map((ap: any) => ap.position).filter(Boolean);
          setPositions(pos);
          if (pos.length > 0) {
            availability.hasPerps = true;
            availability.hypercore = true;
          }
        }
      }

      // Process Hypercore fills
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
        const fillsData = results[1].value.slice(0, 50);
        setFills(fillsData);
        if (fillsData.length > 0) {
          availability.hasPerps = true;
          availability.hypercore = true;
        }
      }

      // Process L1 Explorer user data
      if (results[2].status === 'fulfilled' && results[2].value) {
        const txs = results[2].value.txs || [];
        setL1Txs(txs);
        if (txs.length > 0) {
          availability.hasL1Txs = true;
          availability.hypercore = true;
        }
      }

      // Process EVM data
      if (results[3].status === 'fulfilled' && results[3].value) {
        setEvmData(results[3].value);
        if (parseFloat(results[3].value.balance) > 0 || results[3].value.isContract) {
          availability.hasEvmBalance = true;
          availability.hyperevm = true;
        }
      }

      // Process EVM transactions
      if (results[4].status === 'fulfilled' && results[4].value) {
        setEvmTxs(results[4].value);
        if (results[4].value.length > 0) {
          availability.hasEvmTxs = true;
          availability.hyperevm = true;
        }
      }

      setChainAvailability(availability);
      setIsLoading(false);
    };

    fetchWalletData();
  }, [address]);

  const fetchEvmData = async (addr: string): Promise<EvmData | null> => {
    try {
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=address&address=${addr}`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  const fetchEvmTxs = async (addr: string): Promise<EvmTx[]> => {
    try {
      const url = `${SUPABASE_URL}/functions/v1/hyperevm-rpc?action=addressTxs&address=${addr}&limit=25`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.transactions || [];
    } catch {
      return [];
    }
  };

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading wallet data from Hypercore & HyperEVM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={onBack} className="hover:text-foreground transition-colors">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Wallet Details</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {evmData?.isContract ? (
              <Code className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-foreground">{truncateHash(address)}</h1>
              <button 
                onClick={() => handleCopy(address, 'address')}
                className="text-muted-foreground hover:text-foreground"
              >
                {copiedId === 'address' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              {evmData?.isContract && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-info/20 text-info">
                  Contract
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <a 
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Hyperliquid <ExternalLink className="h-2 w-2" />
              </a>
              <span className="text-muted-foreground/30">•</span>
              <a 
                href={purrsecUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Purrsec <ExternalLink className="h-2 w-2" />
              </a>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

      {/* Chain Availability Indicator */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-muted/30 border border-border/50">
        <span className="text-xs font-medium text-muted-foreground">Data Available:</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {chainAvailability.hypercore ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-profit" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            <span className={cn(
              "text-xs font-medium",
              chainAvailability.hypercore ? "text-foreground" : "text-muted-foreground/50"
            )}>
              Hypercore
            </span>
            {chainAvailability.hypercore && (
              <span className="text-[10px] text-muted-foreground">
                ({[
                  chainAvailability.hasPerps && 'Perps',
                  chainAvailability.hasL1Txs && 'L1'
                ].filter(Boolean).join(', ')})
              </span>
            )}
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            {chainAvailability.hyperevm ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-profit" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            <span className={cn(
              "text-xs font-medium",
              chainAvailability.hyperevm ? "text-foreground" : "text-muted-foreground/50"
            )}>
              HyperEVM
            </span>
            {chainAvailability.hyperevm && (
              <span className="text-[10px] text-muted-foreground">
                ({[
                  chainAvailability.hasEvmBalance && 'Balance',
                  chainAvailability.hasEvmTxs && 'Txs'
                ].filter(Boolean).join(', ')})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Multi-chain Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Hypercore (Perps) Data */}
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Hypercore (Perps L1)</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Account Value</p>
              <p className="text-lg font-semibold">${parseFloat(accountValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Positions</p>
              <p className="text-lg font-semibold">{positions.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recent Fills</p>
              <p className="text-lg font-semibold">{fills.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">L1 Transactions</p>
              <p className="text-lg font-semibold">{l1Txs.length}</p>
            </div>
          </div>
        </div>

        {/* HyperEVM Data */}
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">HyperEVM</h2>
          </div>
          {evmData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Native Balance</p>
                <p className="text-lg font-semibold">{parseFloat(evmData.balance).toFixed(4)} ETH</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-lg font-semibold">{evmData.isContract ? 'Contract' : 'EOA'}</p>
              </div>
              {evmData.isContract && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Bytecode</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {evmData.code?.slice(0, 50)}...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No EVM data available</p>
          )}
        </div>
      </div>

      {/* Trading Insights - Unique analytics not found on typical explorers */}
      {fills.length > 0 && (
        <WalletInsights fills={fills} accountValue={accountValue} />
      )}

      {/* Spot Token Holdings */}
      <SpotBalances 
        address={address} 
        onNavigate={(type, id) => onNavigate(type, id)}
      />

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
            activeTab === 'positions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('fills')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
            activeTab === 'fills' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Perp Fills ({fills.length})
        </button>
        <button
          onClick={() => setActiveTab('l1-txs')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
            activeTab === 'l1-txs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          L1 Txs ({l1Txs.length})
        </button>
        <button
          onClick={() => setActiveTab('evm-txs')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap",
            activeTab === 'evm-txs' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          EVM Txs ({evmTxs.length})
        </button>
      </div>

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
                    No L1 transactions found
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
    </div>
  );
}
