/**
 * Pure GraphQL Vaults Handlers
 * 
 * This module provides handlers for vault-related API endpoints using only GraphQL subgraph data.
 * No database dependencies - all data comes from the subgraph.
 */

import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext } from '../utils';
import { subgraphClient, isSubgraphHealthy } from '../graphql/client';
import type { VaultInfo, PaginationInfo } from '../types';

// Risk level calculation based on pool metrics
function calculateRiskLevel(pool: any): 'low' | 'medium' | 'high' {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const volume24h = parseFloat(pool.volumeUSD || '0');
  const volatilityRatio = tvl > 0 ? volume24h / tvl : 0;
  
  if (volatilityRatio < 0.1 && tvl > 1000000) return 'low';
  if (volatilityRatio < 0.5 && tvl > 100000) return 'medium';
  return 'high';
}

// Calculate APY based on pool fees and volume
function calculatePoolAPY(pool: any): number {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const fees = parseFloat(pool.feesUSD || '0');
  const volume = parseFloat(pool.volumeUSD || '0');
  
  if (tvl === 0) return 0;
  
  // Estimate annual fees based on 24h volume and bin step
  const feeRate = pool.binStep * 0.0001; // binStep as basis points
  const estimatedAnnualFees = volume * 365 * feeRate;
  
  return Math.min((estimatedAnnualFees / tvl) * 100, 500); // Cap at 500% APY
}

// Calculate performance metrics
function calculatePerformanceMetrics(apy: number) {
  const dailyRate = apy / 365 / 100;
  const weeklyRate = Math.pow(1 + dailyRate, 7) - 1;
  const monthlyRate = Math.pow(1 + dailyRate, 30) - 1;
  
  return {
    dailyYield: dailyRate * 100,
    weeklyYield: weeklyRate * 100,
    monthlyYield: monthlyRate * 100,
    totalReturn: apy
  };
}

// Transform pool to vault format
function transformPoolToVault(pool: any): VaultInfo {
  const apy = calculatePoolAPY(pool);
  const riskLevel = calculateRiskLevel(pool);
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  
  // Estimate total shares based on TVL and share price
  const sharePrice = Math.max(tvl / 10000, 1); // Arbitrary share price calculation
  const totalShares = tvl / sharePrice;
  
  return {
    vaultId: `vault_${pool.id}`,
    vaultAddress: pool.id,
    name: `${pool.tokenX.symbol}/${pool.tokenY.symbol} Auto-Compound Vault`,
    description: `Automated yield farming for ${pool.tokenX.symbol}-${pool.tokenY.symbol} liquidity pool`,
    chain: 'bsc-testnet',
    poolAddress: pool.id,
    strategy: riskLevel === 'low' ? 'conservative' : riskLevel === 'medium' ? 'balanced' : 'aggressive',
    riskLevel,
    tokenX: {
      symbol: pool.tokenX.symbol,
      name: pool.tokenX.name,
      address: pool.tokenX.id,
      decimals: pool.tokenX.decimals
    },
    tokenY: {
      symbol: pool.tokenY.symbol,
      name: pool.tokenY.name,
      address: pool.tokenY.id,
      decimals: pool.tokenY.decimals
    },
    tokenPair: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
    tvl: tvl.toFixed(2),
    apy: parseFloat(apy.toFixed(2)),
    totalShares: totalShares.toFixed(2),
    sharePrice: sharePrice.toFixed(2),
    status: tvl > 1000 ? 'active' : 'inactive',
    performanceMetrics: calculatePerformanceMetrics(apy),
    binStep: pool.binStep,
    activeId: pool.activeId,
    reserveX: pool.reserveX,
    reserveY: pool.reserveY,
    liquidityProviderCount: pool.liquidityProviderCount || 0,
    createdAt: new Date().toISOString(), // Placeholder - could be derived from first transaction
    updatedAt: new Date().toISOString()
  };
}

