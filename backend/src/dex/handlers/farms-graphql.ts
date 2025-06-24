/**
 * Pure GraphQL Farms Handlers
 * 
 * This module provides handlers for farm-related API endpoints using only GraphQL subgraph data.
 * Farms are derived from high-yield pools with additional reward mechanisms.
 */

import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import { subgraphClient, isSubgraphHealthy } from '../graphql/client';

// Farm status based on pool metrics
function calculateFarmStatus(pool: any): 'active' | 'paused' | 'ended' {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const volume = parseFloat(pool.volumeUSD || '0');
  
  if (tvl > 10000 && volume > 1000) return 'active';
  if (tvl > 1000) return 'paused';
  return 'ended';
}

// Calculate farm APR (including LP fees + estimated rewards)
function calculateFarmAPR(pool: any): number {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const fees = parseFloat(pool.feesUSD || '0');
  const volume = parseFloat(pool.volumeUSD || '0');
  
  if (tvl === 0) return 0;
  
  // Base APR from fees
  const feeRate = pool.binStep * 0.0001;
  const baseAPR = volume * 365 * feeRate / tvl * 100;
  
  // Additional reward APR (estimated based on pool performance)
  const rewardMultiplier = tvl > 100000 ? 1.5 : tvl > 10000 ? 1.2 : 1.0;
  const totalAPR = baseAPR * rewardMultiplier;
  
  return Math.min(totalAPR, 1000); // Cap at 1000% APR
}

