import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { useExplorerUrl } from '@/hooks/useExplorerUrl';
import { HypeStats } from '@/components/explorer/HypeStats';
import { BlockDetailPage } from '@/components/explorer/BlockDetailPage';
import { TxDetailPage } from '@/components/explorer/TxDetailPage';
import { WalletDetailPage } from '@/components/explorer/WalletDetailPage';
import { SpotTokenDetailPage } from '@/components/explorer/SpotTokenDetailPage';
import { SpotTokenDetailPage } from '@/components/explorer/SpotTokenDetailPage';
import { DomainToggle } from '@/components/explorer/DomainToggle';
import { useResolve } from '@/hooks/useUnifiedResolver';
import type { LoadingStage } from '@/lib/explorer/types';

export default function ExplorerPage() {
  const navigate = useNavigate();
  const { query, mode, chain, navigateTo, clear } = useExplorerUrl();
  const [loadingStage, setLoadingStage] = useState<LoadingStage>({ stage: 'ready', message: '' });

  const handleBack = useCallback(() => {
    // Use browser history for proper back navigation
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      clear();
    }
  }, [navigate, clear]);

  const handleNavigate = useCallback((type: 'block' | 'tx' | 'wallet' | 'spot-token', id: string) => {
    const modeMap: Record<string, 'block' | 'tx' | 'wallet' | 'token'> = {
      'block': 'block',
      'tx': 'tx',
      'wallet': 'wallet',
      'spot-token': 'token',
    };
    navigateTo(modeMap[type] || 'wallet', id, chain || undefined);
  }, [navigateTo, chain]);
  // Fetch resolution data to check for alternates
  const { data: resolution } = useResolve(query);

  const handleDomainToggle = useCallback((newDomain: 'hypercore' | 'hyperevm') => {
    // We update the URL query param 'chain' effectively
    navigateTo('wallet', query!, newDomain);
  }, [navigateTo, query]);

  // Render entity views based on mode
  if (query && mode) {
    // Prepare render props
    const domainToggle = resolution ? (
      <div className="mb-4">
        <DomainToggle
          result={resolution}
          currentDomain={(chain as 'hypercore' | 'hyperevm') || 'hypercore'}
          onToggle={handleDomainToggle}
        />
      </div>
    ) : null;

    if (mode === 'block') {
      return (
        <Layout>
          <ExplorerShell loadingStage={loadingStage}>
            {domainToggle}
            <BlockDetailPage
              blockNumber={parseInt(query)}
              onBack={handleBack}
              onNavigate={handleNavigate}
              preferredChain={chain === 'hypercore' ? 'hypercore' : chain === 'hyperevm' ? 'hyperevm' : undefined}
            />
          </ExplorerShell>
        </Layout>
      );
    }

    if (mode === 'tx') {
      return (
        <Layout>
          <ExplorerShell loadingStage={loadingStage}>
            {domainToggle}
            <TxDetailPage
              hash={query}
              onBack={handleBack}
              onNavigate={handleNavigate}
              preferredChain={chain === 'hypercore' ? 'hypercore' : chain === 'hyperevm' ? 'hyperevm' : undefined}
            />
          </ExplorerShell>
        </Layout>
      );
    }

    if (mode === 'wallet') {
      return (
        <Layout>
          <ExplorerShell loadingStage={loadingStage}>
            {domainToggle}
            <WalletDetailPage
              address={query}
              onBack={handleBack}
              onNavigate={handleNavigate}
            />
          </ExplorerShell>
        </Layout>
      );
    }

    if (mode === 'token') {
      return (
        <Layout>
          <ExplorerShell loadingStage={loadingStage}>
            <SpotTokenDetailPage
              tokenQuery={query}
              onBack={handleBack}
              onNavigate={handleNavigate}
            />
          </ExplorerShell>
        </Layout>
      );
    }
  }

  // Default: show explorer home with network stats
  return (
    <Layout>
      <ExplorerShell loadingStage={loadingStage}>
        <HypeStats />
      </ExplorerShell>
    </Layout>
  );
}
