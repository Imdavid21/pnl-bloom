import { User, Code, Copy, Check, ExternalLink, Shield, AlertTriangle, TrendingUp, TrendingDown, Wallet, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProvenanceIndicator } from './ProvenanceIndicator';
import type { Provenance } from '@/lib/explorer/types';

interface WalletSummaryHeroProps {
  address: string;
  isContract: boolean;
  accountValue: string;
  evmBalance: string;
  openPositions: number;
  pnl24h?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  maxLeverage?: number;
  liquidationProximity?: number;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  provenance?: Provenance;
}

export function WalletSummaryHero({
  address,
  isContract,
  accountValue,
  evmBalance,
  openPositions,
  pnl24h,
  riskLevel,
  riskFactors,
  maxLeverage,
  liquidationProximity,
  onCopy,
  copiedId,
  provenance,
}: WalletSummaryHeroProps) {
  const truncateHash = (h: string) => h.length > 14 ? `${h.slice(0, 6)}...${h.slice(-4)}` : h;
  const verifyUrl = `https://app.hyperliquid.xyz/explorer/address/${address}`;
  const purrsecUrl = `https://purrsec.com/address/${address}`;

  const totalValue = parseFloat(accountValue) + parseFloat(evmBalance || '0');
  const hasPnl = pnl24h !== undefined && pnl24h !== 0;

  const riskConfig = {
    low: { color: 'text-profit-3', bg: 'bg-profit-3/10', icon: Shield, label: 'Low Risk' },
    medium: { color: 'text-warning', bg: 'bg-warning/10', icon: Shield, label: 'Medium Risk' },
    high: { color: 'text-loss-3', bg: 'bg-loss-3/10', icon: AlertTriangle, label: 'High Risk' },
    critical: { color: 'text-loss-4', bg: 'bg-loss-4/10', icon: AlertTriangle, label: 'Critical' },
  };

  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            {isContract ? (
              <Code className="h-7 w-7 text-primary" />
            ) : (
              <User className="h-7 w-7 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold font-mono text-foreground">{truncateHash(address)}</h1>
              <button 
                onClick={() => onCopy(address, 'address-hero')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedId === 'address-hero' ? <Check className="h-4 w-4 text-profit-3" /> : <Copy className="h-4 w-4" />}
              </button>
              {isContract && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-info/20 text-info">
                  Contract
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <a 
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Hyperliquid <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-muted-foreground/30">•</span>
              <a 
                href={purrsecUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Purrsec <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Risk Badge */}
        {riskLevel !== 'low' && (
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", risk.bg)}>
            <RiskIcon className={cn("h-4 w-4", risk.color)} />
            <span className={cn("text-sm font-medium", risk.color)}>{risk.label}</span>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Value */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Value</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          {hasPnl && (
            <p className={cn(
              "text-xs mt-1 flex items-center gap-1",
              pnl24h >= 0 ? "text-profit-3" : "text-loss-3"
            )}>
              {pnl24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {pnl24h >= 0 ? '+' : ''}{pnl24h.toFixed(2)} (24h)
            </p>
          )}
        </div>

        {/* Hypercore Balance */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Hypercore</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            ${parseFloat(accountValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {openPositions} position{openPositions !== 1 ? 's' : ''} open
          </p>
        </div>

        {/* HyperEVM Balance */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">HyperEVM</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {parseFloat(evmBalance || '0').toFixed(4)} HYPE
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Native balance
          </p>
        </div>

        {/* Risk Snapshot */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Risk</span>
          </div>
          {maxLeverage !== undefined && maxLeverage > 0 ? (
            <>
              <p className="text-xl font-bold text-foreground">
                {maxLeverage.toFixed(1)}x
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max leverage
              </p>
            </>
          ) : liquidationProximity !== undefined ? (
            <>
              <p className={cn(
                "text-xl font-bold",
                liquidationProximity < 10 ? "text-loss-3" : liquidationProximity < 25 ? "text-warning" : "text-foreground"
              )}>
                {liquidationProximity.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                To liquidation
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-profit-3">Safe</p>
              <p className="text-xs text-muted-foreground mt-1">
                No positions at risk
              </p>
            </>
          )}
        </div>
      </div>

      {/* Risk Factors (if any) */}
      {riskFactors.length > 0 && (
        <div className="p-3 rounded-lg bg-loss-3/5 border border-loss-3/20 mb-4">
          <p className="text-xs text-loss-3 font-medium mb-1">Risk Factors:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {riskFactors.slice(0, 3).map((factor, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-loss-3" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance */}
      {provenance && (
        <div className="pt-4 border-t border-border/50">
          <ProvenanceIndicator provenance={provenance} />
        </div>
      )}
    </div>
  );
}
