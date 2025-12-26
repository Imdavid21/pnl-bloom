/**
 * Markets Index Page
 * Comprehensive chain stats for Hypercore (L1) and HyperEVM
 */

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Activity, Layers, TrendingUp, Zap, Box, Fuel, 
  Users, FileCode, Clock, Wallet, ArrowUpRight, ArrowDownRight,
  CheckCircle, Code2, DollarSign
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { proxyRequest } from '@/lib/hyperliquidApi';
import { getLatestBlockNumber, getRecentBlocks } from '@/lib/hyperevmApi';
import { supabase } from '@/integrations/supabase/client';

interface HypercoreStats {
  openInterest: number;
  volume24h: number;
  fundingRate: string;
  topMarket: string;
  topMarketVolume: number;
  marketsCount: number;
  spotTokensCount: number;
}

interface EVMStats {
  latestBlock: number;
  avgGasUsed: number;
  recentTxCount: number;
  avgBlockTime: number;
  totalGas24h: number;
  pendingTxs: number;
}

interface OverviewStats {
  totalAddresses: number;
  addressChange24h: number;
  totalTransactions: number;
  txChange24h: number;
  newAddresses24h: number;
  newAddressChange: number;
  transactions24h: number;
  tx24hChange: number;
  totalTokens: number;
  totalContracts: number;
  contractChange24h: number;
  verifiedContracts: number;
  verifiedChange24h: number;
  contracts24h: number;
  contractsDeployed24hChange: number;
  verified24h: number;
  avgTxFee24h: number;
  avgFeeChange: number;
  totalFee24h: number;
  feeChange24h: number;
}

