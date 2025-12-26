import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function NavigationProgress() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start progress on route change
    setIsNavigating(true);
    setProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 50);

    // Complete progress after a short delay
    const completeTimeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
    }, 300);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimeout);
    };
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-200 ease-out",
          progress === 100 && "opacity-0"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
