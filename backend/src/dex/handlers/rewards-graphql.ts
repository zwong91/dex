/**
 * Pure GraphQL Rewards Handlers
 * 
 * This module provides handlers for reward-related API endpoints using only GraphQL subgraph data.
 * Rewards are calculated from user positions and pool performance.
 */

import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import { subgraphClient, isSubgraphHealthy } from '../graphql/client';

// Calculate rewards based on user position and pool performance
function calculatePositionRewards(position: any, pool: any): any {
  const positionValue = parseFloat(position.valueUSD || '0');
  const poolTVL = parseFloat(pool.totalValueLockedUSD || '0');
  const poolFees = parseFloat(pool.feesUSD || '0');
  
  // Calculate user's share of pool fees
  const userShare = poolTVL > 0 ? positionValue / poolTVL : 0;
  const earnedFees = poolFees * userShare;
  
  // Estimate different types of rewards
  const baseRewards = earnedFees * 0.7; // 70% from LP fees
  const bonusRewards = earnedFees * 0.2; // 20% bonus rewards
  const stakingRewards = earnedFees * 0.1; // 10% staking rewards
  
  return {
    totalRewards: (baseRewards + bonusRewards + stakingRewards).toFixed(6),
    baseRewards: baseRewards.toFixed(6),
    bonusRewards: bonusRewards.toFixed(6),
    stakingRewards: stakingRewards.toFixed(6),
    pendingRewards: (earnedFees * 0.3).toFixed(6), // 30% pending
    claimableRewards: (earnedFees * 0.7).toFixed(6), // 70% claimable
    earnedFees: earnedFees.toFixed(6)
  };
}

