import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Zap } from 'lucide-react';

interface RecentEvent {
  id: string;
  eventType: string;
  ts: string;
  market: string | null;
  side: string | null;
  size: number | null;
  execPrice: number | null;
  realizedPnlUsd: number | null;
  feeUsd: number | null;
  fundingUsd: number | null;
  volumeUsd: number | null;
}

interface RecentEventsTableProps {
  events: RecentEvent[];
  isLoading?: boolean;
  onEventClick?: (event: RecentEvent) => void;
}

function getEventBadgeStyle(eventType: string) {
  switch (eventType) {
    case 'PERP_FILL':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'PERP_FUNDING':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'PERP_FEE':
      return 'bg-muted text-muted-foreground';
    case 'SPOT_BUY':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'SPOT_SELL':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'SPOT_TRANSFER_IN':
    case 'SPOT_TRANSFER_OUT':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getEventIcon(eventType: string, side: string | null) {
  if (eventType === 'PERP_FILL') {
    return side === 'long' ? ArrowUpRight : ArrowDownLeft;
  }
  if (eventType === 'PERP_FUNDING') return Zap;
  return DollarSign;
}

function formatEventSummary(event: RecentEvent): string {
  const { eventType, market, side, size, realizedPnlUsd, fundingUsd, feeUsd } = event;
  
  switch (eventType) {
    case 'PERP_FILL':
      if (realizedPnlUsd && realizedPnlUsd !== 0) {
        const pnlText = realizedPnlUsd >= 0 ? `+$${realizedPnlUsd.toFixed(2)}` : `-$${Math.abs(realizedPnlUsd).toFixed(2)}`;
        return `Closed ${size?.toFixed(4) || ''} ${market || ''} for ${pnlText}`;
      }
      return `Opened ${size?.toFixed(4) || ''} ${market || ''} ${side || ''}`;
    
    case 'PERP_FUNDING':
      if (fundingUsd && fundingUsd !== 0) {
        const action = fundingUsd >= 0 ? 'Received' : 'Paid';
        return `${action} $${Math.abs(fundingUsd).toFixed(2)} funding on ${market || 'position'}`;
      }
      return `Funding on ${market || 'position'}`;
    
    case 'PERP_FEE':
      return `Trading fee: $${Math.abs(feeUsd || 0).toFixed(2)}`;
    
    case 'SPOT_BUY':
      return `Bought ${size?.toFixed(4) || ''} ${market || ''}`;
    
    case 'SPOT_SELL':
      return `Sold ${size?.toFixed(4) || ''} ${market || ''}`;
    
    case 'SPOT_TRANSFER_IN':
      return `Received ${market || 'tokens'}`;
    
    case 'SPOT_TRANSFER_OUT':
      return `Sent ${market || 'tokens'}`;
    
    default:
      return eventType.replace(/_/g, ' ').toLowerCase();
  }
}

function formatEventValue(event: RecentEvent): { value: string; trend: 'positive' | 'negative' | 'neutral' } {
  const { eventType, realizedPnlUsd, fundingUsd, feeUsd, volumeUsd } = event;
  
  if (eventType === 'PERP_FILL' && realizedPnlUsd && realizedPnlUsd !== 0) {
    return {
      value: realizedPnlUsd >= 0 ? `+$${realizedPnlUsd.toFixed(2)}` : `-$${Math.abs(realizedPnlUsd).toFixed(2)}`,
      trend: realizedPnlUsd >= 0 ? 'positive' : 'negative',
    };
  }
  
  if (eventType === 'PERP_FUNDING' && fundingUsd) {
    return {
      value: fundingUsd >= 0 ? `+$${fundingUsd.toFixed(2)}` : `-$${Math.abs(fundingUsd).toFixed(2)}`,
      trend: fundingUsd >= 0 ? 'positive' : 'negative',
    };
  }
  
  if (eventType === 'PERP_FEE' && feeUsd) {
    return {
      value: `-$${Math.abs(feeUsd).toFixed(2)}`,
      trend: 'negative',
    };
  }
  
  if (volumeUsd) {
    return {
      value: `$${volumeUsd.toFixed(2)}`,
      trend: 'neutral',
    };
  }
  
  return { value: '-', trend: 'neutral' };
}

function EventRow({ event, onClick }: { event: RecentEvent; onClick?: () => void }) {
  const summary = formatEventSummary(event);
  const { value, trend } = formatEventValue(event);
  const Icon = getEventIcon(event.eventType, event.side);
  
  return (
    <TableRow 
      className={cn("hover:bg-muted/30 transition-colors", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(event.ts), { addSuffix: true })}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("gap-1 text-xs", getEventBadgeStyle(event.eventType))}>
          <Icon className="h-3 w-3" />
          {event.eventType.replace(/_/g, ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{summary}</TableCell>
      <TableCell className={cn(
        "text-sm font-medium text-right",
        trend === 'positive' && "text-green-600 dark:text-green-400",
        trend === 'negative' && "text-red-600 dark:text-red-400"
      )}>
        {value}
      </TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function RecentEventsTable({ events, isLoading, onEventClick }: RecentEventsTableProps) {
  if (!isLoading && events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No recent activity found in database</p>
        <p className="text-sm mt-1">This wallet may not have been synced yet</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs uppercase tracking-wider">Time</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Summary</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows />
          ) : (
            events.map((event) => (
              <EventRow 
                key={event.id} 
                event={event} 
                onClick={onEventClick ? () => onEventClick(event) : undefined}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
