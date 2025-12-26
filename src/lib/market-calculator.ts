// Market calculation utilities

export interface MarketStats24h {
  volume: number;
  tradesCount: number;
  high: number;
  low: number;
}

export interface FundingInfo {
  rate: number;
  nextFundingTime: Date;
  timeUntilNext: number; // in seconds
}

export function calculateTimeUntilFunding(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  // Funding happens every 8 hours at 00:00, 08:00, 16:00 UTC
  const fundingHours = [0, 8, 16];
  let nextFundingHour = fundingHours.find(h => h > currentHour);
  
  if (nextFundingHour === undefined) {
    // Next funding is tomorrow at 00:00 UTC
    nextFundingHour = 24;
  }
  
  const hoursUntil = nextFundingHour - currentHour - 1;
  const minutesUntil = 59 - now.getUTCMinutes();
  const secondsUntil = 59 - now.getUTCSeconds();
  
  return {
    hours: hoursUntil < 0 ? hoursUntil + 8 : hoursUntil,
    minutes: minutesUntil,
    seconds: secondsUntil
  };
}

export function formatFundingCountdown(time: { hours: number; minutes: number; seconds: number }): string {
  return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
}

export function formatFundingRate(rate: number): string {
  const percentage = rate * 100;
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(4)}%`;
}

export function formatPrice(price: number, symbol?: string): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    });
  } else {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 6 
    });
  }
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(2)}B`;
  } else if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function calculatePriceChange(current: number, previous: number): { absolute: number; percentage: number } {
  const absolute = current - previous;
  const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { absolute, percentage };
}

export function isLargeTrade(notionalValue: number, threshold: number = 100000): boolean {
  return notionalValue >= threshold;
}

export function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return 'text-green-500';
  if (winRate >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

export function getRankBadge(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

export const MARKET_SPECS: Record<string, {
  tickSize: number;
  minOrderSize: number;
  maxLeverage: number;
  makerFee: number;
  takerFee: number;
}> = {
  BTC: { tickSize: 0.1, minOrderSize: 0.0001, maxLeverage: 50, makerFee: 0.0002, takerFee: 0.0005 },
  ETH: { tickSize: 0.01, minOrderSize: 0.001, maxLeverage: 50, makerFee: 0.0002, takerFee: 0.0005 },
  SOL: { tickSize: 0.001, minOrderSize: 0.1, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  DOGE: { tickSize: 0.00001, minOrderSize: 100, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  ARB: { tickSize: 0.0001, minOrderSize: 10, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  AVAX: { tickSize: 0.01, minOrderSize: 0.1, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  MATIC: { tickSize: 0.0001, minOrderSize: 10, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  SUI: { tickSize: 0.0001, minOrderSize: 10, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  LINK: { tickSize: 0.001, minOrderSize: 1, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
  OP: { tickSize: 0.001, minOrderSize: 1, maxLeverage: 20, makerFee: 0.0002, takerFee: 0.0005 },
};

export function getMarketSpecs(symbol: string) {
  return MARKET_SPECS[symbol.toUpperCase()] || MARKET_SPECS.BTC;
}
