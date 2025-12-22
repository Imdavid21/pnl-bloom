/**
 * GOLDEN DAY TEST FIXTURE
 * 
 * This is a regression test with KNOWN inputs and KNOWN outputs.
 * Run this test whenever you touch PnL logic to prevent regressions.
 * 
 * Test wallet: 0x519c721de735f7c9e6146d167852e60d60496a47
 * Test date: 2025-10-26 (a day with known trading activity)
 */

import { 
  calculateDailyMetrics, 
  calculateMonthlyMetrics,
  calculateWinRate,
  EconomicEvent,
  DailyPnlRecord
} from './metrics.ts';

// ============================================================================
// GOLDEN TEST DATA - DO NOT MODIFY UNLESS INTENTIONALLY CHANGING LOGIC
// ============================================================================

/**
 * Known fills for 2025-10-26
 * These are simplified versions of actual Hyperliquid API responses
 */
const GOLDEN_DAY_EVENTS: EconomicEvent[] = [
  // Fill 1: Long BTC, small profit
  {
    event_type: 'PERP_FILL',
    size: '0.1',
    exec_price: '65000',
    realized_pnl_usd: '150.00',
    fee_usd: '6.50',
  },
  // Fill 2: Short ETH, loss
  {
    event_type: 'PERP_FILL',
    size: '-2.0',
    exec_price: '3200',
    realized_pnl_usd: '-80.00',
    fee_usd: '6.40',
  },
  // Fill 3: Long HYPE, profit
  {
    event_type: 'PERP_FILL',
    size: '100',
    exec_price: '25',
    realized_pnl_usd: '200.00',
    fee_usd: '2.50',
  },
  // Funding payment 1
  {
    event_type: 'PERP_FUNDING',
    funding_usd: '-12.50',
  },
  // Funding payment 2
  {
    event_type: 'PERP_FUNDING',
    funding_usd: '8.25',
  },
];

/**
 * EXPECTED OUTPUT for the golden day
 * 
 * Calculations:
 * - realized_perps_pnl = 150 + (-80) + 200 = 270
 * - fees = 6.50 + 6.40 + 2.50 = 15.40
 * - funding_pnl = -12.50 + 8.25 = -4.25
 * - closed_pnl = 270 + (-4.25) - 15.40 = 250.35
 * - trades_count = 3
 * - volume = (0.1 * 65000) + (2.0 * 3200) + (100 * 25) = 6500 + 6400 + 2500 = 15400
 */
const EXPECTED_DAILY_METRICS = {
  realized_perps_pnl: 270,
  funding_pnl: -4.25,
  fees: 15.40,
  trades_count: 3,
  volume: 15400,
  closed_pnl: 250.35,
};

/**
 * Golden monthly test data
 */
const GOLDEN_MONTH_DAILY_RECORDS: DailyPnlRecord[] = [
  { total_pnl: 250.35, closed_pnl: 250.35, trades_count: 3 },  // Profitable day
  { total_pnl: -100.00, closed_pnl: -100.00, trades_count: 5 }, // Losing day
  { total_pnl: 50.00, closed_pnl: 50.00, trades_count: 2 },    // Profitable day
  { total_pnl: 0, closed_pnl: 0, trades_count: 0 },            // No trading
];

const EXPECTED_MONTHLY_METRICS = {
  total_pnl: 200.35,
  closed_pnl: 200.35,
  profitable_days: 2,
  trading_days: 3,
};

// ============================================================================
// TEST RUNNER
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}

function assertClose(actual: number, expected: number, tolerance: number = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

export function runGoldenDayTests(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // Test 1: Daily metrics calculation
  const dailyMetrics = calculateDailyMetrics(GOLDEN_DAY_EVENTS);

  results.push({
    name: 'Daily: trades_count',
    passed: dailyMetrics.trades_count === EXPECTED_DAILY_METRICS.trades_count,
    expected: EXPECTED_DAILY_METRICS.trades_count,
    actual: dailyMetrics.trades_count,
  });

  results.push({
    name: 'Daily: realized_perps_pnl',
    passed: assertClose(dailyMetrics.realized_perps_pnl, EXPECTED_DAILY_METRICS.realized_perps_pnl),
    expected: EXPECTED_DAILY_METRICS.realized_perps_pnl,
    actual: dailyMetrics.realized_perps_pnl,
  });

  results.push({
    name: 'Daily: funding_pnl',
    passed: assertClose(dailyMetrics.funding_pnl, EXPECTED_DAILY_METRICS.funding_pnl),
    expected: EXPECTED_DAILY_METRICS.funding_pnl,
    actual: dailyMetrics.funding_pnl,
  });

  results.push({
    name: 'Daily: fees',
    passed: assertClose(dailyMetrics.fees, EXPECTED_DAILY_METRICS.fees),
    expected: EXPECTED_DAILY_METRICS.fees,
    actual: dailyMetrics.fees,
  });

  results.push({
    name: 'Daily: volume',
    passed: assertClose(dailyMetrics.volume, EXPECTED_DAILY_METRICS.volume),
    expected: EXPECTED_DAILY_METRICS.volume,
    actual: dailyMetrics.volume,
  });

  results.push({
    name: 'Daily: closed_pnl',
    passed: assertClose(dailyMetrics.closed_pnl, EXPECTED_DAILY_METRICS.closed_pnl),
    expected: EXPECTED_DAILY_METRICS.closed_pnl,
    actual: dailyMetrics.closed_pnl,
  });

  // Test 2: Monthly metrics calculation
  const monthlyMetrics = calculateMonthlyMetrics(GOLDEN_MONTH_DAILY_RECORDS);

  results.push({
    name: 'Monthly: total_pnl',
    passed: assertClose(monthlyMetrics.total_pnl, EXPECTED_MONTHLY_METRICS.total_pnl),
    expected: EXPECTED_MONTHLY_METRICS.total_pnl,
    actual: monthlyMetrics.total_pnl,
  });

  results.push({
    name: 'Monthly: profitable_days',
    passed: monthlyMetrics.profitable_days === EXPECTED_MONTHLY_METRICS.profitable_days,
    expected: EXPECTED_MONTHLY_METRICS.profitable_days,
    actual: monthlyMetrics.profitable_days,
  });

  results.push({
    name: 'Monthly: trading_days',
    passed: monthlyMetrics.trading_days === EXPECTED_MONTHLY_METRICS.trading_days,
    expected: EXPECTED_MONTHLY_METRICS.trading_days,
    actual: monthlyMetrics.trading_days,
  });

  // Test 3: Win rate calculation
  const winRate = calculateWinRate(2, 3);
  results.push({
    name: 'Win rate: 2/3 days',
    passed: winRate === 67,
    expected: 67,
    actual: winRate,
  });

  const winRateZero = calculateWinRate(0, 0);
  results.push({
    name: 'Win rate: 0/0 days (edge case)',
    passed: winRateZero === 0,
    expected: 0,
    actual: winRateZero,
  });

  const allPassed = results.every(r => r.passed);

  return { passed: allPassed, results };
}

/**
 * Console output for test results
 */
export function printTestResults(results: { passed: boolean; results: TestResult[] }): void {
  console.log('\n========================================');
  console.log('GOLDEN DAY TEST RESULTS');
  console.log('========================================\n');

  for (const result of results.results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
    if (!result.passed) {
      console.log(`  Expected: ${JSON.stringify(result.expected)}`);
      console.log(`  Actual:   ${JSON.stringify(result.actual)}`);
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Overall: ${results.passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('----------------------------------------\n');
}
