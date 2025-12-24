import { RefreshCw, BarChart3 } from 'lucide-react';
import { useAnalytics, useComputeAnalytics } from '@/hooks/useAnalytics';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { FundingTradingChart } from './FundingTradingChart';
import { TradeSizeLeverageChart } from './TradeSizeLeverageChart';
import { MarketDirectionChart } from './MarketDirectionChart';
import { LiquidationProximityChart } from './LiquidationProximityChart';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalyticsSectionProps {
  wallet: string | null;
  className?: string;
}

export function AnalyticsSection({ wallet, className }: AnalyticsSectionProps) {
  const { data: viewModel, isLoading, error, refetch } = useAnalytics(wallet);
  const data = viewModel?.data;
  const metadata = viewModel?.metadata;
  const computeMutation = useComputeAnalytics();

  const handleCompute = async () => {
    if (!wallet) return;
    try {
      await computeMutation.mutateAsync(wallet);
      toast.success('Analytics computed successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to compute analytics');
    }
  };

  const hasData = data?.equity_curve && data.equity_curve.length > 0;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium text-foreground">Advanced Analytics</h2>
          {metadata && <ConfidenceBadge metadata={metadata} />}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCompute}
          disabled={computeMutation.isPending || !wallet}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", computeMutation.isPending && "animate-spin")} />
          {hasData ? 'Refresh' : 'Compute'}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-loss/10 border border-loss/20 text-loss text-sm">
          {(error as Error).message || 'Failed to load analytics'}
        </div>
      )}

      {!isLoading && !error && !hasData && (
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border border-dashed border-border/50 bg-card/20">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No analytics data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Compute" to generate analytics from your trading history</p>
          </div>
        </div>
      )}

      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <FundingTradingChart data={data.equity_curve || []} />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <TradeSizeLeverageChart data={data.trade_size_leverage || null} />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <MarketDirectionChart trades={data.closed_trades || null} />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <LiquidationProximityChart
              trades={data.closed_trades || []}
              positions={data.positions || []}
            />
          </div>
        </div>
      )}
    </div>
  );
}