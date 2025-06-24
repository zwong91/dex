import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import { subgraphClient, isSubgraphHealthy, type LiquidityPosition } from '../graphql/client';
// Handler for user bin IDs
export async function handleUserBinIds(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const userAddress = pathSegments[5];
  const chain = pathSegments[6];
  const poolAddress = pathSegments[7];

  const mockUserBinIds = {
    userAddress: userAddress,
    chain: chain,
    poolAddress: poolAddress,
    binIds: [
      {
        binId: 8388605,
        reserveX: "500.25",
        reserveY: "12750.50",
        liquidityShares: "1000.0",
        totalSupply: "5000.0",
        sharePercent: 20.0,
        priceX: 25.501,
        priceY: 0.039214,
        active: false
      },
      {
        binId: 8388608,
        reserveX: "1000.50",
        reserveY: "25500.00",
        liquidityShares: "2000.0",
        totalSupply: "8000.0",
        sharePercent: 25.0,
        priceX: 25.500,
        priceY: 0.039216,
        active: true
      },
      {
        binId: 8388610,
        reserveX: "750.75",
        reserveY: "19125.25",
        liquidityShares: "1500.0",
        totalSupply: "6000.0",
        sharePercent: 25.0,
        priceX: 25.499,
        priceY: 0.039218,
        active: false
      }
    ],
    totalLiquidityUsd: "76500.75",
    totalSharesOwned: "4500.0",
    activeBinId: 8388608,
    binRange: {
      minBin: 8388605,
      maxBin: 8388610,
      spread: 5
    }
  };

  return new Response(JSON.stringify(mockUserBinIds), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for user pool IDs
export async function handleUserPoolIds(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const userAddress = pathSegments[5];
  const chain = pathSegments[6];

  if (!userAddress) {
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Invalid request',
      'User address is required',
      corsHeaders,
      400,
      'INVALID_REQUEST'
    );
  }

  try {
    // Check if subgraph is available and healthy
    const subgraphHealth = await isSubgraphHealthy();
    
    if (subgraphHealth.healthy) {
      console.log('🔗 Fetching user positions from subgraph for:', userAddress);
      
      try {
        const userPositions = await subgraphClient.getUserPositions(userAddress, 100);
        
        // Group positions by pool
        const poolPositions = new Map<string, {
          poolAddress: string;
          name: string;
          tokenX: any;
          tokenY: any;
          binStep: number;
          positions: LiquidityPosition[];
          totalLiquidityUsd: number;
        }>();

        for (const position of userPositions) {
          const poolAddress = position.pool.pairAddress;
          
          if (!poolPositions.has(poolAddress)) {
            poolPositions.set(poolAddress, {
              poolAddress,
              name: `${position.pool.tokenX.symbol}/${position.pool.tokenY.symbol}`,
              tokenX: {
                address: position.pool.id, // This should be tokenX address from pool data
                symbol: position.pool.tokenX.symbol,
                name: position.pool.tokenX.symbol
              },
              tokenY: {
                address: position.pool.id, // This should be tokenY address from pool data
                symbol: position.pool.tokenY.symbol,
                name: position.pool.tokenY.symbol
              },
              binStep: 25, // TODO: Get from pool data
              positions: [],
              totalLiquidityUsd: 0
            });
          }
          
          poolPositions.get(poolAddress)!.positions.push(position);
        }

        // Transform to API format
        const userPoolData = Array.from(poolPositions.values()).map(pool => ({
          poolAddress: pool.poolAddress,
          name: pool.name,
          tokenX: pool.tokenX,
          tokenY: pool.tokenY,
          binStep: pool.binStep,
          userLiquidityUsd: "0", // TODO: Calculate from position data and prices
          userSharePercent: 0, // TODO: Calculate
          positionCount: pool.positions.length,
          activeBins: pool.positions.map(p => p.binId),
          lastActivity: pool.positions.length > 0 ? 
            Math.max(...pool.positions.map(p => parseInt(p.updatedAt))) : 
            Math.floor(Date.now() / 1000)
        }));

        const result = {
          userAddress,
          chain: chain || 'bsc-testnet',
          poolIds: userPoolData,
          totalPools: userPoolData.length,
          totalLiquidityUsd: "0", // TODO: Sum from all pools
          totalActivePositions: userPositions.length
        };

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (subgraphError) {
        console.error('❌ Subgraph query failed for user positions, falling back to mock data:', subgraphError);
        // Fall through to mock data
      }
    } else {
      console.log('⚠️ Subgraph not healthy for user positions, using mock data:', subgraphHealth.error);
    }

    // Fallback to mock data
    const mockUserPoolIds = {
      userAddress: userAddress,
      chain: chain,
      poolIds: [
      {
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        name: "Token X / Token Y Pool",
        tokenX: {
          address: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
          symbol: "TX",
          name: "Token X"
        },
        tokenY: {
          address: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
          symbol: "TY", 
          name: "Token Y"
        },
        binStep: 25,
        userLiquidityUsd: "51000.0",
        userSharePercent: 2.5,
        positionCount: 3,
        activeBins: [8388605, 8388608, 8388610],
        lastActivity: Math.floor(Date.now() / 1000) - 3600
      },
      {
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        name: "ETH / USDC Pool",
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
        binStep: 15,
        userLiquidityUsd: "25500.0",
        userSharePercent: 1.2,
        positionCount: 2,
        activeBins: [8388600, 8388615],
        lastActivity: Math.floor(Date.now() / 1000) - 7200
      }
    ],
    totalPools: 2,
    totalLiquidityUsd: "76500.0",
    totalActivePositions: 5
  };

    return new Response(JSON.stringify(mockUserPoolIds), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching user pool IDs:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Server error',
      'Failed to fetch user pool data',
      corsHeaders,
      500,
      'SERVER_ERROR'
    );
  }
}

// Handler for pool user balances
export async function handlePoolUserBalances(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const poolAddress = url.searchParams.get('poolAddress');
  const userAddress = url.searchParams.get('userAddress');
  const chain = url.searchParams.get('chain') || 'bsc';

  const mockPoolUserBalances = {
    poolAddress: poolAddress || "0x1234567890abcdef1234567890abcdef12345678",
    userAddress: userAddress || "0xuser123456789abcdef123456789abcdef12345678",
    chain: chain,
    balances: [
      {
        binId: 8388605,
        liquidityShares: "1000.0",
        tokenXBalance: "500.25",
        tokenYBalance: "12750.50",
        sharePercent: 20.0,
        valueUsd: "25500.75",
        active: false,
        feesEarnedX: "2.5",
        feesEarnedY: "63.75",
        feesEarnedUsd: "127.5"
      },
      {
        binId: 8388608,
        liquidityShares: "2000.0",
        tokenXBalance: "1000.50",
        tokenYBalance: "25500.00",
        sharePercent: 25.0,
        valueUsd: "51000.50",
        active: true,
        feesEarnedX: "5.0",
        feesEarnedY: "127.5",
        feesEarnedUsd: "255.0"
      }
    ],
    totalLiquidityShares: "3000.0",
    totalValueUsd: "76501.25",
    totalFeesEarnedUsd: "382.5",
    poolInfo: {
      name: "Token X / Token Y Pool",
      totalLiquidityUsd: "3060050.0",
      userSharePercent: 2.5,
      activeBinId: 8388608,
      binStep: 25
    }
  };

  return new Response(JSON.stringify(mockPoolUserBalances), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for user history
export async function handleUserHistory(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[6];
  const poolAddress = pathSegments[7];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const actionType = url.searchParams.get('actionType') || 'all'; // swap, add_liquidity, remove_liquidity, claim_fees

  const mockUserHistory = {
    userAddress: userAddress,
    poolAddress: poolAddress,
    chain: chain,
    filters: {
      actionType: actionType,
      page: page,
      limit: limit
    },
    pagination: {
      page: page,
      limit: limit,
      total: 85,
      hasMore: page * limit < 85
    },
    transactions: [
      {
        id: "tx_001",
        type: "add_liquidity",
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        blockNumber: 12345678,
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        tokenX: {
          symbol: "ETH",
          amount: "5.0",
          amountUsd: "12750.00"
        },
        tokenY: {
          symbol: "USDC", 
          amount: "12750.00",
          amountUsd: "12750.00"
        },
        binIds: [8388605, 8388608, 8388610],
        liquidityShares: "1000.0",
        gasFee: "0.025",
        gasFeeUsd: "63.75",
        status: "success"
      },
      {
        id: "tx_002",
        type: "swap",
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        blockNumber: 12345456,
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        tokenIn: {
          symbol: "ETH",
          amount: "1.0",
          amountUsd: "2550.00"
        },
        tokenOut: {
          symbol: "USDC",
          amount: "2545.50",
          amountUsd: "2545.50"
        },
        priceImpact: 0.18,
        slippage: 0.1,
        fee: "0.0025",
        feeUsd: "6.375",
        gasFee: "0.015",
        gasFeeUsd: "38.25",
        status: "success"
      },
      {
        id: "tx_003",
        type: "claim_fees",
        txHash: "0xfedcba0987654321fedcba0987654321fedcba09",
        blockNumber: 12344890,
        timestamp: Math.floor(Date.now() / 1000) - 259200,
        feesEarned: [
          {
            token: "ETH",
            amount: "0.125",
            amountUsd: "318.75"
          },
          {
            token: "USDC",
            amount: "318.75",
            amountUsd: "318.75"
          }
        ],
        totalFeesUsd: "637.50",
        gasFee: "0.008",
        gasFeeUsd: "20.40",
        status: "success"
      }
    ],
    summary: {
      totalTransactions: 85,
      totalVolumeUsd: "127500.00",
      totalFeesEarnedUsd: "2551.25",
      totalGasFeesUsd: "425.75",
      netProfitUsd: "2125.50",
      mostRecentActivity: Math.floor(Date.now() / 1000) - 86400
    }
  };

  return new Response(JSON.stringify(mockUserHistory), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for user fees earned
export async function handleUserFeesEarned(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];
  const poolAddress = pathSegments[7];
  const period = url.searchParams.get('period') || '7d'; // 1d, 7d, 30d, all

  const mockUserFeesEarned = {
    userAddress: userAddress,
    poolAddress: poolAddress,
    chain: chain,
    period: period,
    feesEarned: {
      tokenX: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "ETH",
        name: "Ethereum",
        amount: "2.575",
        amountUsd: "6566.25"
      },
      tokenY: {
        address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
        symbol: "USDC",
        name: "USD Coin",
        amount: "6566.25",
        amountUsd: "6566.25"
      },
      totalUsd: "13132.50"
    },
    feesHistory: [
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        tokenXFees: "0.375",
        tokenYFees: "956.25",
        totalUsd: "1912.50"
      },
      {
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        tokenXFees: "0.425",
        tokenYFees: "1083.75",
        totalUsd: "2167.50"
      },
      {
        date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        tokenXFees: "0.525",
        tokenYFees: "1338.75",
        totalUsd: "2677.50"
      }
    ],
    poolInfo: {
      name: "ETH / USDC Pool",
      totalFeesGenerated: "125000.00",
      userSharePercent: 10.5,
      binStep: 15,
      activeBinId: 8388608
    },
    claimableStatus: {
      canClaim: true,
      lastClaimedAt: Math.floor(Date.now() / 1000) - 604800,
      minimumClaimAmount: "10.0",
      estimatedGasCost: "0.005"
    },
    performance: {
      dailyAverageUsd: "1876.07",
      weeklyTotalUsd: "13132.50",
      annualizedYield: 18.75,
      roi: 12.5
    }
  };

  return new Response(JSON.stringify(mockUserFeesEarned), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handler for user lifetime stats
export async function handleUserLifetimeStats(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[6];

  const mockUserLifetimeStats = {
    userAddress: userAddress,
    chain: chain,
    swapStats: {
      totalSwaps: 847,
      totalVolumeUsd: "2575000.75",
      totalFeesUsd: "7725.25",
      averageSwapSize: "3041.92",
      largestSwapUsd: "25500.00",
      smallestSwapUsd: "10.50",
      firstSwapDate: "2023-01-15",
      lastSwapDate: new Date().toISOString().split('T')[0],
      favoriteTokens: [
        {
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          symbol: "ETH",
          name: "Ethereum",
          swapCount: 285,
          volumeUsd: "850000.25"
        },
        {
          address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
          symbol: "USDC",
          name: "USD Coin",
          swapCount: 267,
          volumeUsd: "765000.50"
        },
        {
          address: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
          symbol: "UNC",
          name: "Unicorn Token",
          swapCount: 128,
          volumeUsd: "320000.75"
        }
      ],
      monthlyBreakdown: [
        {
          month: "2024-01",
          swaps: 78,
          volumeUsd: "234000.25",
          feesUsd: "702.00"
        },
        {
          month: "2024-02",
          swaps: 92,
          volumeUsd: "287500.50",
          feesUsd: "862.50"
        },
        {
          month: "2024-03",
          swaps: 105,
          volumeUsd: "335000.75",
          feesUsd: "1005.00"
        }
      ]
    },
    liquidityStats: {
      totalLiquidityProvided: "1275000.00",
      currentLiquidity: "765000.00",
      totalFeesEarned: "15300.75",
      poolsParticipated: 12,
      averageHoldingDays: 45,
      totalImpermanentLoss: "-2550.25",
      netProfitFromLP: "12750.50"
    },
    overallPerformance: {
      totalProfitUsd: "25301.25",
      totalGasSpentUsd: "1275.50",
      netProfitUsd: "24025.75",
      roi: 15.75,
      winRate: 78.5,
      bestDay: {
        date: "2024-02-14",
        profitUsd: "2550.00"
      },
      worstDay: {
        date: "2024-01-22",
        profitUsd: "-1275.25"
      }
    },
    rankings: {
      volumeRank: 247,
      feesEarnedRank: 189,
      swapCountRank: 156,
      totalUsers: 15847
    }
  };

  return new Response(JSON.stringify(mockUserLifetimeStats), {
    headers: { 'Content-Type': 'application/json' }
  });
}
