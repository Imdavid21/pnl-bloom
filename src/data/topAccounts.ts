/**
 * Top Accounts - Static list of tracked whale wallets
 * Balance data is fetched dynamically with caching
 */

export interface TopAccount {
  address: string;
  nameTag: string;
  staticBalance: string; // Initial balance from CSV
  staticPercentage: string;
  staticTxnCount: number;
}

export const TOP_ACCOUNTS: TopAccount[] = [
  { address: "0x2222222222222222222222222222222222222222", nameTag: "", staticBalance: "955,580,376.23 HYPE", staticPercentage: "-", staticTxnCount: 1208790 },
  { address: "0x5555555555555555555555555555555555555555", nameTag: "Hyperliquid: WHYPE Token", staticBalance: "9,545,852.22 HYPE", staticPercentage: "2.84%", staticTxnCount: 1627037 },
  { address: "0xf89d7b9c864f589bbf53a82105107622b35eaa40", nameTag: "Bybit: Hot Wallet", staticBalance: "7,022,986.33 HYPE", staticPercentage: "2.09%", staticTxnCount: 52440 },
  { address: "0xf8191d98ae98d2f7abdfb63a9b0b812b93c873aa", nameTag: "", staticBalance: "1,081,453.57 HYPE", staticPercentage: "0.32%", staticTxnCount: 581 },
  { address: "0xaa1e42c21d71493af1560b75bb293a2401dd157b", nameTag: "", staticBalance: "583,062.43 HYPE", staticPercentage: "0.17%", staticTxnCount: 23 },
  { address: "0x8b30c22c6610be016d13c4a6cfc23986e911d914", nameTag: "", staticBalance: "403,231.31 HYPE", staticPercentage: "0.12%", staticTxnCount: 4 },
  { address: "0xd1aebbd4d53fc248a8413c9e6202ebacad6db709", nameTag: "", staticBalance: "400,000 HYPE", staticPercentage: "0.12%", staticTxnCount: 3 },
  { address: "0x2933782b5a8d72f2754103d1489614f29bfa4625", nameTag: "KuCoin: Wallet", staticBalance: "390,311.51 HYPE", staticPercentage: "0.12%", staticTxnCount: 180 },
  { address: "0x011a1a6a9897295e1bce760aa70d24470d215809", nameTag: "", staticBalance: "368,958.12 HYPE", staticPercentage: "0.11%", staticTxnCount: 3 },
  { address: "0xf5ecf50b4945e4b32fcabecfbfd8672bf60e2e9d", nameTag: "", staticBalance: "357,732.46 HYPE", staticPercentage: "0.11%", staticTxnCount: 9 },
  { address: "0x393d0b87ed38fc779fd9611144ae649ba6082109", nameTag: "Kinetiq: Staking Manager", staticBalance: "351,084.65 HYPE", staticPercentage: "0.10%", staticTxnCount: 67755 },
  { address: "0x8d25fb438c6efcd08679ffa82766869b50e24608", nameTag: "", staticBalance: "330,357.14 HYPE", staticPercentage: "0.10%", staticTxnCount: 51682 },
  { address: "0x65356f43684e4a9115df95cc92e9c487a8349c51", nameTag: "", staticBalance: "329,970 HYPE", staticPercentage: "0.10%", staticTxnCount: 3 },
  { address: "0xca34b166795425bbf786e3642f87ee3b1b3934fe", nameTag: "", staticBalance: "329,678.44 HYPE", staticPercentage: "0.10%", staticTxnCount: 2 },
  { address: "0x77b029f82b5dcf5674a61505edb3a5e6b5023bb7", nameTag: "", staticBalance: "308,056 HYPE", staticPercentage: "0.09%", staticTxnCount: 3 },
  { address: "0x8a6c1fa7f06caa59f81a4417b8ba487dbfa54ad3", nameTag: "", staticBalance: "281,884.01 HYPE", staticPercentage: "0.08%", staticTxnCount: 4 },
  { address: "0x487828727cc97172205faeb8d15b3ee5d9924599", nameTag: "", staticBalance: "250,001.02 HYPE", staticPercentage: "0.07%", staticTxnCount: 0 },
  { address: "0xd282232463d50d54ccbccf0edc5c7562ae47c1e7", nameTag: "", staticBalance: "247,349.12 HYPE", staticPercentage: "0.07%", staticTxnCount: 26 },
  { address: "0x3a28dcae31eea3984c87546f9d1709bfa9eeb030", nameTag: "", staticBalance: "232,855.67 HYPE", staticPercentage: "0.07%", staticTxnCount: 3 },
  { address: "0xecf0ddab9fcf76434f31e9c554a9f8465b4b7444", nameTag: "", staticBalance: "220,223.6 HYPE", staticPercentage: "0.07%", staticTxnCount: 2 },
  { address: "0xffca5ef6e97ab9d685483d0b6bc652d64a02e0f4", nameTag: "", staticBalance: "219,922 HYPE", staticPercentage: "0.07%", staticTxnCount: 2 },
  { address: "0xf70c9547ca5016797d7fd9623320d653e82d83a5", nameTag: "", staticBalance: "219,805.73 HYPE", staticPercentage: "0.07%", staticTxnCount: 4 },
  { address: "0xf35a6bd6e0459a4b53a27862c51a2a7292b383d1", nameTag: "CoinSpot 1", staticBalance: "214,635.12 HYPE", staticPercentage: "0.06%", staticTxnCount: 33 },
  { address: "0x88c847c2abcc9f627248f45af7d1efcd3af5466f", nameTag: "", staticBalance: "213,952.31 HYPE", staticPercentage: "0.06%", staticTxnCount: 3 },
  { address: "0x0a319407fdbe2776400abfcf17eaa706051bb0ad", nameTag: "", staticBalance: "208,837.49 HYPE", staticPercentage: "0.06%", staticTxnCount: 5 },
];
