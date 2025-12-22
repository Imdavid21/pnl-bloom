import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { proxyRequest } from '@/lib/hyperliquidApi';
import { getSymbol } from '@/lib/symbolMapping';
import type { ExplorerMode, ExplorerFilters, DrawerState } from '@/hooks/useExplorerState';

interface ExplorerTableProps {
  mode: ExplorerMode;
  filters: ExplorerFilters;
  wallet: string | null;
  onRowClick: (type: DrawerState['type'], id: string, data: any) => void;
}

export function ExplorerTable({ mode, filters, wallet, onRowClick }: ExplorerTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wallet && (mode === 'positions' || mode === 'activity' || mode === 'funding')) {
      loadData();
    }
  }, [wallet, mode]);

  const loadData = async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      switch (mode) {
        case 'positions':
          const state = await proxyRequest({ type: 'clearinghouseState', user: wallet });
          setData(state?.assetPositions || []);
          break;
        case 'activity':
          const fills = await proxyRequest({ type: 'userFills', user: wallet });
          setData(Array.isArray(fills) ? fills.slice(0, 100) : []);
          break;
        case 'funding':
          const funding = await proxyRequest({ type: 'userFunding', user: wallet });
          setData(Array.isArray(funding) ? funding.slice(0, 100) : []);
          break;
        default:
          setData([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Search for a wallet to view {mode}</p>
      </div>
    );
  }

  switch (mode) {
    case 'positions':
      return <PositionsTable data={data} onRowClick={onRowClick} filters={filters} />;
    case 'activity':
      return <ActivityTable data={data} onRowClick={onRowClick} filters={filters} />;
    case 'funding':
      return <FundingTable data={data} onRowClick={onRowClick} />;
    case 'risk':
      return <RiskTable wallet={wallet} onRowClick={onRowClick} />;
    case 'drawdowns':
      return <DrawdownsTable wallet={wallet} onRowClick={onRowClick} />;
    case 'assets':
      return <AssetsTable onRowClick={onRowClick} />;
    case 'wallet':
      return <WalletSummary wallet={wallet} onRowClick={onRowClick} />;
    default:
      return null;
  }
}

