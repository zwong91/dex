import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import { subgraphClient, isSubgraphHealthy } from '../graphql/client';
import type { VaultInfo, PaginationInfo } from '../types';

// Handler for vaults list
export async function handleVaultsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const status = url.searchParams.get('status') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'totalValueLockedUSD';
    const offset = (page - 1) * limit;
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log('🔗 Fetching vaults from subgraph...');
    
    // Get pools data that can act as "vaults" (pools with significant liquidity)
    const pools = await subgraphClient.getPools(limit, offset, sortBy, 'desc');
    
    // Transform pools to vault format
    const vaults = pools
      .filter(pool => parseFloat(pool.totalValueLockedUSD || '0') > 10000) // Minimum TVL for vaults
      .map(pool => ({
        vaultId: pool.id,
        vaultAddress: pool.id,
        name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Auto-Compound Vault`,
        description: `Automated yield farming for ${pool.tokenX.symbol}-${pool.tokenY.symbol} liquidity`,
        chain: 'bsc-testnet',
        poolAddress: pool.id,
        strategy: 'auto_compound',
        riskLevel: calculateRiskLevel(pool),
        tokenX: {
          symbol: pool.tokenX.symbol,
          name: pool.tokenX.name,
          address: pool.tokenX.id
        },
        tokenY: {
          symbol: pool.tokenY.symbol,
          name: pool.tokenY.name,
          address: pool.tokenY.id
        },
        tvl: pool.totalValueLockedUSD,
        apy: calculateAPY(pool),
        totalShares: calculateTotalShares(pool),
        sharePrice: calculateSharePrice(pool),
        managementFee: 0.5,
        performanceFee: 10.0,
        status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
        createdAt: new Date(pool.timestamp * 1000).toISOString(),
        lastUpdate: pool.timestamp
      }));

    const total = vaults.length;
    const pagination = {
      page,
      limit,
      total,
      hasMore: page * limit < total
    };

    const summary = {
      totalVaults: total,
      totalTvl: vaults.reduce((sum, vault) => sum + parseFloat(vault.tvl || '0'), 0).toString(),
      averageApy: vaults.length > 0 ? vaults.reduce((sum, vault) => sum + vault.apy, 0) / vaults.length : 0,
      activeVaults: vaults.filter(v => v.status === 'active').length,
      pausedVaults: vaults.filter(v => v.status === 'paused').length,
      deprecatedVaults: vaults.filter(v => v.status === 'deprecated').length
    };

    const response = {
      pagination,
      filters: { status, sortBy },
      vaults,
      summary
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching vaults:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch vaults data',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

// Helper functions for vault calculations
function calculateRiskLevel(pool: any): 'low' | 'medium' | 'high' {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const volume24h = parseFloat(pool.volumeUSD || '0');
  
  if (tvl > 1000000 && volume24h / tvl < 0.1) return 'low';
  if (tvl > 100000 && volume24h / tvl < 0.5) return 'medium';
  return 'high';
}

function calculateAPY(pool: any): number {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const fees24h = parseFloat(pool.feesUSD || '0');
  
  if (tvl === 0) return 0;
  
  // Annualized APY based on 24h fees
  const dailyReturn = fees24h / tvl;
  const apy = ((1 + dailyReturn) ** 365 - 1) * 100;
  
  return Math.min(apy, 500); // Cap at 500% APY
}

function calculateTotalShares(pool: any): string {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const sharePrice = 50; // Base share price
  return (tvl / sharePrice).toFixed(2);
}

function calculateSharePrice(pool: any): string {
  // Simple share price calculation based on TVL and performance
  const basePricei = 50;
  const performanceMultiplier = 1 + (calculateAPY(pool) / 100 / 365 * 30); // Monthly growth
  return (basePricei * performanceMultiplier).toFixed(2);
}

// Handler for vaults by chain
export async function handleVaultsByChain(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const status = url.searchParams.get('status') || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'tvl';

  const mockVaultsByChain = {
    chain: chain,
    filters: {
      status: status,
      sortBy: sortBy
    },
    vaults: [
      {
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        name: "High Yield ETH-USDC Vault",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        strategy: "auto_compound",
        riskLevel: "medium",
        tokenPair: "ETH/USDC",
        tvl: "5100000.0",
        apy: 18.5,
        totalShares: "75000.0",
        sharePrice: "68.0",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.051,
          weeklyYield: 0.357,
          monthlyYield: 1.54,
          totalReturn: 18.5
        }
      },
      {
        vaultId: "vault_002",
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        name: "Stable Yield BNB-BUSD Vault",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        strategy: "yield_optimization",
        riskLevel: "low",
        tokenPair: "BNB/BUSD",
        tvl: "2250000.0",
        apy: 12.3,
        totalShares: "45000.0",
        sharePrice: "50.0",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.034,
          weeklyYield: 0.238,
          monthlyYield: 1.03,
          totalReturn: 12.3
        }
      },
      {
        vaultId: "vault_003",
        vaultAddress: "0xvault3fedcba0987654321fedcba0987654321fed",
        name: "Conservative BTCB-ETH Vault",
        poolAddress: "0xfedcba0987654321fedcba0987654321fedcba09",
        strategy: "balanced",
        riskLevel: "low",
        tokenPair: "BTCB/ETH",
        tvl: "3825000.0",
        apy: 9.8,
        totalShares: "55000.0",
        sharePrice: "69.55",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.027,
          weeklyYield: 0.189,
          monthlyYield: 0.82,
          totalReturn: 9.8
        }
      }
    ],
    summary: {
      totalVaults: 3,
      totalTvl: "11175000.0",
      averageApy: 13.53,
      chainInfo: {
        name: chain,
        totalPools: 15,
        activeStrategies: 3
      }
    }
  };

  return new Response(JSON.stringify(mockVaultsByChain), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault share price
export async function handleVaultSharePrice(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];

  const mockVaultSharePrice = {
    vaultAddress: vaultAddress,
    chain: chain,
    currentSharePrice: "68.45",
    priceHistory: [
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        price: "67.80",
        date: new Date(Date.now() - 86400000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        price: "67.25",
        date: new Date(Date.now() - 172800000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 259200,
        price: "66.90",
        date: new Date(Date.now() - 259200000).toISOString()
      }
    ],
    performance: {
      daily: 0.96,
      weekly: 1.82,
      monthly: 2.31,
      inception: 18.5
    },
    totalShares: "75000.0",
    totalValue: "5133750.0",
    lastUpdate: Math.floor(Date.now() / 1000) - 300
  };

  return new Response(JSON.stringify(mockVaultSharePrice), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault details
export async function handleVaultDetails(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];

  const mockVaultDetails = {
    vaultAddress: vaultAddress,
    chain: chain,
    vaultInfo: {
      name: "High Yield ETH-USDC Vault",
      description: "Automated yield farming strategy for ETH-USDC liquidity pool with compound rewards",
      poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
      strategy: "auto_compound",
      riskLevel: "medium",
      launched: "2024-01-15T00:00:00Z",
      manager: "0xmanager1234567890abcdef1234567890abcdef123"
    },
    tokens: {
      tokenX: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        balance: "2000.75",
        balanceUsd: "5101875.0"
      },
      tokenY: {
        address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        balance: "5101875.0",
        balanceUsd: "5101875.0"
      }
    },
    performance: {
      tvl: "5100000.0",
      apy: 18.5,
      totalShares: "75000.0",
      sharePrice: "68.0",
      dailyYield: 0.051,
      weeklyYield: 0.357,
      monthlyYield: 1.54,
      totalReturn: 18.5,
      sharpeRatio: 1.45,
      maxDrawdown: -2.3
    },
    fees: {
      managementFee: 0.5,
      performanceFee: 10.0,
      withdrawalFee: 0.1,
      totalFeesCollected: "255000.0"
    },
    strategy: {
      type: "auto_compound",
      description: "Automatically compounds rewards back into the pool",
      rebalanceFrequency: "daily",
      lastRebalance: Math.floor(Date.now() / 1000) - 3600,
      nextRebalance: Math.floor(Date.now() / 1000) + 82800
    },
    stats: {
      totalDepositors: 1247,
      averageDepositSize: "4089.41",
      largestDeposit: "255000.0",
      totalDeposits: "5100000.0",
      totalWithdrawals: "765000.0",
      netInflows: "4335000.0"
    },
    status: "active",
    lastUpdate: Math.floor(Date.now() / 1000) - 300
  };

  return new Response(JSON.stringify(mockVaultDetails), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault TVL history
export async function handleVaultTvlHistory(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const interval = url.searchParams.get('interval') || 'daily'; // hourly, daily, weekly

  const mockTvlHistory = {
    vaultAddress: vaultAddress,
    chain: chain,
    interval: interval,
    startTime: startTime,
    endTime: endTime,
    currentTvl: "5100000.0",
    history: [
      {
        timestamp: Math.floor(Date.now() / 1000) - 604800,
        tvl: "4850000.0",
        deposits: "125000.0",
        withdrawals: "50000.0",
        yields: "75000.0",
        date: new Date(Date.now() - 604800000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 518400,
        tvl: "4925000.0",
        deposits: "85000.0",
        withdrawals: "25000.0",
        yields: "65000.0",
        date: new Date(Date.now() - 518400000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 432000,
        tvl: "4980000.0",
        deposits: "75000.0",
        withdrawals: "35000.0",
        yields: "55000.0",
        date: new Date(Date.now() - 432000000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 345600,
        tvl: "5025000.0",
        deposits: "65000.0",
        withdrawals: "30000.0",
        yields: "45000.0",
        date: new Date(Date.now() - 345600000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 259200,
        tvl: "5075000.0",
        deposits: "70000.0",
        withdrawals: "25000.0",
        yields: "50000.0",
        date: new Date(Date.now() - 259200000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        tvl: "5090000.0",
        deposits: "35000.0",
        withdrawals: "15000.0",
        yields: "25000.0",
        date: new Date(Date.now() - 172800000).toISOString()
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        tvl: "5100000.0",
        deposits: "25000.0",
        withdrawals: "10000.0",
        yields: "15000.0",
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    analytics: {
      totalGrowth: 5.15,
      averageDailyGrowth: 0.74,
      totalDeposits: "480000.0",
      totalWithdrawals: "190000.0",
      totalYields: "330000.0",
      netFlowTrend: "positive"
    }
  };

  return new Response(JSON.stringify(mockTvlHistory), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault recent activity
export async function handleVaultRecentActivity(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const mockRecentActivity = {
    vaultAddress: vaultAddress,
    chain: chain,
    activities: [
      {
        id: "activity_001",
        type: "deposit",
        userAddress: "0xuser1234567890abcdef1234567890abcdef123456",
        amount: "5000.0",
        amountUsd: "5000.0",
        shares: "73.53",
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        txHash: "0xtx1234567890abcdef1234567890abcdef123456789",
        status: "confirmed"
      },
      {
        id: "activity_002",
        type: "withdrawal",
        userAddress: "0xuser2abcdef1234567890abcdef1234567890abcdef",
        amount: "2500.0",
        amountUsd: "2500.0",
        shares: "36.76",
        timestamp: Math.floor(Date.now() / 1000) - 7200,
        txHash: "0xtx2abcdef1234567890abcdef1234567890abcdef12",
        status: "confirmed"
      },
      {
        id: "activity_003",
        type: "compound",
        amount: "125.75",
        amountUsd: "125.75",
        timestamp: Math.floor(Date.now() / 1000) - 10800,
        txHash: "0xtx3fedcba0987654321fedcba0987654321fedcba09",
        status: "confirmed",
        rewards: {
          tokenX: "0.75",
          tokenY: "125.0"
        }
      },
      {
        id: "activity_004",
        type: "rebalance",
        timestamp: Math.floor(Date.now() / 1000) - 14400,
        txHash: "0xtx4123456789abcdef123456789abcdef123456789a",
        status: "confirmed",
        rebalanceData: {
          oldRatio: "50/50",
          newRatio: "52/48",
          gasCost: "0.025"
        }
      },
      {
        id: "activity_005",
        type: "deposit",
        userAddress: "0xuser3123456789abcdef123456789abcdef123456789",
        amount: "10000.0",
        amountUsd: "10000.0",
        shares: "147.06",
        timestamp: Math.floor(Date.now() / 1000) - 18000,
        txHash: "0xtx5abcdef123456789abcdef123456789abcdef1234",
        status: "confirmed"
      }
    ],
    summary: {
      totalActivities: 5,
      last24h: {
        deposits: 2,
        withdrawals: 1,
        compounds: 1,
        rebalances: 1,
        totalVolumeUsd: "17625.75"
      }
    }
  };

  return new Response(JSON.stringify(mockRecentActivity), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault withdrawals by user
export async function handleVaultWithdrawalsByUser(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[6];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const mockWithdrawals = {
    userAddress: userAddress,
    chain: chain,
    pagination: {
      page: page,
      limit: limit,
      total: 12,
      hasMore: page * limit < 12
    },
    withdrawals: [
      {
        id: "withdrawal_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        vaultName: "High Yield ETH-USDC Vault",
        amount: "2500.0",
        amountUsd: "2500.0",
        shares: "36.76",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        txHash: "0xtx1234567890abcdef1234567890abcdef123456789",
        status: "completed",
        fee: "2.5",
        netAmount: "2497.5"
      },
      {
        id: "withdrawal_002",
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        vaultName: "Stable Yield BNB-BUSD Vault",
        amount: "1000.0",
        amountUsd: "1000.0",
        shares: "20.0",
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        txHash: "0xtx2abcdef1234567890abcdef1234567890abcdef12",
        status: "completed",
        fee: "1.0",
        netAmount: "999.0"
      }
    ],
    summary: {
      totalWithdrawals: 12,
      totalAmountUsd: "18750.0",
      totalFeesUsd: "18.75",
      averageWithdrawal: "1562.50",
      largestWithdrawal: "5000.0"
    }
  };

  return new Response(JSON.stringify(mockWithdrawals), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for vault withdrawals by user and vault
export async function handleVaultWithdrawalsByUserAndVault(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const userAddress = pathSegments[7];

  const mockUserVaultWithdrawals = {
    userAddress: userAddress,
    vaultAddress: vaultAddress,
    chain: chain,
    vaultName: "High Yield ETH-USDC Vault",
    withdrawals: [
      {
        id: "withdrawal_001",
        amount: "2500.0",
        amountUsd: "2500.0",
        shares: "36.76",
        sharePrice: "68.0",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        txHash: "0xtx1234567890abcdef1234567890abcdef123456789",
        status: "completed",
        fee: "2.5",
        netAmount: "2497.5",
        tokens: {
          tokenX: {
            symbol: "ETH",
            amount: "0.98",
            amountUsd: "1250.0"
          },
          tokenY: {
            symbol: "USDC",
            amount: "1247.5",
            amountUsd: "1247.5"
          }
        }
      },
      {
        id: "withdrawal_002",
        amount: "1500.0",
        amountUsd: "1500.0",
        shares: "22.06",
        sharePrice: "68.0",
        timestamp: Math.floor(Date.now() / 1000) - 259200,
        txHash: "0xtx2abcdef1234567890abcdef1234567890abcdef12",
        status: "completed",
        fee: "1.5",
        netAmount: "1498.5",
        tokens: {
          tokenX: {
            symbol: "ETH",
            amount: "0.59",
            amountUsd: "750.0"
          },
          tokenY: {
            symbol: "USDC",
            amount: "748.5",
            amountUsd: "748.5"
          }
        }
      }
    ],
    summary: {
      totalWithdrawals: 2,
      totalAmountUsd: "4000.0",
      totalFeesUsd: "4.0",
      totalShares: "58.82",
      averageSharePrice: "68.0"
    },
    currentPosition: {
      shares: "1441.93",
      valueUsd: "98051.24",
      depositedAmount: "96000.0",
      totalReturn: 2.14
    }
  };

  return new Response(JSON.stringify(mockUserVaultWithdrawals), {
    headers: { 'Content-Type': 'application/json' }
  });
}
