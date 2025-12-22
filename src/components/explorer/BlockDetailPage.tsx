import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, block.txs.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block Details</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Block {blockNumber.toLocaleString()}</h1>
          <a 
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Verify <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Overview</h2>
        <div className="space-y-0">
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
      <div className="rounded-lg border border-border overflow-hidden bg-card/30">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Block Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Hash</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Action</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Block</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Time</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTxs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No transactions in this block
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTxs.map((tx) => (
                  <TableRow 
                    key={tx.hash}
                    className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                    onClick={() => onNavigate('tx', tx.hash)}
                  >
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">
                      {truncateHash(tx.hash)}
                    </TableCell>
                    <TableCell className="text-xs py-3 px-5 text-foreground">{tx.action?.type || 'Noop'}</TableCell>
                    <TableCell 
                      className="text-xs font-mono text-primary py-3 px-5 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      {block.blockNumber.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3 px-5">
                      {formatTime(tx.time)}
                    </TableCell>
                    <TableCell 
                      className="text-xs font-mono text-primary py-3 px-5 cursor-pointer hover:text-primary/80"
                      onClick={(e) => { e.stopPropagation(); onNavigate('wallet', tx.user); }}
                    >
                      {truncateHash(tx.user)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {block.txs.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span>{startIndex}-{endIndex} of {block.txs.length}</span>
            <div className="flex items-center gap-1">
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  page === 0 && "opacity-30 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  page >= totalPages - 1 && "opacity-30 cursor-not-allowed"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 w-16">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono text-foreground break-all">{value}</span>
        {copyable && onCopy && id && (
          <button 
            onClick={() => onCopy(copyable, id)} 
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            {copiedId === id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
