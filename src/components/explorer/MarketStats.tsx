import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatVolume, formatCompactNumber, formatFundingRate, calculateTimeUntilFunding, formatFundingCountdown, formatPrice } from '@/lib/market-calculator';

interface MarketStatsProps {
  volume24h: number;
  tradesCount: number;
  openInterest: number;
  activePositions: number;
  fundingRate: number;
  high24h: number;
  low24h: number;
}

export function MarketStats({
  volume24h,
  tradesCount,
  openInterest,
  activePositions,
  fundingRate,
  high24h,
  low24h
}: MarketStatsProps) {
  const [fundingCountdown, setFundingCountdown] = useState(calculateTimeUntilFunding());

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setFundingCountdown(calculateTimeUntilFunding());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isFundingPositive = fundingRate >= 0;

  const stats = [
    {
      label: '24H VOLUME',
      value: formatVolume(volume24h),
      subtext: `${formatCompactNumber(tradesCount)} trades`,
    },
    {
      label: 'OPEN INTEREST',
      value: formatVolume(openInterest),
      subtext: `${formatCompactNumber(activePositions)} positions`,
    },
    {
      label: 'FUNDING RATE',
      value: formatFundingRate(fundingRate),
      subtext: `Next in ${formatFundingCountdown(fundingCountdown)}`,
      valueColor: isFundingPositive ? 'text-green-500' : 'text-red-500',
    },
    {
      label: '24H RANGE',
      value: `$${formatPrice(low24h)} - $${formatPrice(high24h)}`,
      subtext: 'Low / High',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-muted/30 rounded-lg p-4 md:p-6"
        >
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {stat.label}
          </div>
          <div className={cn(
            "text-xl md:text-2xl font-bold",
            stat.valueColor
          )}>
            {stat.value}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {stat.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
