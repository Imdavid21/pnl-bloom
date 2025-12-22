import { ArrowLeft, BookOpen, Calculator, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DarkModeToggle } from '@/components/DarkModeToggle';

interface DefinitionProps {
  term: string;
  formula?: string;
  description: string;
  example?: string;
}

function Definition({ term, formula, description, example }: DefinitionProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <h3 className="font-medium text-foreground mb-2">{term}</h3>
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

export default function LogicPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Logic & Definitions</h1>
              <p className="text-sm text-muted-foreground">
                All calculations and metrics used throughout HyperPNL
              </p>
            </div>
          </div>
          <DarkModeToggle />
        </div>

        {/* Trade Metrics */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Trade Metrics</h2>
          </div>
          <div className="grid gap-4">
            <Definition
              term="Closed Trade"
              description="A completed round-trip position. Opens when you enter a position and closes when you fully exit. Multiple fills can comprise a single trade."
              example="Buy 1 ETH at $3000 → Sell 1 ETH at $3100 = 1 closed trade with $100 PnL"
            />
            <Definition
              term="Fill"
              description="A single execution/transaction on the exchange. One trade may consist of multiple fills (partial executions)."
              example="Your 10 ETH order might fill as 3 ETH + 4 ETH + 3 ETH = 3 fills, 1 trade"
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
              description="Periodic payments between long and short traders to keep perp prices aligned with spot. Positive = received, Negative = paid."
            />
            <Definition
              term="Win Rate"
              formula="(Profitable Trades / Total Trades) × 100%"
              description="Percentage of trades that resulted in positive net PnL."
            />
          </div>
        </section>

        {/* Position Metrics */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Position Metrics</h2>
          </div>
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
          </div>
        </section>

        {/* Risk Metrics */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Risk Metrics</h2>
          </div>
          <div className="grid gap-4">
            <Definition
              term="Liquidation Price"
              description="The price at which your position will be forcibly closed due to insufficient margin. Varies based on leverage and maintenance margin requirements."
            />
            <Definition
              term="Liquidation Score"
              formula="Weighted: 0.3×Leverage + 0.4×LiqProximity + 0.2×MarginUtil + 0.1×DrawdownPenalty"
              description="A 0-1 score indicating how close a position is to liquidation. Higher = more dangerous."
            />
            <Definition
              term="Drawdown"
              formula="(Peak Equity - Current Equity) / Peak Equity × 100%"
              description="Maximum percentage decline from the highest equity point."
            />
            <Definition
              term="Loss Percentage"
              formula="abs(min(0, Net PnL)) / Notional Value × 100%"
              description="For losing trades, the loss as a percentage of position size. Used in Liquidation Proximity chart."
            />
          </div>
        </section>

        {/* Volume & Aggregates */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Volume & Aggregates</h2>
          </div>
          <div className="grid gap-4">
            <Definition
              term="Volume"
              formula="Σ(abs(Size) × Execution Price)"
              description="Sum of all fill notional values. Measures total trading activity."
            />
            <Definition
              term="Profit Factor"
              formula="Total Profit / abs(Total Loss)"
              description="Ratio of gross profit to gross loss. Above 1.0 = profitable system."
              example="$10,000 profit and $5,000 loss = 2.0 profit factor"
            />
            <Definition
              term="Average Win / Average Loss"
              description="Mean PnL of winning trades vs losing trades. Used to assess risk/reward ratio."
            />
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Data Sources</h2>
          </div>
          <div className="grid gap-4">
            <Definition
              term="daily_pnl table"
              description="Aggregated daily metrics: closed PnL, funding, fees, trade count (fills). Updated after each sync."
            />
            <Definition
              term="closed_trades table"
              description="Individual round-trip trades with entry/exit prices, times, PnL. Computed from fills by matching opens to closes."
            />
            <Definition
              term="economic_events table"
              description="Raw events: PERP_FILL, PERP_FUNDING, etc. The source of truth for all calculations."
            />
            <Definition
              term="equity_curve table"
              description="Daily equity snapshots with cumulative PnL, drawdown, and peak tracking."
            />
          </div>
        </section>

        {/* Chart Explanations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Chart Definitions</h2>
          </div>
          <div className="grid gap-4">
            <Definition
              term="Liquidation Proximity Chart"
              description="Scatter plot showing each closed trade's loss percentage (Y-axis) over time (X-axis). Helps identify high-risk trades and patterns."
            />
            <Definition
              term="Funding vs Trading Chart"
              description="Area chart comparing cumulative trading PnL to cumulative funding PnL over time."
            />
            <Definition
              term="Market Direction Chart"
              description="Breakdown of PnL by market and direction (long vs short). Helps identify your strongest markets."
            />
            <Definition
              term="Trade Size vs Leverage"
              description="Analyzes relationship between position sizing and leverage usage across markets."
            />
          </div>
        </section>
      </div>
    </div>
  );
}