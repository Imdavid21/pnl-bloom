import { X, Copy, Check, ExternalLink, ChevronRight, FileJson, Clock, Hash, Box, User, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { DrawerState } from '@/hooks/useExplorerState';

interface DetailDrawerProps {
  drawer: DrawerState;
  onClose: () => void;
  onNavigate?: (type: DrawerState['type'], id: string, data: any) => void;
}

export function DetailDrawer({ drawer, onClose, onNavigate }: DetailDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!drawer.open) return null;

  // Build verify URL based on type
  const getVerifyUrl = () => {
    const base = 'https://app.hyperliquid.xyz/explorer';
    if (drawer.type === 'tx' && drawer.data?.hash) {
      return `${base}/tx/${drawer.data.hash}`;
    }
    if (drawer.type === 'block' && (drawer.id || drawer.data?.blockNumber)) {
      return `${base}/block/${drawer.id || drawer.data?.blockNumber}`;
    }
    if (drawer.type === 'wallet' && drawer.data?.address) {
      return `${base}/address/${drawer.data.address}`;
    }
    return base;
  };

  const showVerifyLink = ['tx', 'block', 'wallet'].includes(drawer.type || '');

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-[420px] lg:w-[500px] bg-background border-l border-border z-50",
        "transform transition-transform duration-300 ease-out",
        drawer.open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Breadcrumb type={drawer.type} id={drawer.id} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowRawJson(!showRawJson)}
              title="Toggle raw JSON"
            >
              <FileJson className={cn("h-4 w-4", showRawJson && "text-primary")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 py-3 border-b border-border/50">
          <h2 className="text-lg font-semibold text-foreground">
            {drawer.type === 'tx' && `Hash ${drawer.data?.hash?.slice(0, 6)}...${drawer.data?.hash?.slice(-4)}`}
            {drawer.type === 'block' && `Block ${drawer.id || drawer.data?.blockNumber}`}
            {drawer.type === 'position' && `Position ${drawer.data?.market || drawer.data?.coin}`}
            {drawer.type === 'fill' && `Fill ${drawer.data?.coin}`}
            {drawer.type === 'wallet' && `Wallet ${drawer.data?.address?.slice(0, 6)}...${drawer.data?.address?.slice(-4)}`}
            {drawer.type === 'drawdown' && 'Drawdown Event'}
            {drawer.type === 'asset' && `Asset ${drawer.data?.symbol}`}
            {!['tx', 'block', 'position', 'fill', 'wallet', 'drawdown', 'asset'].includes(drawer.type || '') && 'Details'}
          </h2>
          {showVerifyLink && (
            <a 
              href={getVerifyUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground mt-1 transition-colors"
            >
              Verify
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-4">
            {showRawJson ? (
              <RawJsonView data={drawer.data} onCopy={handleCopy} copiedId={copiedId} />
            ) : (
              <DetailContent 
                type={drawer.type} 
                data={drawer.data} 
                onCopy={handleCopy} 
                copiedId={copiedId}
                onNavigate={onNavigate}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

function Breadcrumb({ type, id }: { type: DrawerState['type']; id?: string }) {
  const typeLabels: Record<string, string> = {
    tx: 'Transaction Details',
    block: 'Block Details',
    position: 'Position Details',
    fill: 'Fill Details',
    wallet: 'Wallet Details',
    drawdown: 'Drawdown Details',
    asset: 'Asset Details',
  };

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>Explorer</span>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground">{typeLabels[type || ''] || 'Details'}</span>
    </div>
  );
}

function RawJsonView({ data, onCopy, copiedId }: { data: any; onCopy: (t: string, id: string) => void; copiedId: string | null }) {
  const jsonString = JSON.stringify(data, null, 2);
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 h-7 text-xs gap-1"
        onClick={() => onCopy(jsonString, 'json')}
      >
        {copiedId === 'json' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        Copy
      </Button>
      <pre className="p-3 rounded-lg bg-muted/50 border border-border text-xs font-mono overflow-x-auto max-h-[70vh]">
        {jsonString}
      </pre>
    </div>
  );
}

function DetailContent({ type, data, onCopy, copiedId, onNavigate }: { 
  type: DrawerState['type']; 
  data: any; 
  onCopy: (t: string, id: string) => void;
  copiedId: string | null;
  onNavigate?: (type: DrawerState['type'], id: string, data: any) => void;
}) {
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  switch (type) {
    case 'tx':
      return <TxDetails data={data} onCopy={onCopy} copiedId={copiedId} onNavigate={onNavigate} />;
    case 'block':
      return <BlockDetails data={data} onCopy={onCopy} copiedId={copiedId} onNavigate={onNavigate} />;
    case 'fill':
      return <FillDetails data={data} onCopy={onCopy} copiedId={copiedId} />;
    case 'position':
      return <PositionDetails data={data} onCopy={onCopy} copiedId={copiedId} />;
    case 'drawdown':
      return <DrawdownDetails data={data} />;
    case 'wallet':
      return <WalletDetails data={data} onCopy={onCopy} copiedId={copiedId} />;
    case 'asset':
      return <AssetDetails data={data} />;
    default:
      return <GenericDetails data={data} />;
  }
}

function DetailRow({ label, value, copyable, onCopy, copiedId, id, mono = true, onClick }: {
  label: string;
  value: React.ReactNode;
  copyable?: string;
  onCopy?: (t: string, id: string) => void;
  copiedId?: string | null;
  id?: string;
  mono?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/30 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {onClick ? (
          <button 
            onClick={onClick}
            className={cn(
              "text-sm text-primary hover:text-primary/80 truncate text-right",
              mono && "font-mono"
            )}
          >
            {value}
          </button>
        ) : (
          <span className={cn("text-sm text-foreground truncate text-right", mono && "font-mono")}>
            {value}
          </span>
        )}
        {copyable && onCopy && id && (
          <button 
            onClick={() => onCopy(copyable, id)} 
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {copiedId === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
  );
}

function TxDetails({ data, onCopy, copiedId, onNavigate }: { 
  data: any; 
  onCopy: (t: string, id: string) => void; 
  copiedId: string | null;
  onNavigate?: (type: DrawerState['type'], id: string, data: any) => void;
}) {
  const formatTime = (timestamp: string | number) => {
    if (!timestamp) return '-';
    const date = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ' -');
  };

  return (
    <div className="space-y-4">
      {/* Overview Section */}
      <div>
        <SectionHeader icon={Hash} title="Overview" />
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <DetailRow 
            label="Hash" 
            value={data.hash} 
            copyable={data.hash} 
            onCopy={onCopy} 
            copiedId={copiedId} 
            id="hash" 
          />
          <DetailRow 
            label="Block" 
            value={data.block || data.blockNumber}
            onClick={onNavigate ? () => onNavigate('block', String(data.block || data.blockNumber), { blockNumber: data.block || data.blockNumber }) : undefined}
          />
          <DetailRow label="Time" value={formatTime(data.time || data.timestamp)} />
          <DetailRow 
            label="User" 
            value={data.user ? `${data.user.slice(0, 10)}...${data.user.slice(-4)}` : '-'}
            copyable={data.user}
            onCopy={onCopy}
            copiedId={copiedId}
            id="user"
            onClick={data.user && onNavigate ? () => onNavigate('wallet', data.user, { address: data.user }) : undefined}
          />
        </div>
      </div>

      {/* Action Details */}
      {(data.type || data.action) && (
        <div>
          <SectionHeader icon={Layers} title="Action" />
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <DetailRow label="type" value={`"${data.type || data.action}"`} mono />
            {data.signatureChainId && (
              <DetailRow label="signatureChainId" value={`"${data.signatureChainId}"`} mono />
            )}
            {data.hyperliquidChain && (
              <DetailRow label="hyperliquidChain" value={`"${data.hyperliquidChain}"`} mono />
            )}
            {data.agentAddress && (
              <DetailRow 
                label="agentAddress" 
                value={`"${data.agentAddress}"`} 
                copyable={data.agentAddress}
                onCopy={onCopy}
                copiedId={copiedId}
                id="agent"
                mono 
              />
            )}
            {data.agentName && (
              <DetailRow label="agentName" value={`"${data.agentName}"`} mono />
            )}
            {data.nonce && (
              <DetailRow label="nonce" value={data.nonce} mono />
            )}
          </div>
        </div>
      )}

      {/* Status */}
      {data.status && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <DetailRow label="Status" value={data.status} mono={false} />
        </div>
      )}
    </div>
  );
}

function BlockDetails({ data, onCopy, copiedId, onNavigate }: { 
  data: any; 
  onCopy: (t: string, id: string) => void; 
  copiedId: string | null;
  onNavigate?: (type: DrawerState['type'], id: string, data: any) => void;
}) {
  const formatTime = (timestamp: string | number) => {
    if (!timestamp) return '-';
    const date = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ' -');
  };

  // Mock transactions for demo (in real app, would fetch from API)
  const mockTxs = data.transactions || [
    { hash: '0xf965...663f', action: 'Noop', block: data.blockNumber, time: data.time, user: '0x3ac9...8bf6' },
    { hash: '0xac38...a8bb', action: 'Noop', block: data.blockNumber, time: data.time, user: '0xfbb6...8113' },
    { hash: '0x5f0c...eb37', action: 'Noop', block: data.blockNumber, time: data.time, user: '0x3999...3336' },
    { hash: '0x11df...2db2', action: 'Noop', block: data.blockNumber, time: data.time, user: '0x3ac9...8bf6' },
    { hash: '0xc4b3...702e', action: 'Noop', block: data.blockNumber, time: data.time, user: '0x3ac9...8bf6' },
  ];

  return (
    <div className="space-y-4">
      {/* Overview Section */}
      <div>
        <SectionHeader icon={Box} title="Overview" />
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <DetailRow label="Time" value={formatTime(data.time || data.timestamp)} />
          <DetailRow 
            label="Hash" 
            value={data.hash ? `${data.hash.slice(0, 20)}...` : '-'}
            copyable={data.hash}
            onCopy={onCopy}
            copiedId={copiedId}
            id="blockhash"
          />
          <DetailRow 
            label="Proposer" 
            value={data.proposer ? `${data.proposer.slice(0, 20)}...` : '-'}
            copyable={data.proposer}
            onCopy={onCopy}
            copiedId={copiedId}
            id="proposer"
          />
        </div>
      </div>

      {/* Block Transactions */}
      <div>
        <SectionHeader icon={Layers} title="Block Transactions" />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="text-xs h-8 px-3">Hash</TableHead>
                  <TableHead className="text-xs h-8 px-3">Action</TableHead>
                  <TableHead className="text-xs h-8 px-3">Block</TableHead>
                  <TableHead className="text-xs h-8 px-3">Time</TableHead>
                  <TableHead className="text-xs h-8 px-3">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTxs.map((tx: any, i: number) => (
                  <TableRow 
                    key={i} 
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                    onClick={() => onNavigate?.('tx', tx.hash, tx)}
                  >
                    <TableCell className="text-xs font-mono text-primary py-2 px-3">
                      {tx.hash}
                    </TableCell>
                    <TableCell className="text-xs py-2 px-3">{tx.action}</TableCell>
                    <TableCell className="text-xs font-mono text-primary py-2 px-3">
                      {tx.block || data.blockNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3">
                      {formatTime(tx.time || data.time)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-primary py-2 px-3">
                      {tx.user}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border/50 text-xs text-muted-foreground">
            <span>Rows per page: 10</span>
            <span>1-{mockTxs.length} of {data.txCount || mockTxs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FillDetails({ data, onCopy, copiedId }: { data: any; onCopy: (t: string, id: string) => void; copiedId: string | null }) {
  const pnl = parseFloat(data.closedPnl || '0');
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <DetailRow label="Market" value={data.coin} />
        <DetailRow label="Side" value={data.side} />
        <DetailRow label="Size" value={data.sz} />
        <DetailRow label="Price" value={`$${parseFloat(data.px || '0').toFixed(2)}`} />
        <DetailRow label="Fee" value={`$${parseFloat(data.fee || '0').toFixed(4)}`} />
        <DetailRow 
          label="Realized PnL" 
          value={
            <span className={pnl >= 0 ? "text-profit-3" : "text-loss-3"}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </span>
          } 
        />
        <DetailRow label="Time" value={data.time ? new Date(data.time).toLocaleString() : '-'} />
      </div>
      {data.hash && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <DetailRow label="Tx Hash" value={`${data.hash.slice(0, 10)}...`} copyable={data.hash} onCopy={onCopy} copiedId={copiedId} id="hash" />
        </div>
      )}
    </div>
  );
}

function PositionDetails({ data, onCopy, copiedId }: { data: any; onCopy: (t: string, id: string) => void; copiedId: string | null }) {
  const pnl = parseFloat(data.unrealizedPnl || data.net_pnl || '0');
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <DetailRow label="Market" value={data.coin || data.market} />
        <DetailRow label="Direction" value={data.direction || (parseFloat(data.szi || '0') > 0 ? 'Long' : 'Short')} />
        <DetailRow label="Size" value={data.szi || data.current_size} />
        <DetailRow label="Entry Price" value={`$${parseFloat(data.entryPx || data.avg_entry || '0').toFixed(2)}`} />
        <DetailRow label="Liq. Price" value={data.liquidationPx ? `$${parseFloat(data.liquidationPx).toFixed(2)}` : '-'} />
        <DetailRow label="Leverage" value={data.leverage?.value ? `${data.leverage.value}x` : '-'} />
        <DetailRow 
          label="Unrealized PnL" 
          value={
            <span className={pnl >= 0 ? "text-profit-3" : "text-loss-3"}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </span>
          } 
        />
      </div>
    </div>
  );
}

function DrawdownDetails({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <DetailRow label="Drawdown %" value={`${(data.drawdown_pct || 0).toFixed(2)}%`} />
        <DetailRow label="Drawdown $" value={`$${(data.drawdown_depth || 0).toFixed(2)}`} />
        <DetailRow label="Peak Equity" value={`$${(data.peak_equity || 0).toFixed(2)}`} />
        <DetailRow label="Trough Equity" value={`$${(data.trough_equity || 0).toFixed(2)}`} />
        <DetailRow label="Peak Date" value={data.peak_date || '-'} />
        <DetailRow label="Trough Date" value={data.trough_date || '-'} />
        <DetailRow label="Recovered" value={data.is_recovered ? 'Yes' : 'No'} />
        {data.recovery_days && <DetailRow label="Recovery Days" value={data.recovery_days} />}
      </div>
    </div>
  );
}

function WalletDetails({ data, onCopy, copiedId }: { data: any; onCopy: (t: string, id: string) => void; copiedId: string | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <DetailRow label="Address" value={data.address} copyable={data.address} onCopy={onCopy} copiedId={copiedId} id="addr" />
        <DetailRow label="Account Value" value={`$${(data.accountValue || 0).toFixed(2)}`} />
        <DetailRow label="Total PnL" value={`$${(data.totalPnl || 0).toFixed(2)}`} />
        <DetailRow label="Positions" value={data.positionCount || 0} />
      </div>
    </div>
  );
}

function AssetDetails({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <DetailRow label="Symbol" value={data.symbol} />
        <DetailRow label="Name" value={data.name} />
        <DetailRow label="Price" value={`$${(data.price || 0).toFixed(4)}`} />
        <DetailRow label="24h Volume" value={`$${(data.volume24h || 0).toLocaleString()}`} />
        <DetailRow label="Open Interest" value={`$${(data.openInterest || 0).toLocaleString()}`} />
        <DetailRow label="Funding Rate" value={`${(data.fundingRate || 0).toFixed(4)}%`} />
      </div>
    </div>
  );
}

function GenericDetails({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <pre className="text-xs font-mono overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
