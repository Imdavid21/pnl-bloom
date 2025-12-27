import { ArrowLeft, BookOpen, Calculator, TrendingUp, AlertTriangle, Database, Globe, Zap, Code, Server, Shield, Layers, Activity, Search, BarChart3, Clock, Link as LinkIcon, FileCode, FolderTree, GitBranch, Cpu, Package, Settings, Key, RefreshCw, Table, Workflow, Download } from 'lucide-react';

function generateMarkdownContent(): string {
  return `# HyperPNL Documentation
Complete rebuild guide and technical reference for the Hyperliquid analytics platform.

## Platform Overview

HyperPNL is a comprehensive analytics and exploration platform for Hyperliquid, providing real-time PnL tracking, position analytics, blockchain exploration, and trading insights. The platform operates across both Hyperliquid L1 (HyperCore - the native perps DEX) and HyperEVM (the EVM-compatible layer).

### Key Features
- **PnL Analytics**: Calendar heatmap, equity curves, drawdown tracking, market breakdowns
- **Unified Wallet Explorer**: Domain-aware wallet view with HyperCore + HyperEVM activity
- **Activity Feed**: Unified timeline of perp fills, funding, transfers, and all EVM transactions
- **Live Positions**: Real-time position tracking with liquidation scores and risk metrics
- **Block Explorer**: L1 + EVM explorer with wallet, tx, block, and token details
- **Wallet Sync**: Automatic data ingestion with progress tracking and retry support

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Router v6 for routing
- React Query (TanStack Query v5) for server state management

### Styling & UI
- TailwindCSS with custom design tokens
- shadcn/ui component library
- Lucide icons
- Recharts for data visualization
- next-themes for dark mode

### Backend (Supabase/Lovable Cloud)
- PostgreSQL database with Row Level Security
- Deno-based Edge Functions
- Real-time subscriptions

### Web3 Integration
- Wagmi v3 for wallet state management
- Viem for Ethereum interactions
- WalletConnect v2 for multi-wallet support

---

## Key Dependencies

\`\`\`json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@tanstack/react-query": "^5.90.12",
    "@supabase/supabase-js": "^2.89.0",
    "wagmi": "^3.1.0",
    "viem": "^2.43.2",
    "recharts": "^2.15.4",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.462.0",
    "date-fns": "^3.6.0",
    "sonner": "^1.7.4",
    "zod": "^3.25.76"
  }
}
\`\`\`

---

## Project Structure

\`\`\`
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── explorer/        # Explorer page components
│   ├── pnl/             # PnL analytics components
│   └── wallet/          # Wallet page components (Hero, Activity, Metrics, Positions)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions & API clients
├── pages/               # Route page components
├── integrations/supabase/  # Supabase client & types
├── data/                # Mock data for development
├── App.tsx              # Main app with routes
├── main.tsx             # Entry point
└── index.css            # Global styles & design tokens

supabase/
├── functions/
│   ├── _shared/         # Shared utilities
│   ├── explorer-proxy/  # L1 explorer proxy
│   ├── hyperevm-rpc/    # HyperEVM RPC proxy (supports addressTxs, balance, erc20, tokenMeta)
│   ├── hyperliquid-proxy/  # Hyperliquid API proxy
│   ├── poll-hypercore/  # Data ingestion
│   ├── recompute-pnl/   # PnL aggregation
│   ├── pnl-calendar/    # Calendar data API
│   ├── pnl-day/         # Day detail API
│   ├── pnl-analytics/   # Analytics API
│   ├── compute-analytics/  # Analytics computation
│   ├── live-positions/  # Live position API
│   ├── sync-wallet/     # Wallet sync orchestrator
│   └── unified-resolver/ # Multi-domain entity resolver
└── config.toml          # Supabase config
\`\`\`

---

## Database Schema

### Core Tables

#### wallets
Primary wallet registry. Maps wallet addresses to internal UUIDs.

\`\`\`sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

#### economic_events
Source of truth for all trading activity. Event types: PERP_FILL, PERP_FUNDING, PERP_FEE, SPOT_BUY, SPOT_SELL, SPOT_TRANSFER_IN/OUT.

\`\`\`sql
CREATE TABLE economic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  event_type event_type NOT NULL,
  venue venue_type NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  day DATE NOT NULL,
  market TEXT,
  asset TEXT,
  side side_type,
  size NUMERIC,
  exec_price NUMERIC,
  realized_pnl_usd NUMERIC,
  fee_usd NUMERIC,
  funding_usd NUMERIC,
  volume_usd NUMERIC,
  meta JSONB,
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_wallet_day ON economic_events(wallet_id, day);
CREATE INDEX idx_events_wallet_ts ON economic_events(wallet_id, ts);
\`\`\`

### Aggregation Tables

#### daily_pnl
Daily aggregated metrics computed from economic_events.

\`\`\`sql
CREATE TABLE daily_pnl (
  wallet_id UUID REFERENCES wallets(id),
  day DATE NOT NULL,
  closed_pnl NUMERIC DEFAULT 0,
  funding NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 0,
  trades_count INT DEFAULT 0,
  cumulative_pnl NUMERIC DEFAULT 0,
  running_peak NUMERIC DEFAULT 0,
  drawdown NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wallet_id, day)
);
\`\`\`

#### closed_trades
Completed round-trip trades derived from matching entry/exit fills.

\`\`\`sql
CREATE TABLE closed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  market TEXT NOT NULL,
  side TEXT NOT NULL,
  size NUMERIC NOT NULL,
  avg_entry_price NUMERIC NOT NULL,
  avg_exit_price NUMERIC NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ NOT NULL,
  notional_value NUMERIC NOT NULL,
  realized_pnl NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  funding NUMERIC DEFAULT 0,
  net_pnl NUMERIC DEFAULT 0,
  is_win BOOLEAN DEFAULT false,
  effective_leverage NUMERIC,
  margin_used NUMERIC,
  trade_duration_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

### Database Enums

\`\`\`sql
CREATE TYPE event_type AS ENUM (
  'SPOT_BUY', 'SPOT_SELL', 'SPOT_TRANSFER_IN', 'SPOT_TRANSFER_OUT',
  'SPOT_FEE', 'PERP_FILL', 'PERP_FUNDING', 'PERP_FEE',
  'PRICE_SNAPSHOT', 'MARK_SNAPSHOT'
);

CREATE TYPE side_type AS ENUM ('long', 'short');
CREATE TYPE venue_type AS ENUM ('hypercore', 'onchain', 'external');
CREATE TYPE source_type AS ENUM ('goldrush', 'hypercore');
\`\`\`

---

## External APIs

### Hyperliquid Info API
Base URL: https://api.hyperliquid.xyz/info

\`\`\`javascript
// clearinghouseState - Account positions and balances
{ "type": "clearinghouseState", "user": "0x..." }

// userFills - Trade fills history
{ "type": "userFills", "user": "0x...", "startTime": 1704067200000 }

// userFunding - Funding payments
{ "type": "userFunding", "user": "0x...", "startTime": 1704067200000 }

// meta - Market metadata
{ "type": "meta" }

// allMids - Current mid prices
{ "type": "allMids" }
\`\`\`

### HyperEVM RPC
URL: https://rpc.hyperliquid.xyz/evm

\`\`\`javascript
// Get native balance
{ "method": "eth_getBalance", "params": ["0x...", "latest"] }

// Get block number
{ "method": "eth_blockNumber", "params": [] }

// Call contract (ERC20)
{ "method": "eth_call", "params": [{ "to": "0x...", "data": "0x..." }, "latest"] }

// Trace transaction
{ "method": "debug_traceTransaction", "params": ["0x...", { "tracer": "callTracer" }] }
\`\`\`

### EVM Transaction Types
The platform detects and categorizes all HyperEVM transaction types:
- **HYPE_TRANSFER_IN/OUT**: Native HYPE token transfers
- **CONTRACT_CALL**: Contract interactions with/without value
- **CONTRACT_DEPLOY**: New contract deployments
- **SWAP**: DEX swap transactions
- **TOKEN_TRANSFER_IN/OUT**: ERC20 token transfers

### WebSocket
URL: wss://api.hyperliquid.xyz/ws

\`\`\`javascript
// Subscribe to all mid prices
{ "method": "subscribe", "subscription": { "type": "allMids" } }

// Subscribe to trades
{ "method": "subscribe", "subscription": { "type": "trades", "coin": "BTC" } }
\`\`\`

---

## Edge Functions

| Method | Path | Description |
|--------|------|-------------|
| GET | /functions/v1/explorer-proxy | Proxies L1 Explorer API |
| GET | /functions/v1/hyperevm-rpc | Proxies HyperEVM RPC with actions: balance, erc20, tokenMeta, addressTxs |
| GET | /functions/v1/hyperliquid-proxy | Proxies Hyperliquid Info API |
| POST | /functions/v1/sync-wallet | Initiates wallet sync with progress tracking |
| POST | /functions/v1/poll-hypercore | Ingests trading data (fills, funding) |
| POST | /functions/v1/ingest-hypercore | Ingests HyperCore economic events |
| POST | /functions/v1/recompute-pnl | Recomputes PnL aggregations |
| POST | /functions/v1/compute-analytics | Computes derived analytics |
| GET | /functions/v1/pnl-calendar | Returns calendar view data |
| GET | /functions/v1/pnl-day | Returns day detail breakdown |
| GET | /functions/v1/pnl-analytics | Returns analytics datasets |
| GET | /functions/v1/live-positions | Fetches current positions |
| GET | /functions/v1/unified-resolver | Multi-domain entity resolution |
| GET | /functions/v1/chain-stats | Returns chain statistics |
| GET | /functions/v1/etherscan-proxy | Proxies Etherscan API |
| GET | /functions/v1/hyperevm-lending | HyperEVM lending protocol data |
| POST | /functions/v1/admin-recompute | Admin-triggered PnL recompute |
| POST | /functions/v1/admin-tokens | Admin token metadata management |

---

## Wallet Components

### WalletHero
Displays total net worth with HyperCore/HyperEVM domain breakdown, PnL with timeframe selector (7d/30d/YTD/All).

### WalletActivity  
Unified activity feed combining HyperCore events (perp fills, funding, spot) and all EVM transactions (transfers, contract calls, deploys). Supports filtering by type and infinite scroll.

### WalletMetrics
Terminal-style metric cards showing 30D volume, win rate, account age with domain-specific breakdowns.

### DomainBreakdown
Side-by-side cards for HyperCore (account value, margin, positions) and HyperEVM (HYPE balance, token count).

## Key Formulas

### Realized PnL
\`\`\`
(Exit Price - Entry Price) × Size × Direction
\`\`\`
Direction is +1 for long, -1 for short.

### Net PnL
\`\`\`
Realized PnL + Funding - Fees
\`\`\`

### Drawdown
\`\`\`
(Peak Equity - Current Equity) / Peak Equity × 100%
\`\`\`

### Win Rate
\`\`\`
Winning Trades / Total Trades × 100%
\`\`\`

### Profit Factor
\`\`\`
Gross Profit / |Gross Loss|
\`\`\`

### Liquidation Score
\`\`\`
0.3×LevScore + 0.4×ProxScore + 0.2×MarginScore + 0.1×DDPenalty
\`\`\`

---

## Environment Variables

\`\`\`
# Auto-generated by Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=your-project-id

# Available in Edge Functions
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
\`\`\`

---

## External Resources

- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Hyperliquid Explorer](https://explorer.hyperliquid.xyz)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)
`;
}
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  id?: string;
}

