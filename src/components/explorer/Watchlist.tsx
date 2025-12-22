import { useState } from 'react';
import { Star, Trash2, Plus, Wallet, Coins, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWatchlist, type WatchlistItem } from '@/hooks/useWatchlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WatchlistProps {
  onNavigate?: (type: 'wallet' | 'spot-token', id: string) => void;
}

export function Watchlist({ onNavigate }: WatchlistProps) {
  const { wallets, tokens, addWallet, addToken, remove } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState<'wallets' | 'tokens'>('wallets');

  const handleAddWallet = () => {
    if (walletInput.trim() && walletInput.startsWith('0x')) {
      addWallet(walletInput.trim());
      setWalletInput('');
    }
  };

  const handleAddToken = () => {
    if (tokenInput.trim()) {
      addToken(tokenInput.trim());
      setTokenInput('');
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  const totalItems = wallets.length + tokens.length;

  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Watchlist</h3>
          {totalItems > 0 && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{totalItems}</span>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" />
                Add to Watchlist
              </DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wallets" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1.5" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs">
                  <Coins className="h-3 w-3 mr-1.5" />
                  Token
                </TabsTrigger>
              </TabsList>
              <TabsContent value="wallets" className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="0x..."
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWallet()}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleAddWallet} disabled={!walletInput.startsWith('0x')}>
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Track wallet activity and get notified of large trades.
                </p>
              </TabsContent>
              <TabsContent value="tokens" className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="HYPE, PURR, etc."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToken()}
                    className="text-sm"
                  />
                  <Button onClick={handleAddToken} disabled={!tokenInput.trim()}>
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Track spot token price movements and volume.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="divide-y divide-border max-h-[300px] overflow-y-auto scrollbar-thin">
        {/* Wallets */}
        {wallets.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors group"
          >
            <button
              onClick={() => onNavigate?.('wallet', item.address!)}
              className="flex items-center gap-2 text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                  {truncateAddress(item.address!)}
                </p>
                {item.name && (
                  <p className="text-[10px] text-muted-foreground">{item.name}</p>
                )}
              </div>
            </button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(item.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Tokens */}
        {tokens.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors group"
          >
            <button
              onClick={() => onNavigate?.('spot-token', item.symbol!)}
              className="flex items-center gap-2 text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
                <Coins className="h-3.5 w-3.5 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.symbol}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(item.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {totalItems === 0 && (
          <div className="text-center py-8">
            <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add wallets or tokens to track
            </p>
          </div>
        )}
      </div>

      {/* Notification hint */}
      {totalItems > 0 && (
        <div className="p-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Bell className="h-3 w-3" />
            <span>Browser notifications coming soon</span>
          </div>
        </div>
      )}
    </div>
  );
}
