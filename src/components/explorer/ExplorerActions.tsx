import { ArrowLeft, RefreshCw, ExternalLink, MoreHorizontal, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareableView } from './ShareableView';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ExplorerActionsProps {
  entityType: 'wallet' | 'tx' | 'block' | 'token';
  entityId: string;
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  externalUrl?: string;
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
  className,
}: ExplorerActionsProps) {
  const navigate = useNavigate();

  const getEntityLabel = () => {
    switch (entityType) {
      case 'wallet': return 'Wallet';
      case 'tx': return 'Transaction';
      case 'block': return 'Block';
      case 'token': return 'Token';
      default: return '';
    }
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Left side: Home, Back, Entity type */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/explorer')}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
        </Button>
        
        <span className="text-muted-foreground/50">/</span>
        
        {onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        
        <span className="text-muted-foreground/50">·</span>
        
        <span className="text-sm text-muted-foreground">{getEntityLabel()}</span>
      </div>
      
      <div className="flex-1" />
      
      {/* Right side: Share and More */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}
        
        {/* Share */}
        <ShareableView 
          entityType={entityType}
          entityId={entityId}
          title={title}
        />
        
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
