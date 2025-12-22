import { useState, useMemo, useCallback } from "react";
import { useAccount } from "wagmi";
import { TrendingUp, TrendingDown, Calendar, Banknote, BarChart3, Hash, RefreshCw, Wallet } from "lucide-react";
import { getAllMockData, DailyPnl } from "@/data/mockPnlData";
import { KpiCard } from "@/components/pnl/KpiCard";
import { ToggleGroup } from "@/components/pnl/ToggleGroup";
import { Heatmap } from "@/components/pnl/Heatmap";
import { HeatmapLegend } from "@/components/pnl/HeatmapLegend";
import { DayDetailDrawer } from "@/components/pnl/DayDetailDrawer";
import { WalletConnectButton } from "@/components/pnl/WalletConnectButton";
import { WalletInput } from "@/components/pnl/WalletInput";
import { PaymentModal } from "@/components/pnl/PaymentModal";
import { AnalyticsSection } from "@/components/pnl/AnalyticsSection";
import { CurrentPositions } from "@/components/pnl/CurrentPositions";
import { Layout } from "@/components/Layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePnlCalendar } from "@/hooks/usePnlData";
import { useX402Payment } from "@/hooks/useX402Payment";
import { syncWalletFree } from "@/lib/x402";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Index = () => {
  const isMobile = useIsMobile();
  const allMockData = getAllMockData();
  const { address: connectedWallet, isConnected } = useAccount();
  
  const [selectedYear, setSelectedYear] = useState(2025);
  const [viewMode, setViewMode] = useState<'total' | 'closed' | 'funding'>('total');
  const [timezoneMode, setTimezoneMode] = useState('local');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDayData, setSelectedDayData] = useState<DailyPnl | undefined>();
  const [targetWallet, setTargetWallet] = useState<string>('');
  const [isSyncingFree, setIsSyncingFree] = useState(false);

  const activeWallet = targetWallet || connectedWallet?.toLowerCase() || null;
  
  const {
    data: calendarData,
    isLoading,
    error,
    refetch
  } = usePnlCalendar(activeWallet, selectedYear, viewMode, 'perps', timezoneMode === 'utc' ? 'utc' : 'local');
  
  const {
    isPaying,
    isWaitingForTx,
    paymentRequired,
    txHash,
    error: paymentError,
    initiateSync,
    initiateRecompute,
    executePayment,
    reset: resetPayment
  } = useX402Payment(() => {
    refetch();
  });

  const handleWalletChange = useCallback((wallet: string) => {
    setTargetWallet(wallet);
  }, []);

  const currentData = useMemo(() => {
    if (activeWallet && calendarData) {
      return {
        year: calendarData.year,
        daily: calendarData.daily.map(d => ({
          date: d.date,
          pnl: d.pnl,
          funding: d.funding,
          fees: d.fees,
          perps_pnl: d.perps_pnl,
          trades_count: d.trades_count
        })),
        monthly_summary: calendarData.monthly_summary.length > 0 ? {
          month: calendarData.monthly_summary[0].month,
          pnl: calendarData.monthly_summary.reduce((sum, m) => sum + m.pnl, 0),
          funding: calendarData.monthly_summary.reduce((sum, m) => sum + m.funding, 0),
          profitable_days: calendarData.monthly_summary.reduce((sum, m) => sum + m.profitable_days, 0),
          trading_days: calendarData.monthly_summary.reduce((sum, m) => sum + m.trading_days, 0)
        } : {
          month: `${selectedYear}-01`,
          pnl: 0,
          funding: 0,
          profitable_days: 0,
          trading_days: 0
        },
        total_volume: calendarData.total_volume || 0,
        closed_trades_count: calendarData.closed_trades_count || 0
      };
    }
    const mockData = allMockData[selectedYear];
    return { ...mockData, total_volume: 0, closed_trades_count: 0 };
  }, [activeWallet, calendarData, allMockData, selectedYear]);

  const kpis = useMemo(() => {
    const summary = currentData.monthly_summary;
    // Use closed_trades_count from API (round-trip trades) instead of trades_count (fills)
    const totalTrades = currentData.closed_trades_count || 0;
    const totalRealized = currentData.daily.reduce((sum, d) => sum + ((d.perps_pnl || 0) - (d.fees || 0)), 0);
    const totalFunding = currentData.daily.reduce((sum, d) => sum + (d.funding || 0), 0);
    const totalPnl = totalRealized + totalFunding;
    return {
      pnl: totalPnl,
      profitableDays: summary.profitable_days,
      tradingDays: summary.trading_days,
      funding: totalFunding,
      volume: currentData.total_volume || 0,
      totalTrades
    };
  }, [currentData]);

  const handleDayClick = (date: string, data?: DailyPnl) => {
    setSelectedDate(date);
    setSelectedDayData(data);
    setDrawerOpen(true);
  };

  const handleSync = () => {
    if (activeWallet) initiateSync(activeWallet);
  };

  const handleSyncFree = async () => {
    if (!activeWallet) return;
    setIsSyncingFree(true);
    try {
      const result = await syncWalletFree(activeWallet);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Wallet synced');
        refetch();
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setIsSyncingFree(false);
    }
  };

  const handleRecompute = () => {
    if (activeWallet) initiateRecompute(activeWallet);
  };

  const years = [2025];
  const isViewingOtherWallet = isConnected && activeWallet && activeWallet !== connectedWallet?.toLowerCase();

  return (
    <Layout showFooter={false}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:px-6">
        
        {/* Wallet Connect Header */}
        <div className="mb-4 sm:mb-6 flex justify-end">
          <WalletConnectButton />
        </div>

        {/* Wallet Panel */}
        {isConnected && (
          <div className="mb-6 panel">
            <div className="panel-body space-y-4">
              {/* Wallet Input Row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    Wallet
                  </label>
                  <WalletInput 
                    value={targetWallet || connectedWallet?.toLowerCase() || ''} 
                    onChange={handleWalletChange} 
                  />
                </div>
              </div>

              {/* Status Row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isLoading ? "bg-info animate-pulse" : "bg-profit-3"
                  )} />
                  {activeWallet && (
                    <code className="text-xs font-mono text-foreground tabular-nums">
                      {activeWallet.slice(0, 8)}...{activeWallet.slice(-6)}
                    </code>
                  )}
                  {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                  {isViewingOtherWallet && (
                    <span className="text-xs text-muted-foreground">(viewing)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncFree} 
                    disabled={isSyncingFree || !activeWallet}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RefreshCw className={cn("h-3 w-3", isSyncingFree && "animate-spin")} />
                    Sync
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSync} 
                    disabled={isPaying || !activeWallet}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RefreshCw className={cn("h-3 w-3", isPaying && "animate-spin")} />
                    Full Sync
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRecompute} 
                    disabled={isPaying || !activeWallet}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Recompute
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <div className="mb-6 panel">
            <div className="panel-body flex flex-col items-center gap-4 py-12">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-foreground">Connect wallet to view performance</p>
              </div>
              <WalletConnectButton />
            </div>
          </div>
        )}

        {/* KPI Grid - Responsive */}
        <div className="mb-4 sm:mb-6 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard 
            title="PnL" 
            value={kpis.pnl} 
            icon={kpis.pnl >= 0 ? TrendingUp : TrendingDown} 
            trend={kpis.pnl >= 0 ? 'profit' : 'loss'} 
            subtitle="YTD" 
            className="col-span-2 sm:col-span-1" 
          />
          <KpiCard 
            title="Volume" 
            value={`$${(kpis.volume / 1000000).toFixed(2)}M`} 
            icon={BarChart3} 
            trend="neutral" 
            subtitle="Traded" 
          />
          <KpiCard 
            title="Trades" 
            value={kpis.totalTrades.toLocaleString()} 
            icon={Hash} 
            trend="neutral" 
            subtitle="Total" 
          />
          <KpiCard 
            title="Win Rate" 
            value={`${Math.round(kpis.profitableDays / kpis.tradingDays * 100) || 0}%`} 
            icon={Calendar} 
            trend="neutral" 
            subtitle={`${kpis.profitableDays}/${kpis.tradingDays}`} 
          />
          <KpiCard 
            title="Funding" 
            value={kpis.funding} 
            icon={Banknote} 
            trend={kpis.funding >= 0 ? 'profit' : 'loss'} 
            subtitle="Net" 
          />
        </div>

        {/* Current Positions - moved above Activity Grid */}
        {activeWallet && (
          <CurrentPositions wallet={activeWallet} className="mb-6" />
        )}

        {/* View Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <ToggleGroup 
            label="" 
            options={[
              { value: 'total', label: 'Total' },
              { value: 'closed', label: 'Realized' },
              { value: 'funding', label: 'Funding' }
            ]} 
            value={viewMode} 
            onChange={v => setViewMode(v as 'total' | 'closed' | 'funding')} 
          />
          <div className="flex items-center gap-1 text-xs">
            <button 
              onClick={() => setTimezoneMode('local')} 
              className={cn(
                "px-2 py-1 rounded transition-micro",
                timezoneMode === 'local' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Local
            </button>
            <span className="text-muted-foreground">/</span>
            <button 
              onClick={() => setTimezoneMode('utc')} 
              className={cn(
                "px-2 py-1 rounded transition-micro",
                timezoneMode === 'utc' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              UTC
            </button>
          </div>
        </div>

        {/* Heatmap Panel - Full Width */}
        <div className="panel">
          <div className="panel-body">
            <div className="overflow-x-auto scrollbar-thin">
              <div className="min-w-full">
                <Heatmap 
                  data={currentData.daily} 
                  year={selectedYear} 
                  viewMode={viewMode} 
                  onDayClick={handleDayClick} 
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <HeatmapLegend />
              <p className="text-xs text-muted-foreground">
                Click day for details
              </p>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {activeWallet && (
          <AnalyticsSection wallet={activeWallet} className="mt-6" />
        )}

        {/* Footer Stats */}
        {activeWallet && !error && currentData.daily.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>{currentData.daily.length} days</span>
            <span className="text-border">·</span>
            <span>{kpis.totalTrades.toLocaleString()} trades</span>
            <span className="text-border">·</span>
            <span>${(kpis.volume / 1000000).toFixed(2)}M vol</span>
          </div>
        )}
      </div>

      {/* Day Detail Drawer */}
      <DayDetailDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        date={selectedDate} 
        data={selectedDayData} 
        isMobile={isMobile} 
        wallet={activeWallet} 
        tz={timezoneMode === 'utc' ? 'utc' : 'local'} 
      />

      {/* Payment Modal */}
      <PaymentModal 
        open={!!paymentRequired} 
        onClose={resetPayment} 
        paymentInfo={paymentRequired} 
        onPay={executePayment} 
        isPaying={isPaying} 
        isWaitingForTx={isWaitingForTx} 
        txHash={txHash} 
        error={paymentError} 
      />

    </Layout>
  );
};

export default Index;
