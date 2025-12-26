/**
 * Transaction Not Found Component
 */

import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransactionNotFoundProps {
  identifier: string;
}

export function TransactionNotFound({ identifier }: TransactionNotFoundProps) {
  const shortId = identifier.length > 20 
    ? `${identifier.slice(0, 10)}...${identifier.slice(-8)}`
    : identifier;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
        <Search className="h-7 w-7 text-muted-foreground/40" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground/90">
          Transaction Not Found
        </h2>
        <p className="text-sm text-muted-foreground/60 max-w-sm">
          The transaction <code className="px-1.5 py-0.5 bg-muted/50 rounded text-xs">{shortId}</code> doesn't exist or hasn't been indexed yet.
        </p>
      </div>
      
      <div className="text-sm text-muted-foreground/50 space-y-1">
        <p>• Check the transaction hash is correct</p>
        <p>• Try searching for the wallet address instead</p>
      </div>
      
      <Button variant="outline" asChild className="mt-4">
        <Link to="/explorer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Search Again
        </Link>
      </Button>
    </div>
  );
}
