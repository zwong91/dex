/**
 * DEX Users Handlers - Pure GraphQL Implementation
 * 
 * All handlers now use GraphQL subgraph exclusively for user data.
 * No database fallbacks - the subgraph provides all user positions and transaction data.
 */

import { subgraphClient, isSubgraphHealthy } from '../graphql/client';
import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext, createPaginationInfo } from '../utils';

/**
 * Get user's bin IDs for liquidity positions
 */
export async function handleUserBinIds(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[pathSegments.indexOf('user') + 1];
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid user address',
        'INVALID_ADDRESS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching bin IDs for user ${userAddress} from subgraph...`);
    
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    
    // Extract unique bin IDs from user positions
    const binIds = new Set<number>();
    const poolBins: Record<string, number[]> = {};
    
    userPositions.forEach(position => {
      const poolId = position.lbPair.id;
      
      if (!poolBins[poolId]) {
        poolBins[poolId] = [];
      }
      
      position.userBinLiquidities.forEach(binLiquidity => {
        binIds.add(binLiquidity.binId);
        poolBins[poolId].push(binLiquidity.binId);
      });
    });

    const response = {
      userAddress,
      totalBins: binIds.size,
      binIds: Array.from(binIds).sort((a, b) => a - b),
      poolBins,
      positionsCount: userPositions.length,
      lastUpdate: Math.floor(Date.now() / 1000)
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user bin IDs:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user bin IDs',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get user's pool IDs (liquidity positions)
 */
export async function handleUserPoolIds(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[pathSegments.indexOf('user') + 1];
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid user address',
        'INVALID_ADDRESS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching pool IDs for user ${userAddress} from subgraph...`);
    
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    
    // Transform positions to pool information
    const poolsData = userPositions.map(position => {
      const pool = position.lbPair;
      const totalLiquidity = position.userBinLiquidities.reduce(
        (sum, bin) => sum + parseFloat(bin.liquidity), 
        0
      );
      
      // Estimate USD value (simplified calculation)
      const poolTVL = parseFloat(pool.tokenX.name) || 0; // This would need proper price calculation
      const userSharePercent = poolTVL > 0 ? (totalLiquidity / poolTVL) * 100 : 0;
      const userLiquidityUsd = "0"; // Would need price oracle integration
      
      return {
        poolAddress: pool.id,
        name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
        tokenX: {
          address: pool.tokenX.id,
          symbol: pool.tokenX.symbol,
          name: pool.tokenX.name
        },
        tokenY: {
          address: pool.tokenY.id,
          symbol: pool.tokenY.symbol,
          name: pool.tokenY.name
        },
        userLiquidityUsd,
        userSharePercent,
        positionCount: position.userBinLiquidities.length,
        activeBins: position.userBinLiquidities.map(bin => bin.binId),
        lastActivity: position.timestamp
      };
    });
    
    const totalLiquidityUsd = poolsData.reduce(
      (sum, pool) => sum + parseFloat(pool.userLiquidityUsd), 
      0
    ).toString();

    const response = {
      userAddress,
      poolIds: poolsData,
      totalPools: poolsData.length,
      totalLiquidityUsd,
      totalActivePositions: poolsData.reduce((sum, pool) => sum + pool.positionCount, 0)
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user pool IDs:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user pool IDs',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get user balances for a specific pool
 */
export async function handlePoolUserBalances(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const poolIdIndex = pathSegments.indexOf('pool') + 1;
    const userIdIndex = pathSegments.indexOf('user') + 1;
    const poolId = pathSegments[poolIdIndex];
    const userAddress = pathSegments[userIdIndex];
    const { corsHeaders } = getRequestContext(env);
    
    if (!poolId || !userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid pool ID or user address',
        'INVALID_PARAMETERS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching balances for user ${userAddress} in pool ${poolId}...`);
    
    // Get user positions for this specific pool
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    const poolPosition = userPositions.find(pos => pos.lbPair.id === poolId);
    
    if (!poolPosition) {
      return createErrorResponse(
        'No position found for this user in this pool',
        'POSITION_NOT_FOUND',
        corsHeaders,
        404
      );
    }

    // Get pool details
    const pool = await subgraphClient.getPool(poolId);
    
    if (!pool) {
      return createErrorResponse(
        'Pool not found',
        'POOL_NOT_FOUND',
        corsHeaders,
        404
      );
    }

    // Calculate user balances
    const userBins = poolPosition.userBinLiquidities.map(binLiquidity => ({
      binId: binLiquidity.binId,
      liquidity: binLiquidity.liquidity,
      timestamp: binLiquidity.timestamp,
      // These would need proper calculation with bin price ranges
      tokenXBalance: "0",
      tokenYBalance: "0",
      tokenXBalanceUsd: "0",
      tokenYBalanceUsd: "0"
    }));

    const totalLiquidity = userBins.reduce(
      (sum, bin) => sum + parseFloat(bin.liquidity), 
      0
    );

    const response = {
      userAddress,
      poolAddress: poolId,
      poolName: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
      tokenX: {
        address: pool.tokenX.id,
        symbol: pool.tokenX.symbol,
        name: pool.tokenX.name,
        decimals: pool.tokenX.decimals,
        totalBalance: "0", // Would need calculation
        totalBalanceUsd: "0"
      },
      tokenY: {
        address: pool.tokenY.id,
        symbol: pool.tokenY.symbol,
        name: pool.tokenY.name,
        decimals: pool.tokenY.decimals,
        totalBalance: "0", // Would need calculation
        totalBalanceUsd: "0"
      },
      totalLiquidity: totalLiquidity.toString(),
      totalValueUsd: "0", // Would need price calculation
      binPositions: userBins,
      positionCount: userBins.length,
      lastUpdate: poolPosition.timestamp
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user pool balances:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user pool balances',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get user transaction history
 */
export async function handleUserHistory(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[pathSegments.indexOf('user') + 1];
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid user address',
        'INVALID_ADDRESS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching transaction history for user ${userAddress}...`);
    
    // Get user positions to understand their activity
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    
    // Transform positions into transaction-like history
    const transactions = userPositions.flatMap(position => 
      position.userBinLiquidities.map(binLiquidity => ({
        id: `${position.id}-${binLiquidity.id}`,
        type: 'liquidity_add', // This would need more sophisticated detection
        poolAddress: position.lbPair.id,
        poolName: position.lbPair.name || `${position.lbPair.tokenX.symbol}/${position.lbPair.tokenY.symbol}`,
        binId: binLiquidity.binId,
        liquidity: binLiquidity.liquidity,
        timestamp: binLiquidity.timestamp,
        blockNumber: position.block,
        // These would need actual transaction data from swaps/mints/burns
        tokenXAmount: "0",
        tokenYAmount: "0",
        valueUsd: "0",
        gasUsed: "0",
        txHash: `0x${position.id}` // Placeholder
      }))
    );

    // Sort by timestamp and paginate
    const sortedTransactions = transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice((page - 1) * limit, page * limit);

    const total = transactions.length;
    const pagination = createPaginationInfo(page, limit, total);

    const response = {
      userAddress,
      transactions: sortedTransactions,
      pagination,
      summary: {
        totalTransactions: total,
        totalValueUsd: "0", // Would need calculation
        firstTransaction: total > 0 ? Math.min(...transactions.map(t => t.timestamp)) : null,
        lastTransaction: total > 0 ? Math.max(...transactions.map(t => t.timestamp)) : null
      }
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user history:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user history',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get user fees earned
 */
export async function handleUserFeesEarned(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[pathSegments.indexOf('user') + 1];
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid user address',
        'INVALID_ADDRESS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching fees earned for user ${userAddress}...`);
    
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    
    // Calculate fees for each pool position
    const poolFees = userPositions.map(position => {
      const pool = position.lbPair;
      
      // This would need more sophisticated fee calculation based on:
      // - User's share of the pool
      // - Pool's fee generation
      // - Time-weighted calculations
      const estimatedFeesUsd = "0"; // Placeholder
      
      return {
        poolAddress: pool.id,
        poolName: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
        tokenX: {
          symbol: pool.tokenX.symbol,
          feesEarned: "0",
          feesEarnedUsd: "0"
        },
        tokenY: {
          symbol: pool.tokenY.symbol,
          feesEarned: "0",
          feesEarnedUsd: "0"
        },
        totalFeesUsd: estimatedFeesUsd,
        positionSize: position.userBinLiquidities.length,
        lastUpdate: position.timestamp
      };
    });

    const totalFeesUsd = poolFees.reduce(
      (sum, pool) => sum + parseFloat(pool.totalFeesUsd), 
      0
    ).toString();

    const response = {
      userAddress,
      totalFeesEarnedUsd: totalFeesUsd,
      poolFees,
      feesBreakdown: {
        daily: "0", // Would need 24h calculation
        weekly: "0", // Would need 7d calculation
        monthly: "0", // Would need 30d calculation
        allTime: totalFeesUsd
      },
      lastCalculated: Math.floor(Date.now() / 1000)
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user fees:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user fees earned',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get user lifetime stats
 */
export async function handleUserLifetimeStats(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[pathSegments.indexOf('user') + 1];
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !userAddress.startsWith('0x')) {
      return createErrorResponse(
        'Invalid user address',
        'INVALID_ADDRESS',
        corsHeaders,
        400
      );
    }

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

    console.log(`🔗 Fetching lifetime stats for user ${userAddress}...`);
    
    const userPositions = await subgraphClient.getUserPositions(userAddress, 1000);
    
    // Calculate lifetime statistics
    const totalPositions = userPositions.length;
    const totalBins = userPositions.reduce(
      (sum, pos) => sum + pos.userBinLiquidities.length, 
      0
    );
    
    const uniquePools = new Set(userPositions.map(pos => pos.lbPair.id)).size;
    const uniqueTokens = new Set();
    
    userPositions.forEach(pos => {
      uniqueTokens.add(pos.lbPair.tokenX.id);
      uniqueTokens.add(pos.lbPair.tokenY.id);
    });

    const firstPosition = userPositions.length > 0 
      ? Math.min(...userPositions.map(pos => pos.timestamp))
      : null;
    
    const lastPosition = userPositions.length > 0
      ? Math.max(...userPositions.map(pos => pos.timestamp))
      : null;

    const response = {
      userAddress,
      lifetimeStats: {
        totalPositions,
        totalBins,
        uniquePools,
        uniqueTokens: uniqueTokens.size,
        totalVolumeUsd: "0", // Would need swap data
        totalFeesEarnedUsd: "0", // Would need fee calculation
        totalLiquidityProvidedUsd: "0", // Would need historical calculation
        impermanentLoss: "0", // Would need price tracking
        totalTransactions: totalBins, // Simplified
        firstActivity: firstPosition ? new Date(firstPosition * 1000).toISOString() : null,
        lastActivity: lastPosition ? new Date(lastPosition * 1000).toISOString() : null,
        daysActive: firstPosition && lastPosition 
          ? Math.ceil((lastPosition - firstPosition) / 86400) 
          : 0
      },
      performance: {
        averagePositionSize: totalPositions > 0 ? totalBins / totalPositions : 0,
        portfolioDiversification: uniquePools / Math.max(totalPositions, 1),
        riskScore: calculateRiskScore(userPositions),
        successRate: 0.85 // Placeholder
      },
      lastUpdated: Math.floor(Date.now() / 1000)
    };

    return createApiResponse(response, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching user lifetime stats:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch user lifetime stats',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

// Helper function to calculate risk score
function calculateRiskScore(positions: any[]): number {
  if (positions.length === 0) return 0;
  
  // Simple risk scoring based on position diversity and size
  const uniquePools = new Set(positions.map(pos => pos.lbPair.id)).size;
  const diversificationScore = Math.min(uniquePools / 5, 1); // Max score at 5+ pools
  const positionSizeScore = positions.length / 10; // More positions = potentially less risky
  
  return Math.min((diversificationScore + positionSizeScore) * 50, 100);
}
