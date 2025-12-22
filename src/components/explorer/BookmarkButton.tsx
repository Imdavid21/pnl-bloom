import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  entityType: 'wallet' | 'tx' | 'block' | 'token';
  entityId: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
}

interface BookmarkItem {
  type: string;
  id: string;
  label?: string;
  addedAt: string;
}

const STORAGE_KEY = 'hyperliquid-explorer-bookmarks';

function getBookmarks(): BookmarkItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: BookmarkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function BookmarkButton({ 
  entityType, 
  entityId, 
  label,
  className,
  variant = 'outline'
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  useEffect(() => {
    const bookmarks = getBookmarks();
    setIsBookmarked(bookmarks.some(b => b.type === entityType && b.id === entityId));
  }, [entityType, entityId]);
  
  const toggleBookmark = useCallback(() => {
    const bookmarks = getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.type === entityType && b.id === entityId);
    
    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1);
      saveBookmarks(bookmarks);
      setIsBookmarked(false);
      toast.success('Removed from bookmarks');
    } else {
      bookmarks.unshift({
        type: entityType,
        id: entityId,
        label: label || entityId.slice(0, 10),
        addedAt: new Date().toISOString(),
      });
      // Keep max 50 bookmarks
      if (bookmarks.length > 50) bookmarks.pop();
      saveBookmarks(bookmarks);
      setIsBookmarked(true);
      toast.success('Added to bookmarks');
    }
    
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('bookmarks-updated'));
  }, [entityType, entityId, label]);
  
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={toggleBookmark}
      className={cn(
        "gap-2 transition-colors",
        isBookmarked && "text-yellow-500 hover:text-yellow-400",
        className
      )}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isBookmarked ? (
        <BookmarkCheck className="h-4 w-4 fill-current" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {!className?.includes('w-8') && (isBookmarked ? 'Saved' : 'Save')}
    </Button>
  );
}

// Hook to access bookmarks from other components
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  
  const refresh = useCallback(() => {
    setBookmarks(getBookmarks());
  }, []);
  
  useEffect(() => {
    refresh();
    
    const handleUpdate = () => refresh();
    window.addEventListener('bookmarks-updated', handleUpdate);
    return () => window.removeEventListener('bookmarks-updated', handleUpdate);
  }, [refresh]);
  
  const remove = useCallback((type: string, id: string) => {
    const updated = getBookmarks().filter(b => !(b.type === type && b.id === id));
    saveBookmarks(updated);
    refresh();
    window.dispatchEvent(new CustomEvent('bookmarks-updated'));
  }, [refresh]);
  
  const clear = useCallback(() => {
    saveBookmarks([]);
    refresh();
    window.dispatchEvent(new CustomEvent('bookmarks-updated'));
  }, [refresh]);
  
  return { bookmarks, remove, clear, refresh };
}
