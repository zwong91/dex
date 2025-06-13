import { bsc, bscTestnet } from "wagmi/chains";

// BSC Network Configuration
export const BSC_NETWORKS = {
  testnet: {
    ...bscTestnet,
    contracts: {
      uncToken: "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882",
      usdtToken: "0xafC9D020d0b67522337058f0fDea057769dd386A",
      uncSwap: "0x1234567890123456789012345678901234567890",
      // Add more contract addresses as needed
    },
    faucet: {
      enabled: true,
      uncAmount: "50000",
      usdtAmount: "75000",
    },
    apiEndpoint: "http://localhost:3000", // Backend API endpoint
  },
  mainnet: {
    ...bsc,
    contracts: {
      uncToken: "", // Add mainnet addresses when available
      usdtToken: "",
      uncSwap: "",
    },
    faucet: {
      enabled: false,
      uncAmount: "0",
      usdtAmount: "0",
    },
    apiEndpoint: "https://api.unc-dex.com", // Production API endpoint
  }
} as const;

// Current network (change this for production)
export const CURRENT_NETWORK = BSC_NETWORKS.testnet;

// BSC Gas Settings
export const BSC_GAS_SETTINGS = {
  testnet: {
    gasPrice: "5000000000", // 5 Gwei
    gasLimit: "200000",
  },
  mainnet: {
    gasPrice: "3000000000", // 3 Gwei
    gasLimit: "200000",
  }
};

// UNC DEX Token Information
export const UNC_TOKENS = {
  UNC: {
    name: "Universal Network Coin",
    symbol: "UNC",
    decimals: 18,
    description: "Primary governance and utility token for UNC Protocol",
    color: "#10B981", // Green color
  },
  USDT: {
    name: "Tether USD",
    symbol: "USDT", 
    decimals: 18,
    description: "Stablecoin paired with UNC for trading",
    color: "#26A17B", // Tether green color
  },
  UNCLT: {
    name: "UNC Liquidity Token",
    symbol: "UNCLT",
    decimals: 18,
    description: "Liquidity provider tokens representing pool shares",
    color: "#059669", // Darker green color
  }
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

export const getBSCExplorerUrl = (txHash: string, isTestnet: boolean = true): string => {
  const baseUrl = isTestnet 
    ? "https://testnet.bscscan.com" 
    : "https://bscscan.com";
  return `${baseUrl}/tx/${txHash}`;
};

export const getBSCAddressUrl = (address: string, isTestnet: boolean = true): string => {
  const baseUrl = isTestnet 
    ? "https://testnet.bscscan.com" 
    : "https://bscscan.com";
  return `${baseUrl}/address/${address}`;
};

export const getBSCTokenUrl = (tokenAddress: string, isTestnet: boolean = true): string => {
  const baseUrl = isTestnet 
    ? "https://testnet.bscscan.com" 
    : "https://bscscan.com";
  return `${baseUrl}/token/${tokenAddress}`;
};

// BSC Transaction helpers
export const estimateBSCGas = (isTestnet: boolean = true) => {
  return BSC_GAS_SETTINGS[isTestnet ? 'testnet' : 'mainnet'];
};

// API endpoints for backend communication
export const API_ENDPOINTS = {
  health: "/health",
  networkInfo: "/network-info",
  document: "/document",
  faucet: (wallet: string) => `/faucet/${wallet}`,
  offsets: (documentId: string) => `/offsets/${documentId}`,
  report: (documentId: string) => `/report/${documentId}`,
  systemReport: "/system-report",
  tokenInfo: (contractAddr?: string) => `/token-info${contractAddr ? `/${contractAddr}` : ""}`,
  balance: (userAddress: string) => `/balance/${userAddress}`,
};

// Environment check
export const isTestnetEnvironment = (): boolean => {
  return process.env.NODE_ENV !== "production" || 
         process.env.NEXT_PUBLIC_BSC_NETWORK === "testnet";
};
