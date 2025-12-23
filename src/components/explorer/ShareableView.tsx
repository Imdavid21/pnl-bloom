import { useState, useCallback } from 'react';
import { Share2, Link2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
          <Download className="h-4 w-4" />
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
