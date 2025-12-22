import { useState } from 'react';
import { Activity, Box, ArrowUpRight, Clock, Zap, TrendingUp, TrendingDown, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHybridRealtime } from '@/hooks/useHyperliquidWebSocket';

interface LiveActivityFeedProps {
  onRowClick: (type: string, id: string, data: any) => void;
}

export function LiveActivityFeed({ onRowClick }: LiveActivityFeedProps) {
  const { blocks, transactions, fills, lastBlockTime, lastFillTime, connected, isRealFills, isLoading } = useHybridRealtime(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'blocks' | 'fills'>('fills');

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const truncateHash = (hash: string) => 
    `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading live data from Hyperliquid...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live Activity Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-profit-3/10 border border-profit-3/20">
            <Zap className="h-3 w-3 text-profit-3" />
            <span className="text-[10px] font-medium text-profit-3">200k TPS</span>
          </div>
          <div className="relative flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit-3 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-profit-3"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">Live</span>
          </div>
          
          {/* Connection status */}
          <div className="flex items-center gap-1 text-xs">
            {blocks.length > 0 ? (
              <>
                <Wifi className="h-3 w-3 text-profit-3" />
                <span className="text-profit-3">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Connecting...</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(lastBlockTime)}
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
            activeTab === 'transactions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Transactions
          {transactions.length > 0 && <span className="text-[10px] text-profit-3">({transactions.length})</span>}
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
            activeTab === 'blocks' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Box className="h-3.5 w-3.5" />
          Blocks
          {blocks.length > 0 && <span className="text-[10px] text-profit-3">({blocks.length})</span>}
        </button>
        <button
          onClick={() => setActiveTab('fills')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
            activeTab === 'fills' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Trades
          {connected && <span className="text-[10px] text-profit-3">(WS)</span>}
        </button>
      </div>

      {/* Content */}
      <div className={cn(
        "rounded-xl overflow-hidden",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
        "border border-border/40",
        "backdrop-blur-xl",
      )}>
        {activeTab === 'blocks' && (
          <BlockList blocks={blocks} onRowClick={onRowClick} formatTime={formatTime} truncateHash={truncateHash} />
        )}
        {activeTab === 'transactions' && (
          <TransactionList transactions={transactions} onRowClick={onRowClick} formatTime={formatTime} truncateHash={truncateHash} truncateAddress={truncateAddress} />
        )}
        {activeTab === 'fills' && (
          <FillsList fills={fills} onRowClick={onRowClick} formatTime={formatTime} truncateAddress={truncateAddress} />
        )}
      </div>
    </div>
  );
}

function FillsList({ fills, onRowClick, formatTime, truncateAddress }: {
  fills: any[];
  onRowClick: (type: string, id: string, data: any) => void;
  formatTime: (ts: number) => string;
  truncateAddress: (addr: string) => string;
}) {
  const handleWalletClick = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    onRowClick('wallet', address, { address });
  };

  return (
    <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
      {fills.slice(0, 30).map((fill, i) => {
        const isBuy = fill.side === 'B';
        const size = parseFloat(fill.sz || '0');
        const price = parseFloat(fill.px || '0');
        const notional = size * price;
        
        return (
          <div
            key={`${fill.tid || fill.time}-${i}`}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-all",
              i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300"
            )}
            onClick={() => onRowClick('fill', String(fill.tid || fill.time), fill)}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                isBuy ? "bg-profit-3/10" : "bg-loss-3/10"
              )}>
                {isBuy ? (
                  <TrendingUp className="h-4 w-4 text-profit-3" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-loss-3" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fill.coin}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    isBuy ? "bg-profit-3/20 text-profit-3" : "bg-loss-3/20 text-loss-3"
                  )}>
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                  {i === 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-medium animate-pulse">
                      NEW
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{size.toFixed(4)}</span>
                  <span>@</span>
                  <span className="font-mono">${price >= 1 ? price.toFixed(2) : price.toPrecision(4)}</span>
                  {fill.user && (
                    <>
                      <span>•</span>
                      <button 
                        onClick={(e) => handleWalletClick(e, fill.user)}
                        className="font-mono text-primary/80 hover:text-primary hover:underline transition-colors"
                      >
                        {truncateAddress(fill.user)}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-muted-foreground">{formatTime(fill.time)}</div>
              <div className="text-xs text-muted-foreground">${notional >= 1000 ? `${(notional/1000).toFixed(1)}K` : notional.toFixed(0)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BlockList({ blocks, onRowClick, formatTime, truncateHash }: {
  blocks: any[];
  onRowClick: (type: string, id: string, data: any) => void;
  formatTime: (ts: number) => string;
  truncateHash: (hash: string) => string;
}) {
  return (
    <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
      {blocks.slice(0, 20).map((block, i) => (
        <div
          key={block.blockNumber}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-all",
            i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300"
          )}
          onClick={() => onRowClick('block', String(block.blockNumber), block)}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Box className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-primary">
                  {block.blockNumber.toLocaleString()}
                </span>
                {i === 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-profit-3/20 text-profit-3 text-[10px] font-medium">
                    NEW
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {truncateHash(block.hash)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{formatTime(block.time)}</div>
            <div className="text-xs text-muted-foreground">{block.txCount} txns</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionList({ transactions, onRowClick, formatTime, truncateHash, truncateAddress }: {
  transactions: any[];
  onRowClick: (type: string, id: string, data: any) => void;
  formatTime: (ts: number) => string;
  truncateHash: (hash: string) => string;
  truncateAddress: (addr: string) => string;
}) {
  const handleWalletClick = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    onRowClick('wallet', address, { address });
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'order': return 'text-primary';
      case 'cancel': return 'text-loss-3';
      case 'transfer':
      case 'spottransfer': return 'text-profit-3';
      case 'withdraw': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
      {transactions.slice(0, 30).map((tx, i) => (
        <div
          key={`${tx.hash}-${i}`}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-all",
            i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300"
          )}
          onClick={() => onRowClick('tx', tx.hash, tx)}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary">
                  {truncateHash(tx.hash)}
                </span>
                <span className={cn("text-xs font-medium", getActionColor(tx.action))}>
                  {tx.action}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Block {tx.block.toLocaleString()}</span>
                <span>•</span>
                <button 
                  onClick={(e) => handleWalletClick(e, tx.user)}
                  className="font-mono text-primary/80 hover:text-primary hover:underline transition-colors"
                >
                  {truncateAddress(tx.user)}
                </button>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {formatTime(tx.time)}
          </div>
        </div>
      ))}
    </div>
  );
}
