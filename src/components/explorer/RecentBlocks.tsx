import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Block {
  height: number;
  time: string;
  txCount: number;
  proposer: string;
}

export function RecentBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Simulate real-time blocks
  useEffect(() => {
    // Initialize with some blocks
    const initialHeight = 836473861;
    const initial: Block[] = Array.from({ length: 10 }, (_, i) => ({
      height: initialHeight - i,
      time: 'now',
      txCount: Math.floor(Math.random() * 5000) + 500,
      proposer: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    }));
    setBlocks(initial);

    // Add new blocks periodically
    const interval = setInterval(() => {
      setBlocks(prev => {
        const newBlock: Block = {
          height: (prev[0]?.height || initialHeight) + 1,
          time: 'now',
          txCount: Math.floor(Math.random() * 5000) + 500,
          proposer: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        };
        return [newBlock, ...prev.slice(0, 9)];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Blocks</h3>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {blocks.map((block, i) => (
          <div key={block.height} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm text-foreground">{block.height.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleCopy(block.height.toString(), `block-${i}`)}
                  >
                    {copiedId === `block-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <span className="text-xs text-primary font-medium">{block.time}</span>
              <span className="text-sm text-muted-foreground font-mono">{block.txCount.toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground font-mono">{block.proposer}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Height</span>
          <span>Time</span>
          <span>Txs</span>
          <span>Proposer</span>
        </div>
      </div>
    </div>
  );
}
