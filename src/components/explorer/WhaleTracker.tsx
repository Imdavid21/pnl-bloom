import { useState } from 'react';
import { Loader2, TrendingUp, ExternalLink, ChevronDown, ChevronUp, RefreshCw, Crown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTopAccounts } from '@/hooks/useTopAccounts';
import { Button } from '@/components/ui/button';

interface WhaleTrackerProps {
  onNavigate?: (type: 'wallet', id: string) => void;
}

export function WhaleTracker({ onNavigate }: WhaleTrackerProps) {
  const { accounts, isRefreshing, refreshAll, onAccountClick, lastFullRefresh } = useTopAccounts();
  const [showAll, setShowAll] = useState(false);
  
  const INITIAL_SHOW = 25;
  const displayedAccounts = showAll ? accounts : accounts.slice(0, INITIAL_SHOW);

  const formatBalance = (balance: string) => {
    // Parse the balance string like "955,580,376.23 HYPE"
    const match = balance.match(/^([\d,.]+)\s*(.*)$/);
    if (!match) return balance;
    
    const [, numStr, suffix] = match;
    const num = parseFloat(numStr.replace(/,/g, ''));
    
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M ${suffix}`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K ${suffix}`;
    return balance;
  };

  const formatWeiBalance = (wei: string | null) => {
    if (!wei || wei === '0') return null;
    try {
      const value = BigInt(wei);
      const eth = Number(value) / 1e18;
      if (eth >= 1_000_000) return `${(eth / 1_000_000).toFixed(2)}M`;
      if (eth >= 1_000) return `${(eth / 1_000).toFixed(0)}K`;
      return eth.toFixed(2);
    } catch {
      return null;
    }
  };

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return null;
    const diffMs = Date.now() - ts;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleAccountClick = (address: string) => {
    onAccountClick(address);
    onNavigate?.('wallet', address);
  };

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Top Accounts</h3>
          <span className="text-[10px] text-muted-foreground">HYPE holders</span>
        </div>
        <div className="flex items-center gap-2">
          {lastFullRefresh > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(lastFullRefresh)}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Account List */}
      <div className="divide-y divide-border max-h-[500px] overflow-y-auto scrollbar-thin">
        {displayedAccounts.map((account, index) => (
          <button
            key={account.address}
            onClick={() => handleAccountClick(account.address)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold",
                index === 0 ? "bg-warning/20 text-warning" :
                index < 3 ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground group-hover:text-primary transition-colors">
                    {truncateAddress(account.address)}
                  </span>
                  {account.nameTag && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium">
                      {account.nameTag}
                    </span>
                  )}
                  {account.isLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {formatBalance(account.staticBalance)}
                  </span>
                  {account.staticPercentage !== "-" && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[10px] text-profit">{account.staticPercentage}</span>
                    </>
                  )}
                  {account.staticTxnCount > 0 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {account.staticTxnCount.toLocaleString()} txns
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {account.liveBalance && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">EVM Balance</span>
                  <span className="text-xs font-mono text-foreground">
                    {formatWeiBalance(account.liveBalance)}
                  </span>
                </div>
              )}
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Expand/Collapse button */}
      {accounts.length > INITIAL_SHOW && (
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full h-8 text-xs gap-1"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show All {accounts.length} Accounts <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
