import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TokenNotFoundProps {
  identifier: string;
}

const POPULAR_TOKENS = ['BTC', 'ETH', 'USDC', 'HYPE', 'SOL', 'PURR'];

export function TokenNotFound({ identifier }: TokenNotFoundProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-semibold mb-2">Token Not Found</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        "{identifier}" doesn't exist on HyperCore or HyperEVM.
        Check the symbol or contract address.
      </p>

      {/* Popular Tokens */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-3 text-center">
          Popular tokens:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_TOKENS.map((token) => (
            <Button
              key={token}
              variant="outline"
              size="sm"
              onClick={() => navigate(`/token/${token}`)}
            >
              {token}
            </Button>
          ))}
        </div>
      </div>

      <Button onClick={() => navigate('/')}>
        <Search className="h-4 w-4 mr-2" />
        Search Again
      </Button>
    </div>
  );
}
