import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { ApiHealthIndicator } from '@/components/explorer/ApiHealthIndicator';
import { WhaleTracker } from '@/components/explorer/WhaleTracker';
import { Watchlist } from '@/components/explorer/Watchlist';
import { BlockDetailPage } from '@/components/explorer/BlockDetailPage';
import { TxDetailPage } from '@/components/explorer/TxDetailPage';
import { WalletDetailPage } from '@/components/explorer/WalletDetailPage';
import { SpotTokenDetailPage } from '@/components/explorer/SpotTokenDetailPage';
import { useApiHealthCheck } from '@/hooks/useApiHealthCheck';
import type { LoadingStage } from '@/lib/explorer/types';

export default function ExplorerPage() {
  const { query, mode, chain, navigateTo, clear } = useExplorerUrl();
  const { health, refresh: refreshHealth } = useApiHealthCheck();
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'ready', message: '' });

  const handleBack = useCallback(() => {
    clear();
  }, [clear]);

  const handleNavigate = useCallback((type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => {
    const modeMap: Record<string, 'block' | 'tx' | 'wallet' | 'token'> = {
      'block': 'block',
      'tx': 'tx', 
      'wallet': 'wallet',
      'spot-token': 'token',
    };
    navigateTo(modeMap[type] || 'wallet', id, chain || undefined);
  }, [navigateTo, chain]);

  // Render entity views based on mode
  if (query && mode) {
    if (mode === 'block') {
      return (
        <Layout>
          <BlockDetailPage 
            blockNumber={parseInt(query)} 
            onBack={handleBack}
            onNavigate={handleNavigate}
            preferredChain={chain === 'hypercore' ? 'hypercore' : chain === 'hyperevm' ? 'hyperevm' : undefined}
          />
        </Layout>
      );
    }

    if (mode === 'tx') {
      return (
        <Layout>
          <TxDetailPage
            hash={query}
            onBack={handleBack}
            onNavigate={handleNavigate}
            preferredChain={chain === 'hypercore' ? 'hypercore' : chain === 'hyperevm' ? 'hyperevm' : undefined}
          />
        </Layout>
      );
    }

    if (mode === 'wallet') {
      return (
        <Layout>
          <WalletDetailPage 
            address={query} 
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        </Layout>
      );
    }

    if (mode === 'token') {
      return (
        <Layout>
          <SpotTokenDetailPage 
            tokenQuery={query} 
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        </Layout>
      );
    }
  }

  // Default: show explorer home with search
  return (
    <Layout>
      <ExplorerShell loadingStage={loadingStage}>
        {/* API Health Status */}
        <ApiHealthIndicator health={health} onRefresh={refreshHealth} />

        {/* Watchlist */}
        <Watchlist onNavigate={(type, id) => handleNavigate(type, id)} />

        {/* Whale Tracker */}
        <WhaleTracker onNavigate={(type, id) => handleNavigate('wallet', id)} />
      </ExplorerShell>
    </Layout>
  );
}
