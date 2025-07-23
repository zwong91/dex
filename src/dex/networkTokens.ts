// Centralized token configurations for all networks
import { generateTokenIcon } from './utils/tokenIconGenerator'

export const NETWORK_TOKEN_CONFIGS = {
  97: [ // BSC Testnet
    {
      symbol: 'BNB',
      name: 'BNB',
      address: 'NATIVE', // Special identifier for native BNB
      decimals: 18,
      icon: generateTokenIcon('BNB')
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x64544969ed7EBf5f083679233325356EbE738930',
      decimals: 18,
      icon: generateTokenIcon('USDC')
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      decimals: 18,
      icon: generateTokenIcon('USDT')
    },
    {
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // Real WBNB contract address
      decimals: 18,
      icon: generateTokenIcon('WBNB')
    },
  ],
  56: [ // BSC Mainnet
    {
      symbol: 'BNB',
      name: 'BNB',
      address: 'NATIVE', // Special identifier for native BNB
      decimals: 18,
      icon: generateTokenIcon('BNB')
    },
    {
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // Real WBNB contract address
      decimals: 18,
      icon: generateTokenIcon('WBNB')
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18,
      icon: generateTokenIcon('USDC')
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      icon: generateTokenIcon('USDT')
    },
  ],
  1: [ // Ethereum Mainnet
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      icon: generateTokenIcon('WETH')
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86a33E6441E3073E86c9Ed3B3Ad5e32E6f50A',
      decimals: 6,
      icon: generateTokenIcon('USDC')
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      icon: generateTokenIcon('USDT')
    },
  ],
} as const;

export type TokenConfig = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
};

export type SupportedChainId = keyof typeof NETWORK_TOKEN_CONFIGS;

// Helper function to get tokens for a specific chain
export const getTokensForChain = (chainId: number): TokenConfig[] => {
  const tokens = NETWORK_TOKEN_CONFIGS[chainId as SupportedChainId] || NETWORK_TOKEN_CONFIGS[97];
  // Convert readonly array to mutable array
  return [...tokens];
};

// Helper function to get a specific token by symbol and chain
export const getTokenBySymbol = (symbol: string, chainId: number): TokenConfig | undefined => {
  const tokens = getTokensForChain(chainId);
  return tokens.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
};

// Helper function to get a token by address and chain
export const getTokenByAddress = (address: string, chainId: number): TokenConfig | undefined => {
  const tokens = getTokensForChain(chainId);
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
};

// Helper function to check if a chain is supported
export const isSupportedChain = (chainId: number): chainId is SupportedChainId => {
  return chainId in NETWORK_TOKEN_CONFIGS;
};

// Get chain display name
export const getChainDisplayName = (chainId: number): string => {
  switch (chainId) {
    case 97:
      return 'BSC Testnet';
    case 56:
      return 'BSC Mainnet';
    default:
      return 'Unknown Network';
  }
};
