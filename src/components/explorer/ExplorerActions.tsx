import { ArrowLeft, RefreshCw, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareableView } from './ShareableView';
import { BookmarkButton } from './BookmarkButton';
import { EntityCompare } from './EntityCompare';
import { cn } from '@/lib/utils';

interface ExplorerActionsProps {
  entityType: 'wallet' | 'tx' | 'block' | 'token';
  entityId: string;
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  externalUrl?: string;
  onCompare?: (id: string) => void;
  className?: string;
}

export function ExplorerActions({
  entityType,
  entityId,
  title,
  onBack,
  onRefresh,
  isRefreshing,
  externalUrl,
  onCompare,
  className,
}: ExplorerActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Back button */}
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      
      <div className="flex-1" />
      
      {/* Primary actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
        
        {/* Bookmark */}
        <BookmarkButton 
          entityType={entityType} 
          entityId={entityId}
          label={title}
        />
        
        {/* Share */}
        <ShareableView 
          entityType={entityType}
          entityId={entityId}
          title={title}
        />
        
        {/* Compare (for wallets and tokens) */}
        {(entityType === 'wallet' || entityType === 'token') && onCompare && (
          <EntityCompare
            currentType={entityType}
            currentId={entityId}
            onCompare={onCompare}
          />
        )}
        
        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {externalUrl && (
              <>
                <DropdownMenuItem asChild>
                  <a 
                    href={externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on Hyperliquid
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem 
              onClick={() => navigator.clipboard.writeText(entityId)}
              className="gap-2"
            >
              Copy {entityType === 'tx' ? 'hash' : entityType === 'wallet' ? 'address' : 'ID'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
