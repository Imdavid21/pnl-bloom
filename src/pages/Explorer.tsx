import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useExplorerState } from '@/hooks/useExplorerState';
import { ExplorerSearch, ChainFilter } from '@/components/explorer/ExplorerSearch';
import { LiveActivityFeed } from '@/components/explorer/LiveActivityFeed';
import { LiveBlockActivity } from '@/components/explorer/LiveBlockActivity';
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
      // Could be token name or tokenId
      setDetailView({ type: 'spot-token', id: query });
      setIsLoading(false);
      return;
    }

    // Detect query type based on length and format
    if (lowerQuery.startsWith('0x') && lowerQuery.length === 42) {
      // Wallet address (42 chars including 0x)
      setDetailView({ type: 'wallet', id: lowerQuery });
    } else if (lowerQuery.startsWith('0x') && lowerQuery.length === 66) {
      // Tx hash (66 chars including 0x)
      setDetailView({ type: 'tx', id: lowerQuery, chain: preferredChain });
    } else if (/^\d+$/.test(query)) {
      // Block number (only digits)
      setDetailView({ type: 'block', id: query, chain: preferredChain });
    } else if (lowerQuery.startsWith('0x')) {
      // Could be tokenId or partial hash
      if (lowerQuery.length === 34) {
        // Token ID format (0x + 32 hex chars)
        setDetailView({ type: 'spot-token', id: lowerQuery });
      } else {
        // Try as tx hash
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
      // Transactions coming from the live "transactions" tab are Hypercore L1.
      const chain = data?.user && data?.block ? 'hypercore' : undefined;
      setDetailView({ type: 'tx', id: txHash, chain });
    } else if (type === 'wallet') {
      setDetailView({ type: 'wallet', id: data?.address || id });
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
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Search Header */}
        <ExplorerSearch
          searchQuery={localSearch}
          onSearch={setLocalSearch}
          onSearchSubmit={handleSearchSubmit}
          isLoading={isLoading}
          chainFilter={chainFilter}
          onChainFilterChange={setChainFilter}
        />

        {/* Live Block Activity Visualizer */}
        <div className="mt-6">
          <LiveBlockActivity />
        </div>

        {/* Live Activity Feed */}
        <div className="mt-6">
          <LiveActivityFeed onRowClick={handleRowClick} />
        </div>
      </div>
    </Layout>
  );
}
