/**
 * CTA Selector
 * Choose the right call-to-action based on wallet characteristics
 */

import { LucideIcon, Target, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';

export interface CTAConfig {
  variant: 'profitable_wallet' | 'risk_alert' | 'active_trader' | 'default';
  title: string;
  description: string;
  action: string;
  link: string;
  icon: LucideIcon;
  dismissible: boolean;
}

interface WalletMetrics {
  winRate: number;
  pnl30d: number;
  trades30d: number;
  hasHighRisk: boolean;
  address: string;
}

export function selectCTA(metrics: WalletMetrics): CTAConfig {
  const { winRate, pnl30d, trades30d, hasHighRisk, address } = metrics;

  // High-performance wallet
  if (winRate > 60 && pnl30d > 5000 && trades30d > 20) {
    return {
      variant: 'profitable_wallet',
      title: 'High-Performance Wallet Detected',
      description: 'This wallet shows consistent profitability. Get alerts when they trade.',
      action: 'Follow This Wallet',
      link: `/analytics/${address}`,
      icon: Target,
      dismissible: true,
    };
  }

  // High-risk wallet
  if (hasHighRisk) {
    return {
      variant: 'risk_alert',
      title: 'High Liquidation Risk',
      description: 'Get real-time alerts before positions reach critical risk levels.',
      action: 'Set Up Risk Alerts',
      link: `/analytics/${address}#risk`,
      icon: AlertTriangle,
      dismissible: true,
    };
  }

  // Active trader
  if (trades30d > 50) {
    return {
      variant: 'active_trader',
      title: 'Want Deeper Insights?',
      description: 'Track performance over time, identify winning strategies, and analyze complete trading history.',
      action: 'View Full Analytics',
      link: `/analytics/${address}`,
      icon: BarChart3,
      dismissible: true,
    };
  }

  // Default CTA
  return {
    variant: 'default',
    title: 'Unlock Advanced Analytics',
    description: 'PnL calendar, equity curves, risk metrics, and real-time position alerts.',
    action: 'Explore Analytics',
    link: `/analytics/${address}`,
    icon: TrendingUp,
    dismissible: true,
  };
}

/**
 * Check if CTA was dismissed recently
 */
export function isCTADismissed(address: string, variant: string): boolean {
  const key = `cta_dismissed_${address}_${variant}`;
  const dismissedAt = localStorage.getItem(key);
  
  if (!dismissedAt) return false;
  
  const dismissedTime = parseInt(dismissedAt, 10);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  
  return Date.now() - dismissedTime < sevenDaysMs;
}

/**
 * Dismiss a CTA for 7 days
 */
export function dismissCTA(address: string, variant: string): void {
  const key = `cta_dismissed_${address}_${variant}`;
  localStorage.setItem(key, Date.now().toString());
}