function PositionsTable({ data, onRowClick, filters }: { 
  data: any[]; 
  onRowClick: (type: DrawerState['type'], id: string, data: any) => void;
  filters: ExplorerFilters;
}) {
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const pos = item.position;
      const size = parseFloat(pos.szi || '0');
      const pnl = parseFloat(pos.unrealizedPnl || '0');
      
      if (filters.direction === 'long' && size <= 0) return false;
      if (filters.direction === 'short' && size >= 0) return false;
      if (filters.pnlSign === 'positive' && pnl < 0) return false;
      if (filters.pnlSign === 'negative' && pnl >= 0) return false;
      
      return true;
    });
  }, [data, filters]);

  if (filteredData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No positions</div>;
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Market</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Size</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Entry</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Liq</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">PnL</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">ROE</th>
            <th className="px-3 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredData.map((item, i) => {
            const pos = item.position;
            const size = parseFloat(pos.szi || '0');
            const pnl = parseFloat(pos.unrealizedPnl || '0');
            const roe = parseFloat(pos.returnOnEquity || '0') * 100;
            
            return (
              <tr 
                key={i} 
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onRowClick('position', `${pos.coin}-${i}`, pos)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", size > 0 ? "bg-profit-3" : "bg-loss-3")} />
                    <span className="font-medium">{getSymbol(pos.coin)}</span>
                    <span className="text-xs text-muted-foreground">{pos.leverage?.value || '-'}x</span>
                  </div>
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono text-xs", size > 0 ? "text-profit-3" : "text-loss-3")}>
                  {size > 0 ? '+' : ''}{size.toFixed(4)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">
                  ${parseFloat(pos.entryPx || '0').toFixed(2)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                  {pos.liquidationPx ? `$${parseFloat(pos.liquidationPx).toFixed(2)}` : '-'}
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono text-xs", pnl >= 0 ? "text-profit-3" : "text-loss-3")}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono text-xs", roe >= 0 ? "text-profit-3" : "text-loss-3")}>
                  {roe >= 0 ? '+' : ''}{roe.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTable({ data, onRowClick, filters }: { 
  data: any[]; 
  onRowClick: (type: DrawerState['type'], id: string, data: any) => void;
  filters: ExplorerFilters;
}) {
  const filteredData = useMemo(() => {
    return data.filter(fill => {
      const pnl = parseFloat(fill.closedPnl || '0');
      const isLong = fill.side === 'B';
      
      if (filters.direction === 'long' && !isLong) return false;
      if (filters.direction === 'short' && isLong) return false;
      if (filters.pnlSign === 'positive' && pnl < 0) return false;
      if (filters.pnlSign === 'negative' && pnl >= 0) return false;
      
      return true;
    });
  }, [data, filters]);

  if (filteredData.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No activity</div>;
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Time</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Market</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Side</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Size</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Price</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">PnL</th>
            <th className="px-3 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredData.slice(0, 50).map((fill, i) => {
            const pnl = parseFloat(fill.closedPnl || '0');
            const isBuy = fill.side === 'B';
            
            return (
              <tr 
                key={fill.tid || i} 
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onRowClick('fill', String(fill.tid), fill)}
              >
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                  {new Date(fill.time).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2.5 font-medium">{getSymbol(fill.coin)}</td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-medium",
                    isBuy ? "bg-profit-3/20 text-profit-3" : "bg-loss-3/20 text-loss-3"
                  )}>
                    {isBuy ? 'Buy' : 'Sell'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{fill.sz}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">
                  ${parseFloat(fill.px || '0').toFixed(2)}
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono text-xs", pnl >= 0 ? "text-profit-3" : "text-loss-3")}>
                  {pnl !== 0 ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '-'}
                </td>
                <td className="px-3 py-2.5">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FundingTable({ data, onRowClick }: { 
  data: any[]; 
  onRowClick: (type: DrawerState['type'], id: string, data: any) => void;
}) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No funding data</div>;
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Time</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Market</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Rate</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.slice(0, 50).map((item, i) => {
            const payment = parseFloat(item.delta || '0');
            return (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                  {new Date(item.time).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 font-medium">{getSymbol(item.coin)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">
                  {(parseFloat(item.fundingRate || '0') * 100).toFixed(4)}%
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono text-xs", payment >= 0 ? "text-profit-3" : "text-loss-3")}>
                  {payment >= 0 ? '+' : ''}${payment.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RiskTable({ wallet, onRowClick }: { wallet: string; onRowClick: (type: DrawerState['type'], id: string, data: any) => void }) {
  return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      <p>Risk events for {wallet.slice(0, 8)}...</p>
      <p className="text-xs mt-1">Data synced from backend</p>
    </div>
  );
}

function DrawdownsTable({ wallet, onRowClick }: { wallet: string; onRowClick: (type: DrawerState['type'], id: string, data: any) => void }) {
  return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      <p>Drawdown history for {wallet.slice(0, 8)}...</p>
      <p className="text-xs mt-1">Data synced from backend</p>
    </div>
  );
}

function AssetsTable({ onRowClick }: { onRowClick: (type: DrawerState['type'], id: string, data: any) => void }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const [meta, mids] = await Promise.all([
        proxyRequest({ type: 'metaAndAssetCtxs' }),
        proxyRequest({ type: 'allMids' }),
      ]);
      
      if (meta && Array.isArray(meta) && meta.length >= 2) {
        const universe = meta[0].universe || [];
        const ctxs = meta[1] || [];
        
        const assetData = universe.map((asset: any, i: number) => ({
          symbol: asset.name,
          price: mids?.[asset.name] ? parseFloat(mids[asset.name]) : 0,
          volume24h: ctxs[i]?.dayNtlVlm ? parseFloat(ctxs[i].dayNtlVlm) : 0,
          fundingRate: ctxs[i]?.funding ? parseFloat(ctxs[i].funding) * 100 : 0,
        })).sort((a: any, b: any) => b.volume24h - a.volume24h);
        
        setAssets(assetData);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Market</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Price</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">24h Vol</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Funding</th>
            <th className="px-3 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.slice(0, 50).map((asset, i) => (
            <tr 
              key={asset.symbol} 
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onRowClick('asset', asset.symbol, asset)}
            >
              <td className="px-3 py-2.5 font-medium">{asset.symbol}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">
                ${asset.price >= 1 ? asset.price.toFixed(2) : asset.price.toPrecision(4)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">
                ${(asset.volume24h / 1e6).toFixed(1)}M
              </td>
              <td className={cn(
                "px-3 py-2.5 text-right font-mono text-xs",
                asset.fundingRate > 0 ? "text-profit-3" : asset.fundingRate < 0 ? "text-loss-3" : "text-muted-foreground"
              )}>
                {asset.fundingRate.toFixed(4)}%
              </td>
              <td className="px-3 py-2.5">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WalletSummary({ wallet, onRowClick }: { wallet: string; onRowClick: (type: DrawerState['type'], id: string, data: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, [wallet]);

  const loadWallet = async () => {
    try {
      const state = await proxyRequest({ type: 'clearinghouseState', user: wallet });
      setData(state);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No wallet data</div>;
  }

  const accountValue = parseFloat(data.marginSummary?.accountValue || '0');
  const totalNotional = parseFloat(data.marginSummary?.totalNtlPos || '0');
  const marginUsed = parseFloat(data.marginSummary?.totalMarginUsed || '0');
  const leverage = accountValue > 0 ? totalNotional / accountValue : 0;
  const unrealizedPnl = data.assetPositions?.reduce((sum: number, ap: any) => 
    sum + parseFloat(ap.position?.unrealizedPnl || '0'), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Account Value</p>
          <p className="text-lg font-semibold font-mono">${accountValue.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Leverage</p>
          <p className="text-lg font-semibold font-mono">{leverage.toFixed(2)}x</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Margin Used</p>
          <p className="text-lg font-semibold font-mono">${marginUsed.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Unrealized PnL</p>
          <p className={cn("text-lg font-semibold font-mono", unrealizedPnl >= 0 ? "text-profit-3" : "text-loss-3")}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="p-3 rounded-lg border border-border bg-card/50">
        <p className="text-xs text-muted-foreground mb-2">Open Positions ({data.assetPositions?.length || 0})</p>
        {data.assetPositions?.length > 0 ? (
          <div className="space-y-1">
            {data.assetPositions.slice(0, 5).map((ap: any, i: number) => {
              const pos = ap.position;
              const size = parseFloat(pos.szi || '0');
              const pnl = parseFloat(pos.unrealizedPnl || '0');
              return (
                <div 
                  key={i} 
                  className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2"
                  onClick={() => onRowClick('position', `${pos.coin}-${i}`, pos)}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", size > 0 ? "bg-profit-3" : "bg-loss-3")} />
                    <span className="text-sm font-medium">{getSymbol(pos.coin)}</span>
                  </div>
                  <span className={cn("text-sm font-mono", pnl >= 0 ? "text-profit-3" : "text-loss-3")}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No open positions</p>
        )}
      </div>
    </div>
  );
}
