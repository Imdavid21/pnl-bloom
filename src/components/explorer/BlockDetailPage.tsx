import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, Loader2, Clock, Fuel, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEVMBlock, formatTimestamp, timeAgo, truncateHash, formatGwei, type EVMBlock, type EVMTransaction } from '@/lib/hyperevmApi';
import { cn } from '@/lib/utils';

interface BlockDetailPageProps {
  blockNumber: number;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function BlockDetailPage({ blockNumber, onBack, onNavigate }: BlockDetailPageProps) {
  const [block, setBlock] = useState<EVMBlock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const fetchBlock = async () => {
      setIsLoading(true);
      const data = await getEVMBlock(blockNumber, true);
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

  const verifyUrl = `https://hypurrscan.io/block/${blockNumber}`;

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

  const transactions = (block.transactions || []) as EVMTransaction[];
  const paginatedTxs = transactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, transactions.length);
  const gasUsedPercent = ((block.gasUsed / block.gasLimit) * 100).toFixed(2);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block Details</span>
      </div>

      {/* Title with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Block #{block.number.toLocaleString()}</h1>
              <a 
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Verify <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo(block.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('block', String(blockNumber - 1))}
            disabled={blockNumber <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('block', String(blockNumber + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Timestamp</span>
          </div>
          <p className="text-sm font-medium">{formatTimestamp(block.timestamp)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Hash className="h-4 w-4" />
            <span className="text-xs">Transactions</span>
          </div>
          <p className="text-sm font-medium">{block.txCount} txns</p>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Fuel className="h-4 w-4" />
            <span className="text-xs">Gas Used</span>
          </div>
          <p className="text-sm font-medium">{block.gasUsed.toLocaleString()} ({gasUsedPercent}%)</p>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Fuel className="h-4 w-4" />
            <span className="text-xs">Base Fee</span>
          </div>
          <p className="text-sm font-medium">{block.baseFeePerGas ? formatGwei(block.baseFeePerGas) + ' Gwei' : 'N/A'}</p>
        </div>
      </div>

      {/* Detailed Overview */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Block Details</h2>
        <div className="space-y-0">
          <DetailRow 
            label="Block Hash" 
            value={block.hash}
            copyable={block.hash}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="hash"
          />
          <DetailRow 
            label="Parent Hash" 
            value={block.parentHash}
            copyable={block.parentHash}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="parentHash"
            onClick={() => onNavigate('block', String(blockNumber - 1))}
            isLink
          />
          <DetailRow 
            label="Miner" 
            value={block.miner}
            copyable={block.miner}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="miner"
            onClick={() => onNavigate('wallet', block.miner)}
            isLink
          />
          <DetailRow label="Gas Limit" value={block.gasLimit.toLocaleString()} />
          {block.size && <DetailRow label="Size" value={`${block.size.toLocaleString()} bytes`} />}
          {block.stateRoot && (
            <DetailRow 
              label="State Root" 
              value={block.stateRoot}
              copyable={block.stateRoot}
              onCopy={handleCopy}
              copiedId={copiedId}
              id="stateRoot"
            />
          )}
        </div>
      </div>

      {/* Block Transactions */}
      <div className="rounded-lg border border-border overflow-hidden bg-card/30">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Transactions ({transactions.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Txn Hash</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">From</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">To</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Value</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Gas</TableHead>
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
                    key={typeof tx === 'string' ? tx : tx.hash}
                    className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                    onClick={() => onNavigate('tx', typeof tx === 'string' ? tx : tx.hash)}
                  >
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">
                      {truncateHash(typeof tx === 'string' ? tx : tx.hash)}
                    </TableCell>
                    <TableCell 
                      className="text-xs font-mono text-primary py-3 px-5 cursor-pointer hover:text-primary/80"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (typeof tx !== 'string') onNavigate('wallet', tx.from); 
                      }}
                    >
                      {typeof tx === 'string' ? '-' : truncateHash(tx.from)}
                    </TableCell>
                    <TableCell 
                      className="text-xs font-mono py-3 px-5 cursor-pointer"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (typeof tx !== 'string' && tx.to) onNavigate('wallet', tx.to); 
                      }}
                    >
                      {typeof tx === 'string' ? '-' : tx.to ? (
                        <span className="text-primary hover:text-primary/80">{truncateHash(tx.to)}</span>
                      ) : (
                        <span className="text-emerald-400">Contract Create</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-foreground py-3 px-5">
                      {typeof tx === 'string' ? '-' : `${tx.valueEth} ETH`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3 px-5">
                      {typeof tx === 'string' ? '-' : tx.gas.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {transactions.length > 0 && (
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
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span>{startIndex}-{endIndex} of {transactions.length}</span>
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

function DetailRow({ label, value, copyable, onCopy, copiedId, id, onClick, isLink }: {
  label: string;
  value: string;
  copyable?: string;
  onCopy?: (t: string, id: string) => void;
  copiedId?: string | null;
  id?: string;
  onClick?: () => void;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {isLink && onClick ? (
          <button 
            onClick={onClick}
            className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left"
          >
            {value}
          </button>
        ) : (
          <span className="text-sm font-mono text-foreground break-all">{value}</span>
        )}
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
