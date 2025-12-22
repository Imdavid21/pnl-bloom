import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Box, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, ChevronDown, Loader2, Clock, Fuel, Hash, AlertTriangle, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEVMBlock, formatTimestamp, timeAgo, truncateHash as truncateHashEVM, formatGwei, type EVMBlock, type EVMTransaction } from '@/lib/hyperevmApi';
import { getL1BlockDetails, type L1BlockDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';
import { ProvenanceIndicator } from './ProvenanceIndicator';
import { generateBlockNarrative } from '@/lib/explorer/narratives';
import type { LoadingStage, Provenance, ChainSource } from '@/lib/explorer/types';

interface BlockDetailPageProps {
  blockNumber: number;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
  preferredChain?: 'hyperevm' | 'hypercore';
}

// L1 blocks are currently around 200-300 million, HyperEVM blocks are much smaller
const L1_BLOCK_THRESHOLD = 100_000_000;

// Loading stages for multi-stage UX
const LOADING_STAGES: Array<{ stage: LoadingStage['stage']; message: string; duration: number }> = [
  { stage: 'searching', message: 'Locating block...', duration: 400 },
  { stage: 'fetching', message: 'Fetching block data...', duration: 600 },
  { stage: 'reconciling', message: 'Loading transactions...', duration: 400 },
];

export function BlockDetailPage({ blockNumber, onBack, onNavigate, preferredChain }: BlockDetailPageProps) {
  const [evmBlock, setEvmBlock] = useState<EVMBlock | null>(null);
  const [l1Block, setL1Block] = useState<L1BlockDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'searching', message: 'Locating block...' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [source, setSource] = useState<ChainSource>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details', 'txs']));

  const simulateLoadingStages = useCallback(async () => {
    for (const { stage, message, duration } of LOADING_STAGES) {
      setLoadingStage({ stage, message });
      await new Promise(r => setTimeout(r, duration));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchBlock = async () => {
      setIsLoading(true);
      setError(null);
      setEvmBlock(null);
      setL1Block(null);

      const loadingPromise = simulateLoadingStages();
      
      const tryL1First = preferredChain === 'hypercore' || 
        (preferredChain === undefined && blockNumber >= L1_BLOCK_THRESHOLD);
      
      try {
        if (tryL1First) {
          const l1Data = await getL1BlockDetails(blockNumber);
          if (l1Data && !cancelled) {
            await loadingPromise;
            setL1Block(l1Data);
            setSource('hypercore');
            setIsLoading(false);
            return;
          }
          if (preferredChain !== 'hypercore') {
            const evmData = await getEVMBlock(blockNumber, true);
            if (evmData && !cancelled) {
              await loadingPromise;
              setEvmBlock(evmData);
              setSource('hyperevm');
              setIsLoading(false);
              return;
            }
          }
        } else {
          const evmData = await getEVMBlock(blockNumber, true);
          if (evmData && !cancelled) {
            await loadingPromise;
            setEvmBlock(evmData);
            setSource('hyperevm');
            setIsLoading(false);
            return;
          }
          if (preferredChain !== 'hyperevm') {
            const l1Data = await getL1BlockDetails(blockNumber);
            if (l1Data && !cancelled) {
              await loadingPromise;
              setL1Block(l1Data);
              setSource('hypercore');
              setIsLoading(false);
              return;
            }
          }
        }
        
        await loadingPromise;
        if (!cancelled) {
          setError(`Block ${blockNumber.toLocaleString()} not found`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load block');
        }
      } finally {
        if (!cancelled) {
          setLoadingStage({ stage: 'ready', message: '' });
          setIsLoading(false);
        }
      }
    };

    fetchBlock();
    return () => { cancelled = true; };
  }, [blockNumber, preferredChain, simulateLoadingStages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const truncateHash = (hash: string) => hash.length > 14 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  // Loading state with stages
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Box className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">{loadingStage.message}</p>
            <p className="text-xs text-muted-foreground">Block #{blockNumber.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {LOADING_STAGES.map((s, i) => {
              const currentIdx = LOADING_STAGES.findIndex(ls => ls.stage === loadingStage.stage);
              const isComplete = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={s.stage}
                  className={cn(
                    "h-1.5 w-8 rounded-full transition-all duration-300",
                    isComplete ? "bg-profit-3" : isCurrent ? "bg-primary animate-pulse" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (error || (!evmBlock && !l1Block)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error || `Block ${blockNumber.toLocaleString()} not found`}</p>
          <p className="text-xs text-muted-foreground mt-2">
            HyperEVM and Hypercore have different block numbering.
          </p>
        </div>
      </div>
    );
  }

  // Render EVM block
  if (source === 'hyperevm' && evmBlock) {
    return (
      <EVMBlockDetail 
        block={evmBlock} 
        onBack={onBack} 
        onNavigate={onNavigate} 
        handleCopy={handleCopy} 
        copiedId={copiedId} 
        page={page} 
        setPage={setPage} 
        rowsPerPage={rowsPerPage} 
        setRowsPerPage={setRowsPerPage}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      />
    );
  }

  // Render L1 block
  if (source === 'hypercore' && l1Block) {
    return (
      <L1BlockDetail 
        block={l1Block} 
        onBack={onBack} 
        onNavigate={onNavigate} 
        handleCopy={handleCopy} 
        copiedId={copiedId} 
        page={page} 
        setPage={setPage} 
        rowsPerPage={rowsPerPage} 
        setRowsPerPage={setRowsPerPage}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      />
    );
  }

  return null;
}

// EVM Block Component
function EVMBlockDetail({ block, onBack, onNavigate, handleCopy, copiedId, page, setPage, rowsPerPage, setRowsPerPage, expandedSections, toggleSection }: {
  block: EVMBlock;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
  expandedSections: Set<string>;
  toggleSection: (s: string) => void;
}) {
  const transactions = (block.transactions || []) as EVMTransaction[];
  const paginatedTxs = transactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, transactions.length);
  const gasUsedPercent = ((block.gasUsed / block.gasLimit) * 100).toFixed(1);
  const verifyUrl = `https://hypurrscan.io/block/${block.number}`;
  const truncateHash = (hash: string) => hash.length > 14 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  // Generate narrative
  const narrative = generateBlockNarrative({
    txCount: block.txCount,
    chain: 'hyperevm',
    highlights: transactions.length > 0 ? [`${transactions.length} transactions`] : [],
  });

  const provenance: Provenance = {
    source: 'hyperevm_rpc',
    fetchedAt: Date.now(),
    finality: 'final',
    blockHeight: block.number,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">HyperEVM</span>
      </div>

      {/* Hero Section */}
      <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Box className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">Block #{block.number.toLocaleString()}</h1>
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Verify <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">{narrative}</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Time</span>
            </div>
            <p className="text-sm font-medium">{timeAgo(block.timestamp)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Transactions</span>
            </div>
            <p className="text-sm font-medium">{block.txCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Gas Used</span>
            </div>
            <p className="text-sm font-medium">{gasUsedPercent}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Base Fee</span>
            </div>
            <p className="text-sm font-medium">{block.baseFeePerGas ? formatGwei(block.baseFeePerGas) + ' Gwei' : 'N/A'}</p>
          </div>
        </div>

        <ProvenanceIndicator provenance={provenance} />
      </div>

      {/* Block Details - Collapsible */}
      <CollapsibleSection
        title="Block Details"
        icon={<FileText className="h-4 w-4" />}
        isExpanded={expandedSections.has('details')}
        onToggle={() => toggleSection('details')}
      >
        <div className="space-y-0">
          <DetailRow label="Block Hash" value={block.hash} copyable onCopy={() => handleCopy(block.hash, 'hash')} copied={copiedId === 'hash'} />
          <DetailRow label="Parent Hash" value={truncateHash(block.parentHash)} onClick={() => onNavigate('block', String(block.number - 1))} isLink />
          <DetailRow label="Miner" value={truncateHash(block.miner)} onClick={() => onNavigate('wallet', block.miner)} isLink />
          <DetailRow label="Gas Limit" value={block.gasLimit.toLocaleString()} />
          <DetailRow label="Gas Used" value={`${block.gasUsed.toLocaleString()} (${gasUsedPercent}%)`} />
          {block.size && <DetailRow label="Size" value={`${block.size.toLocaleString()} bytes`} />}
          <DetailRow label="Timestamp" value={formatTimestamp(block.timestamp)} />
        </div>
      </CollapsibleSection>

      {/* Transactions - Collapsible */}
      <CollapsibleSection
        title={`Transactions (${transactions.length})`}
        icon={<Activity className="h-4 w-4" />}
        isExpanded={expandedSections.has('txs')}
        onToggle={() => toggleSection('txs')}
      >
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions in this block</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs h-9 px-4">Hash</TableHead>
                    <TableHead className="text-xs h-9 px-4">From</TableHead>
                    <TableHead className="text-xs h-9 px-4">To</TableHead>
                    <TableHead className="text-xs h-9 px-4">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTxs.map((tx) => (
                    <TableRow 
                      key={typeof tx === 'string' ? tx : tx.hash} 
                      className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                      onClick={() => onNavigate('tx', typeof tx === 'string' ? tx : tx.hash)}
                    >
                      <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                        {truncateHash(typeof tx === 'string' ? tx : tx.hash)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                        {typeof tx === 'string' ? '-' : truncateHash(tx.from)}
                      </TableCell>
                      <TableCell className="text-xs font-mono py-2.5 px-4">
                        {typeof tx === 'string' ? '-' : tx.to ? (
                          <span className="text-primary">{truncateHash(tx.to)}</span>
                        ) : (
                          <span className="text-emerald-400">Contract</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground py-2.5 px-4">
                        {typeof tx === 'string' ? '-' : `${tx.valueEth} HYPE`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-4 pt-3 text-xs text-muted-foreground border-t border-border/30 mt-3">
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
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={cn("p-1.5 rounded hover:bg-muted", page === 0 && "opacity-30")}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className={cn("p-1.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30")}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}

// L1 Block Component
function L1BlockDetail({ block, onBack, onNavigate, handleCopy, copiedId, page, setPage, rowsPerPage, setRowsPerPage, expandedSections, toggleSection }: {
  block: L1BlockDetails;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
  expandedSections: Set<string>;
  toggleSection: (s: string) => void;
}) {
  const transactions = block.txs || [];
  const paginatedTxs = transactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, transactions.length);
  const verifyUrl = `https://app.hyperliquid.xyz/explorer/block/${block.blockNumber}`;
  const truncateHash = (hash: string) => hash.length > 14 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Generate narrative
  const narrative = generateBlockNarrative({
    txCount: block.txCount,
    chain: 'hypercore',
    highlights: block.txCount > 0 ? [`${block.txCount} L1 transactions`] : [],
  });

  const provenance: Provenance = {
    source: 'hyperliquid_api',
    fetchedAt: Date.now(),
    finality: 'final',
    blockHeight: block.blockNumber,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Block</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-medium">Hypercore</span>
      </div>

      {/* Hero Section */}
      <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Box className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">Block #{block.blockNumber.toLocaleString()}</h1>
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Verify <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">{narrative}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.blockNumber - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('block', String(block.blockNumber + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Time</span>
            </div>
            <p className="text-sm font-medium">{formatTime(block.time)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Transactions</span>
            </div>
            <p className="text-sm font-medium">{block.txCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Proposer</span>
            </div>
            <p className="text-sm font-medium font-mono">{truncateHash(block.proposer)}</p>
          </div>
        </div>

        <ProvenanceIndicator provenance={provenance} />
      </div>

      {/* Block Details - Collapsible */}
      <CollapsibleSection
        title="Block Details"
        icon={<FileText className="h-4 w-4" />}
        isExpanded={expandedSections.has('details')}
        onToggle={() => toggleSection('details')}
      >
        <div className="space-y-0">
          <DetailRow label="Block Hash" value={block.hash} copyable onCopy={() => handleCopy(block.hash, 'hash')} copied={copiedId === 'hash'} />
          <DetailRow label="Proposer" value={block.proposer} copyable onCopy={() => handleCopy(block.proposer, 'proposer')} copied={copiedId === 'proposer'} />
          <DetailRow label="Transactions" value={block.txCount.toString()} />
          <DetailRow label="Timestamp" value={formatTime(block.time)} />
        </div>
      </CollapsibleSection>

      {/* Transactions - Collapsible */}
      <CollapsibleSection
        title={`Transactions (${transactions.length})`}
        icon={<Activity className="h-4 w-4" />}
        isExpanded={expandedSections.has('txs')}
        onToggle={() => toggleSection('txs')}
      >
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions in this block</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs h-9 px-4">Hash</TableHead>
                    <TableHead className="text-xs h-9 px-4">User</TableHead>
                    <TableHead className="text-xs h-9 px-4">Action</TableHead>
                    <TableHead className="text-xs h-9 px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTxs.map((tx, i) => (
                    <TableRow 
                      key={tx.hash || i} 
                      className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                      onClick={() => tx.hash && onNavigate('tx', tx.hash)}
                    >
                      <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                        {truncateHash(tx.hash)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-primary py-2.5 px-4">
                        <button onClick={(e) => { e.stopPropagation(); onNavigate('wallet', tx.user); }}>
                          {truncateHash(tx.user)}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {tx.action?.type || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        {tx.error ? (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-loss-3/20 text-loss-3">Failed</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-profit-3/20 text-profit-3">Success</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-4 pt-3 text-xs text-muted-foreground border-t border-border/30 mt-3">
                <span>{startIndex}-{endIndex} of {transactions.length}</span>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className={cn("p-1.5 rounded hover:bg-muted", page === 0 && "opacity-30")}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className={cn("p-1.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30")}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}

// Collapsible Section
function CollapsibleSection({ title, icon, children, isExpanded, onToggle }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// Detail Row
function DetailRow({ label, value, copyable, onCopy, copied, onClick, isLink }: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  onClick?: () => void;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 min-w-[100px]">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isLink && onClick ? (
          <button onClick={onClick} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">
            {value}
          </button>
        ) : (
          <span className="text-sm font-mono text-foreground break-all">{value}</span>
        )}
        {copyable && onCopy && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground shrink-0">
            {copied ? <Check className="h-3.5 w-3.5 text-profit-3" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
