// DEX API Types

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
  permissions?: string[];
  tier?: string;
}

export interface RateLimitResult {
  exceeded: boolean;
  limit: number;
  resetTime: string;
}

export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  [key: string]: string;
}

export interface PoolData {
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
  version: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserveX: number;
  reserveY: number;
  lbBinStep: number;
  liquidityUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  apr: number;
  apy: number;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  priceUsd: number;
  priceNative: string;
}

export interface UserRewards {
  userAddress: string;
  chain: string;
  totalRewards: string;
  claimableRewards: string;
  rewardsHistory: RewardTransaction[];
  merkleProofs: MerkleProof[];
}

export interface RewardTransaction {
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  timestamp: number;
  txHash: string;
  status: string;
}

export interface MerkleProof {
  tokenAddress: string;
  amount: string;
  proof: string[];
}

export interface VaultInfo {
  vaultId: string;
  vaultAddress: string;
  name: string;
  description: string;
  chain: string;
  poolAddress: string;
  strategy: string;
  riskLevel: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  tvl: string;
  apy: number;
  totalShares: string;
  sharePrice: string;
  managementFee: number;
  performanceFee: number;
  status: string;
  createdAt: string;
  lastUpdate: number;
}

export interface UserFarmPosition {
  vaultId: string;
  vaultAddress: string;
  name: string;
  poolAddress: string;
  strategy: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  userPosition: {
    shares: string;
    valueUsd: string;
    depositedAt: number;
    lastHarvest: number;
  };
  rewards: {
    pending: string;
    pendingUsd: string;
    totalEarned: string;
    totalEarnedUsd: string;
  };
  apy: number;
  tvl: string;
  status: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DexAnalytics {
  totalVolume24h: string;
  totalVolume7d: string;
  totalTvl: string;
  totalPools: number;
  totalUsers: number;
  totalTransactions: number;
  topPools: PoolData[];
  volumeChart: Array<{
    timestamp: string;
    volume: string;
  }>;
  tvlChart: Array<{
    timestamp: string;
    tvl: string;
  }>;
}
