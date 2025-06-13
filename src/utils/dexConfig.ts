import { bsc, bscTestnet, mainnet, polygon, arbitrum } from "wagmi/chains";

// Supported Networks Configuration
export const SUPPORTED_NETWORKS = {
  bscTestnet: {
    id: bscTestnet.id,
    name: "BSC Testnet",
    symbol: "tBNB",
    nativeCurrency: bscTestnet.nativeCurrency,
    rpcUrls: bscTestnet.rpcUrls,
    blockExplorers: bscTestnet.blockExplorers,
    contracts: {
      // Default pool contracts - can be customized
      tokenA: "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882",
      tokenB: "0xafC9D020d0b67522337058f0fDea057769dd386A",
      dexRouter: "0xC8fb994B992B01C72c969eC9C077CD030eaD2A7F",
      liquidityToken: "0x4a62fa31Cd52BE39a57621783f16DEC3c54e30ac",
      factory: "",
    },
    faucet: {
      enabled: true,
      endpoint: "http://localhost:3000/faucet",
    },
  },
  bscMainnet: {
    id: bsc.id,
    name: "BSC Mainnet",
    symbol: "BNB",
    nativeCurrency: bsc.nativeCurrency,
    rpcUrls: bsc.rpcUrls,
    blockExplorers: bsc.blockExplorers,
    contracts: {
      tokenA: "",
      tokenB: "",
      dexRouter: "",
      liquidityToken: "",
      factory: "",
    },
    faucet: {
      enabled: false,
      endpoint: "",
    },
  },
  ethereum: {
    id: mainnet.id,
    name: "Ethereum",
    symbol: "ETH",
    nativeCurrency: mainnet.nativeCurrency,
    rpcUrls: mainnet.rpcUrls,
    blockExplorers: mainnet.blockExplorers,
    contracts: {
      tokenA: "",
      tokenB: "",
      dexRouter: "",
      liquidityToken: "",
      factory: "",
    },
    faucet: {
      enabled: false,
      endpoint: "",
    },
  },
  polygon: {
    id: polygon.id,
    name: "Polygon",
    symbol: "MATIC",
    nativeCurrency: polygon.nativeCurrency,
    rpcUrls: polygon.rpcUrls,
    blockExplorers: polygon.blockExplorers,
    contracts: {
      tokenA: "",
      tokenB: "",
      dexRouter: "",
      liquidityToken: "",
      factory: "",
    },
    faucet: {
      enabled: false,
      endpoint: "",
    },
  },
  arbitrum: {
    id: arbitrum.id,
    name: "Arbitrum One",
    symbol: "ETH",
    nativeCurrency: arbitrum.nativeCurrency,
    rpcUrls: arbitrum.rpcUrls,
    blockExplorers: arbitrum.blockExplorers,
    contracts: {
      tokenA: "",
      tokenB: "",
      dexRouter: "",
      liquidityToken: "",
      factory: "",
    },
    faucet: {
      enabled: false,
      endpoint: "",
    },
  },
} as const;

// Current network (change this for production)
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.bscTestnet;

// Gas Settings per network
export const GAS_SETTINGS = {
  [bscTestnet.id]: {
    gasPrice: "5000000000", // 5 Gwei
    gasLimit: "200000",
  },
  [bsc.id]: {
    gasPrice: "3000000000", // 3 Gwei
    gasLimit: "200000",
  },
  [mainnet.id]: {
    gasPrice: "20000000000", // 20 Gwei
    gasLimit: "200000",
  },
  [polygon.id]: {
    gasPrice: "30000000000", // 30 Gwei
    gasLimit: "200000",
  },
  [arbitrum.id]: {
    gasPrice: "100000000", // 0.1 Gwei
    gasLimit: "300000",
  },
};

// Common Token Configurations
export const COMMON_TOKENS = {
  // Stablecoins
  USDT: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 18,
    description: "USD Tether stablecoin",
    color: "#26A17B",
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
    description: "USD Coin stablecoin",
    color: "#2775CA",
  },
  DAI: {
    name: "Dai",
    symbol: "DAI",
    decimals: 18,
    description: "MakerDAO stablecoin",
    color: "#F4B731",
  },
  BUSD: {
    name: "Binance USD",
    symbol: "BUSD",
    decimals: 18,
    description: "Binance USD stablecoin",
    color: "#F0B90B",
  },
  // Major cryptocurrencies
  BTC: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    description: "Bitcoin wrapped token",
    color: "#F7931A",
  },
  ETH: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    description: "Ethereum native token",
    color: "#627EEA",
  },
  BNB: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
    description: "Binance Coin",
    color: "#F3BA2F",
  },
  // Liquidity tokens
  LP: {
    name: "Liquidity Token",
    symbol: "LP",
    decimals: 18,
    description: "Liquidity provider tokens representing pool shares",
    color: "#059669",
  }
} as const;

// DEX Features Configuration
export const DEX_FEATURES = {
  swapping: {
    enabled: true,
    feePercentage: 0.3, // 0.3%
    slippageTolerance: 0.5, // 0.5%
  },
  liquidity: {
    enabled: true,
    withdrawalFee: 0.1, // 0.1% for early withdrawal
    minimumLiquidity: 1000, // Minimum liquidity requirement
  },
  farming: {
    enabled: true,
    baseAPR: 15, // 15% base APR
    boostedAPR: 50, // 50% for stakers
  },
  governance: {
    enabled: false,
    votingPeriod: 7, // 7 days
    proposalThreshold: 10000, // Minimum tokens to create proposal
  },
  analytics: {
    enabled: true,
    trackVolume: true,
    trackTVL: true,
    trackFees: true,
  },
} as const;

// Helper functions
export const formatTokenAmount = (amount: string | number, decimals: number = 18): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  } else {
    return num.toFixed(decimals > 6 ? 6 : decimals);
  }
};

export const getExplorerUrl = (txHash: string, chainId: number): string => {
  const network = Object.values(SUPPORTED_NETWORKS).find(n => n.id === chainId);
  if (!network?.blockExplorers?.default?.url) {
    return "";
  }
  return `${network.blockExplorers.default.url}/tx/${txHash}`;
};

export const getAddressUrl = (address: string, chainId: number): string => {
  const network = Object.values(SUPPORTED_NETWORKS).find(n => n.id === chainId);
  if (!network?.blockExplorers?.default?.url) {
    return "";
  }
  return `${network.blockExplorers.default.url}/address/${address}`;
};

export const getNetworkById = (chainId: number) => {
  return Object.values(SUPPORTED_NETWORKS).find(network => network.id === chainId) || DEFAULT_NETWORK;
};
