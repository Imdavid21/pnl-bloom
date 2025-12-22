import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useExplorerState } from '@/hooks/useExplorerState';
import { useApiHealthCheck } from '@/hooks/useApiHealthCheck';
import { ExplorerSearch, ChainFilter } from '@/components/explorer/ExplorerSearch';
import { ApiHealthIndicator } from '@/components/explorer/ApiHealthIndicator';
import { NetworkStats } from '@/components/explorer/NetworkStats';
import { TopMarkets } from '@/components/explorer/TopMarkets';
import { RecentTrades } from '@/components/explorer/RecentTrades';
import { BlockDetailPage } from '@/components/explorer/BlockDetailPage';
import { TxDetailPage } from '@/components/explorer/TxDetailPage';
import { WalletDetailPage } from '@/components/explorer/WalletDetailPage';
import { SpotTokenDetailPage } from '@/components/explorer/SpotTokenDetailPage';

export default function ExplorerPage() {
  const {
    searchQuery,
    setSearch,
    drawer,
    openDrawer,
    closeDrawer,
  } = useExplorerState();

  const { health, refresh: refreshHealth } = useApiHealthCheck();

  const [isLoading, setIsLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [detailView, setDetailView] = useState<{
    type: 'block' | 'tx' | 'wallet' | 'spot-token' | null;
    id: string;
    chain?: 'hyperevm' | 'hypercore';
  }>({ type: null, id: '' });

  const handleSearchSubmit = useCallback(async () => {
    const query = localSearch.trim();
    if (!query) return;

    setIsLoading(true);
    setSearch(query);

    const lowerQuery = query.toLowerCase();

    const preferredChain =
      chainFilter === 'hyperevm'
        ? 'hyperevm'
        : chainFilter === 'hypercore-perps'
          ? 'hypercore'
          : undefined;

    // If searching in Spot mode, treat as token search
    if (chainFilter === 'hypercore-spot') {
      setDetailView({ type: 'spot-token', id: query });
      setIsLoading(false);
      return;
    }

    // Detect query type based on length and format
    if (lowerQuery.startsWith('0x') && lowerQuery.length === 42) {
      setDetailView({ type: 'wallet', id: lowerQuery });
    } else if (lowerQuery.startsWith('0x') && lowerQuery.length === 66) {
      setDetailView({ type: 'tx', id: lowerQuery, chain: preferredChain });
    } else if (/^\d+$/.test(query)) {
      setDetailView({ type: 'block', id: query, chain: preferredChain });
    } else if (lowerQuery.startsWith('0x')) {
      if (lowerQuery.length === 34) {
        setDetailView({ type: 'spot-token', id: lowerQuery });
      } else {
        setDetailView({ type: 'tx', id: lowerQuery, chain: preferredChain });
      }
    } else {
      // Likely a token name search
      setDetailView({ type: 'spot-token', id: query });
    }

    setIsLoading(false);
  }, [localSearch, setSearch, chainFilter]);

  const handleRowClick = useCallback((type: any, id: string, data: any) => {
    if (type === 'block') {
      setDetailView({ type: 'block', id });
    } else if (type === 'tx') {
      const txHash = data?.hash || id;
      const chain = data?.user && data?.block ? 'hypercore' : undefined;
      setDetailView({ type: 'tx', id: txHash, chain });
    } else if (type === 'wallet') {
      setDetailView({ type: 'wallet', id: data?.address || id });
    } else if (type === 'spot-token') {
      setDetailView({ type: 'spot-token', id });
    } else {
      openDrawer(type, id, data);
    }
  }, [openDrawer]);

  const handleBack = useCallback(() => {
    setDetailView({ type: null, id: '' });
    setLocalSearch('');
    setSearch('');
  }, [setSearch]);

  const handleNavigate = useCallback((type: 'block' | 'tx' | 'wallet', id: string) => {
    setDetailView({ type, id });
  }, []);

  // Show detail page if viewing block/tx/wallet/token
  if (detailView.type === 'block') {
    return (
      <Layout>
        <BlockDetailPage 
          blockNumber={parseInt(detailView.id)} 
          onBack={handleBack}
          onNavigate={handleNavigate}
          preferredChain={detailView.chain}
        />
      </Layout>
    );
  }

  if (detailView.type === 'tx') {
    return (
      <Layout>
        <TxDetailPage
          hash={detailView.id}
          onBack={handleBack}
          onNavigate={handleNavigate}
          preferredChain={detailView.chain}
        />
      </Layout>
    );
  }

  if (detailView.type === 'wallet') {
    return (
      <Layout>
        <WalletDetailPage 
          address={detailView.id} 
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      </Layout>
    );
  }

  if (detailView.type === 'spot-token') {
    return (
      <Layout>
        <SpotTokenDetailPage 
          tokenQuery={detailView.id} 
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Search Header */}
        <ExplorerSearch
          searchQuery={localSearch}
          onSearch={setLocalSearch}
          onSearchSubmit={handleSearchSubmit}
          isLoading={isLoading}
          chainFilter={chainFilter}
          onChainFilterChange={setChainFilter}
        />

        {/* API Health Status */}
        <ApiHealthIndicator health={health} onRefresh={refreshHealth} />

        {/* Network Stats */}
        <NetworkStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Markets */}
          <TopMarkets onNavigate={(type, id) => handleRowClick(type, id, null)} />

          {/* Live Trades */}
          <RecentTrades onNavigate={(type, id) => handleRowClick('wallet', id, { address: id })} />
        </div>
      </div>
    </Layout>
  );
}
