import { useState, useMemo, useEffect } from 'react';
import { Search, Copy, Check, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { proxyRequest } from '@/lib/hyperliquidApi';

// Complete asset ID to symbol mapping - SINGLE SOURCE OF TRUTH
const ASSET_MAPPINGS: Record<string, { symbol: string; name: string; category: string }> = {
  '@1': { symbol: 'BTC', name: 'Bitcoin', category: 'Major' },
  '@2': { symbol: 'ETH', name: 'Ethereum', category: 'Major' },
  '@3': { symbol: 'ARB', name: 'Arbitrum', category: 'L2' },
  '@4': { symbol: 'OP', name: 'Optimism', category: 'L2' },
  '@5': { symbol: 'AVAX', name: 'Avalanche', category: 'L1' },
  '@6': { symbol: 'BNB', name: 'BNB Chain', category: 'L1' },
  '@7': { symbol: 'SOL', name: 'Solana', category: 'L1' },
  '@8': { symbol: 'MATIC', name: 'Polygon', category: 'L2' },
  '@9': { symbol: 'DOGE', name: 'Dogecoin', category: 'Meme' },
  '@10': { symbol: 'LTC', name: 'Litecoin', category: 'Major' },
  '@11': { symbol: 'LINK', name: 'Chainlink', category: 'DeFi' },
  '@12': { symbol: 'UNI', name: 'Uniswap', category: 'DeFi' },
  '@13': { symbol: 'AAVE', name: 'Aave', category: 'DeFi' },
  '@14': { symbol: 'ATOM', name: 'Cosmos', category: 'L1' },
  '@15': { symbol: 'APE', name: 'ApeCoin', category: 'NFT' },
  '@16': { symbol: 'CRV', name: 'Curve', category: 'DeFi' },
  '@17': { symbol: 'DYDX', name: 'dYdX', category: 'DeFi' },
  '@18': { symbol: 'FTM', name: 'Fantom', category: 'L1' },
  '@19': { symbol: 'GMT', name: 'STEPN', category: 'Gaming' },
  '@20': { symbol: 'NEAR', name: 'NEAR Protocol', category: 'L1' },
  '@21': { symbol: 'TRX', name: 'TRON', category: 'L1' },
  '@22': { symbol: 'XRP', name: 'XRP', category: 'Major' },
  '@23': { symbol: 'ADA', name: 'Cardano', category: 'L1' },
  '@24': { symbol: 'DOT', name: 'Polkadot', category: 'L1' },
  '@25': { symbol: 'FIL', name: 'Filecoin', category: 'Storage' },
  '@26': { symbol: 'LDO', name: 'Lido DAO', category: 'DeFi' },
  '@27': { symbol: 'SAND', name: 'The Sandbox', category: 'Metaverse' },
  '@28': { symbol: 'MANA', name: 'Decentraland', category: 'Metaverse' },
  '@29': { symbol: 'APT', name: 'Aptos', category: 'L1' },
  '@30': { symbol: 'BLUR', name: 'Blur', category: 'NFT' },
  '@31': { symbol: 'MAGIC', name: 'Magic', category: 'Gaming' },
  '@32': { symbol: 'ARK', name: 'ARK', category: 'L1' },
  '@33': { symbol: 'CFX', name: 'Conflux', category: 'L1' },
  '@34': { symbol: 'LRC', name: 'Loopring', category: 'L2' },
  '@35': { symbol: 'LUNC', name: 'Terra Classic', category: 'L1' },
  '@36': { symbol: 'PEPE', name: 'Pepe', category: 'Meme' },
  '@37': { symbol: 'SUI', name: 'Sui', category: 'L1' },
  '@38': { symbol: 'SEI', name: 'Sei', category: 'L1' },
  '@39': { symbol: 'CYBER', name: 'CyberConnect', category: 'Social' },
  '@40': { symbol: 'ORDI', name: 'ORDI', category: 'BRC-20' },
  '@41': { symbol: 'TIA', name: 'Celestia', category: 'L1' },
  '@42': { symbol: 'MEME', name: 'Memecoin', category: 'Meme' },
  '@43': { symbol: 'INJ', name: 'Injective', category: 'DeFi' },
  '@44': { symbol: 'JTO', name: 'Jito', category: 'DeFi' },
  '@45': { symbol: 'STRK', name: 'Starknet', category: 'L2' },
  '@46': { symbol: 'PYTH', name: 'Pyth Network', category: 'Oracle' },
  '@47': { symbol: 'WIF', name: 'dogwifhat', category: 'Meme' },
  '@48': { symbol: 'JUP', name: 'Jupiter', category: 'DeFi' },
  '@49': { symbol: 'PENDLE', name: 'Pendle', category: 'DeFi' },
  '@50': { symbol: 'W', name: 'Wormhole', category: 'Bridge' },
  '@51': { symbol: 'ENA', name: 'Ethena', category: 'DeFi' },
  '@52': { symbol: 'TON', name: 'Toncoin', category: 'L1' },
  '@53': { symbol: 'ONDO', name: 'Ondo Finance', category: 'RWA' },
  '@54': { symbol: 'ZRO', name: 'LayerZero', category: 'Bridge' },
  '@55': { symbol: 'IO', name: 'io.net', category: 'AI' },
  '@56': { symbol: 'ZK', name: 'zkSync', category: 'L2' },
  '@57': { symbol: 'BRETT', name: 'Brett', category: 'Meme' },
  '@58': { symbol: 'RENDER', name: 'Render', category: 'AI' },
  '@59': { symbol: 'LISTA', name: 'Lista DAO', category: 'DeFi' },
  '@60': { symbol: 'NOT', name: 'Notcoin', category: 'Gaming' },
  '@61': { symbol: 'BOME', name: 'BOOK OF MEME', category: 'Meme' },
  '@62': { symbol: 'PEOPLE', name: 'ConstitutionDAO', category: 'DAO' },
  '@63': { symbol: 'FLOKI', name: 'Floki', category: 'Meme' },
  '@64': { symbol: 'BONK', name: 'Bonk', category: 'Meme' },
  '@65': { symbol: 'ETHFI', name: 'ether.fi', category: 'DeFi' },
  '@66': { symbol: 'MEW', name: 'cat in a dogs world', category: 'Meme' },
  '@67': { symbol: 'PONKE', name: 'Ponke', category: 'Meme' },
  '@68': { symbol: 'POPCAT', name: 'Popcat', category: 'Meme' },
  '@69': { symbol: 'NEIRO', name: 'Neiro', category: 'Meme' },
  '@70': { symbol: 'MOTHER', name: 'Mother Iggy', category: 'Meme' },
  '@71': { symbol: 'DOGS', name: 'DOGS', category: 'Meme' },
  '@72': { symbol: 'SUNDOG', name: 'Sundog', category: 'Meme' },
  '@73': { symbol: 'TURBO', name: 'Turbo', category: 'Meme' },
  '@74': { symbol: 'CAT', name: "Simon's Cat", category: 'Meme' },
  '@75': { symbol: 'MOODENG', name: 'Moo Deng', category: 'Meme' },
  '@76': { symbol: 'NEIROETH', name: 'Neiro (ETH)', category: 'Meme' },
  '@77': { symbol: 'GOAT', name: 'Goatseus Maximus', category: 'Meme' },
  '@78': { symbol: 'PNUT', name: 'Peanut', category: 'Meme' },
  '@79': { symbol: 'MOG', name: 'Mog Coin', category: 'Meme' },
  '@80': { symbol: 'ACT', name: 'Act I', category: 'AI' },
  '@81': { symbol: 'CHILLGUY', name: 'Chill Guy', category: 'Meme' },
  '@82': { symbol: 'MICHI', name: 'Michi', category: 'Meme' },
  '@83': { symbol: 'LUCE', name: 'LUCE', category: 'Meme' },
  '@84': { symbol: 'BAN', name: 'Banana', category: 'Meme' },
  '@85': { symbol: 'FARTCOIN', name: 'Fartcoin', category: 'Meme' },
  '@86': { symbol: 'AI16Z', name: 'ai16z', category: 'AI' },
  '@87': { symbol: 'GRIFFAIN', name: 'Griffain', category: 'AI' },
  '@88': { symbol: 'ZEREBRO', name: 'Zerebro', category: 'AI' },
  '@89': { symbol: 'AIXBT', name: 'AIXBT', category: 'AI' },
  '@90': { symbol: 'VIRTUAL', name: 'Virtual Protocol', category: 'AI' },
  '@91': { symbol: 'PENGU', name: 'Pudgy Penguins', category: 'NFT' },
  '@92': { symbol: 'USUAL', name: 'Usual', category: 'DeFi' },
  '@93': { symbol: 'MORPHO', name: 'Morpho', category: 'DeFi' },
  '@94': { symbol: 'MOVE', name: 'Movement', category: 'L2' },
  '@95': { symbol: 'VVAIFU', name: 'Vvaifu', category: 'AI' },
  '@96': { symbol: 'ALCH', name: 'Alchemist AI', category: 'AI' },
  '@97': { symbol: 'ME', name: 'Magic Eden', category: 'NFT' },
  '@98': { symbol: 'KOMA', name: 'Koma Inu', category: 'Meme' },
  '@99': { symbol: 'GMCAT', name: 'GM Cat', category: 'Meme' },
  '@100': { symbol: 'FARM', name: 'Farm', category: 'Gaming' },
  '@101': { symbol: 'PIPPIN', name: 'Pippin', category: 'AI' },
  '@102': { symbol: 'ANIME', name: 'Anime', category: 'NFT' },
  '@103': { symbol: 'SONIC', name: 'Sonic', category: 'L1' },
  '@104': { symbol: 'TRUMP', name: 'TRUMP', category: 'Meme' },
  '@105': { symbol: 'MELANIA', name: 'MELANIA', category: 'Meme' },
  '@106': { symbol: 'VINE', name: 'Vine', category: 'Social' },
  '@107': { symbol: 'HYPE', name: 'Hyperliquid', category: 'DeFi' },
  '@108': { symbol: 'ARC', name: 'Arc', category: 'AI' },
  '@109': { symbol: 'DEEP', name: 'DeepBook', category: 'DeFi' },
  '@110': { symbol: 'GAME', name: 'GAME', category: 'AI' },
  '@111': { symbol: 'COOKIE', name: 'Cookie DAO', category: 'AI' },
  '@112': { symbol: 'BUZZ', name: 'Buzz', category: 'AI' },
  '@113': { symbol: 'LAYER3', name: 'Layer3', category: 'L2' },
  '@114': { symbol: 'TOSHI', name: 'Toshi', category: 'Meme' },
  '@115': { symbol: 'ZETA', name: 'ZetaChain', category: 'L1' },
  '@116': { symbol: 'BERA', name: 'Berachain', category: 'L1' },
  '@117': { symbol: 'TST', name: 'TST', category: 'Meme' },
  '@118': { symbol: 'KAITO', name: 'Kaito', category: 'AI' },
  '@119': { symbol: 'SHELL', name: 'Shell Protocol', category: 'DeFi' },
  '@120': { symbol: 'IP', name: 'Story Protocol', category: 'IP' },
  '@121': { symbol: 'BOOP', name: 'Boop', category: 'Meme' },
  '@122': { symbol: 'HOUSE', name: 'House', category: 'Gaming' },
  '@123': { symbol: 'SPX', name: 'SPX6900', category: 'Meme' },
  '@124': { symbol: 'LAUNCHCOIN', name: 'Believe', category: 'Launchpad' },
  '@125': { symbol: 'FARTBOY', name: 'Fartboy', category: 'Meme' },
  // kAssets (Hyperliquid synthetics)
  '@200': { symbol: 'kBTC', name: 'kBTC Synthetic', category: 'kAsset' },
  '@201': { symbol: 'kETH', name: 'kETH Synthetic', category: 'kAsset' },
  '@202': { symbol: 'kSOL', name: 'kSOL Synthetic', category: 'kAsset' },
  '@203': { symbol: 'kARB', name: 'kARB Synthetic', category: 'kAsset' },
  '@204': { symbol: 'kPEPE', name: 'kPEPE Synthetic', category: 'kAsset' },
  '@205': { symbol: 'kBONK', name: 'kBONK Synthetic', category: 'kAsset' },
  '@206': { symbol: 'kDOGE', name: 'kDOGE Synthetic', category: 'kAsset' },
  '@207': { symbol: 'kSUI', name: 'kSUI Synthetic', category: 'kAsset' },
  '@208': { symbol: 'kLINK', name: 'kLINK Synthetic', category: 'kAsset' },
  '@209': { symbol: 'kAVAX', name: 'kAVAX Synthetic', category: 'kAsset' },
  '@210': { symbol: 'kOP', name: 'kOP Synthetic', category: 'kAsset' },
  '@211': { symbol: 'kAPT', name: 'kAPT Synthetic', category: 'kAsset' },
  '@212': { symbol: 'kINJ', name: 'kINJ Synthetic', category: 'kAsset' },
  '@213': { symbol: 'kMATIC', name: 'kMATIC Synthetic', category: 'kAsset' },
  '@214': { symbol: 'kTIA', name: 'kTIA Synthetic', category: 'kAsset' },
  '@215': { symbol: 'kSEI', name: 'kSEI Synthetic', category: 'kAsset' },
  '@216': { symbol: 'kBLUR', name: 'kBLUR Synthetic', category: 'kAsset' },
  '@217': { symbol: 'kJUP', name: 'kJUP Synthetic', category: 'kAsset' },
  '@218': { symbol: 'kSTRK', name: 'kSTRK Synthetic', category: 'kAsset' },
  '@219': { symbol: 'kPYTH', name: 'kPYTH Synthetic', category: 'kAsset' },
  '@220': { symbol: 'kWIF', name: 'kWIF Synthetic', category: 'kAsset' },
  '@221': { symbol: 'kENA', name: 'kENA Synthetic', category: 'kAsset' },
  '@222': { symbol: 'kTON', name: 'kTON Synthetic', category: 'kAsset' },
  '@223': { symbol: 'kONDO', name: 'kONDO Synthetic', category: 'kAsset' },
  '@224': { symbol: 'kIO', name: 'kIO Synthetic', category: 'kAsset' },
  '@225': { symbol: 'kZK', name: 'kZK Synthetic', category: 'kAsset' },
  '@226': { symbol: 'kZRO', name: 'kZRO Synthetic', category: 'kAsset' },
  '@227': { symbol: 'kRENDER', name: 'kRENDER Synthetic', category: 'kAsset' },
  '@228': { symbol: 'kW', name: 'kW Synthetic', category: 'kAsset' },
  '@229': { symbol: 'kNOT', name: 'kNOT Synthetic', category: 'kAsset' },
  '@230': { symbol: 'kBOME', name: 'kBOME Synthetic', category: 'kAsset' },
  '@231': { symbol: 'kFLOKI', name: 'kFLOKI Synthetic', category: 'kAsset' },
  '@232': { symbol: 'kPOPCAT', name: 'kPOPCAT Synthetic', category: 'kAsset' },
  '@233': { symbol: 'kTURBO', name: 'kTURBO Synthetic', category: 'kAsset' },
  '@234': { symbol: 'kMOODENG', name: 'kMOODENG Synthetic', category: 'kAsset' },
  '@235': { symbol: 'kGOAT', name: 'kGOAT Synthetic', category: 'kAsset' },
  '@236': { symbol: 'kPNUT', name: 'kPNUT Synthetic', category: 'kAsset' },
  '@237': { symbol: 'kACT', name: 'kACT Synthetic', category: 'kAsset' },
  '@238': { symbol: 'kVIRTUAL', name: 'kVIRTUAL Synthetic', category: 'kAsset' },
  '@239': { symbol: 'kPENGU', name: 'kPENGU Synthetic', category: 'kAsset' },
  '@240': { symbol: 'kAI16Z', name: 'kAI16Z Synthetic', category: 'kAsset' },
  '@241': { symbol: 'kAIXBT', name: 'kAIXBT Synthetic', category: 'kAsset' },
  '@242': { symbol: 'kFARTCOIN', name: 'kFARTCOIN Synthetic', category: 'kAsset' },
  '@243': { symbol: 'kTRUMP', name: 'kTRUMP Synthetic', category: 'kAsset' },
  '@244': { symbol: 'kMELANIA', name: 'kMELANIA Synthetic', category: 'kAsset' },
  '@245': { symbol: 'kHYPE', name: 'kHYPE Synthetic', category: 'kAsset' },
  '@246': { symbol: 'kANIME', name: 'kANIME Synthetic', category: 'kAsset' },
  '@247': { symbol: 'kSONIC', name: 'kSONIC Synthetic', category: 'kAsset' },
  '@248': { symbol: 'kBERA', name: 'kBERA Synthetic', category: 'kAsset' },
  '@249': { symbol: 'kKAITO', name: 'kKAITO Synthetic', category: 'kAsset' },
  '@250': { symbol: 'kIP', name: 'kIP Synthetic', category: 'kAsset' },
};

interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
}

