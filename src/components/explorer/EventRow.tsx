/**
 * Event Row Component
 * Single row in the activity feed
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EventBadge, DomainBadge } from './EventBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatUsdValue } from '@/lib/format-activity';
import type { UnifiedEvent } from '@/lib/format-activity';

interface EventRowProps {
  event: UnifiedEvent;
}

export function EventRow({ event }: EventRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const relativeTime = formatDistanceToNow(event.timestamp, { addSuffix: false });
  const exactTime = format(event.timestamp, "MMM d, yyyy 'at' h:mm:ss a");
  
  // Format relative time to be shorter
  const shortTime = relativeTime
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' weeks', 'w')
    .replace(' week', 'w')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace('about ', '')
    .replace('less than a minute', 'now');
  
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-4 px-3 -mx-3 rounded-lg",
        "border-b border-border/30 last:border-b-0",
        "transition-colors duration-150",
        isHovered && "bg-muted/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Time */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="w-16 flex-shrink-0 text-sm font-medium text-muted-foreground/60 tabular-nums">
            {shortTime}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {exactTime}
        </TooltipContent>
      </Tooltip>
      
      {/* Badge */}
      <div className="w-16 flex-shrink-0">
        <EventBadge label={event.badge.label} variant={event.badge.variant} />
      </div>
      
      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 truncate">
          {event.descriptionParts.map((part, i) => (
            <span key={i} className={part.bold ? 'font-semibold' : ''}>
              {part.text}
            </span>
          ))}
        </p>
      </div>
      
      {/* Value */}
      <div className="w-24 flex-shrink-0 text-right">
        <span className={cn(
          "text-sm font-medium tabular-nums",
          event.isPnl && event.isPositive && "text-emerald-600 dark:text-emerald-400",
          event.isPnl && !event.isPositive && "text-red-600 dark:text-red-400",
          !event.isPnl && "text-muted-foreground/70"
        )}>
          {event.isPnl && event.isPositive && '+'}
          {event.valueUsd > 0 ? formatUsdValue(event.valueUsd) : '-'}
        </span>
      </div>
      
      {/* Domain + Link */}
      <div className="w-14 flex-shrink-0 flex items-center justify-end gap-2">
        <DomainBadge domain={event.domain} />
        <Link
          to={event.link}
          className={cn(
            "text-muted-foreground/40 hover:text-foreground/80 transition-colors",
            isHovered && "text-muted-foreground/60"
          )}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// Mobile card version
export function EventCard({ event }: EventRowProps) {
  const relativeTime = formatDistanceToNow(event.timestamp, { addSuffix: true });
  
  return (
    <Link 
      to={event.link}
      className="block p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <EventBadge label={event.badge.label} variant={event.badge.variant} size="sm" />
          <span className="text-xs text-muted-foreground/50">{relativeTime}</span>
        </div>
        <DomainBadge domain={event.domain} />
      </div>
      
      <p className="text-sm text-foreground/90 mb-2">
        {event.descriptionParts.map((part, i) => (
          <span key={i} className={part.bold ? 'font-semibold' : ''}>
            {part.text}
          </span>
        ))}
      </p>
      
      <p className={cn(
        "text-lg font-semibold text-right",
        event.isPnl && event.isPositive && "text-emerald-600 dark:text-emerald-400",
        event.isPnl && !event.isPositive && "text-red-600 dark:text-red-400",
        !event.isPnl && "text-foreground/80"
      )}>
        {event.isPnl && event.isPositive && '+'}
        {event.valueUsd > 0 ? formatUsdValue(event.valueUsd) : '-'}
      </p>
    </Link>
  );
}
