/**
 * HyperCore Trade Page
 * Detailed view of a HyperCore trade/event
 */

import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { useHyperCoreTrade } from '@/hooks/useHyperCoreTrade';
import { CopyableText } from '@/components/explorer/CopyableText';
import { TradeSummaryCard } from '@/components/explorer/TradeSummaryCard';
import { TransactionNotFound } from '@/components/explorer/TransactionNotFound';
import { TransactionSkeleton } from '@/components/explorer/TransactionSkeleton';
import { cn } from '@/lib/utils';

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(decimals);
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${formatNumber(value, 0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
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

function EventTypeBadge({ type }: { type: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    'PERP_FILL': { label: 'Trade', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'PERP_FUNDING': { label: 'Funding', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    'PERP_FEE': { label: 'Fee', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    'SPOT_BUY': { label: 'Buy', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    'SPOT_SELL': { label: 'Sell', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };
  
  const badge = badges[type] || { label: type, className: 'bg-muted text-muted-foreground' };
  
  return (
    <Badge className={badge.className}>
      {badge.label}
    </Badge>
  );
}

export default function HyperCoreTrade() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useHyperCoreTrade(id);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explorer');
    }
  };

  const shortId = id 
    ? `${id.slice(0, 8)}...`
    : '';

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <TransactionSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data?.trade) {
    return (
      <Layout>
        <Helmet>
          <title>Trade Not Found | HyperPNL Explorer</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <TransactionNotFound identifier={id || ''} />
          </div>
        </div>
      </Layout>
    );
  }

  const { trade, relatedTrades } = data;

  return (
    <Layout>
      <Helmet>
        <title>Trade {shortId} | HyperPNL Explorer</title>
        <meta name="description" content={`View HyperCore trade ${shortId} on ${trade.market}`} />
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
            <div className="flex items-center gap-2">
              <EventTypeBadge type={trade.eventType} />
              <Badge variant="secondary" className="text-xs">
                HyperCore
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CopyableText 
                text={trade.id} 
                displayText={shortId}
                className="text-lg md:text-xl font-mono"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(trade.timestamp, { addSuffix: true })}
              <span className="mx-2">•</span>
              {format(trade.timestamp, 'MMM d, yyyy \'at\' h:mm:ss a')}
            </p>
          </div>

          {/* Trade Summary Card */}
          <TradeSummaryCard
            eventType={trade.eventType}
            market={trade.market}
            side={trade.side}
            size={trade.size}
            execPrice={trade.execPrice}
            realizedPnl={trade.realizedPnlUsd}
            fundingUsd={trade.fundingUsd}
          />

          {/* Details Grid */}
          <div className="rounded-xl bg-muted/20 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              <DetailRow label="Wallet">
                <Link 
                  to={`/wallet/${trade.walletAddress}`}
                  className="hover:underline underline-offset-2 text-primary"
                >
                  <CopyableText 
                    text={trade.walletAddress} 
                    displayText={shortenAddress(trade.walletAddress)} 
                  />
                </Link>
              </DetailRow>

              <DetailRow label="Market">
                <Link 
                  to={`/explorer/market/${trade.market}`}
                  className="hover:underline underline-offset-2 text-primary"
                >
                  {trade.market}
                </Link>
              </DetailRow>

              {trade.side && (
                <DetailRow label="Side">
                  <Badge className={cn(
                    trade.side === 'long' 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  )}>
                    {trade.side.toUpperCase()}
                  </Badge>
                </DetailRow>
              )}

              {trade.size > 0 && (
                <DetailRow label="Size">
                  {formatNumber(trade.size, 4)} {trade.market}
                </DetailRow>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {trade.execPrice > 0 && (
                <DetailRow label="Execution Price">
                  {formatPrice(trade.execPrice)}
                </DetailRow>
              )}

              {trade.notionalValue > 0 && (
                <DetailRow label="Notional Value">
                  ${formatNumber(trade.notionalValue)}
                </DetailRow>
              )}

              {trade.feeUsd > 0 && (
                <DetailRow label="Fee">
                  ${trade.feeUsd.toFixed(4)}
                </DetailRow>
              )}

              {trade.fundingUsd !== null && trade.fundingUsd !== 0 && (
                <DetailRow label="Funding">
                  <span className={cn(
                    trade.fundingUsd >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {trade.fundingUsd >= 0 ? '+' : ''}${trade.fundingUsd.toFixed(4)}
                  </span>
                </DetailRow>
              )}
            </div>
          </div>

          {/* Related Trades */}
          {relatedTrades.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground/50">
                Related Activity ({relatedTrades.length})
              </h3>
              <div className="space-y-2">
                {relatedTrades.slice(0, 5).map((related) => (
                  <Link 
                    key={related.id}
                    to={`/trade/${related.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <EventTypeBadge type={related.eventType} />
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(related.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    {related.fundingUsd !== null && (
                      <span className={cn(
                        'text-sm font-medium',
                        related.fundingUsd >= 0 ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {related.fundingUsd >= 0 ? '+' : ''}${Math.abs(related.fundingUsd).toFixed(4)}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/wallet/${trade.walletAddress}`}>
                View Wallet
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/explorer/market/${trade.market}`}>
                View Market
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
