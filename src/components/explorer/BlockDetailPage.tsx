import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, Loader2, Clock, Fuel, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEVMBlock, formatTimestamp, timeAgo, truncateHash as truncateHashEVM, formatGwei, type EVMBlock, type EVMTransaction } from '@/lib/hyperevmApi';
import { getL1BlockDetails, type L1BlockDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface BlockDetailPageProps {
  blockNumber: number;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

// L1 blocks are currently around 200-300 million, HyperEVM blocks are much smaller
const L1_BLOCK_THRESHOLD = 100_000_000; // 100M - anything above this is likely L1

export function BlockDetailPage({ blockNumber, onBack, onNavigate }: BlockDetailPageProps) {
  const [evmBlock, setEvmBlock] = useState<EVMBlock | null>(null);
  const [l1Block, setL1Block] = useState<L1BlockDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [source, setSource] = useState<'evm' | 'l1' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      setIsLoading(true);
      setError(null);
      
      // Try L1 first if block number is large (likely L1)
      const isLikelyL1 = blockNumber >= L1_BLOCK_THRESHOLD;
      
      if (isLikelyL1) {
        // Try L1 first
        const l1Data = await getL1BlockDetails(blockNumber);
        if (l1Data) {
          setL1Block(l1Data);
          setSource('l1');
          setIsLoading(false);
          return;
        }
        // Fall back to EVM
        const evmData = await getEVMBlock(blockNumber, true);
        if (evmData) {
          setEvmBlock(evmData);
          setSource('evm');
          setIsLoading(false);
          return;
        }
      } else {
        // Try EVM first for smaller block numbers
        const evmData = await getEVMBlock(blockNumber, true);
        if (evmData) {
          setEvmBlock(evmData);
          setSource('evm');
          setIsLoading(false);
          return;
        }
        // Fall back to L1
        const l1Data = await getL1BlockDetails(blockNumber);
        if (l1Data) {
          setL1Block(l1Data);
          setSource('l1');
          setIsLoading(false);
          return;
        }
      }
      
      setError(`Block ${blockNumber.toLocaleString()} not found on HyperEVM or Hypercore L1`);
      setIsLoading(false);
    };
    fetchBlock();
  }, [blockNumber]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const truncateHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

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

  if (error || (!evmBlock && !l1Block)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error || `Block ${blockNumber.toLocaleString()} not found`}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: HyperEVM and Hypercore L1 have different block numbering.
          </p>
        </div>
      </div>
    );
  }

  // Render EVM block
  if (source === 'evm' && evmBlock) {
    return <EVMBlockDetail block={evmBlock} onBack={onBack} onNavigate={onNavigate} handleCopy={handleCopy} copiedId={copiedId} page={page} setPage={setPage} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} />;
  }

  // Render L1 block
  if (source === 'l1' && l1Block) {
    return <L1BlockDetail block={l1Block} onBack={onBack} onNavigate={onNavigate} handleCopy={handleCopy} copiedId={copiedId} page={page} setPage={setPage} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} />;
  }

  return null;
}

