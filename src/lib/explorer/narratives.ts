import type { TransactionView, WalletView, BlockView, Episode, AssetDelta } from './types';

/**
 * Generate a human-readable narrative for a transaction
 * Answers: "What happened in this transaction?"
 */
export function generateTxNarrative(tx: Partial<TransactionView>): string {
  const { l1Action, from, to, valueNative, evmDetails, deltas = [] } = tx;
  
  // L1 (Hypercore) transactions
  if (l1Action) {
    const { type, market, size, side, price, closedPnl } = l1Action;
    
    switch (type?.toLowerCase()) {
      case 'order':
      case 'trade':
        const direction = side === 'B' || side?.toLowerCase() === 'long' ? 'bought' : 'sold';
        const pnlPart = closedPnl && parseFloat(closedPnl) !== 0
          ? `, realizing ${parseFloat(closedPnl) >= 0 ? '+' : ''}$${parseFloat(closedPnl).toFixed(2)}`
          : '';
        return `${direction} ${size || '?'} ${market || 'unknown'} at $${price || '?'}${pnlPart}`;
      
      case 'deposit':
        return `Deposited ${valueNative || '?'} USDC`;
      
      case 'withdraw':
        return `Withdrew ${valueNative || '?'} USDC`;
      
      case 'transfer':
        return to 
          ? `Transferred ${valueNative || '?'} to ${truncateAddr(to)}`
          : `Received transfer of ${valueNative || '?'}`;
      
      case 'spotswap':
      case 'swap':
        const inDelta = deltas.find(d => d.direction === 'in');
        const outDelta = deltas.find(d => d.direction === 'out');
        if (inDelta && outDelta) {
          return `Swapped ${Math.abs(parseFloat(outDelta.delta)).toFixed(4)} ${outDelta.symbol} for ${parseFloat(inDelta.delta).toFixed(4)} ${inDelta.symbol}`;
        }
        return 'Executed spot swap';
      
      case 'liquidation':
        return `Position liquidated on ${market || 'unknown market'}`;
      
      case 'funding':
        return `Received funding payment of ${valueNative || '?'}`;
      
      default:
        return l1Action.type ? `Executed ${l1Action.type}` : 'L1 action executed';
    }
  }
  
  // EVM transactions
  if (evmDetails) {
    const { input, contractAddress, logs = [] } = evmDetails;
    
    // Contract creation
    if (contractAddress) {
      return `Deployed contract at ${truncateAddr(contractAddress)}`;
    }
    
    // Native transfer
    if ((!input || input === '0x') && valueNative && parseFloat(valueNative) > 0) {
      return to 
        ? `Sent ${valueNative} HYPE to ${truncateAddr(to)}`
        : `Received ${valueNative} HYPE`;
    }
    
    // Token transfer (check logs for Transfer events)
    const transferLog = logs.find((l: any) => 
      l.topics?.[0]?.startsWith('0xddf252ad') // Transfer event signature
    );
    if (transferLog) {
      // This is a token transfer
      return to
        ? `Token transfer to ${truncateAddr(to)}`
        : 'Token transfer executed';
    }
    
    // Generic contract interaction
    if (input && input !== '0x' && to) {
      const methodId = input.slice(0, 10);
      return `Called contract ${truncateAddr(to)} (method: ${methodId})`;
    }
    
    return 'EVM transaction executed';
  }
  
  // Fallback
  if (to && valueNative) {
    return `Transferred ${valueNative} to ${truncateAddr(to)}`;
  }
  
  return 'Transaction executed';
}

/**
 * Generate action type label from transaction
 */
export function getActionType(tx: Partial<TransactionView>): string {
  const { l1Action, evmDetails, to, valueNative } = tx;
  
  if (l1Action?.type) {
    const typeMap: Record<string, string> = {
      'order': 'Trade',
      'trade': 'Trade',
      'deposit': 'Deposit',
      'withdraw': 'Withdrawal',
      'transfer': 'Transfer',
      'spotswap': 'Swap',
      'swap': 'Swap',
      'liquidation': 'Liquidation',
      'funding': 'Funding',
    };
    return typeMap[l1Action.type.toLowerCase()] || l1Action.type;
  }
  
  if (evmDetails?.contractAddress) {
    return 'Contract Deploy';
  }
  
  if (evmDetails?.input && evmDetails.input !== '0x' && to) {
    return 'Contract Call';
  }
  
  if (valueNative && parseFloat(valueNative) > 0) {
    return 'Transfer';
  }
  
  return 'Transaction';
}

