import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Hash, Copy, Check, ExternalLink, ChevronRight, ChevronDown, Loader2, CheckCircle, XCircle, Clock, ArrowRight, AlertTriangle, ArrowUpRight, ArrowDownLeft, Minus, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEVMTransaction, formatTimestamp, timeAgo, truncateHash as truncateHashEVM, formatGwei, decodeKnownEvent, type EVMTransaction, type EVMLog } from '@/lib/hyperevmApi';
import { getL1TxDetails, type L1TransactionDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';
import { ProvenanceIndicator } from './ProvenanceIndicator';
import { AssetDeltaDisplay } from './AssetDeltaDisplay';
import { ExplorerActions } from './ExplorerActions';
import { generateTxNarrative, getActionType } from '@/lib/explorer/narratives';
import type { TransactionView, AssetDelta, Provenance, LoadingStage, ChainSource } from '@/lib/explorer/types';

interface TxDetailPageProps {
  hash: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => void;
  preferredChain?: 'hyperevm' | 'hypercore';
}

// Loading stage messages for "slow but thorough" UX
const LOADING_STAGES: Array<{ stage: LoadingStage['stage']; message: string; duration: number }> = [
  { stage: 'searching', message: 'Searching transaction...', duration: 500 },
  { stage: 'fetching', message: 'Fetching from chain...', duration: 800 },
  { stage: 'reconciling', message: 'Verifying data...', duration: 400 },
  { stage: 'computing', message: 'Computing deltas...', duration: 300 },
];

export function TxDetailPage({ hash, onBack, onNavigate, preferredChain }: TxDetailPageProps) {
  const [txView, setTxView] = useState<TransactionView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'searching', message: 'Searching transaction...' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details']));
  const [error, setError] = useState<string | null>(null);

  // Simulate multi-stage loading for thoroughness perception
  const simulateLoadingStages = useCallback(async () => {
    for (const { stage, message, duration } of LOADING_STAGES) {
      setLoadingStage({ stage, message });
      await new Promise(r => setTimeout(r, duration));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTx = async () => {
      setIsLoading(true);
      setError(null);
      setTxView(null);

      // Start loading animation
      const loadingPromise = simulateLoadingStages();

      try {
        const tryL1First = preferredChain === 'hypercore';
        let evmData: EVMTransaction | null = null;
        let l1Data: L1TransactionDetails | null = null;
        let source: ChainSource = 'unknown';

        if (tryL1First) {
          l1Data = await getL1TxDetails(hash);
          if (l1Data) {
            source = 'hypercore';
          } else if (preferredChain !== 'hypercore') {
            evmData = await getEVMTransaction(hash);
            if (evmData) source = 'hyperevm';
          }
        } else {
          evmData = await getEVMTransaction(hash);
          if (evmData) {
            source = 'hyperevm';
          } else if (preferredChain !== 'hyperevm') {
            l1Data = await getL1TxDetails(hash);
            if (l1Data) source = 'hypercore';
          }
        }

        // Wait for loading animation to complete
        await loadingPromise;
        if (cancelled) return;

        // Transform to TransactionView
        if (source === 'hyperevm' && evmData) {
          const view = transformEVMToView(evmData, hash);
          setTxView(view);
        } else if (source === 'hypercore' && l1Data) {
          const view = transformL1ToView(l1Data);
          setTxView(view);
        } else {
          setError('Transaction not found on HyperEVM or Hypercore');
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load transaction';
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingStage({ stage: 'ready', message: '' });
          setIsLoading(false);
        }
      }
    };

    fetchTx();
    return () => { cancelled = true; };
  }, [hash, preferredChain, simulateLoadingStages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleLog = (index: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const truncateHash = (h: string) => h.length > 14 ? `${h.slice(0, 6)}...${h.slice(-4)}` : h;

  // Loading state with stages
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">{loadingStage.message}</p>
            <p className="text-xs text-muted-foreground font-mono">{truncateHash(hash)}</p>
          </div>
          {/* Stage indicators */}
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

  // Error state with helpful suggestions
  if (error || !txView) {
    // Infer if this looks like an EVM tx hash (0x + 64 chars = 66 total)
    const looksLikeEvmTx = hash.startsWith('0x') && hash.length === 66;
    const suggestedChain = looksLikeEvmTx ? 'hyperevm' : 'hypercore';
    const currentlyTrying = preferredChain || 'hyperevm';
    const shouldSuggestSwitch = suggestedChain !== currentlyTrying;

    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">{error || 'Transaction not found'}</p>
          
          {shouldSuggestSwitch && (
            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 max-w-md mx-auto">
              <p className="text-sm text-foreground mb-3">
                This looks like a <span className="font-semibold">{suggestedChain === 'hyperevm' ? 'HyperEVM' : 'Hypercore L1'}</span> transaction.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Re-navigate with the suggested chain
                  const url = new URL(window.location.href);
                  url.searchParams.set('chain', suggestedChain);
                  window.location.href = url.toString();
                }}
                className="gap-2"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Try {suggestedChain === 'hyperevm' ? 'HyperEVM' : 'Hypercore L1'}
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-4">
            Note: HyperEVM and Hypercore have different transaction formats.
          </p>
        </div>
      </div>
    );
  }

  const verifyUrl = txView.chain === 'hypercore' 
    ? `https://app.hyperliquid.xyz/explorer/tx/${hash}`
    : `https://hypurrscan.io/tx/${hash}`;
    
  const StatusIcon = txView.status === 'success' ? CheckCircle : txView.status === 'failed' ? XCircle : Clock;
  const statusColor = txView.status === 'success' ? 'text-profit-3' : txView.status === 'failed' ? 'text-loss-3' : 'text-warning';
  const statusBg = txView.status === 'success' ? 'bg-profit-3/10' : txView.status === 'failed' ? 'bg-loss-3/10' : 'bg-warning/10';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Action Bar */}
      <ExplorerActions
        entityType="tx"
        entityId={hash}
        title={txView.narrative}
        onBack={onBack}
        externalUrl={verifyUrl}
        className="mb-4"
      />
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Transaction</span>
        <span className={cn(
          "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium",
          txView.chain === 'hyperevm' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
        )}>
          {txView.chain === 'hyperevm' ? 'HyperEVM' : 'Hypercore'}
        </span>
      </div>

      {/* Hero Section: Narrative + Status */}
      <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", statusBg)}>
              <StatusIcon className={cn("h-6 w-6", statusColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  {txView.actionType}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                  txView.status === 'success' ? 'bg-profit-3/20 text-profit-3' : 
                  txView.status === 'failed' ? 'bg-loss-3/20 text-loss-3' : 
                  'bg-warning/20 text-warning'
                )}>
                  {txView.status}
                </span>
              </div>
              <p className="text-lg font-medium text-foreground">{txView.narrative}</p>
            </div>
          </div>
          <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0">
            Verify <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Hash + Time row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">{truncateHash(hash)}</span>
            <button onClick={() => handleCopy(hash, 'hash')} className="text-muted-foreground hover:text-foreground">
              {copiedId === 'hash' ? <Check className="h-3.5 w-3.5 text-profit-3" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeAgo(txView.timestamp)}</span>
            <span className="text-xs">({formatTimestamp(txView.timestamp)})</span>
          </div>
        </div>

        {/* Provenance */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <ProvenanceIndicator provenance={txView.provenance} />
        </div>
      </div>

      {/* Asset Deltas - Primary User Question: "What Changed?" */}
      {txView.deltas.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            What Changed
          </h2>
          <AssetDeltaDisplay deltas={txView.deltas} />
        </div>
      )}

      {/* Parties: From → To */}
      <div className="rounded-xl border border-border bg-card/50 p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <button 
              onClick={() => onNavigate('wallet', txView.from)} 
              className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left"
            >
              {txView.from}
            </button>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-muted-foreground mb-1">
              {txView.to ? 'To' : txView.evmDetails?.contractAddress ? 'Contract Created' : 'To'}
            </p>
            {txView.to ? (
              <button 
                onClick={() => onNavigate('wallet', txView.to!)} 
                className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left"
              >
                {txView.to}
              </button>
            ) : txView.evmDetails?.contractAddress ? (
              <button 
                onClick={() => onNavigate('wallet', txView.evmDetails!.contractAddress!)} 
                className="text-sm font-mono text-emerald-400 break-all text-left"
              >
                {txView.evmDetails.contractAddress}
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* L1 Action Details (Hypercore specific) */}
      {txView.l1Action && (
        <CollapsibleSection
          title="Trade Details"
          icon={<FileText className="h-4 w-4" />}
          isExpanded={expandedSections.has('l1action')}
          onToggle={() => toggleSection('l1action')}
        >
          <div className="space-y-3">
            {txView.l1Action.market && (
              <DetailRow label="Market" value={txView.l1Action.market} />
            )}
            {txView.l1Action.side && (
              <DetailRow 
                label="Side" 
                value={txView.l1Action.side === 'B' ? 'Long' : 'Short'} 
                valueColor={txView.l1Action.side === 'B' ? 'profit' : 'loss'}
              />
            )}
            {txView.l1Action.size && (
              <DetailRow label="Size" value={txView.l1Action.size} />
            )}
            {txView.l1Action.price && (
              <DetailRow label="Price" value={`$${txView.l1Action.price}`} />
            )}
            {txView.l1Action.closedPnl && parseFloat(txView.l1Action.closedPnl) !== 0 && (
              <DetailRow 
                label="Realized PnL" 
                value={`$${parseFloat(txView.l1Action.closedPnl).toFixed(2)}`}
                valueColor={parseFloat(txView.l1Action.closedPnl) >= 0 ? 'profit' : 'loss'}
              />
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Transaction Details */}
      <CollapsibleSection
        title="Transaction Details"
        icon={<FileText className="h-4 w-4" />}
        isExpanded={expandedSections.has('details')}
        onToggle={() => toggleSection('details')}
        defaultExpanded
      >
        <div className="space-y-0">
          <DetailRow label="Hash" value={hash} copyable onCopy={() => handleCopy(hash, 'hash-detail')} copied={copiedId === 'hash-detail'} />
          <DetailRow 
            label="Block" 
            value={txView.blockNumber.toLocaleString()} 
            onClick={() => onNavigate('block', String(txView.blockNumber))} 
            isLink 
          />
          <DetailRow label="Value" value={`${txView.valueNative} ${txView.chain === 'hyperevm' ? 'HYPE' : 'USDC'}`} />
          <DetailRow label="Fee" value={txView.fee} />
          {txView.evmDetails && (
            <>
              <DetailRow label="Gas Used" value={txView.evmDetails.gasUsed.toLocaleString()} />
              <DetailRow label="Gas Limit" value={txView.evmDetails.gasLimit.toLocaleString()} />
              <DetailRow label="Gas Price" value={`${formatGwei(txView.evmDetails.gasPrice)} Gwei`} />
              <DetailRow label="Nonce" value={txView.evmDetails.nonce.toString()} />
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Input Data (EVM) */}
      {txView.evmDetails?.input && txView.evmDetails.input !== '0x' && (
        <CollapsibleSection
          title="Input Data"
          icon={<FileText className="h-4 w-4" />}
          isExpanded={expandedSections.has('input')}
          onToggle={() => toggleSection('input')}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Method ID: <span className="font-mono text-foreground">{txView.evmDetails.input.slice(0, 10)}</span>
            </p>
            <pre className="text-xs font-mono bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground max-h-40">
              {txView.evmDetails.input}
            </pre>
          </div>
        </CollapsibleSection>
      )}

      {/* Event Logs (EVM) */}
      {txView.evmDetails?.logs && txView.evmDetails.logs.length > 0 && (
        <CollapsibleSection
          title={`Event Logs (${txView.evmDetails.logs.length})`}
          icon={<FileText className="h-4 w-4" />}
          isExpanded={expandedSections.has('logs')}
          onToggle={() => toggleSection('logs')}
        >
          <div className="space-y-2">
            {txView.evmDetails.logs.map((log: EVMLog, index: number) => {
              const decodedLog = decodeKnownEvent(log);
              return (
                <div key={index} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleLog(index)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">#{log.logIndex}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate('wallet', log.address); }}
                        className="text-xs font-mono text-primary"
                      >
                        {truncateHash(log.address)}
                      </button>
                      {decodedLog.decoded && (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          {decodedLog.decoded.eventName}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedLogs.has(index) && "rotate-180"
                    )} />
                  </button>
                  {expandedLogs.has(index) && (
                    <div className="border-t border-border/50 p-3 bg-muted/20 space-y-2 text-xs">
                      {log.topics.map((topic, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-muted-foreground">[{i}]</span>
                          <span className="font-mono text-foreground break-all">{topic}</span>
                        </div>
                      ))}
                      {log.data && log.data !== '0x' && (
                        <div>
                          <span className="text-muted-foreground">Data: </span>
                          <span className="font-mono break-all">{log.data}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  isExpanded, 
  onToggle,
  defaultExpanded = false 
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  defaultExpanded?: boolean;
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
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// Detail Row Component
function DetailRow({ 
  label, 
  value, 
  copyable, 
  onCopy, 
  copied, 
  onClick, 
  isLink,
  valueColor 
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  onClick?: () => void;
  isLink?: boolean;
  valueColor?: 'profit' | 'loss' | 'primary';
}) {
  const colorClasses = {
    profit: 'text-profit-3',
    loss: 'text-loss-3',
    primary: 'text-primary',
  };

  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 min-w-[100px]">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isLink && onClick ? (
          <button onClick={onClick} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">
            {value}
          </button>
        ) : (
          <span className={cn(
            "text-sm font-mono break-all",
            valueColor ? colorClasses[valueColor] : 'text-foreground'
          )}>
            {value}
          </span>
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

// Transform EVM transaction to TransactionView
function transformEVMToView(tx: EVMTransaction, hash: string): TransactionView {
  const deltas: AssetDelta[] = [];
  
  // Add native value transfer as delta
  if (tx.valueEth && parseFloat(tx.valueEth) > 0) {
    deltas.push({
      asset: 'HYPE',
      symbol: 'HYPE',
      before: '—',
      after: '—',
      delta: `-${tx.valueEth}`,
      deltaUsd: '—',
      direction: 'out',
      chain: 'hyperevm',
    });
  }

  // Parse Transfer events from logs
  if (tx.logs) {
    for (const log of tx.logs) {
      const decoded = decodeKnownEvent(log);
      if (decoded.decoded?.eventName?.includes('Transfer')) {
        const args = decoded.decoded.args;
        const isIncoming = args.to?.toLowerCase() === tx.from.toLowerCase();
        const amount = args.amount ? (BigInt(args.amount) / BigInt(10 ** 18)).toString() : '?';
        
        deltas.push({
          asset: log.address,
          symbol: 'TOKEN',
          before: '—',
          after: '—',
          delta: isIncoming ? amount : `-${amount}`,
          deltaUsd: '—',
          direction: isIncoming ? 'in' : 'out',
          chain: 'hyperevm',
        });
      }
    }
  }

  const txFee = tx.gasUsed && tx.effectiveGasPrice 
    ? ((tx.gasUsed * tx.effectiveGasPrice) / 1e18).toFixed(8) 
    : '0';

  const view: TransactionView = {
    hash,
    chain: 'hyperevm',
    status: tx.status || 'pending',
    timestamp: tx.blockNumber ? Date.now() / 1000 : Date.now() / 1000, // Would need block timestamp
    blockNumber: tx.blockNumber || 0,
    narrative: '',
    actionType: '',
    from: tx.from,
    to: tx.to,
    valueNative: tx.valueEth,
    fee: `${txFee} HYPE`,
    deltas,
    evmDetails: {
      gasUsed: tx.gasUsed || 0,
      gasLimit: tx.gas,
      gasPrice: tx.gasPrice || tx.maxFeePerGas || 0,
      nonce: tx.nonce,
      input: tx.input,
      logs: tx.logs || [],
      contractAddress: tx.contractAddress || undefined,
    },
    provenance: {
      source: 'hyperevm_rpc',
      fetchedAt: Date.now(),
      finality: tx.status === 'success' ? 'final' : tx.status === 'pending' ? 'pending' : 'final',
      blockHeight: tx.blockNumber || undefined,
    },
  };

  // Generate narrative after building view
  view.narrative = generateTxNarrative(view);
  view.actionType = getActionType(view);

  return view;
}

// Transform L1 transaction to TransactionView
function transformL1ToView(tx: L1TransactionDetails): TransactionView {
  const action = tx.action || {};
  const deltas: AssetDelta[] = [];

  // Extract deltas from action if available
  if (action.type === 'spotSwap' || action.type === 'swap') {
    // Would need to parse swap details
  }

  const view: TransactionView = {
    hash: tx.hash,
    chain: 'hypercore',
    status: tx.error ? 'failed' : 'success',
    timestamp: tx.time / 1000,
    blockNumber: tx.block,
    narrative: '',
    actionType: '',
    from: tx.user,
    to: null,
    valueNative: '0',
    fee: '—',
    deltas,
    l1Action: {
      type: action.type || 'unknown',
      market: action.coin || action.market,
      size: action.sz || action.size,
      price: action.limitPx || action.px,
      side: action.isBuy !== undefined ? (action.isBuy ? 'B' : 'S') : action.side,
      closedPnl: action.closedPnl,
    },
    provenance: {
      source: 'hyperliquid_api',
      fetchedAt: Date.now(),
      finality: 'final',
      blockHeight: tx.block,
    },
  };

  view.narrative = generateTxNarrative(view);
  view.actionType = getActionType(view);

  return view;
}