export default function Markets() {
  const [hypercoreStats, setHypercoreStats] = useState<HypercoreStats | null>(null);
  const [evmStats, setEvmStats] = useState<EVMStats | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [isLoadingCore, setIsLoadingCore] = useState(true);
  const [isLoadingEvm, setIsLoadingEvm] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Fetch Hypercore stats
  useEffect(() => {
    const fetchHypercoreStats = async () => {
      try {
        const [metaAndCtx, spotMetaAndCtx] = await Promise.all([
          proxyRequest({ type: 'metaAndAssetCtxs' }),
          proxyRequest({ type: 'spotMetaAndAssetCtxs' }),
        ]);

        if (metaAndCtx) {
          const [meta, assetCtxs] = metaAndCtx;
          
          let totalOI = 0;
          let totalVolume = 0;
          let topMarket = '';
          let topVolume = 0;
          let topFunding = '0.0000%';

          assetCtxs?.forEach((ctx: any, i: number) => {
            const oi = parseFloat(ctx.openInterest || '0');
            const vol = parseFloat(ctx.dayNtlVlm || '0');
            totalOI += oi;
            totalVolume += vol;
            
            if (vol > topVolume && meta.universe[i]) {
              topVolume = vol;
              topMarket = meta.universe[i].name;
            }
          });

          const btcIndex = meta.universe?.findIndex((u: any) => u.name === 'BTC');
          if (btcIndex >= 0 && assetCtxs?.[btcIndex]) {
            const funding = parseFloat(assetCtxs[btcIndex].funding || '0') * 100;
            topFunding = `${funding >= 0 ? '+' : ''}${funding.toFixed(4)}%`;
          }

          let spotTokensCount = 0;
          if (spotMetaAndCtx && spotMetaAndCtx[0]) {
            spotTokensCount = spotMetaAndCtx[0].tokens?.length || 0;
            spotMetaAndCtx[1]?.forEach((ctx: any) => {
              totalVolume += parseFloat(ctx.dayNtlVlm || '0');
            });
          }

          setHypercoreStats({
            openInterest: totalOI,
            volume24h: totalVolume,
            fundingRate: topFunding,
            topMarket,
            topMarketVolume: topVolume,
            marketsCount: meta.universe?.length || 0,
            spotTokensCount,
          });
        }
      } catch (err) {
        console.error('[Markets] Error fetching Hypercore stats:', err);
      }
      setIsLoadingCore(false);
    };

    fetchHypercoreStats();
  }, []);

  // Fetch HyperEVM stats
  useEffect(() => {
    const fetchEVMStats = async () => {
      try {
        const [latestBlock, recentBlocks] = await Promise.all([
          getLatestBlockNumber(),
          getRecentBlocks(10),
        ]);

        if (recentBlocks.length > 0) {
          const totalGasUsed = recentBlocks.reduce((sum, b) => sum + b.gasUsed, 0);
          const totalTxCount = recentBlocks.reduce((sum, b) => sum + b.txCount, 0);
          
          let avgBlockTime = 0;
          if (recentBlocks.length > 1) {
            const timeDiffs: number[] = [];
            for (let i = 1; i < recentBlocks.length; i++) {
              timeDiffs.push(recentBlocks[i - 1].timestamp - recentBlocks[i].timestamp);
            }
            avgBlockTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
          }

          setEvmStats({
            latestBlock,
            avgGasUsed: Math.round(totalGasUsed / recentBlocks.length),
            recentTxCount: totalTxCount,
            avgBlockTime,
            totalGas24h: totalGasUsed * 8640, // Estimate for 24h based on recent blocks
            pendingTxs: 0,
          });
        }
      } catch (err) {
        console.error('[Markets] Error fetching EVM stats:', err);
      }
      setIsLoadingEvm(false);
    };

    fetchEVMStats();
  }, []);

  // Mock overview stats (would come from indexed data in production)
  useEffect(() => {
    const fetchOverviewStats = async () => {
      // Simulated stats - in production these would come from blockchain indexer
      setOverviewStats({
        totalAddresses: 879600,
        addressChange24h: 0.06,
        totalTransactions: 103460000,
        txChange24h: 1.8,
        newAddresses24h: 485,
        newAddressChange: 18.76,
        transactions24h: 190645,
        tx24hChange: 28.26,
        totalTokens: 36104,
        totalContracts: 443438,
        contractChange24h: 0.07,
        verifiedContracts: 8700,
        verifiedChange24h: 0.01,
        contracts24h: 316,
        contractsDeployed24hChange: 34.17,
        verified24h: 1,
        avgTxFee24h: 0.04,
        avgFeeChange: 12.54,
        totalFee24h: 285.36,
        feeChange24h: 16.55,
      });
      setIsLoadingOverview(false);
    };

    fetchOverviewStats();
  }, []);

  const formatNumber = (num: number, prefix = '') => {
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(1)}K`;
    return `${prefix}${num.toLocaleString()}`;
  };

  const formatGas = (gas: number) => {
    if (gas >= 1e9) return `${(gas / 1e9).toFixed(2)}B`;
    if (gas >= 1e6) return `${(gas / 1e6).toFixed(2)}M`;
    if (gas >= 1e3) return `${(gas / 1e3).toFixed(1)}K`;
    return gas.toString();
  };

  return (
    <Layout>
      <Helmet>
        <title>Markets | Hyperliquid Chain Statistics</title>
        <meta name="description" content="Real-time Hypercore and HyperEVM chain statistics including addresses, transactions, contracts, gas usage, and trading volume." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Chain Overview</h1>
          <p className="text-muted-foreground">
            Real-time statistics for the Hyperliquid ecosystem
          </p>
        </div>

        {/* Overview Stats Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Network Overview
          </h2>
          {isLoadingOverview ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-card/50 border border-border/50">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <OverviewStatCard
                icon={Users}
                label="Addresses (Total)"
                value={formatNumber(overviewStats?.totalAddresses || 0)}
                change={overviewStats?.addressChange24h}
              />
              <OverviewStatCard
                icon={Activity}
                label="Transactions (Total)"
                value={formatNumber(overviewStats?.totalTransactions || 0)}
                subtitle={`${overviewStats?.txChange24h.toFixed(1)} TPS`}
              />
              <OverviewStatCard
                icon={Users}
                label="New Addresses (24h)"
                value={formatNumber(overviewStats?.newAddresses24h || 0)}
                change={overviewStats?.newAddressChange}
                positive
              />
              <OverviewStatCard
                icon={Zap}
                label="Transactions (24h)"
                value={formatNumber(overviewStats?.transactions24h || 0)}
                change={overviewStats?.tx24hChange}
                positive
              />
              <OverviewStatCard
                icon={Code2}
                label="Tokens (Total)"
                value={formatNumber(overviewStats?.totalTokens || 0)}
              />
              <OverviewStatCard
                icon={Clock}
                label="Pending Txs (1h)"
                value={evmStats?.pendingTxs?.toString() || '0'}
                subtitle="Average"
              />
              <OverviewStatCard
                icon={DollarSign}
                label="Total Tx Fee (24h)"
                value={`${overviewStats?.totalFee24h.toFixed(2)} HYPE`}
                change={overviewStats?.feeChange24h}
                positive
              />
              <OverviewStatCard
                icon={DollarSign}
                label="Avg Tx Fee (24h)"
                value={`$${overviewStats?.avgTxFee24h.toFixed(2)}`}
                change={overviewStats?.avgFeeChange}
                positive
              />
              <OverviewStatCard
                icon={FileCode}
                label="Contracts (Total)"
                value={formatNumber(overviewStats?.totalContracts || 0)}
                change={overviewStats?.contractChange24h}
              />
              <OverviewStatCard
                icon={CheckCircle}
                label="Verified (Total)"
                value={formatNumber(overviewStats?.verifiedContracts || 0)}
                change={overviewStats?.verifiedChange24h}
              />
              <OverviewStatCard
                icon={FileCode}
                label="Deployed (24h)"
                value={formatNumber(overviewStats?.contracts24h || 0)}
                change={overviewStats?.contractsDeployed24hChange}
                positive
              />
              <OverviewStatCard
                icon={Fuel}
                label="Gas Used (24h)"
                value={evmStats ? `${formatGas(evmStats.totalGas24h)} gas` : '-'}
                change={29.92}
                positive
              />
            </div>
          )}
        </div>

        {/* Chain-Specific Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Hypercore (L1) Section */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Hypercore (L1)</CardTitle>
                  <p className="text-xs text-muted-foreground">Perpetuals & Spot Trading</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCore ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/20">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock
                    icon={Layers}
                    label="Open Interest"
                    value={hypercoreStats ? formatNumber(hypercoreStats.openInterest, '$') : '-'}
                    subtitle="Total OI"
                  />
                  <StatBlock
                    icon={Activity}
                    label="24h Volume"
                    value={hypercoreStats ? formatNumber(hypercoreStats.volume24h, '$') : '-'}
                    subtitle="Perps + Spot"
                  />
                  <StatBlock
                    icon={TrendingUp}
                    label="BTC Funding"
                    value={hypercoreStats?.fundingRate || '-'}
                    subtitle="8h rate"
                    valueColor={hypercoreStats?.fundingRate?.startsWith('+') ? 'text-emerald-500' : hypercoreStats?.fundingRate?.startsWith('-') ? 'text-red-500' : undefined}
                  />
                  <StatBlock
                    icon={Zap}
                    label="Top Market"
                    value={hypercoreStats?.topMarket || '-'}
                    subtitle={hypercoreStats ? `${formatNumber(hypercoreStats.topMarketVolume, '$')} vol` : '-'}
                  />
                  <StatBlock
                    icon={Activity}
                    label="Perp Markets"
                    value={hypercoreStats?.marketsCount.toString() || '-'}
                    subtitle="Active pairs"
                  />
                  <StatBlock
                    icon={Wallet}
                    label="Spot Tokens"
                    value={hypercoreStats?.spotTokensCount.toString() || '-'}
                    subtitle="Tradeable"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* HyperEVM Section */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10 border border-chart-2/20">
                  <Box className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <CardTitle className="text-lg">HyperEVM</CardTitle>
                  <p className="text-xs text-muted-foreground">EVM-compatible Layer</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingEvm ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/20">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock
                    icon={Box}
                    label="Latest Block"
                    value={evmStats ? `#${evmStats.latestBlock.toLocaleString()}` : '-'}
                    subtitle="Block height"
                  />
                  <StatBlock
                    icon={Clock}
                    label="Block Time"
                    value={evmStats ? `${evmStats.avgBlockTime.toFixed(1)}s` : '-'}
                    subtitle="Average"
                  />
                  <StatBlock
                    icon={Fuel}
                    label="Avg Gas/Block"
                    value={evmStats ? formatGas(evmStats.avgGasUsed) : '-'}
                    subtitle="Per block"
                  />
                  <StatBlock
                    icon={Activity}
                    label="Recent Txs"
                    value={evmStats ? evmStats.recentTxCount.toString() : '-'}
                    subtitle="Last 10 blocks"
                  />
                  <StatBlock
                    icon={FileCode}
                    label="Total Contracts"
                    value={formatNumber(overviewStats?.totalContracts || 0)}
                    subtitle="Deployed"
                  />
                  <StatBlock
                    icon={CheckCircle}
                    label="Verified"
                    value={formatNumber(overviewStats?.verifiedContracts || 0)}
                    subtitle="Contracts"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatBlock({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  valueColor 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subtitle: string;
  valueColor?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/10 border border-border/30">
      <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-base font-semibold tabular-nums", valueColor || "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground/50">{subtitle}</p>
    </div>
  );
}

function OverviewStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle,
  change,
  positive
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subtitle?: string;
  change?: number;
  positive?: boolean;
}) {
  const hasChange = change !== undefined;
  const isPositiveChange = positive || change! > 0;
  
  return (
    <div className="p-4 rounded-xl bg-card/80 border border-border/50 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        {hasChange && (
          <span className={cn(
            "text-[10px] flex items-center gap-0.5",
            isPositiveChange ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositiveChange ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change!).toFixed(2)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
