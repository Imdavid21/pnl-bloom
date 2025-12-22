import { useState, useCallback } from 'react';
import { Share2, Link2, Twitter, Copy, Check, QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareableViewProps {
  title: string;
  entityType: 'wallet' | 'tx' | 'block' | 'token';
  entityId: string;
  className?: string;
  compact?: boolean;
}

export function ShareableView({ 
  title, 
  entityType, 
  entityId, 
  className,
  compact = false 
}: ShareableViewProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
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
  
  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entityId);
      toast.success(`${entityType === 'tx' ? 'Hash' : entityType === 'wallet' ? 'Address' : 'ID'} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  }, [entityId, entityType]);
  
  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(`Check out this ${entityType} on Hyperliquid Explorer: ${title}`);
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }, [title, entityType, getShareUrl]);
  
  const handleExportJSON = useCallback(() => {
    // This would export the current view data as JSON
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

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className={cn("h-8 w-8 p-0", className)}
        title="Copy shareable link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyId} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy {entityType === 'tx' ? 'Hash' : entityType === 'wallet' ? 'Address' : 'ID'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleTwitterShare} className="gap-2">
            <Twitter className="h-4 w-4" />
            Share on Twitter
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowQR(true)} className="gap-2">
            <QrCode className="h-4 w-4" />
            Show QR Code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
            <Download className="h-4 w-4" />
            Export JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Simple QR placeholder - in production would use a QR library */}
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">QR Code for</p>
                <p className="text-xs font-mono truncate max-w-[180px]">{entityId.slice(0, 20)}...</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan to view this {entityType} on any device
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