// EVM Block Component
function EVMBlockDetail({ block, onBack, onNavigate, handleCopy, copiedId, page, setPage, rowsPerPage, setRowsPerPage }: {
  block: EVMBlock;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
}) {
  const transactions = (block.transactions || []) as EVMTransaction[];
  const paginatedTxs = transactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, transactions.length);
  const gasUsedPercent = ((block.gasUsed / block.gasLimit) * 100).toFixed(2);
  const verifyUrl = `https://hypurrscan.io/block/${block.number}`;
  const truncateHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block Details</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">HyperEVM</span>
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
              <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Verify <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo(block.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.number - 1))} disabled={block.number <= 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.number + 1))}>
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
          <DetailRow label="Block Hash" value={block.hash} copyable={block.hash} onCopy={handleCopy} copiedId={copiedId} id="hash" />
          <DetailRow label="Parent Hash" value={block.parentHash} copyable={block.parentHash} onCopy={handleCopy} copiedId={copiedId} id="parentHash" onClick={() => onNavigate('block', String(block.number - 1))} isLink />
          <DetailRow label="Miner" value={block.miner} copyable={block.miner} onCopy={handleCopy} copiedId={copiedId} id="miner" onClick={() => onNavigate('wallet', block.miner)} isLink />
          <DetailRow label="Gas Limit" value={block.gasLimit.toLocaleString()} />
          {block.size && <DetailRow label="Size" value={`${block.size.toLocaleString()} bytes`} />}
        </div>
      </div>

      {/* Transactions */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTxs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>
              ) : (
                paginatedTxs.map((tx) => (
                  <TableRow key={typeof tx === 'string' ? tx : tx.hash} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => onNavigate('tx', typeof tx === 'string' ? tx : tx.hash)}>
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">{truncateHash(typeof tx === 'string' ? tx : tx.hash)}</TableCell>
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">{typeof tx === 'string' ? '-' : truncateHash(tx.from)}</TableCell>
                    <TableCell className="text-xs font-mono py-3 px-5">{typeof tx === 'string' ? '-' : tx.to ? <span className="text-primary">{truncateHash(tx.to)}</span> : <span className="text-emerald-400">Contract</span>}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground py-3 px-5">{typeof tx === 'string' ? '-' : `${tx.valueEth} ETH`}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {transactions.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows:</span>
              <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span>{startIndex}-{endIndex} of {transactions.length}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={cn("p-1.5 rounded hover:bg-muted", page === 0 && "opacity-30")}><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className={cn("p-1.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30")}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// L1 Block Component
function L1BlockDetail({ block, onBack, onNavigate, handleCopy, copiedId, page, setPage, rowsPerPage, setRowsPerPage }: {
  block: L1BlockDetails;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
}) {
  const transactions = block.txs || [];
  const paginatedTxs = transactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, transactions.length);
  const verifyUrl = `https://app.hyperliquid.xyz/explorer/block/${block.blockNumber}`;
  const truncateHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', ' -');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block Details</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">Hypercore L1</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Block #{block.blockNumber.toLocaleString()}</h1>
              <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground">
                Verify <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{formatTime(block.time)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.blockNumber - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.blockNumber + 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Overview</h2>
        <DetailRow label="Time" value={formatTime(block.time)} />
        <DetailRow label="Hash" value={block.hash} copyable={block.hash} onCopy={handleCopy} copiedId={copiedId} id="hash" />
        <DetailRow label="Proposer" value={block.proposer} copyable={block.proposer} onCopy={handleCopy} copiedId={copiedId} id="proposer" />
        <DetailRow label="Transactions" value={block.txCount.toString()} />
      </div>

      {/* Transactions */}
      <div className="rounded-lg border border-border overflow-hidden bg-card/30">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Transactions ({transactions.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Hash</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Action</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">User</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-5">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTxs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>
              ) : (
                paginatedTxs.map((tx) => (
                  <TableRow key={tx.hash} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => onNavigate('tx', tx.hash)}>
                    <TableCell className="text-xs font-mono text-primary py-3 px-5">{truncateHash(tx.hash)}</TableCell>
                    <TableCell className="text-xs py-3 px-5 text-foreground">{tx.action?.type || 'Unknown'}</TableCell>
                    <TableCell className="text-xs font-mono text-primary py-3 px-5 cursor-pointer hover:text-primary/80" onClick={(e) => { e.stopPropagation(); onNavigate('wallet', tx.user); }}>{truncateHash(tx.user)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3 px-5">{formatTime(tx.time)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {transactions.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
            <span>{startIndex}-{endIndex} of {transactions.length}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={cn("p-1.5 rounded hover:bg-muted", page === 0 && "opacity-30")}><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className={cn("p-1.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30")}><ChevronRight className="h-4 w-4" /></button>
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
          <button onClick={onClick} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">{value}</button>
        ) : (
          <span className="text-sm font-mono text-foreground break-all">{value}</span>
        )}
        {copyable && onCopy && id && (
          <button onClick={() => onCopy(copyable, id)} className="text-muted-foreground hover:text-foreground shrink-0">
            {copiedId === id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
