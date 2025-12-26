/**
 * HyperEVM Transaction Page
 * Detailed view of an EVM transaction
 */

import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ExternalLink, Check, X, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEVMTransaction } from '@/hooks/useEVMTransaction';
import { CopyableText } from '@/components/explorer/CopyableText';
import { TransactionNotFound } from '@/components/explorer/TransactionNotFound';
import { TransactionSkeleton } from '@/components/explorer/TransactionSkeleton';
import { cn } from '@/lib/utils';

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWei(wei: string): { eth: string; usd: string } {
  const weiNum = BigInt(wei || '0');
  const ethValue = Number(weiNum) / 1e18;
  const usdValue = ethValue * 2000; // Placeholder price
  return {
    eth: ethValue.toFixed(6),
    usd: `$${usdValue.toFixed(2)}`,
  };
}

function StatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
  if (status === 'success') {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
        <Check className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
        <X className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground/50 font-medium">
        {label}
      </p>
      <div className="text-sm md:text-base font-medium">
        {children}
      </div>
    </div>
  );
}

export default function HyperEVMTransaction() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const { data: tx, isLoading, error } = useEVMTransaction(hash);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explorer');
    }
  };

  const shortHash = hash 
    ? `${hash.slice(0, 10)}...${hash.slice(-8)}`
    : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <TransactionSkeleton />
        </div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <>
        <Helmet>
          <title>Transaction Not Found | HyperPNL Explorer</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <TransactionNotFound identifier={hash || ''} />
          </div>
        </div>
      </>
    );
  }

  const value = formatWei(tx.value);
  const fee = formatWei(
    (BigInt(tx.gasUsed) * BigInt(tx.gasPrice || '0')).toString()
  );

  return (
    <>
      <Helmet>
        <title>Transaction {shortHash} | HyperPNL Explorer</title>
        <meta name="description" content={`View HyperEVM transaction ${shortHash}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
          {/* Back Navigation */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="text-muted-foreground/60 hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          {/* Header */}
          <div className="space-y-3">
            <Badge variant="secondary" className="text-xs">
              Transaction
            </Badge>
            <div className="flex flex-wrap items-center gap-3">
              <CopyableText 
                text={tx.hash} 
                displayText={shortHash}
                className="text-xl md:text-2xl font-semibold"
              />
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={tx.status} />
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="rounded-xl bg-muted/20 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              <DetailRow label="From">
                <Link 
                  to={`/wallet/${tx.from}`}
                  className="hover:underline underline-offset-2 text-primary"
                >
                  <CopyableText text={tx.from} displayText={shortenAddress(tx.from)} />
                </Link>
              </DetailRow>

              <DetailRow label="To">
                {tx.to ? (
                  <Link 
                    to={`/wallet/${tx.to}`}
                    className="hover:underline underline-offset-2 text-primary"
                  >
                    <CopyableText text={tx.to} displayText={shortenAddress(tx.to)} />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Contract Creation</span>
                )}
              </DetailRow>

              <DetailRow label="Value">
                <div>
                  <span>{value.eth} ETH</span>
                  <span className="text-muted-foreground ml-2">({value.usd})</span>
                </div>
              </DetailRow>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <DetailRow label="Block">
                <Link 
                  to={`/block/${tx.blockNumber}`}
                  className="hover:underline underline-offset-2 text-primary"
                >
                  {tx.blockNumber.toLocaleString()}
                </Link>
              </DetailRow>

              <DetailRow label="Gas Used">
                <span>{tx.gasUsed.toLocaleString()}</span>
              </DetailRow>

              <DetailRow label="Transaction Fee">
                <div>
                  <span>{fee.eth} ETH</span>
                  <span className="text-muted-foreground ml-2">({fee.usd})</span>
                </div>
              </DetailRow>
            </div>
          </div>

          {/* Token Transfers */}
          {tx.tokenTransfers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground/50">
                Token Transfers
              </h3>
              <div className="space-y-2">
                {tx.tokenTransfers.map((transfer, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/20"
                  >
                    <span className="text-lg">
                      {transfer.direction === 'in' ? '←' : '→'}
                    </span>
                    <span className={cn(
                      'font-medium',
                      transfer.direction === 'in' ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {transfer.amount} {transfer.tokenSymbol}
                    </span>
                    <span className="text-muted-foreground">
                      {transfer.direction === 'in' ? 'from' : 'to'}
                    </span>
                    <Link 
                      to={`/wallet/${transfer.direction === 'in' ? transfer.from : transfer.to}`}
                      className="font-mono text-sm hover:underline"
                    >
                      {shortenAddress(transfer.direction === 'in' ? transfer.from : transfer.to)}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Logs */}
          {tx.logs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground/50">
                Event Logs ({tx.logs.length})
              </h3>
              <div className="space-y-2">
                {tx.logs.slice(0, 5).map((log, i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-lg bg-muted/20 text-sm font-mono overflow-hidden"
                  >
                    <p className="text-muted-foreground truncate">
                      Contract: {shortenAddress(log.address)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground/50 mt-1">
                      Topics: {log.topics.length}
                    </p>
                  </div>
                ))}
                {tx.logs.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{tx.logs.length - 5} more events
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/wallet/${tx.from}`}>
                View Wallet
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/block/${tx.blockNumber}`}>
                View Block
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