// Transform pool to farm format
function transformPoolToFarm(pool: any): any {
  const apr = calculateFarmAPR(pool);
  const status = calculateFarmStatus(pool);
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  
  return {
    farmId: `farm_${pool.id}`,
    poolId: pool.id,
    name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Farm`,
    description: `Liquidity mining for ${pool.tokenX.symbol}-${pool.tokenY.symbol} pair`,
    pair: {
      tokenX: {
        address: pool.tokenX.id,
        symbol: pool.tokenX.symbol,
        name: pool.tokenX.name,
        decimals: pool.tokenX.decimals
      },
      tokenY: {
        address: pool.tokenY.id,
        symbol: pool.tokenY.symbol,
        name: pool.tokenY.name,
        decimals: pool.tokenY.decimals
      }
    },
    status,
    apr: parseFloat(apr.toFixed(2)),
    tvl: tvl.toFixed(2),
    totalStaked: pool.reserveX && pool.reserveY 
      ? (parseFloat(pool.reserveX) + parseFloat(pool.reserveY)).toFixed(2)
      : '0',
    rewardTokens: [
      {
        address: pool.tokenX.id,
        symbol: pool.tokenX.symbol,
        emissionRate: '100', // Mock emission rate
        totalRewards: (tvl * 0.1).toFixed(2) // Mock total rewards
      }
    ],
    stakingInfo: {
      minStake: '1.0',
      lockupPeriod: '0', // No lockup for LP farms
      withdrawalFee: '0.1',
      earlyWithdrawalPenalty: '0'
    },
    performance: {
      dailyAPR: apr / 365,
      weeklyAPR: apr / 52,
      monthlyAPR: apr / 12,
      totalValueStaked: tvl.toFixed(2),
      totalRewardsDistributed: (tvl * 0.05).toFixed(2) // Mock historical rewards
    },
    binStep: pool.binStep,
    activeId: pool.activeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Handler for user farms
export async function handleUserFarms(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[3]; // Extract from /api/dex/user/:userAddress/farms
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch user farms',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🚜 Fetching farms for user ${userAddress}...`);
    
    // Get user's liquidity positions
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    
    // Get pools data for farms
    const pools = await subgraphClient.getPools(50, 0, 'totalValueLockedUSD', 'desc');
    
    // Match user positions with farm pools
    const userFarms = userPositions
      .map(position => {
        const pool = pools.find(p => p.id === position.pair.id);
        if (!pool) return null;
        
        const farm = transformPoolToFarm(pool);
        const stakedAmount = parseFloat(position.valueUSD || '0');
        const shares = stakedAmount / parseFloat(farm.tvl) * 100;
        
        return {
          ...farm,
          userPosition: {
            stakedAmount: stakedAmount.toFixed(2),
            stakedAmountUSD: stakedAmount.toFixed(2),
            shares: shares.toFixed(6),
            pendingRewards: (stakedAmount * 0.001).toFixed(6), // Mock pending rewards
            claimableRewards: (stakedAmount * 0.0005).toFixed(6), // Mock claimable rewards
            stakingTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Mock staking time
            lastClaimTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            estimatedDailyRewards: (stakedAmount * farm.apr / 365 / 100).toFixed(6)
          }
        };
      })
      .filter(Boolean);

    // Calculate summary
    const totalStakedUSD = userFarms.reduce((sum, farm) => 
      sum + parseFloat(farm.userPosition.stakedAmount), 0
    );
    
    const totalPendingRewards = userFarms.reduce((sum, farm) => 
      sum + parseFloat(farm.userPosition.pendingRewards), 0
    );
    
    const averageAPR = userFarms.length > 0 
      ? userFarms.reduce((sum, farm) => sum + farm.apr, 0) / userFarms.length
      : 0;

    return createApiResponse({
      userAddress,
      farms: userFarms,
      summary: {
        totalFarms: userFarms.length,
        totalStakedUSD: totalStakedUSD.toFixed(2),
        totalPendingRewards: totalPendingRewards.toFixed(6),
        averageAPR: parseFloat(averageAPR.toFixed(2)),
        estimatedDailyEarnings: (totalStakedUSD * averageAPR / 365 / 100).toFixed(6)
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleUserFarms:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch user farms from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for user farm details
export async function handleUserFarmDetails(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[3]; // /api/dex/user/:userAddress/farms/:farmId
    const farmId = pathSegments[5];
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress || !farmId) {
      return createErrorResponse('User address and farm ID are required', 'MISSING_PARAMS', corsHeaders, 400);
    }
    
    // Extract pool ID from farm ID
    const poolId = farmId.replace('farm_', '');
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch farm details',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🚜 Fetching farm details for ${farmId} and user ${userAddress}...`);
    
    // Get user's positions for this specific pool
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    const userPosition = userPositions.find(pos => pos.pair.id === poolId);
    
    if (!userPosition) {
      return createErrorResponse(
        `User has no position in farm ${farmId}`,
        'NO_POSITION',
        corsHeaders,
        404
      );
    }
    
    // Get pool data
    const pools = await subgraphClient.getPools(1, 0, 'totalValueLockedUSD', 'desc');
    const pool = pools.find(p => p.id === poolId);
    
    if (!pool) {
      return createErrorResponse(
        `Farm ${farmId} not found`,
        'FARM_NOT_FOUND',
        corsHeaders,
        404
      );
    }
    
    const farm = transformPoolToFarm(pool);
    const stakedAmount = parseFloat(userPosition.valueUSD || '0');
    
    // Enhanced farm details with user position
    const farmDetails = {
      ...farm,
      userPosition: {
        stakedAmount: stakedAmount.toFixed(2),
        stakedAmountUSD: stakedAmount.toFixed(2),
        shares: (stakedAmount / parseFloat(farm.tvl) * 100).toFixed(6),
        binPositions: userPosition.binIds?.map((binId: string) => ({
          binId: parseInt(binId),
          liquidity: (stakedAmount / (userPosition.binIds?.length || 1)).toFixed(6),
          priceRange: {
            lower: parseInt(binId) - 1,
            upper: parseInt(binId) + 1
          }
        })) || [],
        rewards: {
          pending: (stakedAmount * 0.001).toFixed(6),
          claimable: (stakedAmount * 0.0005).toFixed(6),
          totalEarned: (stakedAmount * 0.01).toFixed(6),
          lastClaimTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        performance: {
          stakingTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          currentValue: stakedAmount.toFixed(2),
          initialValue: (stakedAmount * 0.95).toFixed(2), // Mock initial value
          pnl: (stakedAmount * 0.05).toFixed(2),
          pnlPercentage: 5.0,
          estimatedAPR: farm.apr
        }
      },
      farmHistory: [
        // Mock historical data
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 0.9, apr: farm.apr * 0.95 },
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 0.92, apr: farm.apr * 0.97 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 0.95, apr: farm.apr * 0.99 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 0.98, apr: farm.apr * 1.01 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 0.99, apr: farm.apr * 1.02 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 1.01, apr: farm.apr * 1.0 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), tvl: parseFloat(farm.tvl) * 1.02, apr: farm.apr * 0.98 },
        { date: new Date().toISOString(), tvl: parseFloat(farm.tvl), apr: farm.apr }
      ]
    };

    return createApiResponse(farmDetails, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleUserFarmDetails:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch farm details from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for all available farms
export async function handleFarmsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const status = url.searchParams.get('status') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'apr';
    const minTvl = parseFloat(url.searchParams.get('minTvl') || '1000');
    const offset = (page - 1) * limit;
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch farms',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🚜 Fetching farms list (page ${page}, limit ${limit})...`);
    
    // Get pools data
    const pools = await subgraphClient.getPools(limit * 2, 0, 'totalValueLockedUSD', 'desc');
    
    // Transform pools to farms and apply filters
    let farms = pools
      .filter(pool => parseFloat(pool.totalValueLockedUSD || '0') >= minTvl)
      .map(transformPoolToFarm);
    
    // Apply status filter
    if (status !== 'all') {
      farms = farms.filter(farm => farm.status === status);
    }
    
    // Sort farms
    if (sortBy === 'apr') {
      farms.sort((a, b) => b.apr - a.apr);
    } else if (sortBy === 'tvl') {
      farms.sort((a, b) => parseFloat(b.tvl) - parseFloat(a.tvl));
    }
    
    // Apply pagination
    const totalFarms = farms.length;
    const paginatedFarms = farms.slice(offset, offset + limit);

    return createApiResponse({
      pagination: {
        page,
        limit,
        total: totalFarms,
        pages: Math.ceil(totalFarms / limit)
      },
      filters: {
        status,
        sortBy,
        minTvl: minTvl.toString()
      },
      farms: paginatedFarms,
      summary: {
        totalFarms,
        activeFarms: farms.filter(f => f.status === 'active').length,
        totalTVL: farms.reduce((sum, f) => sum + parseFloat(f.tvl), 0).toFixed(2),
        averageAPR: farms.length > 0 
          ? (farms.reduce((sum, f) => sum + f.apr, 0) / farms.length).toFixed(2)
          : '0'
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleFarmsList:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch farms from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}
