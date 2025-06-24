/**
 * DEX Pools Handlers - Pure GraphQL Implementation
 * 
 * All handlers now use GraphQL subgraph exclusively for data.
 * No database fallbacks - the subgraph is the single source of truth.
 */

import { subgraphClient, isSubgraphHealthy } from '../graphql/client';
import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext, createPaginationInfo } from '../utils';

/**
 * Get list of all pools
 */
export async function handlePoolsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const offset = (page - 1) * limit;
    
    // Check if subgraph is available and healthy
    const subgraphHealth = await isSubgraphHealthy();
    
    if (!subgraphHealth.healthy) {
      return createErrorResponse(
        'Subgraph unavailable', 
        'SUBGRAPH_ERROR',
        corsHeaders,
        503
      );
    }

    console.log('🔗 Fetching pools from subgraph...');
    
    const subgraphPools = await subgraphClient.getPools(limit, offset, 'timestamp', 'desc');
    
    // Transform subgraph data to API format
    const transformedPools = subgraphPools.map(pool => ({
      id: pool.id,
      pairAddress: pool.id,
      chain: 'bsc-testnet',
      name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
      status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
      version: '2.1',
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
      },
      binStep: pool.binStep,
      activeId: pool.activeId,
      reserveX: pool.reserveX,
      reserveY: pool.reserveY,
      totalValueLockedUSD: pool.totalValueLockedUSD,
      volumeUSD: pool.volumeUSD,
      feesUSD: pool.feesUSD,
      txCount: pool.txCount,
      liquidityProviderCount: pool.liquidityProviderCount,
      tokenXPrice: pool.tokenXPrice,
      tokenYPrice: pool.tokenYPrice,
      tokenXPriceUSD: pool.tokenXPriceUSD,
      tokenYPriceUSD: pool.tokenYPriceUSD,
      createdAt: new Date(pool.timestamp * 1000).toISOString(),
      lastUpdate: pool.timestamp
    }));

    const total = transformedPools.length;
    const pagination = createPaginationInfo(page, limit, total);

    return createApiResponse(transformedPools, corsHeaders, 200, pagination);
    
  } catch (error) {
    console.error('❌ Error fetching pools from subgraph:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch pools data',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get list of tokens
 */
export async function handleTokensList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
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

    console.log('🔗 Fetching tokens from subgraph...');
    
    // Get pools to extract unique tokens
    const pools = await subgraphClient.getPools(1000, 0, 'timestamp', 'desc');
    
    // Extract unique tokens from pools
    const tokenMap = new Map();
    
    pools.forEach(pool => {
      if (!tokenMap.has(pool.tokenX.id)) {
        tokenMap.set(pool.tokenX.id, {
          id: pool.tokenX.id,
          address: pool.tokenX.id,
          symbol: pool.tokenX.symbol,
          name: pool.tokenX.name,
          decimals: pool.tokenX.decimals,
          chain: 'bsc-testnet',
          totalValueLockedUSD: '0',
          volumeUSD: '0',
          txCount: 0,
          poolCount: 0
        });
      }
      
      if (!tokenMap.has(pool.tokenY.id)) {
        tokenMap.set(pool.tokenY.id, {
          id: pool.tokenY.id,
          address: pool.tokenY.id,
          symbol: pool.tokenY.symbol,
          name: pool.tokenY.name,
          decimals: pool.tokenY.decimals,
          chain: 'bsc-testnet',
          totalValueLockedUSD: '0',
          volumeUSD: '0',
          txCount: 0,
          poolCount: 0
        });
      }
      
      // Aggregate stats
      const tokenXData = tokenMap.get(pool.tokenX.id);
      const tokenYData = tokenMap.get(pool.tokenY.id);
      
      tokenXData.totalValueLockedUSD = (parseFloat(tokenXData.totalValueLockedUSD) + parseFloat(pool.totalValueLockedUSD || '0') / 2).toString();
      tokenYData.totalValueLockedUSD = (parseFloat(tokenYData.totalValueLockedUSD) + parseFloat(pool.totalValueLockedUSD || '0') / 2).toString();
      
      tokenXData.volumeUSD = (parseFloat(tokenXData.volumeUSD) + parseFloat(pool.volumeUSD || '0') / 2).toString();
      tokenYData.volumeUSD = (parseFloat(tokenYData.volumeUSD) + parseFloat(pool.volumeUSD || '0') / 2).toString();
      
      tokenXData.txCount += pool.txCount / 2;
      tokenYData.txCount += pool.txCount / 2;
      
      tokenXData.poolCount++;
      tokenYData.poolCount++;
    });
    
    const tokens = Array.from(tokenMap.values())
      .sort((a, b) => parseFloat(b.totalValueLockedUSD) - parseFloat(a.totalValueLockedUSD))
      .slice(offset, offset + limit);
    
    const total = tokenMap.size;
    const pagination = createPaginationInfo(page, limit, total);

    return createApiResponse(tokens, corsHeaders, 200, pagination);
    
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch tokens data',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get DEX analytics
 */
export async function handleDexAnalytics(request: Request, env: any): Promise<Response> {
  try {
    const { corsHeaders } = getRequestContext(env);
    
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

    console.log('🔗 Fetching DEX analytics from subgraph...');
    
    // Get all pools for analytics
    const pools = await subgraphClient.getPools(1000, 0, 'totalValueLockedUSD', 'desc');
    
    // Calculate analytics
    const totalValueLocked = pools.reduce((sum, pool) => sum + parseFloat(pool.totalValueLockedUSD || '0'), 0);
    const totalVolume24h = pools.reduce((sum, pool) => sum + parseFloat(pool.volumeUSD || '0'), 0);
    const totalFees24h = pools.reduce((sum, pool) => sum + parseFloat(pool.feesUSD || '0'), 0);
    const totalTxCount = pools.reduce((sum, pool) => sum + pool.txCount, 0);
    const activePools = pools.filter(pool => pool.liquidityProviderCount > 0).length;
    
    // Get unique tokens count
    const uniqueTokens = new Set();
    pools.forEach(pool => {
      uniqueTokens.add(pool.tokenX.id);
      uniqueTokens.add(pool.tokenY.id);
    });
    
    const analytics = {
      totalValueLocked: totalValueLocked.toString(),
      volume24h: totalVolume24h.toString(),
      fees24h: totalFees24h.toString(),
      txCount24h: totalTxCount,
      totalPools: pools.length,
      activePools,
      uniqueTokens: uniqueTokens.size,
      timestamp: Math.floor(Date.now() / 1000),
      chain: 'bsc-testnet'
    };

    return createApiResponse(analytics, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch analytics data',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get pools by chain
 */
export async function handlePoolsByChain(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const chainId = pathSegments[pathSegments.length - 1];
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const offset = (page - 1) * limit;
    
    // For this implementation, we'll filter by the chain we support
    if (chainId !== 'bsc-testnet' && chainId !== '97') {
      return createErrorResponse(
        'Unsupported chain',
        'INVALID_CHAIN',
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

    console.log(`🔗 Fetching pools for chain ${chainId} from subgraph...`);
    
    const subgraphPools = await subgraphClient.getPools(limit, offset, 'totalValueLockedUSD', 'desc');
    
    // Transform and filter pools for the requested chain
    const chainPools = subgraphPools.map(pool => ({
      id: pool.id,
      pairAddress: pool.id,
      chain: 'bsc-testnet',
      name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
      status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
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
      },
      binStep: pool.binStep,
      tvl: pool.totalValueLockedUSD,
      volume24h: pool.volumeUSD,
      fees24h: pool.feesUSD,
      apy: calculatePoolAPY(pool),
      createdAt: new Date(pool.timestamp * 1000).toISOString()
    }));

    const total = chainPools.length;
    const pagination = createPaginationInfo(page, limit, total);

    return createApiResponse(chainPools, corsHeaders, 200, pagination);
    
  } catch (error) {
    console.error('❌ Error fetching pools by chain:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch pools data',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

/**
 * Get detailed pool information
 */
export async function handlePoolDetails(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const poolId = pathSegments[pathSegments.length - 1];
    const { corsHeaders } = getRequestContext(env);
    
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

    console.log(`🔗 Fetching pool ${poolId} details from subgraph...`);
    
    const pool = await subgraphClient.getPool(poolId);
    
    if (!pool) {
      return createErrorResponse(
        'Pool not found',
        'POOL_NOT_FOUND',
        corsHeaders,
        404
      );
    }

    // Get 24h stats
    const stats24h = await subgraphClient.getPool24hStats(poolId);
    
    // Transform pool data to detailed format
    const poolDetails = {
      id: pool.id,
      pairAddress: pool.id,
      chain: 'bsc-testnet',
      name: pool.name || `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
      status: pool.liquidityProviderCount > 0 ? 'active' : 'inactive',
      version: '2.1',
      tokenX: {
        address: pool.tokenX.id,
        symbol: pool.tokenX.symbol,
        name: pool.tokenX.name,
        decimals: pool.tokenX.decimals,
        reserve: pool.reserveX,
        priceUSD: pool.tokenXPriceUSD
      },
      tokenY: {
        address: pool.tokenY.id,
        symbol: pool.tokenY.symbol,
        name: pool.tokenY.name,
        decimals: pool.tokenY.decimals,
        reserve: pool.reserveY,
        priceUSD: pool.tokenYPriceUSD
      },
      binStep: pool.binStep,
      activeId: pool.activeId,
      totalValueLockedUSD: pool.totalValueLockedUSD,
      volume24h: stats24h.volume24h.toString(),
      fees24h: stats24h.fees24h.toString(),
      swapCount24h: stats24h.swapCount,
      txCount: pool.txCount,
      liquidityProviderCount: pool.liquidityProviderCount,
      apy: calculatePoolAPY(pool),
      apr: calculatePoolAPR(pool),
      createdAt: new Date(pool.timestamp * 1000).toISOString(),
      lastUpdate: pool.timestamp
    };

    return createApiResponse(poolDetails, corsHeaders);
    
  } catch (error) {
    console.error('❌ Error fetching pool details:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Failed to fetch pool details',
      'GRAPHQL_ERROR',
      corsHeaders,
      500
    );
  }
}

// Helper functions for calculations
function calculatePoolAPY(pool: any): number {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const fees24h = parseFloat(pool.feesUSD || '0');
  
  if (tvl === 0) return 0;
  
  // Annualized APY based on 24h fees
  const dailyReturn = fees24h / tvl;
  const apy = ((1 + dailyReturn) ** 365 - 1) * 100;
  
  return Math.min(apy, 1000); // Cap at 1000% APY
}

function calculatePoolAPR(pool: any): number {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0');
  const fees24h = parseFloat(pool.feesUSD || '0');
  
  if (tvl === 0) return 0;
  
  // Simple APR calculation
  const dailyReturn = fees24h / tvl;
  const apr = dailyReturn * 365 * 100;
  
  return Math.min(apr, 1000); // Cap at 1000% APR
}
