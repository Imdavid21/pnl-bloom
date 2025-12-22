import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Layers, Zap, Users, DollarSign } from 'lucide-react';
import { proxyRequest } from '@/lib/hyperliquidApi';
import { cn } from '@/lib/utils';

interface NetworkStatsProps {
  onNavigate?: (type: 'block' | 'tx' | 'wallet', id: string) => void;
}

interface Stats {
  openInterest: number;
  volume24h: number;
  totalUsers: number;
  fundingRate: string;
  topMarket: string;
  topMarketVolume: number;
}

export function NetworkStats({ onNavigate }: NetworkStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [metaAndCtx, spotMetaAndCtx] = await Promise.all([
          proxyRequest({ type: 'metaAndAssetCtxs' }),
          proxyRequest({ type: 'spotMetaAndAssetCtxs' }),
        ]);

        if (metaAndCtx) {
          const [meta, assetCtxs] = metaAndCtx;
          
          // Calculate total open interest and volume
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

          // Get funding rate for BTC
          const btcIndex = meta.universe?.findIndex((u: any) => u.name === 'BTC');
          if (btcIndex >= 0 && assetCtxs?.[btcIndex]) {
            const funding = parseFloat(assetCtxs[btcIndex].funding || '0') * 100;
            topFunding = `${funding >= 0 ? '+' : ''}${funding.toFixed(4)}%`;
          }

          // Add spot volume
          if (spotMetaAndCtx && spotMetaAndCtx[1]) {
            spotMetaAndCtx[1].forEach((ctx: any) => {
              totalVolume += parseFloat(ctx.dayNtlVlm || '0');
            });
          }

          setStats({
            openInterest: totalOI,
            volume24h: totalVolume,
            totalUsers: 0, // Not available from API
            fundingRate: topFunding,
            topMarket,
            topMarketVolume: topVolume,
          });
        }
      } catch (err) {
        console.error('[NetworkStats] Error:', err);
      }
      setIsLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card/30 animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-6 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={Layers}
        label="Open Interest"
        value={stats ? formatNumber(stats.openInterest) : '-'}
        subtitle="Total across all markets"
      />
      <StatCard
        icon={Activity}
        label="24h Volume"
        value={stats ? formatNumber(stats.volume24h) : '-'}
        subtitle="Perps + Spot combined"
      />
      <StatCard
        icon={TrendingUp}
        label="BTC Funding"
        value={stats?.fundingRate || '-'}
        subtitle="8h predicted rate"
        valueColor={stats?.fundingRate?.startsWith('+') ? 'text-profit-3' : stats?.fundingRate?.startsWith('-') ? 'text-loss-3' : undefined}
      />
      <StatCard
        icon={Zap}
        label="Top Market"
        value={stats?.topMarket || '-'}
        subtitle={stats ? formatNumber(stats.topMarketVolume) + ' vol' : '-'}
      />
    </div>
  );
}

function StatCard({ 
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
    <div className={cn(
      "group relative overflow-hidden",
      "p-4 rounded-xl",
      "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
      "border border-border/40",
      "backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border/60 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]"
    )}>
      <div className="flex items-center gap-2 text-muted-foreground/60 mb-1.5">
        <div className="p-1.5 rounded-lg bg-muted/10 border border-border/30 group-hover:bg-muted/20 transition-colors">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold tabular-nums", valueColor || "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
    </div>
  );
}
