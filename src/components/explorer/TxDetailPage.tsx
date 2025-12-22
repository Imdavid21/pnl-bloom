import { useState, useEffect } from 'react';
import { ArrowLeft, Hash, Copy, Check, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTxDetails, type TransactionDetails } from '@/lib/hyperliquidApi';

interface TxDetailPageProps {
  hash: string;
  onBack: () => void;
  onNavigate: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

export function TxDetailPage({ hash, onBack, onNavigate }: TxDetailPageProps) {
  const [tx, setTx] = useState<TransactionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTx = async () => {
      setIsLoading(true);
      const data = await getTxDetails(hash);
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

  const truncateHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;

  const verifyUrl = `https://app.hyperliquid.xyz/explorer/tx/${hash}`;

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

  const action = tx.action || {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={onBack} className="hover:text-foreground transition-colors">Explorer</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Transaction Details</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Hash {truncateHash(hash)}</h1>
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
          <DetailRow 
            label="Hash" 
            value={hash}
            copyable={hash}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="hash"
          />
          <DetailRow 
            label="Block" 
            value={tx.block.toLocaleString()}
            onClick={() => onNavigate('block', String(tx.block))}
            isLink
          />
          <DetailRow label="Time" value={formatTime(tx.time)} />
          <DetailRow 
            label="User" 
            value={tx.user}
            copyable={tx.user}
            onCopy={handleCopy}
            copiedId={copiedId}
            id="user"
            onClick={() => onNavigate('wallet', tx.user)}
            isLink
          />
        </div>
      </div>

      {/* Action Details */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <h2 className="text-sm font-medium text-foreground mb-3">Action Details</h2>
        <div className="space-y-3">
          {action.type && (
            <DetailRow label="type" value={`"${action.type}"`} />
          )}
          {action.signatureChainId && (
            <DetailRow label="signatureChainId" value={`"${action.signatureChainId}"`} />
          )}
          {action.hyperliquidChain && (
            <DetailRow label="hyperliquidChain" value={`"${action.hyperliquidChain}"`} />
          )}
          {action.agentAddress && (
            <DetailRow 
              label="agentAddress" 
              value={`"${action.agentAddress}"`}
              copyable={action.agentAddress}
              onCopy={handleCopy}
              copiedId={copiedId}
              id="agent"
            />
          )}
          {action.agentName && (
            <DetailRow label="agentName" value={`"${action.agentName}"`} />
          )}
          {action.nonce && (
            <DetailRow label="nonce" value={String(action.nonce)} />
          )}
          {tx.error && (
            <DetailRow label="error" value={tx.error} />
          )}
        </div>
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
    <div className="flex items-start justify-between py-2 border-b border-border/20 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0 min-w-[120px]">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {isLink && onClick ? (
          <button 
            onClick={onClick}
            className="text-sm font-mono text-primary hover:text-primary/80 truncate text-right"
          >
            {value}
          </button>
        ) : (
          <span className="text-sm font-mono text-foreground truncate text-right">{value}</span>
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
