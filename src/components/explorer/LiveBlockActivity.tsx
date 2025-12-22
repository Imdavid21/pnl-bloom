import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
interface BlockCell {
  id: number;
  intensity: number; // 0-5
  timestamp: number;
}
const ROWS = 5;
const COLS = 28;
const TOTAL_CELLS = ROWS * COLS;
export function LiveBlockActivity() {
  const [cells, setCells] = useState<BlockCell[]>(() => Array.from({
    length: TOTAL_CELLS
  }, (_, i) => ({
    id: i,
    intensity: 0,
    timestamp: Date.now()
  })));
  const [latency, setLatency] = useState(0);
  const cellIndexRef = useRef(0);

  // Simulate live block activity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newIntensity = Math.floor(Math.random() * 6);
      setCells(prev => {
        const updated = [...prev];
        // Add new activity at the current position
        const idx = cellIndexRef.current % TOTAL_CELLS;
        updated[idx] = {
          id: idx,
          intensity: newIntensity,
          timestamp: now
        };
        cellIndexRef.current++;
        return updated;
      });
      setLatency(Math.floor(Math.random() * 150) + 50);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 0:
        return 'bg-muted/30';
      case 1:
        return 'bg-muted/50';
      case 2:
        return 'bg-muted/70';
      case 3:
        return 'bg-muted';
      case 4:
        return 'bg-foreground/30';
      case 5:
        return 'bg-foreground/50';
      default:
        return 'bg-muted/30';
    }
  };
  return <div className="p-6 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
          <p className="text-sm text-muted-foreground">Real-time visualization of network activity</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Low</span>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={cn("h-3 w-3 rounded-sm", getIntensityClass(i))} />)}
            </div>
            <span>High</span>
          </div>
          <div className="px-3 py-1 rounded-full border border-border bg-background text-xs font-mono text-muted-foreground">
            {latency} ms
          </div>
        </div>
      </div>

      <div className="grid gap-1" style={{
      gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`
    }}>
        {cells.map((cell, i) => <div key={i} className={cn("aspect-square rounded-sm transition-colors duration-300", getIntensityClass(cell.intensity))} />)}
      </div>
    </div>;
}