import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarketNotFoundProps {
  symbol: string;
}

const POPULAR_MARKETS = ['BTC', 'ETH', 'SOL', 'DOGE', 'ARB', 'AVAX', 'SUI', 'OP'];

export function MarketNotFound({ symbol }: MarketNotFoundProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-semibold mb-2">Market Not Found</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        The market "{symbol}" doesn't exist on Hyperliquid. 
        Check the symbol or try one of the popular markets below.
      </p>
      
      {/* Popular Markets */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {POPULAR_MARKETS.map((market) => (
          <Button
            key={market}
            variant="outline"
            size="sm"
            onClick={() => navigate(`/market/${market}`)}
          >
            {market}
          </Button>
        ))}
      </div>

      <Button onClick={() => navigate('/')}>
        <Search className="h-4 w-4 mr-2" />
        Search Again
      </Button>
    </div>
  );
}
