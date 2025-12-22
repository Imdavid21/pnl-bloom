/**
 * CENTRALIZED METRIC DEFINITIONS
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all PnL metric calculations.
 * DO NOT reimplement these rules elsewhere.
 * 
 * If you need to change how a metric is calculated, change it HERE ONLY.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EconomicEvent {
  event_type: string;
  realized_pnl_usd?: number | string | null;
  funding_usd?: number | string | null;
  fee_usd?: number | string | null;
  size?: number | string | null;
  exec_price?: number | string | null;
  usd_value?: number | string | null;
}

export interface DailyMetrics {
  realized_perps_pnl: number;
  funding_pnl: number;
  fees: number;
  trades_count: number;
  volume: number;
  closed_pnl: number;
}

export interface DailyPnlRecord {
  total_pnl: number;
  closed_pnl: number;
  trades_count: number;
}

export interface MonthlyMetrics {
  total_pnl: number;
  closed_pnl: number;
  funding: number;
  profitable_days: number;
  trading_days: number;
  volume: number;
}

// ============================================================================
// METRIC DEFINITIONS - THE SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * What counts as a TRADE?
 * - Any PERP_FILL event is counted as ONE trade
 * - Each fill represents a single execution, regardless of size
 */
export function isTrade(event: EconomicEvent): boolean {
  return event.event_type === 'PERP_FILL';
}

/**
 * What counts as a FUNDING event?
 * - Any PERP_FUNDING event
 */
export function isFunding(event: EconomicEvent): boolean {
  return event.event_type === 'PERP_FUNDING';
}

/**
 * Calculate VOLUME from a fill event
 * - Volume = |size| × exec_price
 * - Always positive (absolute value of size)
 */
export function calculateFillVolume(event: EconomicEvent): number {
  if (!isTrade(event)) return 0;
  const size = Math.abs(parseFloat(String(event.size || 0)));
  const price = parseFloat(String(event.exec_price || 0));
  return size * price;
}

/**
 * Calculate REALIZED PNL from a fill
 * - This is the closedPnl from Hyperliquid API
 */
export function calculateFillRealizedPnl(event: EconomicEvent): number {
  if (!isTrade(event)) return 0;
  return parseFloat(String(event.realized_pnl_usd || 0));
}

/**
 * Calculate FEE from a fill
 */
export function calculateFillFee(event: EconomicEvent): number {
  if (!isTrade(event)) return 0;
  return parseFloat(String(event.fee_usd || 0));
}

/**
 * Calculate FUNDING amount from a funding event
 */
export function calculateFundingAmount(event: EconomicEvent): number {
  if (!isFunding(event)) return 0;
  return parseFloat(String(event.funding_usd || 0));
}

/**
 * Is a day PROFITABLE?
 * - A day is profitable if closed_pnl > 0
 * - closed_pnl = realized_perps_pnl + funding - fees
 */
export function isProfitableDay(closedPnl: number): boolean {
  return closedPnl > 0;
}

/**
 * Is a day a TRADING DAY?
 * - A day is a trading day if there was at least 1 trade (fill)
 */
export function isTradingDay(tradesCount: number): boolean {
  return tradesCount > 0;
}

// ============================================================================
// AGGREGATE CALCULATIONS
// ============================================================================

/**
 * Calculate all daily metrics from a list of economic events
 * This is THE ONLY function that should compute daily metrics
 */
export function calculateDailyMetrics(events: EconomicEvent[]): DailyMetrics {
  let realized_perps_pnl = 0;
  let funding_pnl = 0;
  let fees = 0;
  let trades_count = 0;
  let volume = 0;

  for (const event of events) {
    if (isTrade(event)) {
      realized_perps_pnl += calculateFillRealizedPnl(event);
      fees += calculateFillFee(event);
      volume += calculateFillVolume(event);
      trades_count++;
    } else if (isFunding(event)) {
      funding_pnl += calculateFundingAmount(event);
    }
  }

  // CLOSED PNL FORMULA: realized_perps + funding - fees
  const closed_pnl = realized_perps_pnl + funding_pnl - fees;

  return {
    realized_perps_pnl,
    funding_pnl,
    fees,
    trades_count,
    volume,
    closed_pnl,
  };
}

/**
 * Calculate monthly metrics from daily PnL records
 * This is THE ONLY function that should compute monthly metrics
 */
export function calculateMonthlyMetrics(dailyRecords: DailyPnlRecord[]): MonthlyMetrics {
  let total_pnl = 0;
  let closed_pnl = 0;
  let funding = 0;
  let profitable_days = 0;
  let trading_days = 0;
  let volume = 0;

  for (const day of dailyRecords) {
    const dayClosedPnl = parseFloat(String(day.closed_pnl || 0));
    const dayTotalPnl = parseFloat(String(day.total_pnl || 0));
    const dayTradesCount = day.trades_count || 0;

    total_pnl += dayTotalPnl;
    closed_pnl += dayClosedPnl;

    if (isProfitableDay(dayClosedPnl)) {
      profitable_days++;
    }

    if (isTradingDay(dayTradesCount)) {
      trading_days++;
    }
  }

  return {
    total_pnl,
    closed_pnl,
    funding,
    profitable_days,
    trading_days,
    volume,
  };
}

/**
 * Calculate win rate from monthly metrics
 * Win Rate = profitable_days / trading_days (as percentage)
 * Returns 0 if no trading days
 */
export function calculateWinRate(profitableDays: number, tradingDays: number): number {
  if (tradingDays === 0) return 0;
  return Math.round((profitableDays / tradingDays) * 100);
}
