import { useState, useEffect } from 'react';
import { ArrowLeft, Hash, Copy, Check, ExternalLink, ChevronRight, Loader2, CheckCircle, XCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEVMTransaction, formatTimestamp, timeAgo, truncateHash as truncateHashEVM, formatGwei, decodeKnownEvent, type EVMTransaction, type EVMLog } from '@/lib/hyperevmApi';
import { getL1TxDetails, type L1TransactionDetails } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface TxDetailPageProps {
  hash: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function TxDetailPage({ hash, onBack, onNavigate }: TxDetailPageProps) {
  const [evmTx, setEvmTx] = useState<EVMTransaction | null>(null);
  const [l1Tx, setL1Tx] = useState<L1TransactionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [source, setSource] = useState<'evm' | 'l1' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTx = async () => {
      setIsLoading(true);
      setError(null);
      
      // Try both in parallel
      const [evmData, l1Data] = await Promise.all([
        getEVMTransaction(hash),
        getL1TxDetails(hash),
      ]);

      if (evmData) {
        setEvmTx(evmData);
        setSource('evm');
      } else if (l1Data) {
        setL1Tx(l1Data);
        setSource('l1');
      } else {
        setError('Transaction not found on HyperEVM or Hypercore L1');
      }
      
      setIsLoading(false);
    };
    fetchTx();
  }, [hash]);

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

  const truncateHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (error || (!evmTx && !l1Tx)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error || 'Transaction not found'}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: HyperEVM and Hypercore L1 have different transaction formats.
          </p>
        </div>
      </div>
    );
  }

  // Render EVM transaction
  if (source === 'evm' && evmTx) {
    return <EVMTxDetail tx={evmTx} hash={hash} onBack={onBack} onNavigate={onNavigate} handleCopy={handleCopy} copiedId={copiedId} showRawInput={showRawInput} setShowRawInput={setShowRawInput} expandedLogs={expandedLogs} toggleLog={toggleLog} />;
  }

  // Render L1 transaction
  if (source === 'l1' && l1Tx) {
    return <L1TxDetail tx={l1Tx} onBack={onBack} onNavigate={onNavigate} handleCopy={handleCopy} copiedId={copiedId} />;
  }

  return null;
}

