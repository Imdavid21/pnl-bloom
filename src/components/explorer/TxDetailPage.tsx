import { useState, useEffect } from 'react';
import { ArrowLeft, Hash, Copy, Check, ExternalLink, ChevronRight, Loader2, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEVMTransaction, formatTimestamp, timeAgo, truncateHash, formatGwei, decodeKnownEvent, type EVMTransaction, type EVMLog } from '@/lib/hyperevmApi';
import { cn } from '@/lib/utils';

interface TxDetailPageProps {
  hash: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function TxDetailPage({ hash, onBack, onNavigate }: TxDetailPageProps) {
  const [tx, setTx] = useState<EVMTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchTx = async () => {
      setIsLoading(true);
      const data = await getEVMTransaction(hash);
      setTx(data);
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
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const verifyUrl = `https://hypurrscan.io/tx/${hash}`;

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

  if (!tx) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Transaction not found</p>
        </div>
      </div>
    );
  }

  const StatusIcon = tx.status === 'success' ? CheckCircle : tx.status === 'failed' ? XCircle : Clock;
  const statusColor = tx.status === 'success' ? 'text-profit-3' : tx.status === 'failed' ? 'text-loss-3' : 'text-yellow-500';
  const txFee = tx.gasUsed && tx.effectiveGasPrice 
    ? ((tx.gasUsed * tx.effectiveGasPrice) / 1e18).toFixed(8)
    : null;

  // Decode logs
  const decodedLogs = (tx.logs || []).map(log => decodeKnownEvent(log));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <button onClick={onBack} className="hover:text-foreground transition-colors text-primary">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Transaction Details</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", 
            tx.status === 'success' ? 'bg-profit-3/10' : tx.status === 'failed' ? 'bg-loss-3/10' : 'bg-yellow-500/10'
          )}>
            <StatusIcon className={cn("h-5 w-5", statusColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Transaction</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                tx.status === 'success' ? 'bg-profit-3/20 text-profit-3' : 
                tx.status === 'failed' ? 'bg-loss-3/20 text-loss-3' : 
                'bg-yellow-500/20 text-yellow-500'
              )}>
                {tx.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{truncateHash(hash, 10, 8)}</p>
          </div>
        </div>
        <a 
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Verify on Hypurrscan <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* From -> To */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <button 
              onClick={() => onNavigate('wallet', tx.from)}
              className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left"
            >
              {tx.from}
            </button>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground mb-1">{tx.to ? 'To' : 'Contract Created'}</p>
            {tx.to ? (
              <button 
                onClick={() => onNavigate('wallet', tx.to!)}
                className="text-sm font-mono text-primary hover:text-primary/80 break-all text-left"
              >
                {tx.to}
              </button>
            ) : tx.contractAddress ? (
              <button 
                onClick={() => onNavigate('wallet', tx.contractAddress!)}
                className="text-sm font-mono text-emerald-400 hover:text-emerald-300 break-all text-left"
              >
                {tx.contractAddress}
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">Pending...</span>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Transaction Details</h2>
        <div className="space-y-0">
          <DetailRow 
            label="Transaction Hash" 
            value={tx.hash}
            copyable={tx.hash}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="hash"
          />
          <DetailRow 
            label="Block" 
            value={tx.blockNumber ? tx.blockNumber.toLocaleString() : 'Pending'}
            onClick={tx.blockNumber ? () => onNavigate('block', String(tx.blockNumber)) : undefined}
            isLink={!!tx.blockNumber}
          />
          <DetailRow label="Value" value={`${tx.valueEth} ETH`} />
          <DetailRow label="Gas Limit" value={tx.gas.toLocaleString()} />
          {tx.gasUsed && <DetailRow label="Gas Used" value={tx.gasUsed.toLocaleString()} />}
          {tx.gasPrice && <DetailRow label="Gas Price" value={`${formatGwei(tx.gasPrice)} Gwei`} />}
          {tx.effectiveGasPrice && <DetailRow label="Effective Gas Price" value={`${formatGwei(tx.effectiveGasPrice)} Gwei`} />}
          {txFee && <DetailRow label="Transaction Fee" value={`${txFee} ETH`} />}
          {tx.maxFeePerGas && <DetailRow label="Max Fee Per Gas" value={`${formatGwei(tx.maxFeePerGas)} Gwei`} />}
          {tx.maxPriorityFeePerGas && <DetailRow label="Max Priority Fee" value={`${formatGwei(tx.maxPriorityFeePerGas)} Gwei`} />}
          <DetailRow label="Nonce" value={tx.nonce.toString()} />
          <DetailRow label="Transaction Type" value={`Type ${tx.type}`} />
          {tx.transactionIndex !== null && (
            <DetailRow label="Position in Block" value={tx.transactionIndex.toString()} />
          )}
        </div>
      </div>

      {/* Input Data */}
      {tx.input && tx.input !== '0x' && (
        <div className="rounded-lg border border-border bg-card/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Input Data</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowRawInput(!showRawInput)}
              className="text-xs"
            >
              {showRawInput ? 'Hide Raw' : 'Show Raw'}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Method ID: <span className="font-mono text-foreground">{tx.input.slice(0, 10)}</span>
            </p>
            {showRawInput && (
              <div className="relative">
                <pre className="text-xs font-mono bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                  {tx.input}
                </pre>
                <button 
                  onClick={() => handleCopy(tx.input, 'input')}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                >
                  {copiedId === 'input' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Logs */}
      {decodedLogs.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Event Logs ({decodedLogs.length})</h2>
          <div className="space-y-3">
            {decodedLogs.map((log, index) => (
              <div key={index} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleLog(index)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{log.logIndex}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigate('wallet', log.address); }}
                      className="text-xs font-mono text-primary hover:text-primary/80"
                    >
                      {truncateHash(log.address)}
                    </button>
                    {log.decoded && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        {log.decoded.eventName}
                      </span>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expandedLogs.has(index) && "rotate-90"
                  )} />
                </button>
                {expandedLogs.has(index) && (
                  <div className="border-t border-border/50 p-3 bg-muted/20 space-y-2">
                    {log.decoded && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Decoded:</p>
                        {Object.entries(log.decoded.args).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground">{key}:</span>
                            {typeof val === 'string' && val.startsWith('0x') && val.length === 42 ? (
                              <button 
                                onClick={() => onNavigate('wallet', val)}
                                className="font-mono text-primary hover:text-primary/80 break-all text-left"
                              >
                                {val}
                              </button>
                            ) : (
                              <span className="font-mono text-foreground break-all">{String(val)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Topics:</p>
                      {log.topics.map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">[{i}]</span>
                          <span className="font-mono text-foreground break-all">{topic}</span>
                        </div>
                      ))}
                    </div>
                    {log.data && log.data !== '0x' && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Data:</p>
                        <pre className="text-xs font-mono text-foreground break-all">{log.data}</pre>
                      </div>
                    )}
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

function DetailRow({ 
  label, 
  value, 
  copyable, 
  onCopy, 
  copiedId, 
  id, 
  onClick, 
  isLink
}: {
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
      <span className="text-xs text-muted-foreground shrink-0 min-w-[140px]">{label}</span>
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
