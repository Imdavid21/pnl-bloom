import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TokenOverviewProps {
  symbol: string;
  description?: string | null;
  type?: 'stablecoin' | 'governance' | 'utility' | 'wrapped' | null;
  decimals?: number;
  links?: {
    website?: string;
    twitter?: string;
    docs?: string;
  } | null;
  chains: { hypercore: boolean; hyperevm: boolean };
}

export function TokenOverview({
  symbol,
  description,
  type,
  decimals,
  links,
  chains,
}: TokenOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Description */}
      {description && (
        <div>
          <h3 className="text-lg font-semibold mb-3">About {symbol}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* Quick Stats & Links */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Token Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Token Details</h3>
          <div className="space-y-3">
            {type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{type}</span>
              </div>
            )}
            {decimals !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Decimals</span>
                <span className="font-medium">{decimals}</span>
              </div>
            )}
            {chains.hyperevm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standard</span>
                <span className="font-medium">ERC-20</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available On</span>
              <span className="font-medium">
                {[
                  chains.hypercore && 'HyperCore',
                  chains.hyperevm && 'HyperEVM',
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Links */}
        {links && Object.values(links).some(Boolean) && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Official Links</h3>
            <div className="space-y-2">
              {links.website && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => window.open(links.website, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </Button>
              )}
              {links.twitter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => window.open(links.twitter, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Twitter
                </Button>
              )}
              {links.docs && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => window.open(links.docs, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Documentation
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Related Markets */}
      {chains.hypercore && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Related Markets</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/market/${symbol}`}
            >
              {symbol}-PERP →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