// EVM Transaction Component
function EVMTxDetail({ tx, hash, onBack, onNavigate, handleCopy, copiedId, showRawInput, setShowRawInput, expandedLogs, toggleLog }: {
  tx: EVMTransaction;
  hash: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
  showRawInput: boolean;
  setShowRawInput: (v: boolean) => void;
  expandedLogs: Set<number>;
  toggleLog: (i: number) => void;
}) {
  const truncateHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;
  const verifyUrl = `https://hypurrscan.io/tx/${hash}`;
  const StatusIcon = tx.status === 'success' ? CheckCircle : tx.status === 'failed' ? XCircle : Clock;
  const statusColor = tx.status === 'success' ? 'text-profit-3' : tx.status === 'failed' ? 'text-loss-3' : 'text-yellow-500';
  const txFee = tx.gasUsed && tx.effectiveGasPrice ? ((tx.gasUsed * tx.effectiveGasPrice) / 1e18).toFixed(8) : null;
  const decodedLogs = (tx.logs || []).map(log => decodeKnownEvent(log));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Transaction Details</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">HyperEVM</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tx.status === 'success' ? 'bg-profit-3/10' : tx.status === 'failed' ? 'bg-loss-3/10' : 'bg-yellow-500/10')}>
            <StatusIcon className={cn("h-5 w-5", statusColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Transaction</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", tx.status === 'success' ? 'bg-profit-3/20 text-profit-3' : tx.status === 'failed' ? 'bg-loss-3/20 text-loss-3' : 'bg-yellow-500/20 text-yellow-500')}>{tx.status}</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{truncateHash(hash)}</p>
          </div>
        </div>
        <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Verify <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* From -> To */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <button onClick={() => onNavigate('wallet', tx.from)} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">{tx.from}</button>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground mb-1">{tx.to ? 'To' : 'Contract Created'}</p>
            {tx.to ? (
              <button onClick={() => onNavigate('wallet', tx.to!)} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">{tx.to}</button>
            ) : tx.contractAddress ? (
              <button onClick={() => onNavigate('wallet', tx.contractAddress!)} className="text-sm font-mono text-emerald-400 break-all text-left">{tx.contractAddress}</button>
            ) : (
              <span className="text-sm text-muted-foreground">Pending...</span>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Transaction Details</h2>
        <DetailRow label="Transaction Hash" value={tx.hash} copyable={tx.hash} onCopy={handleCopy} copiedId={copiedId} id="hash" />
        <DetailRow label="Block" value={tx.blockNumber ? tx.blockNumber.toLocaleString() : 'Pending'} onClick={tx.blockNumber ? () => onNavigate('block', String(tx.blockNumber)) : undefined} isLink={!!tx.blockNumber} />
        <DetailRow label="Value" value={`${tx.valueEth} ETH`} />
        <DetailRow label="Gas Limit" value={tx.gas.toLocaleString()} />
        {tx.gasUsed && <DetailRow label="Gas Used" value={tx.gasUsed.toLocaleString()} />}
        {txFee && <DetailRow label="Transaction Fee" value={`${txFee} ETH`} />}
        <DetailRow label="Nonce" value={tx.nonce.toString()} />
      </div>

      {/* Input Data */}
      {tx.input && tx.input !== '0x' && (
        <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Input Data</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowRawInput(!showRawInput)} className="text-xs">{showRawInput ? 'Hide' : 'Show'}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Method ID: <span className="font-mono text-foreground">{tx.input.slice(0, 10)}</span></p>
          {showRawInput && (
            <pre className="mt-2 text-xs font-mono bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">{tx.input}</pre>
          )}
        </div>
      )}

      {/* Event Logs */}
      {decodedLogs.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Event Logs ({decodedLogs.length})</h2>
          <div className="space-y-2">
            {decodedLogs.map((log, index) => (
              <div key={index} className="border border-border/50 rounded-lg overflow-hidden">
                <button onClick={() => toggleLog(index)} className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{log.logIndex}</span>
                    <button onClick={(e) => { e.stopPropagation(); onNavigate('wallet', log.address); }} className="text-xs font-mono text-primary">{truncateHash(log.address)}</button>
                    {log.decoded && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{log.decoded.eventName}</span>}
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedLogs.has(index) && "rotate-90")} />
                </button>
                {expandedLogs.has(index) && (
                  <div className="border-t border-border/50 p-3 bg-muted/20 space-y-2 text-xs">
                    {log.topics.map((topic, i) => (
                      <div key={i} className="flex gap-2"><span className="text-muted-foreground">[{i}]</span><span className="font-mono text-foreground break-all">{topic}</span></div>
                    ))}
                    {log.data && log.data !== '0x' && <div><span className="text-muted-foreground">Data:</span> <span className="font-mono break-all">{log.data}</span></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// L1 Transaction Component
function L1TxDetail({ tx, onBack, onNavigate, handleCopy, copiedId }: {
  tx: L1TransactionDetails;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
  handleCopy: (t: string, id: string) => void;
  copiedId: string | null;
}) {
  const truncateHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;
  const verifyUrl = `https://app.hyperliquid.xyz/explorer/tx/${tx.hash}`;
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();
  const action = tx.action || {};
  const actionFields = Object.entries(action).filter(([key]) => key !== 'type');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Transaction Details</span>
        <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">Hypercore L1</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tx.error ? 'bg-loss-3/10' : 'bg-profit-3/10')}>
            {tx.error ? <XCircle className="h-5 w-5 text-loss-3" /> : <CheckCircle className="h-5 w-5 text-profit-3" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Transaction</h1>
            <p className="text-xs text-muted-foreground font-mono">{truncateHash(tx.hash)}</p>
          </div>
        </div>
        <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Verify <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Overview</h2>
        <DetailRow label="Hash" value={tx.hash} copyable={tx.hash} onCopy={handleCopy} copiedId={copiedId} id="hash" />
        <DetailRow label="Block" value={tx.block.toLocaleString()} onClick={() => onNavigate('block', String(tx.block))} isLink />
        <DetailRow label="Time" value={formatTime(tx.time)} />
        <DetailRow label="User" value={tx.user} copyable={tx.user} onCopy={handleCopy} copiedId={copiedId} id="user" onClick={() => onNavigate('wallet', tx.user)} isLink />
        {action.type && <DetailRow label="Action Type" value={action.type} valueColor="emerald" />}
        {tx.error && <DetailRow label="Error" value={tx.error} valueColor="red" />}
      </div>

      {/* Action Details */}
      {actionFields.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Action Details</h2>
          {actionFields.map(([key, value]) => (
            <DetailRow key={key} label={key} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, copyable, onCopy, copiedId, id, onClick, isLink, valueColor }: {
  label: string;
  value: string;
  copyable?: string;
  onCopy?: (t: string, id: string) => void;
  copiedId?: string | null;
  id?: string;
  onClick?: () => void;
  isLink?: boolean;
  valueColor?: 'primary' | 'emerald' | 'red';
}) {
  const colorClasses = { primary: 'text-primary', emerald: 'text-emerald-400', red: 'text-loss-3' };
  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0 gap-6">
      <span className="text-xs text-muted-foreground shrink-0 min-w-[120px]">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {isLink && onClick ? (
          <button onClick={onClick} className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left">{value}</button>
        ) : (
          <span className={cn("text-sm font-mono break-all", valueColor ? colorClasses[valueColor] : 'text-foreground')}>{value}</span>
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
