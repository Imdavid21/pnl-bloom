import { formatTokenAmount } from '@/lib/token-aggregator';
import { formatVolume } from '@/lib/market-calculator';

interface TokenStatsProps {
  totalSupply?: number;
  circulatingSupply?: number;
  volume24h?: number;
  hypercoreVolume?: number;
  hyperevmVolume?: number;
  holdersCount?: number;
  symbol: string;
  currentPrice: number;
  chains: { hypercore: boolean; hyperevm: boolean };
}

export function TokenStats({
  totalSupply,
  circulatingSupply,
  volume24h = 0,
  hypercoreVolume,
  hyperevmVolume,
  holdersCount,
  symbol,
  currentPrice,
  chains,
}: TokenStatsProps) {
  const stats = [
    totalSupply && totalSupply > 0 ? {
      label: 'TOTAL SUPPLY',
      value: `${formatTokenAmount(totalSupply)} ${symbol}`,
      subtext: `$${formatTokenAmount(totalSupply * currentPrice)}`,
    } : null,
    circulatingSupply && circulatingSupply > 0 && circulatingSupply !== totalSupply ? {
      label: 'CIRCULATING',
      value: `${formatTokenAmount(circulatingSupply)} ${symbol}`,
      subtext: totalSupply ? `${((circulatingSupply / totalSupply) * 100).toFixed(1)}% of total` : undefined,
    } : null,
    {
      label: '24H VOLUME',
      value: formatVolume(volume24h),
      subtext: hypercoreVolume !== undefined && hyperevmVolume !== undefined
        ? `HC: ${formatVolume(hypercoreVolume)} • EVM: ${formatVolume(hyperevmVolume)}`
        : chains.hypercore ? 'HyperCore' : chains.hyperevm ? 'HyperEVM' : undefined,
    },
    holdersCount && holdersCount > 0 ? {
      label: 'HOLDERS',
      value: holdersCount.toLocaleString(),
      subtext: 'On HyperEVM',
    } : null,
  ].filter(Boolean);

  // If we have fewer than 4 stats, don't show empty ones
  const displayStats = stats.slice(0, 4);

  if (displayStats.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(displayStats.length, 4)} gap-4`}>
      {displayStats.map((stat) => (
        <div
          key={stat!.label}
          className="bg-muted/30 rounded-lg p-4 md:p-6"
        >
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {stat!.label}
          </div>
          <div className="text-xl md:text-2xl font-bold">
            {stat!.value}
          </div>
          {stat!.subtext && (
            <div className="text-sm text-muted-foreground mt-1">
              {stat!.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
