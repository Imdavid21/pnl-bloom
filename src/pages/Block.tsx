import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { BlockDetailPage } from '@/components/explorer/BlockDetailPage';
import type { LoadingStage } from '@/lib/explorer/types';

export default function Block() {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'ready', message: '' });

  // Handle "latest" redirect
  useEffect(() => {
    if (number === 'latest') {
      // Fetch latest block number and redirect
      const fetchLatest = async () => {
        try {
          const response = await fetch('https://rpc.hyperliquid.xyz/evm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 1,
            }),
          });
          const data = await response.json();
          if (data.result) {
            const latestBlock = parseInt(data.result, 16);
            navigate(`/block/${latestBlock}`, { replace: true });
          }
        } catch (err) {
          console.error('Failed to fetch latest block:', err);
        }
      };
      fetchLatest();
    }
  }, [number, navigate]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explorer');
    }
  }, [navigate]);

  const handleNavigate = useCallback((type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => {
    switch (type) {
      case 'block':
        navigate(`/block/${id}`);
        break;
      case 'tx':
        navigate(`/tx/${id}`);
        break;
      case 'wallet':
        navigate(`/wallet/${id}`);
        break;
      case 'spot-token':
        navigate(`/token/${id}`);
        break;
    }
  }, [navigate]);

  // Parse block number
  const blockNumber = number ? parseInt(number, 10) : NaN;

  // Handle invalid block number
  if (number !== 'latest' && (isNaN(blockNumber) || blockNumber < 0)) {
    return (
      <Layout>
        <ExplorerShell loadingStage={loadingStage}>
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-xl font-semibold mb-2">Invalid Block Number</h1>
            <p className="text-muted-foreground mb-6">
              Please enter a valid block number
            </p>
            <button
              onClick={() => navigate('/block/latest')}
              className="text-primary hover:underline"
            >
              Go to Latest Block →
            </button>
          </div>
        </ExplorerShell>
      </Layout>
    );
  }

  // Show loading while redirecting from "latest"
  if (number === 'latest') {
    return (
      <Layout>
        <ExplorerShell loadingStage={{ stage: 'searching', message: 'Finding latest block...' }}>
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <div className="animate-pulse text-muted-foreground">
              Loading latest block...
            </div>
          </div>
        </ExplorerShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <ExplorerShell loadingStage={loadingStage}>
        <BlockDetailPage
          blockNumber={blockNumber}
          onBack={handleBack}
          onNavigate={handleNavigate}
          preferredChain="hyperevm"
        />
      </ExplorerShell>
    </Layout>
  );
}
