import { User, Code, Copy, Check, ExternalLink, Shield, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
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
    low: { color: 'text-profit-3', label: 'Low Risk' },
    medium: { color: 'text-warning', label: 'Medium Risk' },
    high: { color: 'text-loss-3', label: 'High Risk' },
    critical: { color: 'text-loss-4', label: 'Critical' },
  };

  const risk = riskConfig[riskLevel];

  return (
    <div className="border border-border rounded bg-card mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
            {isContract ? (
              <Code className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-foreground">{truncateHash(address)}</span>
              <button 
                onClick={() => onCopy(address, 'address-hero')}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {copiedId === 'address-hero' ? <Check className="h-3.5 w-3.5 text-profit-3" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {isContract && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-info/20 text-info">
                  Contract
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <a 
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors duration-150"
              >
                Hyperliquid <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span>·</span>
              <a 
                href={purrsecUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors duration-150"
              >
                Purrsec <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Risk indicator - inline, not badge */}
        {riskLevel !== 'low' && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={cn("h-3.5 w-3.5", risk.color)} />
            <span className={cn("text-xs font-medium", risk.color)}>{risk.label}</span>
          </div>
        )}
      </div>

      {/* Data rows */}
      <div className="divide-y divide-border">
        {/* Total Value */}
        <div className="flex items-baseline justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Total Value</span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold font-mono tabular-nums text-foreground">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            {hasPnl && (
              <span className={cn(
                "text-[11px] font-medium tabular-nums flex items-center gap-0.5",
                pnl24h >= 0 ? "text-profit-3" : "text-loss-3"
              )}>
                {pnl24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {pnl24h >= 0 ? '+' : ''}{pnl24h.toFixed(2)} 24h
              </span>
            )}
          </div>
        </div>

        {/* Hypercore Balance */}
        <div className="flex items-baseline justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Hypercore</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium font-mono tabular-nums text-foreground">
              ${parseFloat(accountValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {openPositions} position{openPositions !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* HyperEVM Balance */}
        <div className="flex items-baseline justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">HyperEVM</span>
          <span className="text-sm font-medium font-mono tabular-nums text-foreground">
            {parseFloat(evmBalance || '0').toFixed(4)} HYPE
          </span>
        </div>

        {/* Risk */}
        <div className="flex items-baseline justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Risk</span>
          {maxLeverage !== undefined && maxLeverage > 0 ? (
            <span className="text-sm font-medium font-mono tabular-nums text-foreground">
              {maxLeverage.toFixed(1)}x max leverage
            </span>
          ) : liquidationProximity !== undefined ? (
            <span className={cn(
              "text-sm font-medium font-mono tabular-nums",
              liquidationProximity < 10 ? "text-loss-3" : liquidationProximity < 25 ? "text-warning" : "text-foreground"
            )}>
              {liquidationProximity.toFixed(1)}% to liquidation
            </span>
          ) : (
            <span className="text-sm font-medium text-profit-3">Safe</span>
          )}
        </div>
      </div>

      {/* Risk Factors - expandable section would go here */}
      {riskFactors.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-loss-3/5">
          <p className="text-[11px] text-loss-3 font-medium mb-1">Risk Factors</p>
          <ul className="text-[11px] text-muted-foreground space-y-0.5">
            {riskFactors.slice(0, 3).map((factor, i) => (
              <li key={i}>· {factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance */}
      {provenance && (
        <div className="px-4 py-3 border-t border-border">
          <ProvenanceIndicator provenance={provenance} />
        </div>
      )}
    </div>
  );
}
