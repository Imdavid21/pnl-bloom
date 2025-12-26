import { ArrowLeft, RefreshCw, ExternalLink, MoreHorizontal, Home, Link2, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

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
  const [copied, setCopied] = useState(false);

  const getEntityLabel = () => {
    switch (entityType) {
      case 'wallet': return 'Wallet';
      case 'tx': return 'Transaction';
      case 'block': return 'Block';
      case 'token': return 'Token';
      default: return '';
    }
  };

  const getShareUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    return url.toString();
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl]);

  const handleCopyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entityId);
      toast.success(`${entityType === 'tx' ? 'Hash' : entityType === 'wallet' ? 'Address' : 'ID'} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  }, [entityId, entityType]);

  const handleExportJSON = useCallback(() => {
    const data = {
      type: entityType,
      id: entityId,
      title,
      url: getShareUrl(),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}-${entityId.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  }, [entityType, entityId, title, getShareUrl]);

  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {/* Left side: Breadcrumb navigation */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/explorer')}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
        </Button>
        
        <span className="text-muted-foreground/30">/</span>
        
        <span className="text-sm font-medium text-foreground/80">{getEntityLabel()}</span>
        
        {onBack && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-xs">Back</span>
            </Button>
          </>
        )}
      </div>
      
      {/* Right side: Refresh and actions */}
      <div className="flex items-center gap-1">
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
        
        {/* Unified actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {externalUrl && (
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
            )}
            <DropdownMenuItem onClick={handleCopyAddress} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy {entityType === 'tx' ? 'hash' : entityType === 'wallet' ? 'address' : 'ID'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
              <Download className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
