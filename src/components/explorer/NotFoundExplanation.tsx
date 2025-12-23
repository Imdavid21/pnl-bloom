import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { classifyInput, type InputType } from '@/lib/explorer/searchResolver';

interface NotFoundExplanationProps {
  query: string;
  entityType: 'tx' | 'block' | 'wallet' | 'token';
  attemptedSources: string[];
  className?: string;
}

function getInputTypeLabel(inputType: InputType): string {
  switch (inputType) {
    case 'evm_tx_hash':
      return 'transaction hash';
    case 'address':
      return 'wallet address';
    case 'block_number':
      return 'block number';
    case 'token_id':
      return 'token ID';
    case 'token_name':
      return 'token name';
    default:
      return 'identifier';
  }
}

function getNotFoundReasons(entityType: string, inputType: InputType): string[] {
  const reasons: string[] = [];
  
  if (entityType === 'tx') {
    reasons.push('The transaction may still be pending or not yet indexed');
    reasons.push('The transaction hash may be from a different network');
    reasons.push('There may have been a recent chain reorganization');
  } else if (entityType === 'block') {
    reasons.push('The block may not exist yet (future block number)');
    reasons.push('Block indexing may be temporarily delayed');
  } else if (entityType === 'wallet') {
    reasons.push('The address may have no on-chain activity yet');
    reasons.push('Data indexing may be in progress');
  } else if (entityType === 'token') {
    reasons.push('The token may not be listed on Hyperliquid');
    reasons.push('The search term may not match any token symbol or name');
  }
  
  return reasons;
}

export function NotFoundExplanation({ 
  query, 
  entityType, 
  attemptedSources,
  className 
}: NotFoundExplanationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const inputType = classifyInput(query);
  const inputLabel = getInputTypeLabel(inputType);
  const reasons = getNotFoundReasons(entityType, inputType);
  
  const truncatedQuery = query.length > 20 
    ? `${query.slice(0, 10)}...${query.slice(-8)}` 
    : query;
  
  return (
    <div className={cn("max-w-lg mx-auto text-center py-12", className)}>
      {/* Icon */}
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted/50 mb-6">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      </div>
      
      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {entityType === 'tx' ? 'Transaction' : 
         entityType === 'block' ? 'Block' : 
         entityType === 'wallet' ? 'Wallet' : 'Token'} not found
      </h2>
      
      {/* Main explanation */}
      <p className="text-muted-foreground mb-6">
        We checked both HyperEVM and Hypercore.
        <br />
        This {inputLabel} does not match any known {entityType} on either domain.
      </p>
      
      {/* Query display */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/50 mb-6">
        <span className="text-xs text-muted-foreground">Searched:</span>
        <code className="font-mono text-sm text-foreground">{truncatedQuery}</code>
      </div>
      
      {/* Collapsible details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        <span>{showDetails ? 'Hide details' : 'Why might this happen?'}</span>
        {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {showDetails && (
        <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border/30 text-left">
          {/* What was checked */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Sources checked
            </h4>
            <div className="flex flex-wrap gap-2">
              {attemptedSources.map(source => (
                <span 
                  key={source}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    source === 'hyperevm' 
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-primary/20 text-primary"
                  )}
                >
                  {source === 'hyperevm' ? 'HyperEVM' : 'Hypercore'}
                </span>
              ))}
            </div>
          </div>
          
          {/* Possible reasons */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Possible reasons
            </h4>
            <ul className="space-y-1.5">
              {reasons.map((reason, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
