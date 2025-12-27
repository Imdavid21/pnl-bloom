/**
 * Centralized formatters for numbers, currency, etc.
 * Handles very large values with abbreviations (K, M, B, T)
 */

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  
  if (abs >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  
  return value.toFixed(2);
}

export function formatUsdCompact(value: number, forceCompact = false): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  // Force compact for very large values
  if (abs >= 1e12) {
    return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  }
  if (forceCompact || abs >= 100000) {
    return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  if (abs >= 1000) {
    return `${sign}$${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(abs)}`;
  }
  
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatUsd(value: number, compact = false): string {
  if (compact) {
    return formatUsdCompact(value, true);
  }
  
  // For very large values, always use compact
  const abs = Math.abs(value);
  if (abs >= 1e9) {
    return formatUsdCompact(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number, compact = false): string {
  const abs = Math.abs(value);
  
  if (compact || abs >= 1e6) {
    return formatCompact(value);
  }
  
  if (abs >= 1000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTokenBalance(value: number, decimals = 4): string {
  const abs = Math.abs(value);
  
  // Very large balances
  if (abs >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  return value.toFixed(decimals);
}
