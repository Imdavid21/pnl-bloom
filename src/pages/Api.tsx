import { useState } from 'react';
import { Play, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { ENDPOINTS, proxyRequest, getApiUrl, buildCurlCommand, type ApiEndpoint } from '@/lib/hyperliquidApi';

export default function ApiPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(ENDPOINTS[0]);
  const [wallet, setWallet] = useState('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildRequestBody = () => {
    const body = { ...selectedEndpoint.requestBody };
    if ('user' in body && wallet) {
      (body as any).user = wallet.toLowerCase();
    }
    return body;
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponse('');
    
    try {
      const requestBody = buildRequestBody();
      const data = await proxyRequest(requestBody);
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const curlCommand = buildCurlCommand(buildRequestBody());

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">API Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Direct Hyperliquid API calls
            </p>
          </div>
          <a 
            href="https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Docs
            </Button>
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Endpoint List */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Endpoints
            </h2>
            <div className="space-y-1">
              {ENDPOINTS.map(endpoint => (
                <button
                  key={endpoint.id}
                  onClick={() => {
                    setSelectedEndpoint(endpoint);
                    setResponse('');
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors text-sm",
                    selectedEndpoint.id === endpoint.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="font-medium">{endpoint.name}</span>
                  <span className="block text-xs opacity-70 mt-0.5">{endpoint.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Request Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endpoint Info */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-primary/20 text-primary">
                  POST
                </span>
                <code className="text-sm font-mono text-muted-foreground break-all">{getApiUrl()}</code>
              </div>
              <p className="text-sm text-muted-foreground">{selectedEndpoint.description}</p>
            </div>

            {/* Wallet Input */}
            {selectedEndpoint.requiresUser && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Wallet Address
                </label>
                <Input
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            {/* Request Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Request Body</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(buildRequestBody(), null, 2), 'body')}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copiedId === 'body' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
                {JSON.stringify(buildRequestBody(), null, 2)}
              </pre>
            </div>

            {/* cURL Command */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">cURL</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(curlCommand, 'curl')}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copiedId === 'curl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-muted font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {curlCommand}
              </pre>
            </div>

            {/* Execute Button */}
            <Button 
              onClick={handleExecute} 
              disabled={isLoading || (selectedEndpoint.requiresUser && !wallet)}
              className="w-full gap-2"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Executing...' : 'Execute Request'}
            </Button>

            {/* Response */}
            {response && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Response</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(response, 'response')}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {copiedId === 'response' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={response}
                  readOnly
                  className="font-mono text-xs min-h-[300px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
