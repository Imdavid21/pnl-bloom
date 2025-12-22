import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Copy, Check, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBlockDetails, type BlockDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface BlockDetailPageProps {
  blockNumber: number;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function BlockDetailPage({ blockNumber, onBack, onNavigate }: BlockDetailPageProps) {
  const [block, setBlock] = useState<BlockDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchBlock = async () => {
      setIsLoading(true);
      const data = await getBlockDetails(blockNumber);
      setBlock(data);
      setIsLoading(false);
    };
    fetchBlock();
  }, [blockNumber]);

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

  const truncateHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  const verifyUrl = `https://app.hyperliquid.xyz/explorer/block/${blockNumber}`;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading block {blockNumber.toLocaleString()}...</p>
        </div>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Block {blockNumber.toLocaleString()} not found</p>
        </div>
      </div>
    );
  }

  const paginatedTxs = block.txs.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(block.txs.length / rowsPerPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={onBack} className="hover:text-foreground transition-colors">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block Details</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Block {blockNumber.toLocaleString()}</h1>
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

      {/* Overview */}
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-3">Overview</h2>
        <div className="space-y-3">
          <DetailRow label="Time" value={formatTime(block.time)} />
          <DetailRow 
            label="Hash" 
            value={block.hash}
            copyable={block.hash}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="hash"
          />
          <DetailRow 
            label="Proposer" 
            value={block.proposer}
            copyable={block.proposer}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="proposer"
          />
        </div>
      </div>

      {/* Block Transactions */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Block Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs h-9 px-4">Hash</TableHead>
                <TableHead className="text-xs h-9 px-4">Action</TableHead>
                <TableHead className="text-xs h-9 px-4">Block</TableHead>
                <TableHead className="text-xs h-9 px-4">Time</TableHead>
                <TableHead className="text-xs h-9 px-4">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTxs.map((tx, i) => (
                <TableRow 
                  key={tx.hash}
                  className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                  onClick={() => onNavigate('tx', tx.hash)}
                >
                  <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                    {truncateHash(tx.hash)}
                  </TableCell>
                  <TableCell className="text-xs py-2.5 px-4">{tx.action?.type || 'Unknown'}</TableCell>
                  <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                    {block.blockNumber.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2.5 px-4">
                    {formatTime(tx.time)}
                  </TableCell>
                  <TableCell 
                    className="text-xs font-mono text-primary py-2.5 px-4"
                    onClick={(e) => { e.stopPropagation(); onNavigate('wallet', tx.user); }}
                  >
                    {truncateHash(tx.user)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-xs text-muted-foreground">
          <span>Rows per page: {rowsPerPage}</span>
          <div className="flex items-center gap-2">
            <span>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, block.txs.length)} of {block.txs.length}</span>
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className={cn("px-2 py-1 rounded", page === 0 ? "opacity-50" : "hover:bg-muted")}
            >
              ‹
            </button>
            <button 
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className={cn("px-2 py-1 rounded", page >= totalPages - 1 ? "opacity-50" : "hover:bg-muted")}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, copyable, onCopy, copiedId, id }: {
  label: string;
  value: string;
  copyable?: string;
  onCopy?: (t: string, id: string) => void;
  copiedId?: string | null;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/20 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0 w-20">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-mono text-foreground truncate">{value}</span>
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
