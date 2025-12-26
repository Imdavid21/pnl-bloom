/**
 * Activity Event Formatter
 * Converts raw events into human-readable descriptions
 */

// ============ TYPES ============

export type EventType = 
  | 'PERP_FILL' 
  | 'PERP_FUNDING' 
  | 'PERP_FEE' 
  | 'SPOT_BUY'
  | 'SPOT_SELL'
  | 'SPOT_TRANSFER_IN'
  | 'SPOT_TRANSFER_OUT'
  | 'ERC20_TRANSFER_IN'
  | 'ERC20_TRANSFER_OUT'
  | 'SWAP'
  | 'LENDING_DEPOSIT'
  | 'LENDING_WITHDRAW'
  | 'BORROW'
  | 'REPAY'
  | 'UNKNOWN';

export type BadgeVariant = 'trade' | 'funding' | 'fee' | 'transfer' | 'swap' | 'lending';

export interface UnifiedEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  domain: 'hypercore' | 'hyperevm';
  description: string;
  descriptionParts: Array<{ text: string; bold?: boolean }>;
  valueUsd: number;
  isPnl: boolean;
  isPositive: boolean;
  link: string;
  badge: {
    label: string;
    variant: BadgeVariant;
  };
  raw?: any;
}

// ============ FORMATTERS ============

export function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(decimals);
}

export function formatUsdValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============ BADGE MAPPING ============

export function getBadgeInfo(type: EventType): { label: string; variant: BadgeVariant } {
  switch (type) {
    case 'PERP_FILL':
    case 'SPOT_BUY':
    case 'SPOT_SELL':
      return { label: 'Trade', variant: 'trade' };
    case 'PERP_FUNDING':
      return { label: 'Funding', variant: 'funding' };
    case 'PERP_FEE':
      return { label: 'Fee', variant: 'fee' };
    case 'SPOT_TRANSFER_IN':
    case 'SPOT_TRANSFER_OUT':
    case 'ERC20_TRANSFER_IN':
    case 'ERC20_TRANSFER_OUT':
      return { label: 'Transfer', variant: 'transfer' };
    case 'SWAP':
      return { label: 'Swap', variant: 'swap' };
    case 'LENDING_DEPOSIT':
      return { label: 'Deposit', variant: 'lending' };
    case 'LENDING_WITHDRAW':
      return { label: 'Withdraw', variant: 'lending' };
    case 'BORROW':
      return { label: 'Borrow', variant: 'lending' };
    case 'REPAY':
      return { label: 'Repay', variant: 'lending' };
    default:
      return { label: 'Event', variant: 'fee' };
  }
}

// ============ DESCRIPTION FORMATTERS ============

interface DescriptionPart {
  text: string;
  bold?: boolean;
}

function createParts(...parts: (string | { text: string; bold: boolean })[]): DescriptionPart[] {
  return parts.map(p => typeof p === 'string' ? { text: p } : p);
}

function b(text: string): { text: string; bold: boolean } {
  return { text, bold: true };
}

