import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import type { VaultInfo, UserFarmPosition } from '../types';

// Handler for user farms
export async function handleUserFarms(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const userAddress = routeParams.userAddress;
  const { chainId } = parseQueryParams(url);
  const chain = chainId || '43114';

  const mockUserFarms = {
    userAddress: userAddress,
    chain: chain,
    farms: [
      {
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        name: "High Yield ETH-USDC Farm",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        strategy: "auto_compound",
        tokenX: {
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          symbol: "ETH",
          name: "Ethereum"
        },
        tokenY: {
          address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
          symbol: "USDC",
          name: "USD Coin"
        },
        userPosition: {
          shares: "1500.75",
          valueUsd: "76500.00",
          depositedAt: Math.floor(Date.now() / 1000) - 604800,
          lastHarvest: Math.floor(Date.now() / 1000) - 86400
        },
        rewards: {
          pending: "250.50",
          pendingUsd: "500.25",
          totalEarned: "1250.75",
          totalEarnedUsd: "2501.50"
        },
        apy: 18.5,
        tvl: "5100000.0",
        status: "active"
      },
      {
        vaultId: "vault_002", 
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        name: "Stable Yield BNB-BUSD Farm",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        strategy: "yield_optimization",
        tokenX: {
          address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          symbol: "BNB",
          name: "Binance Coin"
        },
        tokenY: {
          address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
          symbol: "BUSD",
          name: "Binance USD"
        },
        userPosition: {
          shares: "750.25",
          valueUsd: "22500.00",
          depositedAt: Math.floor(Date.now() / 1000) - 1209600,
          lastHarvest: Math.floor(Date.now() / 1000) - 172800
        },
        rewards: {
          pending: "125.25",
          pendingUsd: "250.50",
          totalEarned: "625.75",
          totalEarnedUsd: "1251.50"
        },
        apy: 12.3,
        tvl: "2250000.0",
        status: "active"
      }
    ],
    summary: {
      totalFarms: 2,
      totalValueUsd: "99000.00",
      totalPendingRewardsUsd: "750.75",
      totalEarnedRewardsUsd: "3753.00",
      averageApy: 15.4
    }
  };

  return createApiResponse(mockUserFarms, corsHeaders);
}

// Handler for user farm details
export async function handleUserFarmDetails(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const userAddress = routeParams.userAddress;
  const farmId = routeParams.farmId;
  const { chainId } = parseQueryParams(url);
  const chain = chainId || '43114';

  const mockUserFarmDetails = {
    vaultId: farmId,
    vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
    userAddress: userAddress,
    chain: chain,
    farmDetails: {
      name: "High Yield ETH-USDC Farm",
      description: "Automated yield farming strategy for ETH-USDC liquidity pool",
      poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
      strategy: "auto_compound",
      riskLevel: "medium",
      managementFee: 0.5,
      performanceFee: 10.0,
      tokenX: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18
      },
      tokenY: {
        address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6
      }
    },
    userPosition: {
      shares: "1500.75",
      totalShares: "75000.0",
      sharePercent: 2.0,
      valueUsd: "76500.00",
      depositHistory: [
        {
          amount: "1000.0",
          valueUsd: "51000.00",
          timestamp: Math.floor(Date.now() / 1000) - 604800,
          txHash: "0xdeposit1234567890abcdef1234567890abcdef123"
        },
        {
          amount: "500.75",
          valueUsd: "25500.00",
          timestamp: Math.floor(Date.now() / 1000) - 259200,
          txHash: "0xdeposit2abcdef1234567890abcdef1234567890ab"
        }
      ],
      withdrawalHistory: [],
      lastAction: Math.floor(Date.now() / 1000) - 259200
    },
    rewards: {
      pending: "250.50",
      pendingUsd: "500.25",
      totalEarned: "1250.75",
      totalEarnedUsd: "2501.50",
      harvestHistory: [
        {
          amount: "500.25",
          amountUsd: "1000.50",
          timestamp: Math.floor(Date.now() / 1000) - 86400,
          txHash: "0xharvest1234567890abcdef1234567890abcdef12"
        }
      ],
      nextHarvestAvailable: Math.floor(Date.now() / 1000) + 3600
    },
    performance: {
      apy: 18.5,
      dailyYield: 0.05,
      weeklyYield: 0.35,
      monthlyYield: 1.5,
      totalReturn: 3.27,
      impermanentLoss: -0.15
    },
    vaultStats: {
      tvl: "5100000.0",
      totalShares: "75000.0",
      sharePrice: "68.0",
      lastUpdate: Math.floor(Date.now() / 1000) - 300
    }
  };

  return createApiResponse(mockUserFarmDetails, corsHeaders);
}
