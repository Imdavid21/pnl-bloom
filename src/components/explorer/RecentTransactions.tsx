import { useState, useEffect } from 'react';
import { ExternalLink, ArrowUpRight, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSymbol } from '@/lib/symbolMapping';

interface Transaction {
  id: string;
  user: string;
  action: 'Order' | 'Cancel';
  coin: string;
  side: 'Long' | 'Short';
  size: string;
  status: 'Success' | 'Error' | 'Pending';
}

const COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'OP', 'DOGE', 'PEPE', 'WIF', 'BONK', 'XRP'];
const SIZES = ['$1.00K', '$5.00K', '$10.00K', '$25.00K', '$50.00K', '$100.00K', '$250.00K'];

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Simulate real-time transactions
  useEffect(() => {
    const generateTx = (): Transaction => ({
      id: Math.random().toString(36).slice(2, 10),
      user: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
      action: Math.random() > 0.8 ? 'Cancel' : 'Order',
      coin: COINS[Math.floor(Math.random() * COINS.length)],
      side: Math.random() > 0.5 ? 'Long' : 'Short',
      size: SIZES[Math.floor(Math.random() * SIZES.length)],
      status: Math.random() > 0.1 ? 'Success' : 'Error',
    });

    // Initialize
    setTransactions(Array.from({ length: 10 }, generateTx));

    // Add new transactions
    const interval = setInterval(() => {
      setTransactions(prev => [generateTx(), ...prev.slice(0, 9)]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Transactions</h3>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {transactions.map((tx) => (
          <div key={tx.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-mono">{tx.user.slice(2, 4)}</span>
                </div>
                <code className="text-xs text-muted-foreground">{tx.user}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{tx.action}•</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground">{tx.coin}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className={cn(
                    "text-sm font-medium",
                    tx.side === 'Long' ? "text-profit-3" : "text-loss-3"
                  )}>
                    {tx.side} {tx.size}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                tx.status === 'Success' 
                  ? "bg-profit-3/20 text-profit-3" 
                  : tx.status === 'Error'
                  ? "bg-loss-3/20 text-loss-3"
                  : "bg-muted text-muted-foreground"
              )}>
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>User</span>
          <span>Action / Details</span>
          <span>Status</span>
        </div>
      </div>
    </div>
  );
}
