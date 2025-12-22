import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { DailyPnl } from "@/data/mockPnlData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { usePnlDayDetails } from "@/hooks/usePnlData";
import { getSymbol } from "@/lib/symbolMapping";

interface DayDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  data?: DailyPnl;
  isMobile?: boolean;
  wallet?: string | null;
  tz?: "utc" | "local";
}

type TabType = "perps" | "funding";

export function DayDetailDrawer({
  isOpen,
  onClose,
  date,
  data,
  isMobile = false,
  wallet = null,
  tz = "local",
}: DayDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("perps");

  const { data: details, isLoading, error } = usePnlDayDetails(
    wallet,
    isOpen && date ? date : null,
    tz
  );

  const perpsFills = details?.perps_fills ?? [];
  const funding = details?.funding ?? [];

  const formatValue = (val: number, prefix = "$") => {
    const formatted = Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = val >= 0 ? "+" : "-";
    return `${sign}${prefix}${formatted}`;
  };

  const containerClasses = isMobile
    ? "fixed inset-x-0 bottom-0 z-50 h-[70vh] animate-slide-in-bottom rounded-t-2xl border-t border-border bg-card shadow-xl"
    : "fixed inset-y-0 right-0 z-50 w-[420px] animate-slide-in-right border-l border-border bg-card shadow-xl";

  const tabs: { id: TabType; label: string }[] = [
    { id: "perps", label: "Perps" },
    { id: "funding", label: "Funding" },
  ];

  const headerSub = useMemo(() => {
    if (!wallet) return "Connect a wallet to see trades";
    if (isLoading) return "Loading day details…";
    if (error) return "Failed to load day details";

    const eventCount = details?.meta?.events_count;
    if (typeof eventCount === "number") return `${eventCount} events`;

    return "";
  }, [wallet, isLoading, error, details?.meta?.events_count]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={containerClasses}>
        {/* Handle for mobile */}
        {isMobile && (
          <div className="flex justify-center py-2">
            <div className="h-1 w-12 rounded-full bg-muted" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {format(new Date(date), "MMMM d, yyyy")}
            </h3>
            <div className="mt-1 space-y-0.5">
              {data && (() => {
                const realizedPnl = (data.perps_pnl || 0) - (data.fees || 0);
                const funding = data.funding || 0;
                const totalPnl = realizedPnl + funding;
                
                return (
                  <>
                    <p className={cn("font-mono text-sm", totalPnl >= 0 ? "text-profit" : "text-loss")}>
                      {formatValue(totalPnl)} Total
                    </p>
                    <div className="flex gap-3 text-xs font-mono text-muted-foreground">
                      <span className={realizedPnl >= 0 ? "text-profit/70" : "text-loss/70"}>
                        {formatValue(realizedPnl)} Realized
                      </span>
                      <span className={funding >= 0 ? "text-profit/70" : "text-loss/70"}>
                        {formatValue(funding)} Funding
                      </span>
                    </div>
                  </>
                );
              })()}
              <p className="text-xs text-muted-foreground">{headerSub}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {!wallet ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Connect a wallet to view perps fills and funding for this day.
            </p>
          ) : activeTab === "perps" ? (
            <PerpsFillsTable fills={perpsFills} isLoading={isLoading} />
          ) : (
            <FundingTable payments={funding} isLoading={isLoading} />
          )}
        </div>
      </div>
    </>
  );
}

function PerpsFillsTable({
  fills,
  isLoading,
}: {
  fills: {
    id: string;
    timestamp: string;
    market: string;
    side: string;
    size: number;
    exec_price: number;
    realized_pnl: number;
    fee: number;
  }[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (fills.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No perps fills</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 font-medium">Time</th>
            <th className="pb-2 font-medium">Symbol</th>
            <th className="pb-2 font-medium">Side</th>
            <th className="pb-2 font-medium text-right">Size</th>
            <th className="pb-2 font-medium text-right">PnL</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((fill) => {
            const t = new Date(fill.timestamp);
            const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isLong = String(fill.side).toLowerCase() === "long";

            return (
              <tr key={fill.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 font-mono text-muted-foreground">{time}</td>
                <td className="py-2 font-medium">{getSymbol(fill.market)}</td>
                <td
                  className={cn(
                    "py-2 font-medium uppercase",
                    isLong ? "text-profit" : "text-loss"
                  )}
                >
                  {isLong ? "LONG" : "SHORT"}
                </td>
                <td className="py-2 text-right font-mono">
                  {fill.size.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-mono font-medium",
                    fill.realized_pnl >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {fill.realized_pnl >= 0 ? "+" : ""}
                  {fill.realized_pnl.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FundingTable({
  payments,
  isLoading,
}: {
  payments: { id: string; timestamp: string; type: string; market: string; amount: number }[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No funding events</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 font-medium">Time</th>
            <th className="pb-2 font-medium">Market</th>
            <th className="pb-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const t = new Date(p.timestamp);
            const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <tr key={p.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 font-mono text-muted-foreground">{time}</td>
                <td className="py-2 font-medium">{getSymbol(p.market)}</td>
                <td
                  className={cn(
                    "py-2 text-right font-mono font-medium",
                    p.amount >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {p.amount >= 0 ? "+" : ""}
                  {p.amount.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
