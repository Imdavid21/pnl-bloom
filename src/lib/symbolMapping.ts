/**
 * HYPERLIQUID SYMBOL MAPPING
 * 
 * Hyperliquid uses asset IDs like @107 for some tokens.
 * This file provides human-readable symbol mappings.
 */

// Known Hyperliquid asset ID to symbol mappings
const ASSET_ID_TO_SYMBOL: Record<string, string> = {
  '@1': 'BTC',
  '@2': 'ETH',
  '@3': 'ARB',
  '@4': 'OP',
  '@5': 'AVAX',
  '@6': 'BNB',
  '@7': 'SOL',
  '@8': 'MATIC',
  '@9': 'DOGE',
  '@10': 'LTC',
  '@11': 'LINK',
  '@12': 'UNI',
  '@13': 'AAVE',
  '@14': 'ATOM',
  '@15': 'APE',
  '@16': 'CRV',
  '@17': 'DYDX',
  '@18': 'FTM',
  '@19': 'GMT',
  '@20': 'NEAR',
  '@21': 'TRX',
  '@22': 'XRP',
  '@23': 'ADA',
  '@24': 'DOT',
  '@25': 'FIL',
  '@26': 'LDO',
  '@27': 'SAND',
  '@28': 'MANA',
  '@29': 'APT',
  '@30': 'BLUR',
  '@31': 'MAGIC',
  '@32': 'ARK',
  '@33': 'CFX',
  '@34': 'LRC',
  '@35': 'LUNC',
  '@36': 'PEPE',
  '@37': 'SUI',
  '@38': 'SEI',
  '@39': 'CYBER',
  '@40': 'ORDI',
  '@41': 'TIA',
  '@42': 'MEME',
  '@43': 'INJ',
  '@44': 'JTO',
  '@45': 'STRK',
  '@46': 'PYTH',
  '@47': 'WIF',
  '@48': 'JUP',
  '@49': 'PENDLE',
  '@50': 'W',
  '@51': 'ENA',
  '@52': 'TON',
  '@53': 'ONDO',
  '@54': 'ZRO',
  '@55': 'IO',
  '@56': 'ZK',
  '@57': 'BRETT',
  '@58': 'RENDER',
  '@59': 'LISTA',
  '@60': 'NOT',
  '@61': 'BOME',
  '@62': 'PEOPLE',
  '@63': 'FLOKI',
  '@64': 'BONK',
  '@65': 'ETHFI',
  '@66': 'MEW',
  '@67': 'PONKE',
  '@68': 'POPCAT',
  '@69': 'NEIRO',
  '@70': 'MOTHER',
  '@71': 'DOGS',
  '@72': 'SUNDOG',
  '@73': 'TURBO',
  '@74': 'CAT',
  '@75': 'MOODENG',
  '@76': 'NEIROETH',
  '@77': 'GOAT',
  '@78': 'PNUT',
  '@79': 'MOG',
  '@80': 'ACT',
  '@81': 'CHILLGUY',
  '@82': 'MICHI',
  '@83': 'LUCE',
  '@84': 'BAN',
  '@85': 'FARTCOIN',
  '@86': 'AI16Z',
  '@87': 'GRIFFAIN',
  '@88': 'ZEREBRO',
  '@89': 'AIXBT',
  '@90': 'VIRTUAL',
  '@91': 'PENGU',
  '@92': 'USUAL',
  '@93': 'MORPHO',
  '@94': 'MOVE',
  '@95': 'VVAIFU',
  '@96': 'ALCH',
  '@97': 'ME',
  '@98': 'KOMA',
  '@99': 'GMCAT',
  '@100': 'FARM',
  '@101': 'PIPPIN',
  '@102': 'ANIME',
  '@103': 'SONIC',
  '@104': 'TRUMP',
  '@105': 'MELANIA',
  '@106': 'VINE',
  '@107': 'HYPE',
  '@108': 'ARC',
  '@109': 'DEEP',
  '@110': 'GAME',
  '@111': 'COOKIE',
  '@112': 'BUZZ',
  '@113': 'LAYER3',
  '@114': 'TOSHI',
  '@115': 'ZETA',
  '@116': 'BERA',
  '@117': 'TST',
  '@118': 'KAITO',
  '@119': 'SHELL',
  '@120': 'IP',
  '@121': 'BOOP',
  '@122': 'HOUSE',
  '@123': 'SPX',
  '@124': 'LAUNCHCOIN',
  '@125': 'FARTBOY',
  '@200': 'kBTC',
  '@201': 'kETH',
  '@202': 'kSOL',
  '@203': 'kARB',
  '@204': 'kPEPE',
  '@205': 'kBONK',
  '@206': 'kDOGE',
  '@207': 'kSUI',
  '@208': 'kLINK',
  '@209': 'kAVAX',
  '@210': 'kOP',
  '@211': 'kAPT',
  '@212': 'kINJ',
  '@213': 'kMATIC',
  '@214': 'kTIA',
  '@215': 'kSEI',
  '@216': 'kBLUR',
  '@217': 'kJUP',
  '@218': 'kSTRK',
  '@219': 'kPYTH',
  '@220': 'kWIF',
  '@221': 'kENA',
  '@222': 'kTON',
  '@223': 'kONDO',
  '@224': 'kIO',
  '@225': 'kZK',
  '@226': 'kZRO',
  '@227': 'kRENDER',
  '@228': 'kW',
  '@229': 'kNOT',
  '@230': 'kBOME',
  '@231': 'kFLOKI',
  '@232': 'kPOPCAT',
  '@233': 'kTURBO',
  '@234': 'kMOODENG',
  '@235': 'kGOAT',
  '@236': 'kPNUT',
  '@237': 'kACT',
  '@238': 'kVIRTUAL',
  '@239': 'kPENGU',
  '@240': 'kAI16Z',
  '@241': 'kAIXBT',
  '@242': 'kFARTCOIN',
  '@243': 'kTRUMP',
  '@244': 'kMELANIA',
  '@245': 'kHYPE',
  '@246': 'kANIME',
  '@247': 'kSONIC',
  '@248': 'kBERA',
  '@249': 'kKAITO',
  '@250': 'kIP',
};

/**
 * Convert a Hyperliquid market/asset identifier to a readable symbol
 * @param identifier The market identifier (e.g., "@107" or "BTC-PERP" or "BTC")
 * @returns Human-readable symbol (e.g., "HYPE")
 */
export function getSymbol(identifier: string | null | undefined): string {
  if (!identifier) return 'UNKNOWN';
  
  const trimmed = identifier.trim();
  
  // Check if it's an asset ID like @107
  if (trimmed.startsWith('@')) {
    return ASSET_ID_TO_SYMBOL[trimmed] || trimmed;
  }
  
  // Remove common suffixes
  const cleanSymbol = trimmed
    .replace(/-PERP$/i, '')
    .replace(/-USD$/i, '')
    .replace(/-USDC$/i, '')
    .replace(/\/USD$/i, '')
    .replace(/\/USDC$/i, '');
  
  return cleanSymbol.toUpperCase();
}

/**
 * Format a market name for display
 * @param market The market identifier
 * @returns Formatted market name with /USD suffix
 */
export function formatMarket(market: string | null | undefined): string {
  const symbol = getSymbol(market);
  return `${symbol}/USD`;
}
