import { useState, useEffect } from 'react';
import { ArrowLeft, User, Copy, Check, ExternalLink, ChevronRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { proxyRequest } from '@/lib/hyperliquidApi';
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

export function WalletDetailPage({ address, onBack, onNavigate }: WalletDetailPageProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [accountValue, setAccountValue] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'fills'>('positions');

  useEffect(() => {
    const fetchWalletData = async () => {
      setIsLoading(true);
      try {
        const [stateRes, fillsRes] = await Promise.all([
          proxyRequest({ type: 'clearinghouseState', user: address }),
          proxyRequest({ type: 'userFills', user: address }),
        ]);

        if (stateRes?.marginSummary) {
          setAccountValue(stateRes.marginSummary.accountValue);
        }
        if (stateRes?.assetPositions) {
          setPositions(stateRes.assetPositions.map((ap: any) => ap.position).filter(Boolean));
        }
        if (Array.isArray(fillsRes)) {
          setFills(fillsRes.slice(0, 50));
        }
      } catch (err) {
        console.error('Failed to fetch wallet data:', err);
      }
      setIsLoading(false);
    };
    fetchWalletData();
  }, [address]);

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading wallet data...</p>
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
            <User className="h-5 w-5 text-primary" />
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
            </div>
            <a 
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Verify <ExternalLink className="h-2 w-2" />
            </a>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

      {/* Account Overview */}
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-3">Account Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm font-mono truncate">{address}</p>
          </div>
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
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors",
            activeTab === 'positions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('fills')}
          className={cn(
            "flex-1 px-4 py-2 rounded text-sm font-medium transition-colors",
            activeTab === 'fills' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Recent Fills ({fills.length})
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
                        isLong ? "bg-profit-3/20 text-profit-3" : "bg-loss-3/20 text-loss-3"
                      )}>
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">{Math.abs(size).toFixed(4)}</TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">${parseFloat(pos.entryPx).toFixed(2)}</TableCell>
                    <TableCell className="text-sm py-2.5 px-4">{pos.leverage?.value || '-'}x</TableCell>
                    <TableCell className={cn(
                      "text-sm font-mono py-2.5 px-4",
                      pnl >= 0 ? "text-profit-3" : "text-loss-3"
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
                          <TrendingUp className="h-3.5 w-3.5 text-profit-3" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-loss-3" />
                        )}
                        <span className="text-xs text-muted-foreground">{fill.dir}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">{fill.sz}</TableCell>
                    <TableCell className="text-sm font-mono py-2.5 px-4">${parseFloat(fill.px).toFixed(2)}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-mono py-2.5 px-4",
                      pnl === 0 ? "text-muted-foreground" : pnl > 0 ? "text-profit-3" : "text-loss-3"
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
    </div>
  );
}