function Section({ icon, title, children, id }: SectionProps) {
  return (
    <section className="mb-10" id={id}>
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

interface CodeBlockProps {
  title?: string;
  language?: string;
  children: string;
}

function CodeBlock({ title, language = 'typescript', children }: CodeBlockProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted border-b border-border flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
        </div>
      )}
      <pre className="p-4 bg-card overflow-x-auto">
        <code className="text-xs font-mono text-foreground whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

interface FileTreeItemProps {
  name: string;
  type: 'folder' | 'file';
  description?: string;
  children?: React.ReactNode;
  indent?: number;
}

function FileTreeItem({ name, type, description, children, indent = 0 }: FileTreeItemProps) {
  return (
    <div>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${indent * 16}px` }}>
        {type === 'folder' ? (
          <FolderTree className="h-4 w-4 text-primary" />
        ) : (
          <FileCode className="h-4 w-4 text-muted-foreground" />
        )}
        <code className="text-sm font-mono text-foreground">{name}</code>
        {description && <span className="text-xs text-muted-foreground">— {description}</span>}
      </div>
      {children}
    </div>
  );
}

export default function DocsPage() {
  const handleDownloadAll = () => {
    const content = generateMarkdownContent();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hyperpnl-documentation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">HyperPNL Documentation</h1>
              <p className="text-sm text-muted-foreground">
                Complete rebuild guide and technical reference
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadAll} className="gap-2">
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>

        {/* Quick Nav */}
        <div className="mb-8 p-4 rounded-lg border border-border bg-card">
          <h3 className="text-sm font-medium text-foreground mb-3">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '#overview', label: 'Overview' },
              { href: '#tech-stack', label: 'Tech Stack' },
              { href: '#project-structure', label: 'Project Structure' },
              { href: '#database', label: 'Database Schema' },
              { href: '#edge-functions', label: 'Edge Functions' },
              { href: '#external-apis', label: 'External APIs' },
              { href: '#components', label: 'Components' },
              { href: '#hooks', label: 'Hooks' },
              { href: '#env-setup', label: 'Environment Setup' },
              { href: '#rebuild-steps', label: 'Rebuild Steps' },
            ].map(link => (
              <a key={link.href} href={link.href} className="px-3 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="api">APIs & Functions</TabsTrigger>
            <TabsTrigger value="frontend">Frontend</TabsTrigger>
            <TabsTrigger value="rebuild">Rebuild Guide</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8">
            <Section icon={<Layers className="h-5 w-5 text-primary" />} title="Platform Overview" id="overview">
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

            <Section icon={<Code className="h-5 w-5 text-primary" />} title="Technology Stack" id="tech-stack">
              <div className="grid gap-4">
                <Definition
                  term="Frontend Framework"
                  description="React 18 with TypeScript, Vite for build tooling, React Router v6 for routing, React Query (TanStack Query v5) for server state management."
                  badges={['React 18', 'TypeScript', 'Vite', 'React Router v6']}
                />
                <Definition
                  term="Styling & UI"
                  description="TailwindCSS with custom design tokens in index.css, shadcn/ui component library, Lucide icons, Recharts for data visualization, next-themes for dark mode."
                  badges={['TailwindCSS', 'shadcn/ui', 'Lucide', 'Recharts']}
                />
                <Definition
                  term="Backend (Supabase/Lovable Cloud)"
                  description="PostgreSQL database with Row Level Security, Deno-based Edge Functions, Real-time subscriptions, no traditional server required."
                  badges={['PostgreSQL', 'Deno', 'Edge Functions', 'RLS']}
                />
                <Definition
                  term="Real-time Data"
                  description="WebSocket connections to Hyperliquid for live prices and trades, Supabase Realtime for database change subscriptions."
                  badges={['WebSocket', 'Supabase Realtime']}
                />
              </div>
            </Section>

            <Section icon={<Package className="h-5 w-5 text-primary" />} title="Key Dependencies">
              <CodeBlock title="package.json (key dependencies)">
{`{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@tanstack/react-query": "^5.90.12",
    "@supabase/supabase-js": "^2.89.0",
    "recharts": "^2.15.4",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.462.0",
    "date-fns": "^3.6.0",
    "sonner": "^1.7.4",
    "zod": "^3.25.76",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  }
}`}
              </CodeBlock>
            </Section>
          </TabsContent>

          {/* ARCHITECTURE TAB */}
          <TabsContent value="architecture" className="space-y-8">
            <Section icon={<FolderTree className="h-5 w-5 text-primary" />} title="Project Structure" id="project-structure">
              <div className="p-4 rounded-lg border border-border bg-card font-mono text-sm space-y-1">
                <FileTreeItem name="src/" type="folder" description="Main source code">
                  <FileTreeItem name="components/" type="folder" description="React components" indent={1}>
                    <FileTreeItem name="ui/" type="folder" description="shadcn/ui primitives" indent={2} />
                    <FileTreeItem name="explorer/" type="folder" description="Explorer page components" indent={2} />
                <FileTreeItem name="pnl/" type="folder" description="PnL analytics components" indent={2} />
                    <FileTreeItem name="wallet/" type="folder" description="Wallet page components" indent={2} />
                  </FileTreeItem>
                  <FileTreeItem name="hooks/" type="folder" description="Custom React hooks" indent={1} />
                  <FileTreeItem name="lib/" type="folder" description="Utility functions & API clients" indent={1} />
                  <FileTreeItem name="pages/" type="folder" description="Route page components" indent={1} />
                  <FileTreeItem name="integrations/supabase/" type="folder" description="Supabase client & types" indent={1} />
                  <FileTreeItem name="data/" type="folder" description="Mock data for development" indent={1} />
                  <FileTreeItem name="App.tsx" type="file" description="Main app with routes" indent={1} />
                  <FileTreeItem name="main.tsx" type="file" description="Entry point" indent={1} />
                  <FileTreeItem name="index.css" type="file" description="Global styles & design tokens" indent={1} />
                </FileTreeItem>
                <FileTreeItem name="supabase/" type="folder" description="Supabase configuration">
                  <FileTreeItem name="functions/" type="folder" description="Edge functions" indent={1}>
                    <FileTreeItem name="_shared/" type="folder" description="Shared utilities" indent={2} />
                    <FileTreeItem name="explorer-proxy/" type="folder" description="L1 explorer proxy" indent={2} />
                    <FileTreeItem name="hyperevm-rpc/" type="folder" description="HyperEVM RPC proxy" indent={2} />
                    <FileTreeItem name="hyperliquid-proxy/" type="folder" description="Hyperliquid API proxy" indent={2} />
                    <FileTreeItem name="poll-hypercore/" type="folder" description="Data ingestion" indent={2} />
                    <FileTreeItem name="recompute-pnl/" type="folder" description="PnL aggregation" indent={2} />
                    <FileTreeItem name="pnl-calendar/" type="folder" description="Calendar data API" indent={2} />
                    <FileTreeItem name="pnl-day/" type="folder" description="Day detail API" indent={2} />
                    <FileTreeItem name="pnl-analytics/" type="folder" description="Analytics API" indent={2} />
                    <FileTreeItem name="compute-analytics/" type="folder" description="Analytics computation" indent={2} />
                    <FileTreeItem name="live-positions/" type="folder" description="Live position API" indent={2} />
                    <FileTreeItem name="sync-wallet/" type="folder" description="Wallet sync orchestrator" indent={2} />
                    <FileTreeItem name="unified-resolver/" type="folder" description="Multi-domain entity resolution" indent={2} />
                    <FileTreeItem name="chain-stats/" type="folder" description="Chain statistics API" indent={2} />
                    <FileTreeItem name="etherscan-proxy/" type="folder" description="Etherscan API proxy" indent={2} />
                    <FileTreeItem name="hyperevm-lending/" type="folder" description="HyperEVM lending data" indent={2} />
                    <FileTreeItem name="ingest-hypercore/" type="folder" description="HyperCore data ingestion" indent={2} />
                    <FileTreeItem name="admin-recompute/" type="folder" description="Admin PnL recompute" indent={2} />
                  </FileTreeItem>
                  <FileTreeItem name="config.toml" type="file" description="Supabase config" indent={1} />
                </FileTreeItem>
                <FileTreeItem name="public/" type="folder" description="Static assets" />
                <FileTreeItem name="tailwind.config.ts" type="file" description="Tailwind configuration" />
                <FileTreeItem name="vite.config.ts" type="file" description="Vite build config" />
              </div>
            </Section>

            <Section icon={<Workflow className="h-5 w-5 text-primary" />} title="Data Flow Architecture">
              <div className="space-y-6">
                {/* Main Architecture Diagram */}
                <div className="p-6 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                  <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    System Architecture Overview
                  </h4>
                  <div className="overflow-x-auto">
                    <svg viewBox="0 0 900 600" className="w-full max-w-4xl mx-auto" style={{ minWidth: '700px' }}>
                      {/* Background sections */}
                      <rect x="20" y="20" width="250" height="560" rx="8" fill="hsl(var(--muted))" opacity="0.3" />
                      <rect x="290" y="20" width="300" height="560" rx="8" fill="hsl(var(--primary))" opacity="0.1" />
                      <rect x="610" y="20" width="270" height="560" rx="8" fill="hsl(var(--muted))" opacity="0.3" />
                      
                      {/* Section Labels */}
                      <text x="145" y="50" textAnchor="middle" className="fill-muted-foreground text-xs font-medium">EXTERNAL APIs</text>
                      <text x="440" y="50" textAnchor="middle" className="fill-primary text-xs font-medium">EDGE FUNCTIONS</text>
                      <text x="745" y="50" textAnchor="middle" className="fill-muted-foreground text-xs font-medium">DATABASE</text>
                      
                      {/* External APIs */}
                      <rect x="40" y="80" width="210" height="50" rx="6" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="145" y="100" textAnchor="middle" className="fill-foreground text-xs font-medium">Hyperliquid Info API</text>
                      <text x="145" y="118" textAnchor="middle" className="fill-muted-foreground text-[10px]">fills, funding, positions</text>
                      
                      <rect x="40" y="145" width="210" height="50" rx="6" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="145" y="165" textAnchor="middle" className="fill-foreground text-xs font-medium">HyperEVM RPC</text>
                      <text x="145" y="183" textAnchor="middle" className="fill-muted-foreground text-[10px]">txs, balances, tokens</text>
                      
                      <rect x="40" y="210" width="210" height="50" rx="6" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="145" y="230" textAnchor="middle" className="fill-foreground text-xs font-medium">L1 Explorer API</text>
                      <text x="145" y="248" textAnchor="middle" className="fill-muted-foreground text-[10px]">blocks, validators</text>
                      
                      <rect x="40" y="275" width="210" height="50" rx="6" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="145" y="295" textAnchor="middle" className="fill-foreground text-xs font-medium">Etherscan API</text>
                      <text x="145" y="313" textAnchor="middle" className="fill-muted-foreground text-[10px]">contract verification</text>
                      
                      {/* Edge Functions - Ingestion Layer */}
                      <rect x="310" y="80" width="130" height="40" rx="4" className="fill-primary/20 stroke-primary" strokeWidth="1" />
                      <text x="375" y="105" textAnchor="middle" className="fill-foreground text-[10px] font-medium">poll-hypercore</text>
                      
                      <rect x="450" y="80" width="130" height="40" rx="4" className="fill-primary/20 stroke-primary" strokeWidth="1" />
                      <text x="515" y="105" textAnchor="middle" className="fill-foreground text-[10px] font-medium">ingest-hypercore</text>
                      
                      <rect x="310" y="135" width="130" height="40" rx="4" className="fill-primary/20 stroke-primary" strokeWidth="1" />
                      <text x="375" y="160" textAnchor="middle" className="fill-foreground text-[10px] font-medium">sync-wallet</text>
                      
                      {/* Edge Functions - Processing Layer */}
                      <rect x="310" y="200" width="130" height="40" rx="4" className="fill-amber-500/20 stroke-amber-500" strokeWidth="1" />
                      <text x="375" y="225" textAnchor="middle" className="fill-foreground text-[10px] font-medium">recompute-pnl</text>
                      
                      <rect x="450" y="200" width="130" height="40" rx="4" className="fill-amber-500/20 stroke-amber-500" strokeWidth="1" />
                      <text x="515" y="225" textAnchor="middle" className="fill-foreground text-[10px] font-medium">compute-analytics</text>
                      
                      {/* Edge Functions - Query Layer */}
                      <rect x="310" y="270" width="85" height="35" rx="4" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1" />
                      <text x="352" y="292" textAnchor="middle" className="fill-foreground text-[9px] font-medium">pnl-calendar</text>
                      
                      <rect x="402" y="270" width="85" height="35" rx="4" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1" />
                      <text x="444" y="292" textAnchor="middle" className="fill-foreground text-[9px] font-medium">pnl-day</text>
                      
                      <rect x="495" y="270" width="85" height="35" rx="4" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1" />
                      <text x="537" y="292" textAnchor="middle" className="fill-foreground text-[9px] font-medium">pnl-analytics</text>
                      
                      <rect x="310" y="315" width="85" height="35" rx="4" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1" />
                      <text x="352" y="337" textAnchor="middle" className="fill-foreground text-[9px] font-medium">live-positions</text>
                      
                      {/* Edge Functions - Proxy Layer */}
                      <rect x="310" y="375" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="375" y="397" textAnchor="middle" className="fill-foreground text-[10px] font-medium">hyperliquid-proxy</text>
                      
                      <rect x="450" y="375" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="515" y="397" textAnchor="middle" className="fill-foreground text-[10px] font-medium">explorer-proxy</text>
                      
                      <rect x="310" y="420" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="375" y="442" textAnchor="middle" className="fill-foreground text-[10px] font-medium">hyperevm-rpc</text>
                      
                      <rect x="450" y="420" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="515" y="442" textAnchor="middle" className="fill-foreground text-[10px] font-medium">unified-resolver</text>
                      
                      <rect x="310" y="465" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="375" y="487" textAnchor="middle" className="fill-foreground text-[10px] font-medium">etherscan-proxy</text>
                      
                      <rect x="450" y="465" width="130" height="35" rx="4" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="515" y="487" textAnchor="middle" className="fill-foreground text-[10px] font-medium">chain-stats</text>
                      
                      {/* Database Tables - Core */}
                      <rect x="630" y="80" width="130" height="35" rx="4" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="695" y="102" textAnchor="middle" className="fill-foreground text-[10px] font-medium">wallets</text>
                      
                      <rect x="630" y="125" width="130" height="35" rx="4" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="695" y="147" textAnchor="middle" className="fill-foreground text-[10px] font-medium">economic_events</text>
                      
                      <rect x="630" y="170" width="130" height="35" rx="4" className="fill-card stroke-border" strokeWidth="1" />
                      <text x="695" y="192" textAnchor="middle" className="fill-foreground text-[10px] font-medium">raw_events</text>
                      
                      {/* Database Tables - Aggregations */}
                      <rect x="770" y="80" width="100" height="35" rx="4" className="fill-amber-500/10 stroke-amber-500/50" strokeWidth="1" />
                      <text x="820" y="102" textAnchor="middle" className="fill-foreground text-[9px] font-medium">daily_pnl</text>
                      
                      <rect x="770" y="125" width="100" height="35" rx="4" className="fill-amber-500/10 stroke-amber-500/50" strokeWidth="1" />
                      <text x="820" y="147" textAnchor="middle" className="fill-foreground text-[9px] font-medium">monthly_pnl</text>
                      
                      <rect x="770" y="170" width="100" height="35" rx="4" className="fill-amber-500/10 stroke-amber-500/50" strokeWidth="1" />
                      <text x="820" y="192" textAnchor="middle" className="fill-foreground text-[9px] font-medium">equity_curve</text>
                      
                      {/* Database Tables - Derived */}
                      <rect x="630" y="230" width="130" height="35" rx="4" className="fill-emerald-500/10 stroke-emerald-500/50" strokeWidth="1" />
                      <text x="695" y="252" textAnchor="middle" className="fill-foreground text-[10px] font-medium">closed_trades</text>
                      
                      <rect x="770" y="230" width="100" height="35" rx="4" className="fill-emerald-500/10 stroke-emerald-500/50" strokeWidth="1" />
                      <text x="820" y="252" textAnchor="middle" className="fill-foreground text-[9px] font-medium">market_stats</text>
                      
                      <rect x="630" y="275" width="130" height="35" rx="4" className="fill-emerald-500/10 stroke-emerald-500/50" strokeWidth="1" />
                      <text x="695" y="297" textAnchor="middle" className="fill-foreground text-[10px] font-medium">materialized_positions</text>
                      
                      <rect x="770" y="275" width="100" height="35" rx="4" className="fill-emerald-500/10 stroke-emerald-500/50" strokeWidth="1" />
                      <text x="820" y="297" textAnchor="middle" className="fill-foreground text-[9px] font-medium">market_rollups</text>
                      
                      {/* Database Tables - Live */}
                      <rect x="630" y="335" width="130" height="35" rx="4" className="fill-sky-500/10 stroke-sky-500/50" strokeWidth="1" />
                      <text x="695" y="357" textAnchor="middle" className="fill-foreground text-[10px] font-medium">positions_perps</text>
                      
                      <rect x="770" y="335" width="100" height="35" rx="4" className="fill-sky-500/10 stroke-sky-500/50" strokeWidth="1" />
                      <text x="820" y="357" textAnchor="middle" className="fill-foreground text-[9px] font-medium">positions_spot</text>
                      
                      {/* Database Tables - Risk */}
                      <rect x="630" y="390" width="130" height="35" rx="4" className="fill-rose-500/10 stroke-rose-500/50" strokeWidth="1" />
                      <text x="695" y="412" textAnchor="middle" className="fill-foreground text-[10px] font-medium">risk_events</text>
                      
                      <rect x="770" y="390" width="100" height="35" rx="4" className="fill-rose-500/10 stroke-rose-500/50" strokeWidth="1" />
                      <text x="820" y="412" textAnchor="middle" className="fill-foreground text-[9px] font-medium">drawdown_events</text>
                      
                      {/* Database Tables - System */}
                      <rect x="630" y="450" width="130" height="35" rx="4" className="fill-muted stroke-border" strokeWidth="1" />
                      <text x="695" y="472" textAnchor="middle" className="fill-foreground text-[10px] font-medium">sync_runs</text>
                      
                      <rect x="770" y="450" width="100" height="35" rx="4" className="fill-muted stroke-border" strokeWidth="1" />
                      <text x="820" y="472" textAnchor="middle" className="fill-foreground text-[9px] font-medium">resolution_cache</text>
                      
                      {/* Arrows - API to Edge Functions */}
                      <path d="M250 105 L305 100" className="stroke-muted-foreground" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                      <path d="M250 170 L305 155" className="stroke-muted-foreground" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                      <path d="M250 235 L305 395" className="stroke-muted-foreground" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                      <path d="M250 300 L305 480" className="stroke-muted-foreground" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                      
                      {/* Arrows - Ingestion to DB */}
                      <path d="M580 100 L625 142" className="stroke-primary" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-primary)" />
                      <path d="M580 155 L625 187" className="stroke-primary" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-primary)" />
                      
                      {/* Arrows - Processing to DB */}
                      <path d="M580 220 L625 247" className="stroke-amber-500" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" />
                      <path d="M580 220 L765 97" className="stroke-amber-500" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" />
                      
                      {/* Arrow Markers */}
                      <defs>
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
                        </marker>
                        <marker id="arrow-primary" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 Z" className="fill-primary" />
                        </marker>
                        <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 Z" className="fill-amber-500" />
                        </marker>
                      </defs>
                      
                      {/* Legend */}
                      <rect x="40" y="520" width="12" height="12" rx="2" className="fill-primary/20 stroke-primary" strokeWidth="1" />
                      <text x="58" y="530" className="fill-muted-foreground text-[10px]">Ingestion</text>
                      
                      <rect x="120" y="520" width="12" height="12" rx="2" className="fill-amber-500/20 stroke-amber-500" strokeWidth="1" />
                      <text x="138" y="530" className="fill-muted-foreground text-[10px]">Processing</text>
                      
                      <rect x="210" y="520" width="12" height="12" rx="2" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1" />
                      <text x="228" y="530" className="fill-muted-foreground text-[10px]">Query APIs</text>
                      
                      <rect x="300" y="520" width="12" height="12" rx="2" className="fill-sky-500/20 stroke-sky-500" strokeWidth="1" />
                      <text x="318" y="530" className="fill-muted-foreground text-[10px]">Proxy/Resolver</text>
                    </svg>
                  </div>
                </div>
                
                {/* Flow descriptions */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      1. Data Ingestion
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• sync-wallet orchestrates full wallet sync</p>
                      <p>• poll-hypercore fetches fills & funding</p>
                      <p>• Data stored in economic_events table</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      2. Processing
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• recompute-pnl aggregates daily/monthly</p>
                      <p>• compute-analytics derives trades</p>
                      <p>• Populates equity_curve, market_stats</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      3. Query
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• pnl-calendar returns heatmap data</p>
                      <p>• live-positions fetches current state</p>
                      <p>• React Query caches on frontend</p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section icon={<GitBranch className="h-5 w-5 text-primary" />} title="Component Hierarchy">
              <CodeBlock title="Main App Structure">
{`App.tsx
├── QueryClientProvider (React Query)
├── ThemeProvider (next-themes)
├── Routes
│   ├── Layout (NavBar + Footer wrapper)
│   │   ├── Index (PnL page)
│   │   ├── Explorer
│   │   │   ├── WalletDetailPage
│   │   │   ├── BlockDetailPage
│   │   │   ├── TxDetailPage
│   │   │   └── SpotTokenDetailPage
│   │   ├── Assets
│   │   ├── Api
│   │   └── Docs
│   └── NotFound
└── Toaster (sonner)`}
              </CodeBlock>
            </Section>
          </TabsContent>

          {/* DATABASE TAB */}
          <TabsContent value="database" className="space-y-8">
            <Section icon={<Database className="h-5 w-5 text-primary" />} title="Database Schema" id="database">
              <div className="grid gap-4">
                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                  <h4 className="font-medium text-foreground mb-2">Core Tables</h4>
                  <p className="text-sm text-muted-foreground">These are the foundational tables that store primary data.</p>
                </div>
                <Definition
                  term="wallets"
                  description="Primary wallet registry. Maps wallet addresses to internal UUIDs. All other tables reference this via wallet_id foreign key."
                  badges={['Core', 'UUID Primary Key']}
                />
                <CodeBlock title="wallets table">
{`CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                </CodeBlock>
                <Definition
                  term="economic_events"
                  description="Source of truth for all trading activity. Stores individual fills, funding payments, transfers. Event types: PERP_FILL, PERP_FUNDING, PERP_FEE, SPOT_BUY, SPOT_SELL, SPOT_TRANSFER_IN/OUT."
                  badges={['Core', 'Source of Truth']}
                />
                <CodeBlock title="economic_events table">
{`CREATE TABLE economic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  event_type event_type NOT NULL,  -- enum
  venue venue_type NOT NULL,       -- 'hypercore' | 'onchain' | 'external'
  ts TIMESTAMPTZ NOT NULL,
  day DATE NOT NULL,               -- for partitioning/indexing
  market TEXT,
  asset TEXT,
  side side_type,                  -- 'long' | 'short'
  size NUMERIC,
  exec_price NUMERIC,
  realized_pnl_usd NUMERIC,
  fee_usd NUMERIC,
  funding_usd NUMERIC,
  volume_usd NUMERIC,
  meta JSONB,
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Critical indexes
CREATE INDEX idx_events_wallet_day ON economic_events(wallet_id, day);
CREATE INDEX idx_events_wallet_ts ON economic_events(wallet_id, ts);`}
                </CodeBlock>
              </div>
            </Section>

            <Section icon={<Table className="h-5 w-5 text-primary" />} title="Aggregation Tables">
              <div className="grid gap-4">
                <Definition
                  term="daily_pnl"
                  description="Daily aggregated metrics computed from economic_events. Includes closed PnL, funding, fees, volume, trade count, cumulative PnL, and drawdown."
                  badges={['Aggregation', 'Composite Key']}
                />
                <CodeBlock title="daily_pnl table">
{`CREATE TABLE daily_pnl (
  wallet_id UUID REFERENCES wallets(id),
  day DATE NOT NULL,
  closed_pnl NUMERIC DEFAULT 0,
  funding NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  perps_pnl NUMERIC DEFAULT 0,
  spot_pnl NUMERIC DEFAULT 0,
  unrealized_change NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 0,
  trades_count INT DEFAULT 0,
  cumulative_pnl NUMERIC DEFAULT 0,
  running_peak NUMERIC DEFAULT 0,
  drawdown NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (wallet_id, day)
);`}
                </CodeBlock>
                <Definition
                  term="monthly_pnl"
                  description="Monthly rollups for high-level summaries. Aggregates total PnL, volume, trading days, profitable days."
                  badges={['Aggregation']}
                />
                <Definition
                  term="closed_trades"
                  description="Completed round-trip trades derived from matching entry/exit fills. Stores entry/exit prices and times, fees, funding, realized and net PnL, win/loss status."
                  badges={['Derived']}
                />
                <CodeBlock title="closed_trades table">
{`CREATE TABLE closed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  market TEXT NOT NULL,
  side TEXT NOT NULL,           -- 'long' | 'short'
  size NUMERIC NOT NULL,
  avg_entry_price NUMERIC NOT NULL,
  avg_exit_price NUMERIC NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ NOT NULL,
  notional_value NUMERIC NOT NULL,
  realized_pnl NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  funding NUMERIC DEFAULT 0,
  net_pnl NUMERIC DEFAULT 0,
  is_win BOOLEAN DEFAULT false,
  effective_leverage NUMERIC,
  margin_used NUMERIC,
  trade_duration_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`}
                </CodeBlock>
                <Definition
                  term="equity_curve"
                  description="Daily equity snapshots for charting. Tracks starting/ending equity, cumulative PnL, peak equity, drawdown amounts and percentages."
                  badges={['Derived', 'Charting']}
                />
                <Definition
                  term="market_stats"
                  description="Per-market aggregated statistics: win rate, profit factor, total PnL, average win/loss, total volume, average leverage."
                  badges={['Analytics']}
                />
                <Definition
                  term="drawdown_events"
                  description="Records significant drawdown periods with peak/trough dates, equity values, drawdown percentage, recovery status and duration."
                  badges={['Analytics']}
                />
              </div>
            </Section>

            <Section icon={<Activity className="h-5 w-5 text-primary" />} title="Live Data Tables">
              <div className="grid gap-4">
                <Definition
                  term="positions_perps"
                  description="Current open perpetual positions. Updated by live-positions endpoint. Stores market, size, entry, unrealized PnL, leverage, liquidation price."
                  badges={['Live', 'Composite Key']}
                />
                <Definition
                  term="positions_spot"
                  description="Current spot token holdings. Stores asset, balance, average cost basis."
                  badges={['Live']}
                />
                <Definition
                  term="clearinghouse_snapshots"
                  description="Historical snapshots of account state: account value, margin used, notional position, withdrawable balance."
                  badges={['Historical']}
                />
              </div>
            </Section>

            <Section icon={<RefreshCw className="h-5 w-5 text-primary" />} title="Operations Tables">
              <div className="grid gap-4">
                <Definition
                  term="sync_runs"
                  description="Tracks data synchronization operations. Records status, events ingested, start/end times, errors. Used for progress display and debugging."
                  badges={['Operations']}
                />
                <Definition
                  term="recompute_runs"
                  description="Tracks PnL recomputation runs. Similar to sync_runs but for analytics processing."
                  badges={['Operations']}
                />
                <Definition
                  term="sources"
                  description="Tracks data source cursors for incremental sync. Stores last synced timestamp per source type per wallet."
                  badges={['Operations']}
                />
              </div>
            </Section>

            <Section icon={<Shield className="h-5 w-5 text-primary" />} title="Row Level Security">
              <CodeBlock title="RLS Policies">
{`-- Wallets: public read, authenticated insert
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select" ON wallets FOR SELECT USING (true);
CREATE POLICY "wallets_insert" ON wallets FOR INSERT WITH CHECK (true);

-- Economic events: public read (no auth required for this app)
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON economic_events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON economic_events FOR INSERT WITH CHECK (true);

-- Similar policies for aggregation tables...
-- In production, restrict writes to service role only`}
              </CodeBlock>
            </Section>

            <Section icon={<Cpu className="h-5 w-5 text-primary" />} title="Enums">
              <CodeBlock title="Database Enums">
{`CREATE TYPE event_type AS ENUM (
  'SPOT_BUY', 'SPOT_SELL', 'SPOT_TRANSFER_IN', 'SPOT_TRANSFER_OUT',
  'SPOT_FEE', 'PERP_FILL', 'PERP_FUNDING', 'PERP_FEE',
  'PRICE_SNAPSHOT', 'MARK_SNAPSHOT'
);

CREATE TYPE side_type AS ENUM ('long', 'short');

CREATE TYPE venue_type AS ENUM ('hypercore', 'onchain', 'external');

CREATE TYPE source_type AS ENUM ('goldrush', 'hypercore');`}
              </CodeBlock>
            </Section>
          </TabsContent>

          {/* API TAB */}
          <TabsContent value="api" className="space-y-8">
            <Section icon={<Globe className="h-5 w-5 text-primary" />} title="External APIs" id="external-apis">
              <div className="grid gap-4">
                <Definition
                  term="Hyperliquid Info API"
                  description="Main API for account state, positions, order history. POST requests with JSON body specifying request type."
                  badges={['REST', 'POST only']}
                  example="Base URL: https://api.hyperliquid.xyz/info"
                />
                <CodeBlock title="Hyperliquid API Request Types">
{`// clearinghouseState - Account positions and balances
{ "type": "clearinghouseState", "user": "0x..." }

// userFills - Trade fills history
{ "type": "userFills", "user": "0x...", "startTime": 1704067200000 }

// userFunding - Funding payments
{ "type": "userFunding", "user": "0x...", "startTime": 1704067200000 }

// meta - Market metadata (leverage, tick sizes)
{ "type": "meta" }

// allMids - Current mid prices
{ "type": "allMids" }

// spotMeta - Spot token metadata
{ "type": "spotMeta" }`}
                </CodeBlock>

                <Definition
                  term="Hyperliquid L1 Explorer"
                  description="Block and transaction explorer for Hyperliquid L1 chain. GET requests for blocks, transactions, and user activity."
                  badges={['REST', 'GET']}
                  example="Base URL: https://explorer-api.hyperliquid.xyz"
                />
                <CodeBlock title="L1 Explorer Endpoints">
{`// Block by height
GET /block/{height}

// Transaction by hash
GET /tx/{hash}

// User transactions
GET /user/{address}

// Spot token info
GET /spot-token/{tokenIndex}
// Returns: name, symbol, decimals, totalSupply, genesis info`}
                </CodeBlock>

                <Definition
                  term="HyperEVM RPC"
                  description="Standard Ethereum JSON-RPC endpoint for HyperEVM. Used for balances, tokens, transactions, and traces."
                  badges={['JSON-RPC']}
                  example="URL: https://rpc.hyperliquid.xyz/evm"
                />
                <CodeBlock title="HyperEVM RPC Methods">
{`// Get native balance
{ "method": "eth_getBalance", "params": ["0x...", "latest"] }

// Get block number
{ "method": "eth_blockNumber", "params": [] }

// Get block with transactions
{ "method": "eth_getBlockByNumber", "params": ["0x...", true] }

// Call contract (ERC20 balanceOf, name, symbol, etc.)
{ "method": "eth_call", "params": [{ "to": "0x...", "data": "0x..." }, "latest"] }

// Trace transaction (for internal txs)
{ "method": "debug_traceTransaction", "params": ["0x...", { "tracer": "callTracer" }] }`}
                </CodeBlock>

                <Definition
                  term="Hyperliquid WebSocket"
                  description="Real-time streaming for prices and trades. Supports subscriptions for allMids, trades, orderbook, and more."
                  badges={['WebSocket', 'Streaming']}
                  example="URL: wss://api.hyperliquid.xyz/ws"
                />
                <CodeBlock title="WebSocket Subscriptions">
{`// Subscribe to all mid prices
{ "method": "subscribe", "subscription": { "type": "allMids" } }

// Subscribe to trades for a specific coin
{ "method": "subscribe", "subscription": { "type": "trades", "coin": "BTC" } }

// Response format for trades:
{
  "channel": "trades",
  "data": [{
    "coin": "BTC",
    "side": "B",  // B = buy, S = sell
    "px": "65000.0",
    "sz": "0.5",
    "time": 1704067200000,
    "hash": "0x..."
  }]
}`}
                </CodeBlock>
              </div>
            </Section>

            <Section icon={<Server className="h-5 w-5 text-primary" />} title="Edge Functions" id="edge-functions">
              <div className="grid gap-4">
                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                  <h4 className="font-medium text-foreground mb-2">Edge Function Architecture</h4>
                  <p className="text-sm text-muted-foreground">
                    All edge functions are Deno-based, deployed to Supabase Edge Functions. They handle CORS, proxy external APIs, 
                    and perform data processing. Located in supabase/functions/ directory.
                  </p>
                </div>

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/explorer-proxy"
                  description="Proxies requests to Hyperliquid L1 Explorer API. Handles CORS and normalizes error responses."
                  params={['type: block|tx|user|spot-token', 'address (for user)', 'hash (for tx)', 'height (for block)', 'token (for spot-token)']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/hyperevm-rpc"
                  description="Proxies HyperEVM RPC calls with high-level actions. Handles rate limiting with delays and retries."
                  params={['action: balance|erc20|tokenMeta|addressTxs|addressInternalTxs', 'address', 'limit (for txs)']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/hyperliquid-proxy"
                  description="Proxies Hyperliquid Info API requests. Adds CORS headers and handles authentication if needed."
                  params={['type: clearinghouseState|userFills|userFunding|meta|allMids|spotMeta', 'user', 'startTime']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/sync-wallet"
                  description="Initiates wallet data synchronization. Creates wallet record if needed, triggers poll-hypercore."
                  params={['wallet (address)']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/poll-hypercore"
                  description="Ingests trading data from Hyperliquid. Fetches fills and funding history, stores as economic_events with deduplication."
                  params={['wallet', 'startTime?', 'endTime?', 'fullHistory?', 'maxFills?']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/recompute-pnl"
                  description="Recomputes PnL aggregations from raw events. Updates daily_pnl, monthly_pnl tables with cumulative calculations."
                  params={['wallet', 'start_day', 'end_day']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/compute-analytics"
                  description="Computes derived analytics: closed_trades from fill pairs, market_stats aggregates, equity_curve, drawdown_events."
                  params={['wallet']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/pnl-calendar"
                  description="Returns calendar view data with daily PnL for heatmap. Includes monthly summaries and totals."
                  params={['wallet', 'year', 'view?: total|closed|funding', 'product?: all|perps|spot', 'tz?: timezone offset']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/pnl-day"
                  description="Returns detailed breakdown for a specific day. Includes trades list, hourly breakdown, market breakdown."
                  params={['wallet', 'date (YYYY-MM-DD)', 'tz?']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/pnl-analytics"
                  description="Returns analytics datasets. Supports multiple dataset types for different visualizations."
                  params={['wallet', 'dataset?: summary|equityCurve|closedTrades|marketStats|drawdowns', 'minTrades?']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/live-positions"
                  description="Fetches current open positions with real-time data. Includes liquidation risk scoring."
                  params={['wallet']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/unified-resolver"
                  description="Resolves any input (address, tx hash, block, token) to entity type. Powers universal search across domains."
                  params={['q (query string)', 'domain?: hypercore|hyperevm|all']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/chain-stats"
                  description="Returns chain-level statistics including block height, TPS, validator count, and network health."
                  params={['chain?: l1|evm']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/etherscan-proxy"
                  description="Proxies Etherscan-compatible API for EVM transaction history and contract verification."
                  params={['module', 'action', 'address?', 'txhash?']}
                />

                <ApiEndpoint
                  method="GET"
                  path="/functions/v1/hyperevm-lending"
                  description="Fetches lending protocol positions and rates from HyperEVM DeFi protocols."
                  params={['wallet', 'protocol?']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/ingest-hypercore"
                  description="Ingests HyperCore economic events (fills, funding, transfers) with deduplication."
                  params={['wallet', 'events[]']}
                />

                <ApiEndpoint
                  method="POST"
                  path="/functions/v1/admin-recompute"
                  description="Admin endpoint to trigger full PnL recomputation for a wallet. Requires service role."
                  params={['wallet', 'force?: boolean']}
                />
              </div>
            </Section>

            <Section icon={<FileCode className="h-5 w-5 text-primary" />} title="Edge Function Template">
              <CodeBlock title="supabase/functions/example/index.ts">
{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const url = new URL(req.url);
    const wallet = url.searchParams.get("wallet");

    if (!wallet) {
      return new Response(
        JSON.stringify({ error: "wallet parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query database
    const { data, error } = await supabase
      .from("daily_pnl")
      .select("*")
      .eq("wallet_id", wallet)
      .order("day", { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});`}
              </CodeBlock>
            </Section>
          </TabsContent>

          {/* FRONTEND TAB */}
          <TabsContent value="frontend" className="space-y-8">
            <Section icon={<Layers className="h-5 w-5 text-primary" />} title="Key Components" id="components">
              <div className="grid gap-4">
                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                  <h4 className="font-medium text-foreground mb-2">Wallet Components (src/components/wallet/)</h4>
                  <p className="text-sm text-muted-foreground">Domain-aware wallet view components for unified HyperCore + HyperEVM display.</p>
                </div>
                <Definition
                  term="WalletHero"
                  description="Displays total net worth with domain breakdown (HyperCore/HyperEVM), PnL with timeframe selector (7d/30d/YTD/All), and first seen/last active timestamps."
                  badges={['Wallet', 'Hero']}
                />
                <Definition
                  term="WalletActivity"
                  description="Unified activity feed combining HyperCore events (perp fills, funding, spot transfers) and all EVM transactions (native transfers, contract calls, deploys, swaps). Supports filtering by type (all/trades/funding/transfers) and infinite scroll pagination."
                  badges={['Wallet', 'Activity', 'Infinite Scroll']}
                />
                <Definition
                  term="WalletMetrics"
                  description="Terminal-style metric cards showing 30D volume, win rate, and account age. Each metric includes domain-specific breakdowns (HC for HyperCore, EVM for HyperEVM)."
                  badges={['Wallet', 'Metrics']}
                />
                <Definition
                  term="DomainBreakdown"
                  description="Side-by-side cards for HyperCore (account value, margin used, open positions with long/short counts) and HyperEVM (native HYPE balance, ERC-20 token count)."
                  badges={['Wallet', 'Multi-domain']}
                />
                <Definition
                  term="EquityCurveChart"
                  description="Line chart showing equity over time with cumulative PnL overlay. Supports timeframe selection and brush for zooming."
                  badges={['Wallet', 'Chart']}
                />
                <Definition
                  term="WalletPositions"
                  description="Displays current open perp positions with unrealized PnL, leverage, liquidation price. Uses live-positions edge function for real-time data."
                  badges={['Wallet', 'Positions']}
                />
                <Definition
                  term="PositionHistoryTimeline"
                  description="Visual timeline of closed positions showing entry/exit points, PnL, and trade duration. Supports filtering and sorting."
                  badges={['Wallet', 'History']}
                />
                <Definition
                  term="WalletCTA"
                  description="Call-to-action component prompting users to sync wallet or view analytics. Contextual based on wallet state."
                  badges={['Wallet', 'CTA']}
                />

                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 mt-4">
                  <h4 className="font-medium text-foreground mb-2">PnL Components (src/components/pnl/)</h4>
                  <p className="text-sm text-muted-foreground">Calendar heatmap and analytics visualization components.</p>
                </div>
                <Definition
                  term="Heatmap (src/components/pnl/Heatmap.tsx)"
                  description="Calendar heatmap for daily PnL visualization. Uses color gradient from red (loss) to green (profit). Supports click to show day details."
                  badges={['PnL', 'Visualization']}
                />
                <Definition
                  term="AnalyticsSection (src/components/pnl/AnalyticsSection.tsx)"
                  description="Container for all analytics charts. Uses React Query to fetch analytics data. Includes equity curve, market direction, drawdown charts."
                  badges={['PnL', 'Charts']}
                />
                <Definition
                  term="CurrentPositions (src/components/pnl/CurrentPositions.tsx)"
                  description="Live open positions display with liquidation risk indicators. Uses live-positions edge function."
                  badges={['PnL', 'Live']}
                />

                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 mt-4">
                  <h4 className="font-medium text-foreground mb-2">Explorer Components (src/components/explorer/)</h4>
                  <p className="text-sm text-muted-foreground">Block explorer and search components.</p>
                </div>
                <Definition
                  term="WalletDetailPage (src/components/explorer/WalletDetailPage.tsx)"
                  description="Comprehensive wallet view with progressive loading. Shows L1 clearinghouse, fills, transactions; EVM balances, transactions, tokens."
                  badges={['Explorer', 'Multi-chain']}
                />
                <Definition
                  term="WhaleTracker (src/components/explorer/WhaleTracker.tsx)"
                  description="Real-time large trade monitor using WebSocket. Configurable threshold. Shows coin, side, size, price, time."
                  badges={['Explorer', 'Real-time']}
                />
                <Definition
                  term="UniversalSearch"
                  description="Search input that resolves addresses, transaction hashes, block numbers, and token symbols. Routes to appropriate detail pages."
                  badges={['Explorer', 'Search']}
                />
              </div>
            </Section>

            <Section icon={<Zap className="h-5 w-5 text-primary" />} title="Custom Hooks" id="hooks">
              <div className="grid gap-4">
                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                  <h4 className="font-medium text-foreground mb-2">Wallet Hooks</h4>
                  <p className="text-sm text-muted-foreground">Hooks for wallet data aggregation and activity feeds.</p>
                </div>
                <Definition
                  term="useWalletSync (src/hooks/useWalletSync.ts)"
                  description="Manages wallet sync lifecycle: checks if wallet exists, triggers sync if needed, tracks progress with estimated time, supports manual retry. Returns isSyncing, syncComplete, error, triggerManualSync, retrySync."
                  badges={['Wallet', 'Sync']}
                />
                <Definition
                  term="useInfiniteActivity (src/hooks/useInfiniteActivity.ts)"
                  description="Fetches unified activity from HyperCore (economic_events) and HyperEVM (addressTxs, token transfers). Supports infinite scroll with cursor-based pagination. Deduplicates and sorts by timestamp."
                  badges={['Wallet', 'Infinite Query']}
                />
                <CodeBlock title="useInfiniteActivity usage">
{`const {
  data,           // { pages: UnifiedEvent[][] }
  fetchNextPage,
  hasNextPage,
  isLoading,
  isFetchingNextPage
} = useInfiniteActivity(walletAddress);

// Flatten pages for rendering
const events = data?.pages.flatMap(p => p.events) ?? [];`}
                </CodeBlock>

                <Definition
                  term="useWalletExplorer (src/hooks/useWalletExplorer.ts)"
                  description="Aggregates wallet data from multiple sources: live trading state, activity summary (30d PnL, volume, trades), recent events, and EVM data. Returns hasHypercore, hasHyperevm flags for domain detection."
                  badges={['Wallet', 'Aggregation']}
                />

                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 mt-4">
                  <h4 className="font-medium text-foreground mb-2">PnL Hooks</h4>
                  <p className="text-sm text-muted-foreground">Hooks for calendar data and analytics.</p>
                </div>
                <Definition
                  term="usePnlData (src/hooks/usePnlData.ts)"
                  description="Main hook for PnL calendar data. Handles wallet input, sync status, data fetching via React Query. Returns calendarData, isLoading, isSyncing, refetch."
                  badges={['Core', 'React Query']}
                />
                <CodeBlock title="usePnlData usage">
{`const {
  calendarData,    // { days: DayData[], monthlyTotals: MonthlyTotal[], yearTotal: number }
  isLoading,
  isSyncing,
  syncProgress,
  refetch,
  triggerSync
} = usePnlData(walletAddress, selectedYear);`}
                </CodeBlock>

                <Definition
                  term="useAnalytics (src/hooks/useAnalytics.ts)"
                  description="Fetches computed analytics for charts. Returns summary stats, equity curve data, closed trades, market stats, drawdown events."
                  badges={['Analytics', 'React Query']}
                />

                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 mt-4">
                  <h4 className="font-medium text-foreground mb-2">Real-time Hooks</h4>
                  <p className="text-sm text-muted-foreground">WebSocket and live data hooks.</p>
                </div>
                <Definition
                  term="useHyperliquidWebSocket (src/hooks/useHyperliquidWebSocket.ts)"
                  description="Manages WebSocket connection to Hyperliquid. Supports subscriptions for allMids and trades. Auto-reconnects on disconnect."
                  badges={['Real-time', 'WebSocket']}
                />
                <CodeBlock title="useHyperliquidWebSocket usage">
{`const { 
  prices,      // Map<string, number> of current mid prices
  trades,      // Recent trades array
  isConnected,
  subscribe,   // Subscribe to coin trades
  unsubscribe
} = useHyperliquidWebSocket();

// Subscribe to BTC trades
useEffect(() => {
  subscribe('BTC');
  return () => unsubscribe('BTC');
}, []);`}
                </CodeBlock>

                <Definition
                  term="useExplorerState (src/hooks/useExplorerState.ts)"
                  description="Manages explorer page state: search query, selected chain, result type, view mode. Persists to URL params."
                  badges={['Explorer', 'State']}
                />

                <Definition
                  term="useWhaleTracking (src/hooks/useWhaleTracking.ts)"
                  description="Filters WebSocket trades by size threshold. Returns whale trades above configurable USD value."
                  badges={['Explorer', 'Filtering']}
                />

                <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 mt-4">
                  <h4 className="font-medium text-foreground mb-2">Data & Position Hooks</h4>
                  <p className="text-sm text-muted-foreground">Hooks for positions, equity, and market data.</p>
                </div>
                <Definition
                  term="useUnifiedWallet (src/hooks/useUnifiedWallet.ts)"
                  description="Main wallet hook that fetches unified wallet data from wallet-aggregator. Returns combined HyperCore + HyperEVM state."
                  badges={['Wallet', 'Aggregation']}
                />
                <Definition
                  term="useUnifiedPositions (src/hooks/useUnifiedPositions.ts)"
                  description="Fetches and aggregates all position types: perps, spot, and EVM holdings. Calculates total exposure and risk metrics."
                  badges={['Positions', 'Multi-domain']}
                />
                <Definition
                  term="usePositionHistory (src/hooks/usePositionHistory.ts)"
                  description="Fetches closed positions from closed_trades table. Supports pagination and filtering by market/timeframe."
                  badges={['Positions', 'History']}
                />
                <Definition
                  term="useEquityCurve (src/hooks/useEquityCurve.ts)"
                  description="Fetches equity curve data from equity_curve table for charting. Returns daily equity snapshots with drawdown calculations."
                  badges={['Analytics', 'Charts']}
                />
                <Definition
                  term="useMarketData (src/hooks/useMarketData.ts)"
                  description="Fetches market metadata from Hyperliquid. Returns market info, funding rates, open interest, and 24h volume."
                  badges={['Market', 'Metadata']}
                />
                <Definition
                  term="useTokenData (src/hooks/useTokenData.ts)"
                  description="Fetches spot token metadata and balances. Resolves token IDs to symbols and logos."
                  badges={['Tokens', 'Metadata']}
                />
                <Definition
                  term="useUnifiedResolver (src/hooks/useUnifiedResolver.ts)"
                  description="Resolves any input (address, tx hash, block number, token symbol) to appropriate entity type. Powers universal search."
                  badges={['Search', 'Resolution']}
                />
              </div>
            </Section>

            <Section icon={<Code className="h-5 w-5 text-primary" />} title="Utility Libraries">
              <div className="grid gap-4">
                <Definition
                  term="src/lib/hyperliquidApi.ts"
                  description="Client-side API wrapper for Hyperliquid. Functions for clearinghouse state, fills, funding, market data. All calls go through edge function proxy."
                  badges={['API', 'Client']}
                />
                <Definition
                  term="src/lib/hyperevmApi.ts"
                  description="Client-side API wrapper for HyperEVM RPC. Functions for balances, tokens, transactions (up to 100), internal transactions."
                  badges={['API', 'Client']}
                />
                <Definition
                  term="src/lib/wallet-aggregator.ts"
                  description="Unifies data from HyperCore and HyperEVM into single wallet view. Fetches clearinghouse state, EVM balances, activity stats. Caches responses for 30s."
                  badges={['Aggregation', 'Caching']}
                />
                <Definition
                  term="src/lib/format-activity.ts"
                  description="Formats activity events for display. Handles all event types including EVM transactions (HYPE_TRANSFER, CONTRACT_CALL, CONTRACT_DEPLOY, SWAP, TOKEN_TRANSFER)."
                  badges={['Formatting', 'EVM']}
                />
                <Definition
                  term="src/lib/pnlApi.ts"
                  description="API functions for PnL data. Fetches calendar data, day details, analytics from edge functions."
                  badges={['API', 'Client']}
                />
                <Definition
                  term="src/lib/symbolMapping.ts"
                  description="Maps Hyperliquid token indices to symbols and metadata. Used for display names and token resolution."
                  badges={['Utility']}
                />
                <Definition
                  term="src/lib/formatters.ts"
                  description="Number and currency formatting utilities. formatUsd(), formatNumber(), formatPercent(), formatAddress() with abbreviation support."
                  badges={['Utility', 'Formatting']}
                />
                <Definition
                  term="src/lib/position-aggregator.ts"
                  description="Aggregates position data from multiple sources. Calculates combined exposure, weighted average entry, total unrealized PnL."
                  badges={['Positions', 'Aggregation']}
                />
                <Definition
                  term="src/lib/risk-calculator.ts"
                  description="Calculates risk metrics: liquidation distance, margin ratio, effective leverage, liquidation score. Used for position health indicators."
                  badges={['Risk', 'Calculation']}
                />
                <Definition
                  term="src/lib/risk-detector.ts"
                  description="Detects risk events: approaching liquidation, high leverage, underwater positions. Triggers alerts and behavior flags."
                  badges={['Risk', 'Detection']}
                />
                <Definition
                  term="src/lib/token-aggregator.ts"
                  description="Aggregates token balances across HyperCore spot and HyperEVM ERC-20s. Calculates total value with live prices."
                  badges={['Tokens', 'Aggregation']}
                />
                <Definition
                  term="src/lib/token-resolver.ts"
                  description="Resolves token symbols to addresses and vice versa. Handles both HyperCore spot tokens and EVM ERC-20s."
                  badges={['Tokens', 'Resolution']}
                />
                <Definition
                  term="src/lib/input-resolver.ts"
                  description="Determines input type (address, tx hash, block number, token) from user search. Routes to appropriate resolver."
                  badges={['Search', 'Parsing']}
                />
              </div>
            </Section>
          </TabsContent>

          {/* REBUILD TAB */}
          <TabsContent value="rebuild" className="space-y-8">
            <Section icon={<Settings className="h-5 w-5 text-primary" />} title="Environment Setup" id="env-setup">
              <div className="grid gap-4">
                <CodeBlock title=".env (auto-generated by Supabase)">
{`# These are auto-generated - DO NOT EDIT
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=your-project-id`}
                </CodeBlock>

                <CodeBlock title="Edge Function Environment Variables">
{`# Available in Deno.env.get()
SUPABASE_URL          # Supabase project URL
SUPABASE_ANON_KEY     # Public anon key
SUPABASE_SERVICE_ROLE_KEY  # Service role key (full access)`}
                </CodeBlock>
              </div>
            </Section>

            <Section icon={<Key className="h-5 w-5 text-primary" />} title="No External API Keys Required">
              <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                <h4 className="font-medium text-foreground mb-2">All APIs are Public</h4>
                <p className="text-sm text-muted-foreground">
                  This project uses only public, unauthenticated APIs from Hyperliquid. No API keys are required for:
                  Hyperliquid Info API, L1 Explorer API, HyperEVM RPC, or WebSocket connections. 
                  All data access is public and rate-limited only by the upstream providers.
                </p>
              </div>
            </Section>

            <Section icon={<BookOpen className="h-5 w-5 text-primary" />} title="Step-by-Step Rebuild Guide" id="rebuild-steps">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 1: Initialize Project</h4>
                  <CodeBlock>
{`# Create new Lovable project or Vite + React + TypeScript project
npm create vite@latest hyperpnl -- --template react-ts
cd hyperpnl
npm install

# Install core dependencies
npm install @tanstack/react-query react-router-dom @supabase/supabase-js
npm install recharts date-fns
npm install tailwindcss postcss autoprefixer
npm install lucide-react sonner
npm install class-variance-authority clsx tailwind-merge

# Initialize Tailwind
npx tailwindcss init -p`}
                  </CodeBlock>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 2: Setup Supabase/Lovable Cloud</h4>
                  <CodeBlock>
{`# If using Lovable, Cloud is auto-configured
# If standalone Supabase:
npx supabase init
npx supabase start

# Create database tables using migrations
# See Database Schema section for full SQL

# Deploy edge functions
npx supabase functions deploy explorer-proxy
npx supabase functions deploy hyperevm-rpc
npx supabase functions deploy hyperliquid-proxy
# ... and all other functions`}
                  </CodeBlock>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 3: Create Core Files</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create the following structure. Key files to implement first:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li><code>src/integrations/supabase/client.ts</code> - Supabase client (auto-generated)</li>
                    <li><code>src/lib/utils.ts</code> - cn() helper for Tailwind class merging</li>
                    <li><code>src/lib/hyperliquidApi.ts</code> - API client for Hyperliquid</li>
                    <li><code>src/lib/hyperevmApi.ts</code> - API client for HyperEVM</li>
                    <li><code>src/lib/pnlApi.ts</code> - PnL data API client</li>
                    <li><code>src/hooks/usePnlData.ts</code> - Main data hook</li>
                    <li><code>src/hooks/useHyperliquidWebSocket.ts</code> - WebSocket hook</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 4: Implement Edge Functions</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Edge functions are the backend. Implement in this order:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li><code>hyperliquid-proxy</code> - Basic API proxy for Hyperliquid</li>
                    <li><code>explorer-proxy</code> - L1 explorer proxy</li>
                    <li><code>hyperevm-rpc</code> - EVM RPC proxy with actions</li>
                    <li><code>poll-hypercore</code> - Data ingestion from Hyperliquid</li>
                    <li><code>recompute-pnl</code> - PnL aggregation logic</li>
                    <li><code>pnl-calendar</code> - Calendar data endpoint</li>
                    <li><code>pnl-analytics</code> - Analytics data endpoint</li>
                    <li><code>live-positions</code> - Real-time positions</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 5: Build UI Components</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Start with shadcn/ui base, then custom components:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Install shadcn/ui: <code>npx shadcn-ui@latest init</code></li>
                    <li>Add base components: button, card, input, tabs, badge, dialog</li>
                    <li>Create Layout with NavBar and Footer</li>
                    <li>Build PnL page with Heatmap and AnalyticsSection</li>
                    <li>Build Explorer with search, detail pages, live feeds</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-medium text-foreground mb-2">Step 6: Wire Up Data Flow</h4>
                  <CodeBlock title="App.tsx structure">
{`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/explorer" element={<Explorer />} />
              {/* ... other routes */}
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}`}
                  </CodeBlock>
                </div>
              </div>
            </Section>

            <Section icon={<Calculator className="h-5 w-5 text-primary" />} title="Key Formulas & Logic">
              <div className="grid gap-4">
                <Definition
                  term="Closed Trade Detection"
                  formula="Position size crosses zero → trade is closed"
                  description="Track running position size per market. When fills cause size to cross from positive to negative (or vice versa), a trade has closed. Match entry fills with exit fills to calculate PnL."
                />
                <Definition
                  term="Realized PnL"
                  formula="(Exit Price - Entry Price) × Size × Direction"
                  description="Direction is +1 for long, -1 for short. Size is always positive. For partial closes, calculate proportionally."
                />
                <Definition
                  term="Net PnL"
                  formula="Realized PnL + Funding - Fees"
                  description="The true profit/loss including all costs. Funding can be positive (received) or negative (paid)."
                />
                <Definition
                  term="Cumulative PnL"
                  formula="Σ(Daily Net PnL from start to day)"
                  description="Running sum of daily PnL. Used for equity curve and drawdown calculations."
                />
                <Definition
                  term="Drawdown"
                  formula="(Peak Equity - Current Equity) / Peak Equity × 100%"
                  description="Track running peak equity. Drawdown is the percentage decline from peak. Update peak when equity exceeds previous peak."
                />
                <Definition
                  term="Win Rate"
                  formula="Winning Trades / Total Trades × 100%"
                  description="A trade is a 'win' if net_pnl > 0. Count closed trades only."
                />
                <Definition
                  term="Profit Factor"
                  formula="Gross Profit / |Gross Loss|"
                  description="Sum all positive net_pnl (gross profit), sum all negative net_pnl (gross loss). Ratio indicates overall profitability. > 1 = profitable."
                />
                <Definition
                  term="Liquidation Score"
                  formula="0.3×LevScore + 0.4×ProxScore + 0.2×MarginScore + 0.1×DDPenalty"
                  description="Composite risk score from 0-1. LevScore = effective_leverage / max_leverage. ProxScore = 1 - (distance_to_liq / entry_price). MarginScore = margin_used / account_value. DDPenalty = current position drawdown."
                />
              </div>
            </Section>

            <Section icon={<LinkIcon className="h-5 w-5 text-primary" />} title="External Resources">
              <div className="grid sm:grid-cols-2 gap-4">
                <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api" target="_blank" rel="noopener noreferrer" 
                   className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                  <h4 className="font-medium text-foreground mb-1">Hyperliquid API Docs</h4>
                  <p className="text-xs text-muted-foreground">Official API documentation</p>
                </a>
                <a href="https://explorer.hyperliquid.xyz" target="_blank" rel="noopener noreferrer"
                   className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                  <h4 className="font-medium text-foreground mb-1">Hyperliquid Explorer</h4>
                  <p className="text-xs text-muted-foreground">Official L1 block explorer</p>
                </a>
                <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer"
                   className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                  <h4 className="font-medium text-foreground mb-1">Supabase Docs</h4>
                  <p className="text-xs text-muted-foreground">Database and Edge Functions</p>
                </a>
                <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer"
                   className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                  <h4 className="font-medium text-foreground mb-1">shadcn/ui</h4>
                  <p className="text-xs text-muted-foreground">Component library</p>
                </a>
                <a href="https://recharts.org" target="_blank" rel="noopener noreferrer"
                   className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                  <h4 className="font-medium text-foreground mb-1">Recharts</h4>
                  <p className="text-xs text-muted-foreground">React charting library</p>
                </a>
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </Layout>
  );
}