// Handler for user rewards
export async function handleUserRewards(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[3]; // Extract from /api/dex/user/:userAddress/rewards
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch user rewards',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🎁 Fetching rewards for user ${userAddress}...`);
    
    // Get user's liquidity positions
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    
    // Get pools data for reward calculations
    const pools = await subgraphClient.getPools(100, 0, 'totalValueLockedUSD', 'desc');
    
    // Calculate rewards for each position
    const positionRewards = userPositions.map(position => {
      const pool = pools.find(p => p.id === position.pair.id);
      if (!pool) return null;
      
      const rewards = calculatePositionRewards(position, pool);
      
      return {
        poolId: pool.id,
        poolName: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
        tokenX: {
          symbol: pool.tokenX.symbol,
          address: pool.tokenX.id
        },
        tokenY: {
          symbol: pool.tokenY.symbol,
          address: pool.tokenY.id
        },
        positionValue: position.valueUSD,
        rewards,
        binIds: position.binIds || [],
        lastUpdate: new Date().toISOString()
      };
    }).filter(Boolean);

    // Calculate total rewards across all positions
    const totalRewards = positionRewards.reduce((sum, pos) => 
      sum + parseFloat(pos.rewards.totalRewards), 0
    );
    
    const totalPending = positionRewards.reduce((sum, pos) => 
      sum + parseFloat(pos.rewards.pendingRewards), 0
    );
    
    const totalClaimable = positionRewards.reduce((sum, pos) => 
      sum + parseFloat(pos.rewards.claimableRewards), 0
    );

    return createApiResponse({
      userAddress,
      positions: positionRewards,
      summary: {
        totalPositions: positionRewards.length,
        totalRewards: totalRewards.toFixed(6),
        totalPendingRewards: totalPending.toFixed(6),
        totalClaimableRewards: totalClaimable.toFixed(6),
        estimatedDailyRewards: (totalRewards * 0.01).toFixed(6), // 1% daily estimate
        lastCalculated: new Date().toISOString()
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleUserRewards:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch user rewards from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for claimable rewards
export async function handleClaimableRewards(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[3]; // Extract from /api/dex/user/:userAddress/claimable-rewards
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch claimable rewards',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`💰 Fetching claimable rewards for user ${userAddress}...`);
    
    // Get user's liquidity positions
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    
    // Get pools data
    const pools = await subgraphClient.getPools(100, 0, 'totalValueLockedUSD', 'desc');
    
    // Calculate only claimable rewards
    const claimableRewards = userPositions.map(position => {
      const pool = pools.find(p => p.id === position.pair.id);
      if (!pool) return null;
      
      const rewards = calculatePositionRewards(position, pool);
      
      return {
        poolId: pool.id,
        poolName: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
        claimableAmount: rewards.claimableRewards,
        rewardTokens: [
          {
            address: pool.tokenX.id,
            symbol: pool.tokenX.symbol,
            amount: (parseFloat(rewards.claimableRewards) * 0.5).toFixed(6)
          },
          {
            address: pool.tokenY.id,
            symbol: pool.tokenY.symbol,
            amount: (parseFloat(rewards.claimableRewards) * 0.5).toFixed(6)
          }
        ],
        binIds: position.binIds || [],
        canClaim: parseFloat(rewards.claimableRewards) > 0.001 // Minimum claim threshold
      };
    }).filter(Boolean);

    // Filter only claimable positions
    const claimablePositions = claimableRewards.filter(reward => reward.canClaim);
    
    const totalClaimable = claimablePositions.reduce((sum, pos) => 
      sum + parseFloat(pos.claimableAmount), 0
    );

    return createApiResponse({
      userAddress,
      claimablePositions,
      summary: {
        totalClaimablePositions: claimablePositions.length,
        totalClaimableAmount: totalClaimable.toFixed(6),
        minimumClaimThreshold: '0.001',
        estimatedGasCost: '0.01', // Mock gas cost
        canClaimAll: totalClaimable > 0.001
      },
      claimInstructions: {
        batchClaimAvailable: claimablePositions.length > 1,
        maxBatchSize: 10,
        recommendedGasLimit: '300000'
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleClaimableRewards:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch claimable rewards from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for rewards history
export async function handleRewardsHistory(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const userAddress = pathSegments[3]; // Extract from /api/dex/user/:userAddress/rewards/history
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    const timeRange = url.searchParams.get('timeRange') || '30d';
    const poolId = url.searchParams.get('poolId');
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch rewards history',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`📊 Fetching rewards history for user ${userAddress} (${timeRange})...`);
    
    // Get user's transaction history (as a proxy for rewards history)
    const userSwaps = await subgraphClient.getUserSwaps(userAddress, limit, 0);
    
    // Mock rewards history based on swap activity
    // In a real implementation, this would query reward claim events from the subgraph
    const rewardsHistory = userSwaps.map((swap, index) => ({
      id: `reward_${index + 1}`,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock tx hash
      poolId: swap.pair.id,
      poolName: `${swap.pair.tokenX.symbol}/${swap.pair.tokenY.symbol}`,
      type: index % 3 === 0 ? 'claim' : index % 3 === 1 ? 'auto_compound' : 'farming_reward',
      amount: (parseFloat(swap.amountUSD || '0') * 0.01).toFixed(6), // 1% of swap as reward
      amountUSD: (parseFloat(swap.amountUSD || '0') * 0.01).toFixed(2),
      rewardTokens: [
        {
          address: swap.pair.tokenX.id,
          symbol: swap.pair.tokenX.symbol,
          amount: (parseFloat(swap.amountUSD || '0') * 0.005).toFixed(6)
        },
        {
          address: swap.pair.tokenY.id,
          symbol: swap.pair.tokenY.symbol,
          amount: (parseFloat(swap.amountUSD || '0') * 0.005).toFixed(6)
        }
      ],
      timestamp: Math.floor(Date.now() / 1000) - index * 3600, // Spread over hours
      blockNumber: 1000000 + index,
      status: 'completed'
    }));

    // Apply pool filter if specified
    const filteredHistory = poolId 
      ? rewardsHistory.filter(reward => reward.poolId === poolId)
      : rewardsHistory;

    // Calculate pagination
    const offset = (page - 1) * limit;
    const paginatedHistory = filteredHistory.slice(offset, offset + limit);
    
    // Calculate summary statistics
    const totalRewardsClaimed = filteredHistory.reduce((sum, reward) => 
      sum + parseFloat(reward.amountUSD), 0
    );
    
    const uniquePools = new Set(filteredHistory.map(r => r.poolId)).size;

    return createApiResponse({
      userAddress,
      timeRange,
      poolFilter: poolId,
      pagination: {
        page,
        limit,
        total: filteredHistory.length,
        pages: Math.ceil(filteredHistory.length / limit)
      },
      history: paginatedHistory,
      summary: {
        totalRewardsClaimed: totalRewardsClaimed.toFixed(2),
        totalTransactions: filteredHistory.length,
        uniquePools,
        averageRewardPerClaim: filteredHistory.length > 0 
          ? (totalRewardsClaimed / filteredHistory.length).toFixed(2)
          : '0',
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString()
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleRewardsHistory:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch rewards history from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for batch rewards proof (for claiming multiple rewards)
export async function handleBatchRewardsProof(request: Request, env: any): Promise<Response> {
  try {
    const { corsHeaders } = getRequestContext(env);
    
    // Parse request body
    const body = await request.json();
    const { userAddress, poolIds, binIds } = body;
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot generate batch proof',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🧾 Generating batch rewards proof for user ${userAddress}...`);
    
    // Get user's positions for the specified pools/bins
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    
    // Filter positions by requested pools and bins
    const filteredPositions = userPositions.filter(position => {
      const poolMatch = !poolIds || poolIds.includes(position.pair.id);
      const binMatch = !binIds || binIds.some((binId: string) => 
        position.binIds?.includes(binId)
      );
      return poolMatch && binMatch;
    });
    
    // Generate mock proof data for batch claiming
    const proofData = {
      userAddress,
      batchId: `batch_${Date.now()}`,
      merkleRoot: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock merkle root
      totalClaimableAmount: '0',
      proofs: filteredPositions.map((position, index) => {
        const claimableAmount = (parseFloat(position.valueUSD || '0') * 0.01).toFixed(6);
        
        return {
          poolId: position.pair.id,
          binIds: position.binIds || [],
          claimableAmount,
          merkleProof: [
            `0x${Math.random().toString(16).substr(2, 64)}`,
            `0x${Math.random().toString(16).substr(2, 64)}`,
            `0x${Math.random().toString(16).substr(2, 64)}`
          ],
          leafIndex: index,
          rewardTokens: [
            {
              address: position.pair.tokenX.id,
              symbol: position.pair.tokenX.symbol,
              amount: (parseFloat(claimableAmount) * 0.5).toFixed(6)
            },
            {
              address: position.pair.tokenY.id,
              symbol: position.pair.tokenY.symbol,
              amount: (parseFloat(claimableAmount) * 0.5).toFixed(6)
            }
          ]
        };
      }),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      generatedAt: new Date().toISOString()
    };

    // Calculate total claimable amount
    proofData.totalClaimableAmount = proofData.proofs
      .reduce((sum, proof) => sum + parseFloat(proof.claimableAmount), 0)
      .toFixed(6);

    return createApiResponse({
      ...proofData,
      claimInstructions: {
        contractAddress: '0x1234567890123456789012345678901234567890', // Mock contract
        methodName: 'batchClaim',
        gasEstimate: '400000',
        warning: 'Proof expires in 24 hours. Use immediately for best results.'
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleBatchRewardsProof:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to generate batch rewards proof',
      'PROOF_ERROR',
      corsHeaders
    );
  }
}