/**
 * Generate narrative for a block
 */
export function generateBlockNarrative(block: Partial<BlockView>): string {
  const { txCount = 0, chain, highlights = [] } = block;
  
  if (txCount === 0) {
    return 'Empty block with no transactions';
  }
  
  const chainLabel = chain === 'hypercore' ? 'L1' : chain === 'hyperevm' ? 'EVM' : '';
  
  if (highlights.length > 0) {
    return `${chainLabel} block with ${txCount} txs including ${highlights[0]}`;
  }
  
  return `${chainLabel} block containing ${txCount} transaction${txCount !== 1 ? 's' : ''}`;
}

/**
 * Generate risk narrative for a wallet
 */
export function generateWalletRiskNarrative(wallet: Partial<WalletView>): string {
  const { riskLevel, riskFactors = [], liquidationProximity, maxLeverage } = wallet;
  
  if (riskLevel === 'critical') {
    return `⚠️ Critical risk: ${riskFactors[0] || 'High exposure detected'}`;
  }
  
  if (riskLevel === 'high') {
    const liqPart = liquidationProximity && liquidationProximity < 10 
      ? `${liquidationProximity.toFixed(1)}% from liquidation` 
      : '';
    const levPart = maxLeverage && maxLeverage > 20 
      ? `${maxLeverage.toFixed(1)}x leverage` 
      : '';
    return `High risk: ${[liqPart, levPart].filter(Boolean).join(', ') || riskFactors[0] || 'Elevated exposure'}`;
  }
  
  if (riskLevel === 'medium') {
    return 'Moderate risk profile';
  }
  
  return 'Low risk profile';
}

/**
 * Generate narrative for an episode (grouped actions)
 */
export function generateEpisodeNarrative(episode: Episode): string {
  const { type, deltas = [], summary } = episode;
  
  if (summary) return summary;
  
  const deltaSummary = deltas.length > 0
    ? deltas.map(d => `${d.direction === 'in' ? '+' : '-'}${Math.abs(parseFloat(d.delta)).toFixed(2)} ${d.symbol}`).join(', ')
    : '';
  
  switch (type) {
    case 'trade':
      return deltaSummary ? `Trade: ${deltaSummary}` : 'Executed trade';
    case 'transfer':
      return deltaSummary ? `Transfer: ${deltaSummary}` : 'Transfer completed';
    case 'swap':
      return deltaSummary ? `Swap: ${deltaSummary}` : 'Swap executed';
    case 'funding':
      return deltaSummary ? `Funding: ${deltaSummary}` : 'Funding received';
    case 'liquidation':
      return 'Position liquidated';
    case 'deposit':
      return deltaSummary ? `Deposit: ${deltaSummary}` : 'Deposit completed';
    case 'withdrawal':
      return deltaSummary ? `Withdrawal: ${deltaSummary}` : 'Withdrawal completed';
    case 'contract_interaction':
      return 'Contract interaction';
    default:
      return 'Action completed';
  }
}

/**
 * Format delta for display
 */
export function formatDelta(delta: AssetDelta): string {
  const value = parseFloat(delta.delta);
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  
  // Format based on magnitude
  let formatted: string;
  if (absValue >= 1000000) {
    formatted = `${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    formatted = `${(absValue / 1000).toFixed(2)}K`;
  } else if (absValue >= 1) {
    formatted = absValue.toFixed(2);
  } else if (absValue >= 0.0001) {
    formatted = absValue.toFixed(4);
  } else {
    formatted = absValue.toFixed(8);
  }
  
  return `${sign}${formatted} ${delta.symbol}`;
}

// Helper
function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr || 'unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