export function formatHypercoreEvent(event: any, walletAddress: string): UnifiedEvent {
  const timestamp = new Date(event.ts);
  const type = event.event_type as EventType;
  const badge = getBadgeInfo(type);
  
  let description = '';
  let descriptionParts: DescriptionPart[] = [];
  let valueUsd = 0;
  let isPnl = false;
  let isPositive = false;
  
  switch (type) {
    case 'PERP_FILL': {
      const size = Math.abs(Number(event.size || 0));
      const market = event.market || 'Unknown';
      const side = event.side === 'long' ? 'long' : 'short';
      const price = Number(event.exec_price || 0);
      const pnl = Number(event.realized_pnl_usd || 0);
      const volume = Number(event.volume_usd || 0);
      
      if (pnl !== 0) {
        // Closing trade
        isPnl = true;
        isPositive = pnl > 0;
        valueUsd = pnl;
        const pnlStr = pnl > 0 ? `+${formatUsdValue(pnl)}` : formatUsdValue(pnl);
        description = `Closed ${size} ${market} ${side} for ${pnlStr} PnL`;
        descriptionParts = createParts(
          'Closed ',
          b(`${size} ${market}`),
          ` ${side} for `,
          b(pnlStr),
          ' PnL'
        );
      } else {
        // Opening trade
        valueUsd = volume || size * price;
        description = `Opened ${size} ${market} ${side} at $${formatNumber(price)}`;
        descriptionParts = createParts(
          'Opened ',
          b(`${size} ${market}`),
          ` ${side} at `,
          b(`$${formatNumber(price)}`)
        );
      }
      break;
    }
    
    case 'PERP_FUNDING': {
      const funding = Number(event.funding_usd || 0);
      const market = event.market || 'position';
      isPnl = true;
      isPositive = funding > 0;
      valueUsd = Math.abs(funding);
      
      const action = funding > 0 ? 'Received' : 'Paid';
      description = `${action} $${formatNumber(Math.abs(funding))} funding on ${market}`;
      descriptionParts = createParts(
        action,
        ' ',
        b(`$${formatNumber(Math.abs(funding))}`),
        ` funding on ${market}`
      );
      break;
    }
    
    case 'PERP_FEE': {
      const fee = Math.abs(Number(event.fee_usd || 0));
      valueUsd = fee;
      description = `Trading fee: $${formatNumber(fee)}`;
      descriptionParts = createParts('Trading fee: ', b(`$${formatNumber(fee)}`));
      break;
    }
    
    case 'SPOT_BUY': {
      const qty = Number(event.qty || 0);
      const asset = event.asset || 'tokens';
      const value = Number(event.usd_value || 0);
      valueUsd = value;
      description = `Bought ${formatNumber(qty)} ${asset}`;
      descriptionParts = createParts('Bought ', b(`${formatNumber(qty)} ${asset}`));
      break;
    }
    
    case 'SPOT_SELL': {
      const qty = Number(event.qty || 0);
      const asset = event.asset || 'tokens';
      const value = Number(event.usd_value || 0);
      valueUsd = value;
      description = `Sold ${formatNumber(qty)} ${asset}`;
      descriptionParts = createParts('Sold ', b(`${formatNumber(qty)} ${asset}`));
      break;
    }
    
    case 'SPOT_TRANSFER_IN': {
      const qty = Number(event.qty || 0);
      const asset = event.asset || 'tokens';
      const value = Number(event.usd_value || 0);
      valueUsd = value;
      description = `Received ${formatNumber(qty)} ${asset}`;
      descriptionParts = createParts('Received ', b(`${formatNumber(qty)} ${asset}`));
      break;
    }
    
    case 'SPOT_TRANSFER_OUT': {
      const qty = Number(event.qty || 0);
      const asset = event.asset || 'tokens';
      const value = Number(event.usd_value || 0);
      valueUsd = value;
      description = `Sent ${formatNumber(qty)} ${asset}`;
      descriptionParts = createParts('Sent ', b(`${formatNumber(qty)} ${asset}`));
      break;
    }
    
    default: {
      description = `${type.replace(/_/g, ' ').toLowerCase()} event`;
      descriptionParts = [{ text: description }];
      valueUsd = Number(event.usd_value || event.volume_usd || 0);
    }
  }
  
  return {
    id: event.id,
    timestamp,
    type,
    domain: 'hypercore',
    description,
    descriptionParts,
    valueUsd,
    isPnl,
    isPositive,
    link: `/trade/${event.id}`,
    badge,
    raw: event,
  };
}

export function formatHyperevmEvent(tx: any, walletAddress: string): UnifiedEvent {
  const timestamp = new Date(tx.timestamp * 1000);
  const isIncoming = tx.to?.toLowerCase() === walletAddress.toLowerCase();
  const value = Number(tx.valueEth || 0);
  const valueUsd = value * 2000; // TODO: Use actual ETH price
  
  // Default to transfer for native transactions
  let type: EventType = isIncoming ? 'ERC20_TRANSFER_IN' : 'ERC20_TRANSFER_OUT';
  let description = '';
  let descriptionParts: DescriptionPart[] = [];
  
  if (isIncoming) {
    description = `Received ${formatNumber(value, 4)} ETH`;
    descriptionParts = createParts('Received ', b(`${formatNumber(value, 4)} ETH`));
  } else {
    const recipient = shortenAddress(tx.to || '');
    description = `Sent ${formatNumber(value, 4)} ETH to ${recipient}`;
    descriptionParts = createParts(
      'Sent ',
      b(`${formatNumber(value, 4)} ETH`),
      ` to ${recipient}`
    );
  }
  
  return {
    id: tx.hash,
    timestamp,
    type,
    domain: 'hyperevm',
    description,
    descriptionParts,
    valueUsd,
    isPnl: false,
    isPositive: false,
    link: `/tx/${tx.hash}`,
    badge: getBadgeInfo(type),
    raw: tx,
  };
}