const CATEGORIES = ['All', 'Major', 'L1', 'L2', 'DeFi', 'Meme', 'AI', 'NFT', 'kAsset', 'Gaming', 'Other'];

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [metaData, midsData] = await Promise.all([
          proxyRequest({ type: 'metaAndAssetCtxs' }),
          proxyRequest({ type: 'allMids' }),
        ]);

        const newMarketData: Record<string, MarketData> = {};
        
        if (metaData && Array.isArray(metaData) && metaData.length >= 2) {
          const meta = metaData[0];
          const assetCtxs = metaData[1];
          
          meta.universe?.forEach((asset: any, index: number) => {
            const ctx = assetCtxs[index];
            const symbol = asset.name;
            const midPrice = midsData?.[symbol] ? parseFloat(midsData[symbol]) : 0;
            
            newMarketData[symbol] = {
              symbol,
              price: midPrice,
              volume24h: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0,
              openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) * midPrice : 0,
              fundingRate: ctx?.funding ? parseFloat(ctx.funding) * 100 : 0,
            };
          });
        }
        
        setMarketData(newMarketData);
      } catch (err) {
        console.error('Failed to fetch market data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  const filteredAssets = useMemo(() => {
    return Object.entries(ASSET_MAPPINGS)
      .filter(([id, asset]) => {
        const matchesSearch = 
          id.toLowerCase().includes(search.toLowerCase()) ||
          asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
          asset.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || asset.category === category ||
          (category === 'Other' && !CATEGORIES.slice(1, -1).includes(asset.category));
        return matchesSearch && matchesCategory;
      })
      .map(([id, asset]) => ({
        id,
        ...asset,
        market: marketData[asset.symbol] || null,
      }))
      .sort((a, b) => {
        // Sort by volume if available, then by ID
        if (a.market?.volume24h && b.market?.volume24h) {
          return b.market.volume24h - a.market.volume24h;
        }
        const numA = parseInt(a.id.replace('@', ''));
        const numB = parseInt(b.id.replace('@', ''));
        return numA - numB;
      });
  }, [search, category, marketData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatUsd = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toPrecision(4)}`;
  };

  const totalVolume = useMemo(() => 
    Object.values(marketData).reduce((sum, m) => sum + (m.volume24h || 0), 0)
  , [marketData]);

  const totalOI = useMemo(() => 
    Object.values(marketData).reduce((sum, m) => sum + (m.openInterest || 0), 0)
  , [marketData]);

  const stats = useMemo(() => ({
    total: Object.keys(ASSET_MAPPINGS).length,
    perps: Object.values(ASSET_MAPPINGS).filter(a => !a.symbol.startsWith('k')).length,
    kAssets: Object.values(ASSET_MAPPINGS).filter(a => a.symbol.startsWith('k')).length,
  }), []);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Assets</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hyperliquid markets • Live data
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-card">
            <p className="text-lg sm:text-2xl font-mono font-semibold text-foreground">{stats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Assets</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-card">
            <p className="text-lg sm:text-2xl font-mono font-semibold text-foreground">{stats.perps}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Perps Markets</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-card">
            <p className="text-lg sm:text-2xl font-mono font-semibold text-foreground">
              {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : formatUsd(totalVolume)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">24h Volume</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-border bg-card">
            <p className="text-lg sm:text-2xl font-mono font-semibold text-foreground">
              {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : formatUsd(totalOI)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Open Interest</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, symbol, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
                className="text-xs h-7 sm:h-8 px-2 sm:px-3"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Asset Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-medium text-muted-foreground">Symbol</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium text-muted-foreground">Volume</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium text-muted-foreground hidden md:table-cell">OI</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium text-muted-foreground">Funding</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <code className="font-mono text-primary text-xs">{asset.id}</code>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <span className="font-medium text-foreground">{asset.symbol}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-muted-foreground hidden sm:table-cell">{asset.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono text-foreground">
                      {asset.market?.price ? formatPrice(asset.market.price) : '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono text-foreground">
                      {asset.market?.volume24h ? formatUsd(asset.market.volume24h) : '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono text-foreground hidden md:table-cell">
                      {asset.market?.openInterest ? formatUsd(asset.market.openInterest) : '-'}
                    </td>
                    <td className={cn(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono",
                      asset.market?.fundingRate && asset.market.fundingRate > 0 ? "text-profit-3" : 
                      asset.market?.fundingRate && asset.market.fundingRate < 0 ? "text-loss-3" : "text-muted-foreground"
                    )}>
                      {asset.market?.fundingRate ? `${asset.market.fundingRate.toFixed(4)}%` : '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        asset.category === 'Major' && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                        asset.category === 'L1' && "bg-purple-500/20 text-purple-600 dark:text-purple-400",
                        asset.category === 'L2' && "bg-pink-500/20 text-pink-600 dark:text-pink-400",
                        asset.category === 'DeFi' && "bg-green-500/20 text-green-600 dark:text-green-400",
                        asset.category === 'Meme' && "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                        asset.category === 'AI' && "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
                        asset.category === 'kAsset' && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                        !['Major', 'L1', 'L2', 'DeFi', 'Meme', 'AI', 'kAsset'].includes(asset.category) && "bg-muted text-muted-foreground"
                      )}>
                        {asset.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Showing {filteredAssets.length} of {Object.keys(ASSET_MAPPINGS).length} assets
        </p>
      </div>
    </Layout>
  );
}
