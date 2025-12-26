/**
 * Markets Index Page
 * Chain stats for Hypercore (L1) and HyperEVM
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Activity, Layers, TrendingUp, Zap, Box, Fuel, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { proxyRequest } from '@/lib/hyperliquidApi';
import { getLatestBlockNumber, getRecentBlocks, type BlockSummary } from '@/lib/hyperevmApi';

interface ChainStats {
  openInterest: number;
  volume24h: number;
  fundingRate: string;
  topMarket: string;
  topMarketVolume: number;
  marketsCount: number;
}

interface EVMStats {
  latestBlock: number;
  avgGasUsed: number;
  recentTxCount: number;
  avgBlockTime: number;
}

export default function Markets() {
  const [hypercoreStats, setHypercoreStats] = useState<ChainStats | null>(null);
  const [evmStats, setEvmStats] = useState<EVMStats | null>(null);
  const [isLoadingCore, setIsLoadingCore] = useState(true);
  const [isLoadingEvm, setIsLoadingEvm] = useState(true);

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

          if (spotMetaAndCtx && spotMetaAndCtx[1]) {
            spotMetaAndCtx[1].forEach((ctx: any) => {
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
          
          // Calculate average block time
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
          });
        }
      } catch (err) {
        console.error('[Markets] Error fetching EVM stats:', err);
      }
      setIsLoadingEvm(false);
    };

    fetchEVMStats();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatGas = (gas: number) => {
    if (gas >= 1e6) return `${(gas / 1e6).toFixed(2)}M`;
    if (gas >= 1e3) return `${(gas / 1e3).toFixed(1)}K`;
    return gas.toString();
  };

  return (
    <Layout>
      <Helmet>
        <title>Markets | Hyperliquid Chain Stats</title>
        <meta name="description" content="Real-time Hypercore and HyperEVM chain statistics including open interest, volume, funding rates, and block data." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Markets Overview</h1>
          <p className="text-muted-foreground">
            Real-time chain statistics for Hyperliquid ecosystem
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Hypercore (L1) Section */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Hypercore (L1)</CardTitle>
                    <p className="text-xs text-muted-foreground">Perpetuals & Spot Trading</p>
                  </div>
                </div>
                <Link 
                  to="/market/HYPE" 
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View Markets <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCore ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
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
                    value={hypercoreStats ? formatNumber(hypercoreStats.openInterest) : '-'}
                    subtitle="Total OI"
                  />
                  <StatBlock
                    icon={Activity}
                    label="24h Volume"
                    value={hypercoreStats ? formatNumber(hypercoreStats.volume24h) : '-'}
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
                    subtitle={hypercoreStats ? `${formatNumber(hypercoreStats.topMarketVolume)} vol` : '-'}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* HyperEVM Section */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-2/10 border border-chart-2/20">
                    <Box className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">HyperEVM</CardTitle>
                    <p className="text-xs text-muted-foreground">EVM-compatible Layer</p>
                  </div>
                </div>
                <Link 
                  to="/explorer" 
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Explorer <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingEvm ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
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
                    icon={Fuel}
                    label="Avg Gas"
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
                    icon={Zap}
                    label="Block Time"
                    value={evmStats ? `${evmStats.avgBlockTime.toFixed(1)}s` : '-'}
                    subtitle="Average"
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