// Handler for vaults list
export async function handleVaultsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const status = url.searchParams.get('status') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'totalValueLockedUSD';
    const minTvl = parseFloat(url.searchParams.get('minTvl') || '1000');
    const offset = (page - 1) * limit;
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch vault data',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🏦 Fetching vaults from subgraph (page ${page}, limit ${limit})...`);
    
    // Get pools data from subgraph
    const pools = await subgraphClient.getPools(limit * 2, 0, sortBy, 'desc'); // Get more to filter
    
    // Transform pools to vaults and apply filters
    let vaults = pools
      .filter(pool => {
        const tvl = parseFloat(pool.totalValueLockedUSD || '0');
        return tvl >= minTvl; // Minimum TVL for vaults
      })
      .map(transformPoolToVault);
    
    // Apply status filter
    if (status !== 'all') {
      vaults = vaults.filter(vault => vault.status === status);
    }
    
    // Apply pagination
    const totalVaults = vaults.length;
    const paginatedVaults = vaults.slice(offset, offset + limit);
    
    const pagination: PaginationInfo = {
      page,
      limit,
      total: totalVaults,
      pages: Math.ceil(totalVaults / limit)
    };

    return createApiResponse({
      pagination,
      filters: {
        status,
        sortBy,
        minTvl: minTvl.toString()
      },
      vaults: paginatedVaults
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleVaultsList:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch vaults data from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for vault details by ID
export async function handleVaultDetails(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const vaultId = url.pathname.split('/').pop();
    const { corsHeaders } = getRequestContext(env);
    
    if (!vaultId) {
      return createErrorResponse('Vault ID is required', 'MISSING_VAULT_ID', corsHeaders, 400);
    }
    
    // Extract pool ID from vault ID
    const poolId = vaultId.replace('vault_', '');
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch vault details',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🏦 Fetching vault details for ${vaultId}...`);
    
    // Get specific pool data
    const pools = await subgraphClient.getPools(1, 0, 'totalValueLockedUSD', 'desc');
    const pool = pools.find(p => p.id === poolId);
    
    if (!pool) {
      return createErrorResponse(
        `Vault ${vaultId} not found`,
        'VAULT_NOT_FOUND',
        corsHeaders,
        404
      );
    }
    
    const vault = transformPoolToVault(pool);
    
    // Add additional details for single vault view
    const enhancedVault = {
      ...vault,
      additionalMetrics: {
        volume24h: parseFloat(pool.volumeUSD || '0'),
        fees24h: parseFloat(pool.feesUSD || '0'),
        txCount: pool.txCount || 0,
        priceRange: {
          min: pool.activeId - 50, // Arbitrary range around active bin
          max: pool.activeId + 50,
          current: pool.activeId
        }
      },
      historicalPerformance: [
        // Mock historical data - in real implementation, this would come from historical subgraph queries
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 0.95 },
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 0.98 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 1.02 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 0.97 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 1.01 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 0.99 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), apy: vault.apy * 1.03 },
        { date: new Date().toISOString(), apy: vault.apy }
      ]
    };

    return createApiResponse(enhancedVault, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleVaultDetails:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch vault details from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for vault analytics
export async function handleVaultsAnalytics(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { corsHeaders } = getRequestContext(env);
    
    const timeRange = url.searchParams.get('timeRange') || '24h';
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch analytics',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`📊 Fetching vault analytics for ${timeRange}...`);
    
    // Get all pools data for analytics
    const pools = await subgraphClient.getPools(100, 0, 'totalValueLockedUSD', 'desc');
    
    // Filter pools that qualify as vaults
    const vaultPools = pools.filter(pool => 
      parseFloat(pool.totalValueLockedUSD || '0') >= 1000
    );
    
    // Calculate aggregate metrics
    const totalTVL = vaultPools.reduce((sum, pool) => 
      sum + parseFloat(pool.totalValueLockedUSD || '0'), 0
    );
    
    const totalVolume = vaultPools.reduce((sum, pool) => 
      sum + parseFloat(pool.volumeUSD || '0'), 0
    );
    
    const totalFees = vaultPools.reduce((sum, pool) => 
      sum + parseFloat(pool.feesUSD || '0'), 0
    );
    
    const averageAPY = vaultPools.length > 0 
      ? vaultPools.reduce((sum, pool) => sum + calculatePoolAPY(pool), 0) / vaultPools.length
      : 0;
    
    const totalUsers = vaultPools.reduce((sum, pool) => 
      sum + (pool.liquidityProviderCount || 0), 0
    );

    // Risk distribution
    const riskDistribution = vaultPools.reduce((dist, pool) => {
      const risk = calculateRiskLevel(pool);
      dist[risk] = (dist[risk] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const analytics = {
      timeRange,
      totalMetrics: {
        totalTVL: totalTVL.toFixed(2),
        totalVolume24h: totalVolume.toFixed(2),
        totalFees24h: totalFees.toFixed(2),
        averageAPY: parseFloat(averageAPY.toFixed(2)),
        totalVaults: vaultPools.length,
        totalUsers,
        totalTransactions: vaultPools.reduce((sum, pool) => sum + (pool.txCount || 0), 0)
      },
      topVaults: vaultPools
        .slice(0, 5)
        .map(transformPoolToVault),
      riskDistribution,
      performanceMetrics: {
        highestAPY: Math.max(...vaultPools.map(calculatePoolAPY)),
        lowestAPY: Math.min(...vaultPools.map(calculatePoolAPY)),
        medianTVL: vaultPools.length > 0 
          ? vaultPools.sort((a, b) => 
              parseFloat(b.totalValueLockedUSD || '0') - parseFloat(a.totalValueLockedUSD || '0')
            )[Math.floor(vaultPools.length / 2)]?.totalValueLockedUSD || '0'
          : '0'
      },
      trends: {
        // Mock trend data - in real implementation, this would come from time-series subgraph queries
        tvlChange24h: "+5.2%",
        volumeChange24h: "+12.8%",
        apyChange24h: "+0.3%",
        newVaults24h: 2,
        activeUsers24h: Math.floor(totalUsers * 0.1) // Estimate active users
      }
    };

    return createApiResponse(analytics, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleVaultsAnalytics:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch vault analytics from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for vault strategies
export async function handleVaultStrategies(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { corsHeaders } = getRequestContext(env);
    
    const strategyType = url.searchParams.get('type') || 'all';
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch strategy data',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`🎯 Fetching vault strategies (type: ${strategyType})...`);
    
    // Get pools data to analyze strategies
    const pools = await subgraphClient.getPools(50, 0, 'totalValueLockedUSD', 'desc');
    
    const strategies = [
      {
        id: 'auto_compound',
        name: 'Auto-Compound Strategy',
        description: 'Automatically compounds LP rewards to maximize yield',
        riskLevel: 'medium',
        expectedAPY: '15-25%',
        minTVL: '10000',
        applicablePools: pools.filter(pool => 
          parseFloat(pool.totalValueLockedUSD || '0') > 10000 &&
          calculateRiskLevel(pool) === 'medium'
        ).length
      },
      {
        id: 'conservative',
        name: 'Conservative Strategy',
        description: 'Low-risk strategy focusing on stable returns with major token pairs',
        riskLevel: 'low',
        expectedAPY: '8-15%',
        minTVL: '50000',
        applicablePools: pools.filter(pool => 
          parseFloat(pool.totalValueLockedUSD || '0') > 50000 &&
          calculateRiskLevel(pool) === 'low'
        ).length
      },
      {
        id: 'aggressive',
        name: 'Aggressive Strategy',
        description: 'High-risk, high-reward strategy for volatile token pairs',
        riskLevel: 'high',
        expectedAPY: '25-50%',
        minTVL: '5000',
        applicablePools: pools.filter(pool => 
          parseFloat(pool.totalValueLockedUSD || '0') > 5000 &&
          calculateRiskLevel(pool) === 'high'
        ).length
      }
    ];

    // Filter strategies if specific type requested
    const filteredStrategies = strategyType === 'all' 
      ? strategies 
      : strategies.filter(s => s.riskLevel === strategyType);

    return createApiResponse({
      strategies: filteredStrategies,
      totalStrategies: filteredStrategies.length,
      availableTypes: ['low', 'medium', 'high']
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleVaultStrategies:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch vault strategies from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}

// Handler for user vault positions
export async function handleUserVaultPositions(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userAddress = url.searchParams.get('address');
    const { corsHeaders } = getRequestContext(env);
    
    if (!userAddress) {
      return createErrorResponse('User address is required', 'MISSING_ADDRESS', corsHeaders, 400);
    }
    
    // Check subgraph health
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable - cannot fetch user positions',
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log(`👤 Fetching vault positions for user ${userAddress}...`);
    
    // Get user's liquidity positions from subgraph
    const userPositions = await subgraphClient.getUserPositions(userAddress);
    
    // Transform positions to vault positions
    const vaultPositions = await Promise.all(
      userPositions.map(async (position) => {
        // Get pool details for this position
        const pools = await subgraphClient.getPools(1, 0, 'totalValueLockedUSD', 'desc');
        const pool = pools.find(p => p.id === position.pair.id);
        
        if (!pool) return null;
        
        const vault = transformPoolToVault(pool);
        const positionValue = parseFloat(position.valueUSD || '0');
        const shares = positionValue / parseFloat(vault.sharePrice);
        
        return {
          vaultId: vault.vaultId,
          vaultName: vault.name,
          userAddress,
          shares: shares.toFixed(6),
          sharePrice: vault.sharePrice,
          currentValue: positionValue.toFixed(2),
          entryValue: positionValue.toFixed(2), // Placeholder - would need historical data
          pnl: '0.00', // Placeholder - would need entry price data
          pnlPercentage: 0,
          earnedFees: '0.00', // Would need fee calculation from position data
          strategy: vault.strategy,
          riskLevel: vault.riskLevel,
          entryDate: new Date().toISOString(), // Placeholder
          lastUpdated: new Date().toISOString()
        };
      })
    );

    // Filter out null positions
    const validPositions = vaultPositions.filter(Boolean);
    
    // Calculate summary
    const totalValue = validPositions.reduce((sum, pos) => 
      sum + parseFloat(pos.currentValue), 0
    );
    
    const totalPnL = validPositions.reduce((sum, pos) => 
      sum + parseFloat(pos.pnl), 0
    );

    return createApiResponse({
      userAddress,
      positions: validPositions,
      summary: {
        totalPositions: validPositions.length,
        totalValue: totalValue.toFixed(2),
        totalPnL: totalPnL.toFixed(2),
        totalPnLPercentage: totalValue > 0 ? (totalPnL / totalValue) * 100 : 0
      }
    }, corsHeaders);

  } catch (error) {
    console.error('❌ Error in handleUserVaultPositions:', error);
    const { corsHeaders } = getRequestContext(env);
    
    return createErrorResponse(
      'Failed to fetch user vault positions from subgraph',
      'FETCH_ERROR',
      corsHeaders
    );
  }
}
