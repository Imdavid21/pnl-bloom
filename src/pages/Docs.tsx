import { ArrowLeft, BookOpen, Calculator, TrendingUp, AlertTriangle, Wallet, Database, Globe, Zap, Code, Server, Shield, Layers, Activity, Search, BarChart3, Clock, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Badge } from '@/components/ui/badge';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

interface DefinitionProps {
  term: string;
  formula?: string;
  description: string;
  example?: string;
  badges?: string[];
}

function Definition({ term, formula, description, example, badges }: DefinitionProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-foreground">{term}</h3>
        {badges && (
          <div className="flex gap-1 flex-wrap">
            {badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="text-xs">{badge}</Badge>
            ))}
          </div>
        )}
      </div>
      {formula && (
        <code className="block px-3 py-2 rounded bg-muted font-mono text-sm text-primary mb-2">
          {formula}
        </code>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
      {example && (
        <p className="text-xs text-muted-foreground mt-2 italic">Example: {example}</p>
      )}
    </div>
  );
}

interface ApiEndpointProps {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: string[];
}

function ApiEndpoint({ method, path, description, params }: ApiEndpointProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={method === 'GET' ? 'default' : 'secondary'} className="font-mono text-xs">
          {method}
        </Badge>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      {params && params.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {params.map((param) => (
            <code key={param} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
              {param}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">HyperPNL Documentation</h1>
              <p className="text-sm text-muted-foreground">
                Complete technical reference for the Hyperliquid analytics platform
              </p>
            </div>
          </div>
          <DarkModeToggle />
        </div>

        {/* Overview */}
        <Section icon={<Layers className="h-5 w-5 text-primary" />} title="Platform Overview">
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground mb-4">
              HyperPNL is a comprehensive analytics and exploration platform for Hyperliquid, providing real-time PnL tracking, 
              position analytics, blockchain exploration, and trading insights. The platform operates across both Hyperliquid L1 
              (the native perps DEX) and HyperEVM (the EVM-compatible layer).
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <BarChart3 className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-medium text-foreground mb-1">PnL Analytics</h4>
                <p className="text-xs text-muted-foreground">Calendar heatmap, equity curves, drawdown tracking, market breakdowns</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <Search className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-medium text-foreground mb-1">Block Explorer</h4>
                <p className="text-xs text-muted-foreground">Unified L1 + EVM explorer with wallet, tx, block, and token details</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <Activity className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-medium text-foreground mb-1">Live Positions</h4>
                <p className="text-xs text-muted-foreground">Real-time position tracking with liquidation scores and risk metrics</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Tech Stack */}
        <Section icon={<Code className="h-5 w-5 text-primary" />} title="Technology Stack">
          <div className="grid gap-4">
            <Definition
              term="Frontend"
              description="React 18 with TypeScript, Vite build tool, TailwindCSS with custom design tokens, shadcn/ui components, React Query for data fetching, React Router for navigation."
              badges={['React', 'TypeScript', 'Vite', 'TailwindCSS']}
            />
            <Definition
              term="Backend"
              description="Supabase (Lovable Cloud) for database, authentication, and edge functions. PostgreSQL database with Row Level Security. Deno-based edge functions for API proxying and data processing."
              badges={['Supabase', 'PostgreSQL', 'Deno', 'Edge Functions']}
            />
            <Definition
              term="Web3"
              description="Wagmi v3 for wallet connections, Viem for Ethereum interactions, WalletConnect for multi-wallet support. Supports MetaMask, WalletConnect, and Coinbase Wallet."
              badges={['Wagmi', 'Viem', 'WalletConnect']}
            />
            <Definition
              term="Data Visualization"
              description="Recharts for charts and graphs, custom heatmap components, real-time WebSocket updates for live data."
              badges={['Recharts', 'WebSocket']}
            />
          </div>
        </Section>

        {/* External APIs */}
        <Section icon={<Globe className="h-5 w-5 text-primary" />} title="External APIs & Data Sources">
          <div className="grid gap-4">
            <Definition
              term="Hyperliquid Info API"
              description="REST API for account state, positions, order history, and market data. Base URL: api.hyperliquid.xyz. Used for clearinghouse state, user fills, funding history."
              badges={['REST', 'Real-time']}
              example="POST /info with { type: 'clearinghouseState', user: '0x...' }"
            />
            <Definition
              term="Hyperliquid L1 Explorer"
              description="Block and transaction explorer for Hyperliquid L1. Base URL: explorer-api.hyperliquid.xyz. Provides block details, transaction history, and user activity."
              badges={['REST', 'Explorer']}
            />
            <Definition
              term="HyperEVM RPC"
              description="Ethereum-compatible JSON-RPC endpoint for HyperEVM. Base URL: rpc.hyperliquid.xyz/evm. Used for EVM balances, token metadata, transaction traces."
              badges={['JSON-RPC', 'EVM']}
            />
            <Definition
              term="Hyperliquid WebSocket"
              description="Real-time streaming for trades, orderbook updates, and market data. URL: wss://api.hyperliquid.xyz/ws. Subscriptions for allMids, trades, and more."
              badges={['WebSocket', 'Streaming']}
            />
          </div>
        </Section>

        {/* Edge Functions */}
        <Section icon={<Server className="h-5 w-5 text-primary" />} title="Edge Functions">
          <div className="grid gap-4">
            <ApiEndpoint
              method="GET"
              path="/functions/v1/explorer-proxy"
              description="Proxies requests to Hyperliquid L1 Explorer API with CORS handling and error normalization."
              params={['type: block|tx|user|spot-token', 'address', 'hash', 'height', 'token']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/hyperevm-rpc"
              description="Proxies HyperEVM RPC calls with actions for balances, tokens, transactions, and internal traces."
              params={['action: balance|erc20|tokenMeta|addressTxs|addressInternalTxs', 'address', 'limit']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/hyperliquid-proxy"
              description="Proxies Hyperliquid Info API requests with CORS handling."
              params={['type: clearinghouseState|userFills|userFunding|...', 'user', 'startTime']}
            />
            <ApiEndpoint
              method="POST"
              path="/functions/v1/poll-hypercore"
              description="Ingests trading history from Hyperliquid into the database. Fetches fills and funding, stores as economic events."
              params={['wallet', 'startTime?', 'endTime?', 'fullHistory?', 'maxFills?']}
            />
            <ApiEndpoint
              method="POST"
              path="/functions/v1/recompute-pnl"
              description="Recomputes PnL aggregations from raw events. Updates daily_pnl, monthly_pnl, equity_curve, closed_trades."
              params={['wallet', 'start_day', 'end_day']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/pnl-calendar"
              description="Returns calendar data with daily/monthly PnL aggregates for a wallet."
              params={['wallet', 'year', 'view?', 'product?', 'tz?']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/pnl-day"
              description="Returns detailed breakdown of a specific day's trading activity."
              params={['wallet', 'date', 'tz?']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/pnl-analytics"
              description="Returns computed analytics: summary stats, equity curve, closed trades, market stats, drawdown events."
              params={['wallet', 'dataset?', 'minTrades?']}
            />
            <ApiEndpoint
              method="POST"
              path="/functions/v1/compute-analytics"
              description="Triggers analytics computation for a wallet. Computes market stats, equity curve, and summary metrics."
              params={['wallet']}
            />
            <ApiEndpoint
              method="GET"
              path="/functions/v1/live-positions"
              description="Fetches current open positions with real-time PnL and liquidation risk scoring."
              params={['wallet']}
            />
          </div>
        </Section>

        {/* Database Schema */}
        <Section icon={<Database className="h-5 w-5 text-primary" />} title="Database Schema">
          <div className="grid gap-4">
            <Definition
              term="wallets"
              description="Stores wallet addresses and their internal UUIDs. Primary key for all wallet-related data."
              badges={['Core']}
            />
            <Definition
              term="economic_events"
              description="Raw trading events: PERP_FILL, PERP_FUNDING, SPOT_BUY, SPOT_SELL, etc. Source of truth for all calculations. Indexed by wallet_id, day, ts."
              badges={['Core', 'Source of Truth']}
            />
            <Definition
              term="daily_pnl"
              description="Aggregated daily metrics: closed_pnl, funding, fees, volume, trades_count, cumulative_pnl, drawdown. Composite key: (wallet_id, day)."
              badges={['Aggregation']}
            />
            <Definition
              term="monthly_pnl"
              description="Monthly rollups: total_pnl, closed_pnl, funding, volume, trading_days, profitable_days. Composite key: (wallet_id, month)."
              badges={['Aggregation']}
            />
            <Definition
              term="closed_trades"
              description="Completed round-trip trades with entry/exit prices, times, fees, funding, net_pnl, is_win. Computed by matching fills."
              badges={['Derived']}
            />
            <Definition
              term="equity_curve"
              description="Daily equity snapshots: starting/ending equity, cumulative PnL, peak equity, drawdown, drawdown_pct. For equity charts."
              badges={['Derived']}
            />
            <Definition
              term="market_stats"
              description="Per-market statistics: win_rate, total_pnl, avg_win, avg_loss, profit_factor, total_volume, avg_leverage."
              badges={['Analytics']}
            />
            <Definition
              term="drawdown_events"
              description="Tracks drawdown periods: peak_date, trough_date, peak_equity, trough_equity, drawdown_pct, recovery_date, recovery_days."
              badges={['Analytics']}
            />
            <Definition
              term="positions_perps"
              description="Current open perpetual positions: market, position_size, avg_entry, unrealized_pnl, effective_leverage, liquidation_px."
              badges={['Live']}
            />
            <Definition
              term="positions_spot"
              description="Current spot holdings: asset, balance, avg_cost."
              badges={['Live']}
            />
            <Definition
              term="sync_runs"
              description="Tracks data sync operations: status, events_ingested, fills_ingested, started_at, completed_at, error_message."
              badges={['Operations']}
            />
          </div>
        </Section>

        {/* Trade Metrics */}
        <Section icon={<TrendingUp className="h-5 w-5 text-primary" />} title="Trade Metrics & Calculations">
          <div className="grid gap-4">
            <Definition
              term="Closed Trade"
              description="A completed round-trip position. Opens when entering, closes when fully exiting. Multiple fills can comprise a single trade."
              example="Buy 1 ETH at $3000 → Sell 1 ETH at $3100 = 1 closed trade with $100 PnL"
            />
            <Definition
              term="Realized PnL"
              formula="(Exit Price - Entry Price) × Size × Direction"
              description="Profit or loss from closed positions. Direction is +1 for longs, -1 for shorts."
            />
            <Definition
              term="Net PnL"
              formula="Realized PnL + Funding - Fees"
              description="Total profit/loss after accounting for funding payments and trading fees."
            />
            <Definition
              term="Funding"
              description="Periodic payments between long and short traders to keep perp prices aligned with spot. Positive = received, Negative = paid. Paid every 8 hours."
            />
            <Definition
              term="Win Rate"
              formula="(Profitable Trades / Total Trades) × 100%"
              description="Percentage of trades that resulted in positive net PnL."
            />
            <Definition
              term="Profit Factor"
              formula="Total Gross Profit / abs(Total Gross Loss)"
              description="Ratio of gross profit to gross loss. Above 1.0 indicates a profitable system. Above 2.0 is excellent."
              example="$10,000 profit and $5,000 loss = 2.0 profit factor"
            />
          </div>
        </Section>

        {/* Position Metrics */}
        <Section icon={<Wallet className="h-5 w-5 text-primary" />} title="Position Metrics">
          <div className="grid gap-4">
            <Definition
              term="Notional Value"
              formula="Position Size × Entry Price"
              description="The total dollar value of the position at entry."
              example="10 ETH at $3000 = $30,000 notional"
            />
            <Definition
              term="Effective Leverage"
              formula="Notional Value / Margin Used"
              description="How leveraged your position actually is based on margin allocation."
              example="$30,000 position with $10,000 margin = 3x leverage"
            />
            <Definition
              term="Unrealized PnL"
              formula="(Mark Price - Entry Price) × Size × Direction"
              description="Paper profit/loss on open positions based on current market price."
            />
            <Definition
              term="Return on Equity (ROE)"
              formula="Unrealized PnL / Margin Used × 100%"
              description="Percentage return relative to margin committed to the position."
            />
            <Definition
              term="Max Leverage"
              description="Maximum leverage allowed for a market. Varies by asset: BTC/ETH up to 50x, altcoins typically 20x or less."
            />
          </div>
        </Section>

        {/* Risk Metrics */}
        <Section icon={<AlertTriangle className="h-5 w-5 text-primary" />} title="Risk Metrics">
          <div className="grid gap-4">
            <Definition
              term="Liquidation Price"
              description="The price at which your position will be forcibly closed due to insufficient margin. Calculated based on entry price, leverage, and maintenance margin requirements."
            />
            <Definition
              term="Liquidation Score"
              formula="0.3×LeverageScore + 0.4×ProximityScore + 0.2×MarginUtilScore + 0.1×DrawdownPenalty"
              description="A 0-1 score indicating how close a position is to liquidation. Higher = more dangerous. Components: leverage utilization, distance to liquidation price, margin usage, and drawdown severity."
            />
            <Definition
              term="Drawdown"
              formula="(Peak Equity - Current Equity) / Peak Equity × 100%"
              description="Maximum percentage decline from the highest equity point. Key risk metric for measuring worst-case scenarios."
            />
            <Definition
              term="Max Adverse Excursion (MAE)"
              description="The maximum unrealized loss experienced during a trade before closing. Measures how far underwater a position went."
            />
            <Definition
              term="Max Favorable Excursion (MFE)"
              description="The maximum unrealized profit during a trade. Shows how much profit was available before exit."
            />
          </div>
        </Section>

        {/* Explorer Features */}
        <Section icon={<Search className="h-5 w-5 text-primary" />} title="Explorer Features">
          <div className="grid gap-4">
            <Definition
              term="Unified Search"
              description="Search across L1 and EVM by wallet address, transaction hash, block height, or spot token. Auto-detects query type and routes to appropriate detail view."
              badges={['L1', 'EVM']}
            />
            <Definition
              term="Wallet Detail View"
              description="Progressive loading of wallet data: L1 clearinghouse state, trading fills, L1 transactions, EVM balances, EVM transactions, token holdings, internal transactions."
              badges={['L1', 'EVM']}
            />
            <Definition
              term="Block Detail View"
              description="L1 block details: height, hash, timestamp, proposer, transactions list with decoded action types."
              badges={['L1']}
            />
            <Definition
              term="Transaction Detail View"
              description="L1 transaction details: hash, block, timestamp, sender, action type, decoded action data."
              badges={['L1']}
            />
            <Definition
              term="Spot Token Detail View"
              description="Spot token info from L1 with EVM contract integration: name, symbol, decimals, total supply, token index, genesis info."
              badges={['L1', 'EVM']}
            />
            <Definition
              term="Whale Tracker"
              description="Monitors large trades in real-time via WebSocket. Configurable threshold (default $100k). Shows coin, side, size, price, and relative time."
              badges={['Real-time', 'WebSocket']}
            />
            <Definition
              term="Watchlist"
              description="Persisted list of watched addresses (localStorage). Quick access to frequently monitored wallets with recent activity indicators."
              badges={['Local Storage']}
            />
          </div>
        </Section>

        {/* Analytics Features */}
        <Section icon={<BarChart3 className="h-5 w-5 text-primary" />} title="Analytics & Charts">
          <div className="grid gap-4">
            <Definition
              term="PnL Heatmap"
              description="Calendar heatmap showing daily PnL with color intensity. Supports multiple views: total, closed, funding. Click days to see detailed breakdown."
            />
            <Definition
              term="Equity Curve"
              description="Line chart of cumulative equity over time with drawdown visualization. Shows peak equity line and underwater periods."
            />
            <Definition
              term="Drawdown & Recovery"
              description="Tracks drawdown events with recovery times. Shows peak-to-trough depth, recovery date, and days to recover."
            />
            <Definition
              term="Funding vs Trading"
              description="Dual area chart comparing cumulative trading PnL to cumulative funding PnL. Helps identify funding as profit source vs trading skill."
            />
            <Definition
              term="Market Direction"
              description="Stacked bar chart showing PnL breakdown by market and direction (long vs short). Identifies strongest markets and directional bias."
            />
            <Definition
              term="Trade Size vs Leverage"
              description="Scatter plot analyzing relationship between position sizing and leverage usage. Helps identify over-leveraging patterns."
            />
            <Definition
              term="Liquidation Proximity"
              description="Scatter plot of each trade's loss percentage over time. Y-axis shows how close trades came to liquidation-level losses."
            />
            <Definition
              term="Market Skill Chart"
              description="Radar/bar chart showing performance metrics across different markets: win rate, profit factor, avg trade size."
            />
          </div>
        </Section>

        {/* Sync & Data Flow */}
        <Section icon={<Clock className="h-5 w-5 text-primary" />} title="Data Sync Flow">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>poll-hypercore:</strong> Fetches user fills and funding from Hyperliquid API, stores as raw economic_events</li>
              <li><strong>recompute-pnl:</strong> Processes economic_events to compute daily_pnl, monthly_pnl aggregations</li>
              <li><strong>compute-analytics:</strong> Derives closed_trades from fills, computes market_stats, equity_curve, drawdown_events</li>
              <li><strong>Frontend:</strong> Queries pnl-calendar, pnl-day, pnl-analytics for visualization</li>
            </ol>
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/50">
              <code className="text-xs">
                Hyperliquid API → poll-hypercore → economic_events → recompute-pnl → daily_pnl/monthly_pnl<br/>
                economic_events → compute-analytics → closed_trades, market_stats, equity_curve
              </code>
            </div>
          </div>
        </Section>

        {/* Volume Calculations */}
        <Section icon={<Calculator className="h-5 w-5 text-primary" />} title="Volume & Aggregates">
          <div className="grid gap-4">
            <Definition
              term="Fill Volume"
              formula="abs(Size) × Execution Price"
              description="Notional value of a single fill. For perps, this is the contract value."
            />
            <Definition
              term="Daily Volume"
              formula="Σ(Fill Volumes for day)"
              description="Sum of all fill volumes for a given day. Stored in daily_pnl.volume."
            />
            <Definition
              term="Average Trade Size"
              formula="Total Volume / Trade Count"
              description="Mean notional value per trade. Indicates typical position sizing."
            />
          </div>
        </Section>

        {/* WebSocket Subscriptions */}
        <Section icon={<Zap className="h-5 w-5 text-primary" />} title="WebSocket Subscriptions">
          <div className="grid gap-4">
            <Definition
              term="allMids"
              description="Real-time mid prices for all markets. Used for spot price display and live PnL calculations."
              badges={['Price Feed']}
            />
            <Definition
              term="trades"
              description="Real-time trade feed for specified coins. Used for whale tracking and activity feed. Includes price, size, side, timestamp."
              badges={['Trade Feed']}
            />
          </div>
        </Section>

        {/* Security */}
        <Section icon={<Shield className="h-5 w-5 text-primary" />} title="Security & Access">
          <div className="grid gap-4">
            <Definition
              term="Row Level Security (RLS)"
              description="PostgreSQL RLS policies protect data at the database level. Wallets table has public read access; write operations require authentication."
              badges={['Database']}
            />
            <Definition
              term="Edge Function Auth"
              description="Edge functions validate requests and handle CORS. Public endpoints for read operations; admin endpoints require ADMIN_API_KEY."
              badges={['API']}
            />
            <Definition
              term="Client-Side Wallet"
              description="Wallet connections are client-side only via Wagmi. No private keys are ever sent to the server. Signatures used only for identity verification."
              badges={['Web3']}
            />
          </div>
        </Section>

        {/* Links */}
        <Section icon={<LinkIcon className="h-5 w-5 text-primary" />} title="External Resources">
          <div className="grid sm:grid-cols-2 gap-4">
            <a href="https://hyperliquid.xyz" target="_blank" rel="noopener noreferrer" 
               className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
              <h4 className="font-medium text-foreground mb-1">Hyperliquid</h4>
              <p className="text-xs text-muted-foreground">Main trading platform</p>
            </a>
            <a href="https://app.hyperliquid.xyz" target="_blank" rel="noopener noreferrer"
               className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
              <h4 className="font-medium text-foreground mb-1">Hyperliquid App</h4>
              <p className="text-xs text-muted-foreground">Trading interface</p>
            </a>
            <a href="https://hyperliquid.gitbook.io" target="_blank" rel="noopener noreferrer"
               className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
              <h4 className="font-medium text-foreground mb-1">Hyperliquid Docs</h4>
              <p className="text-xs text-muted-foreground">Official documentation</p>
            </a>
            <a href="https://explorer.hyperliquid.xyz" target="_blank" rel="noopener noreferrer"
               className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
              <h4 className="font-medium text-foreground mb-1">Official Explorer</h4>
              <p className="text-xs text-muted-foreground">Hyperliquid block explorer</p>
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}
