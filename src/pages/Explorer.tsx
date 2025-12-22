import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useExplorerState } from '@/hooks/useExplorerState';
import { ExplorerSearch } from '@/components/explorer/ExplorerSearch';
import { LiveActivityFeed } from '@/components/explorer/LiveActivityFeed';
import { BlockDetailPage } from '@/components/explorer/BlockDetailPage';
import { TxDetailPage } from '@/components/explorer/TxDetailPage';
import { WalletDetailPage } from '@/components/explorer/WalletDetailPage';

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
  const [detailView, setDetailView] = useState<{
    type: 'block' | 'tx' | 'wallet' | null;
    id: string;
  }>({ type: null, id: '' });

  const handleSearchSubmit = useCallback(async () => {
    const query = localSearch.trim().toLowerCase();
    if (!query) return;

    setIsLoading(true);
    setSearch(query);
    
    // Detect query type based on length and format
    if (query.startsWith('0x') && query.length === 42) {
      // Wallet address
      setDetailView({ type: 'wallet', id: query });
    } else if (query.startsWith('0x') && query.length === 66) {
      // Tx hash
      setDetailView({ type: 'tx', id: query });
    } else if (/^\d+$/.test(query)) {
      // Block number
      setDetailView({ type: 'block', id: query });
    }
    
    setIsLoading(false);
  }, [localSearch, setSearch]);

  const handleRowClick = useCallback((type: any, id: string, data: any) => {
    if (type === 'block') {
      setDetailView({ type: 'block', id });
    } else if (type === 'tx') {
      setDetailView({ type: 'tx', id: data?.hash || id });
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

  // Show detail page if viewing block/tx/wallet
  if (detailView.type === 'block') {
    return (
      <Layout>
        <BlockDetailPage 
          blockNumber={parseInt(detailView.id)} 
          onBack={handleBack}
          onNavigate={handleNavigate}
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

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Search Header */}
        <ExplorerSearch
          searchQuery={localSearch}
          onSearch={setLocalSearch}
          onSearchSubmit={handleSearchSubmit}
          isLoading={isLoading}
        />

        {/* Live Activity Feed */}
        <div className="mt-6">
          <LiveActivityFeed onRowClick={handleRowClick} />
        </div>
      </div>
    </Layout>
  );
}
