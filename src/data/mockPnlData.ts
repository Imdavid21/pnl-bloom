export interface DailyPnl {
  date: string;
  pnl: number;  // closed_pnl - the only PnL we track
  funding: number;
  fees: number;
  perps_pnl: number;
  trades_count: number;
}

export interface MonthlySummary {
  month: string;
  pnl: number;  // closed_pnl
  funding: number;
  profitable_days: number;
  trading_days: number;
}

export interface PnlData {
  year: number;
  daily: DailyPnl[];
  monthly_summary: MonthlySummary;
  total_volume: number;
}

// Return empty data when no wallet connected
function generateEmptyData(year: number): PnlData {
  const currentMonth = new Date().getMonth();
  const monthStr = `${year}-${String(currentMonth + 1).padStart(2, '0')}`;

  return {
    year,
    daily: [],
    monthly_summary: {
      month: monthStr,
      pnl: 0,
      funding: 0,
      profitable_days: 0,
      trading_days: 0,
    },
    total_volume: 0,
  };
}

export const mockPnlData2025 = generateEmptyData(2025);
export const mockPnlData2024 = generateEmptyData(2024);
export const mockPnlData2023 = generateEmptyData(2023);

export const getAllMockData = (): Record<number, PnlData> => ({
  2025: mockPnlData2025,
  2024: mockPnlData2024,
  2023: mockPnlData2023,
});

// Trade/transfer mock data for drawer
export interface Trade {
  id: string;
  time: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  pnl: number;
  fees: number;
}

export interface Transfer {
  id: string;
  time: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  asset: string;
  status: 'completed' | 'pending';
}

export interface FundingPayment {
  id: string;
  time: string;
  symbol: string;
  payment: number;
  rate: number;
}

export function generateDayDetails(date: string) {
  const trades: Trade[] = [];
  const transfers: Transfer[] = [];
  const funding: FundingPayment[] = [];
  
  const symbols = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'ARB-PERP', 'DOGE-PERP'];
  
  // Generate 3-15 trades
  const tradeCount = Math.floor(Math.random() * 12) + 3;
  for (let i = 0; i < tradeCount; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isProfit = Math.random() > 0.4;
    trades.push({
      id: `trade-${i}`,
      time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      symbol,
      side: Math.random() > 0.5 ? 'long' : 'short',
      size: Math.round((Math.random() * 5 + 0.1) * 1000) / 1000,
      price: Math.round(Math.random() * 50000 + 100),
      pnl: Math.round((isProfit ? 1 : -1) * Math.random() * 200 * 100) / 100,
      fees: -Math.round(Math.random() * 5 * 100) / 100,
    });
  }

  // Generate 0-2 transfers
  if (Math.random() > 0.7) {
    transfers.push({
      id: 'transfer-1',
      time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      type: Math.random() > 0.5 ? 'deposit' : 'withdrawal',
      amount: Math.round(Math.random() * 5000 * 100) / 100,
      asset: 'USDT',
      status: 'completed',
    });
  }

  // Generate 2-5 funding payments
  const fundingCount = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < fundingCount; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    funding.push({
      id: `funding-${i}`,
      time: ['00:00', '08:00', '16:00'][i % 3],
      symbol,
      payment: Math.round((Math.random() - 0.5) * 20 * 100) / 100,
      rate: Math.round((Math.random() - 0.5) * 0.02 * 10000) / 10000,
    });
  }

  // Sort by time
  trades.sort((a, b) => a.time.localeCompare(b.time));
  funding.sort((a, b) => a.time.localeCompare(b.time));

  return { trades, transfers, funding };
}
