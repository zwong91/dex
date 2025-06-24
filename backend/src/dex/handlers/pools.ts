/**
 * DEX Pools and Analytics Handlers
 * Handles all pool-related and analytics endpoints
 */

import type { PoolData, TokenInfo, DexAnalytics } from '../types';
import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext, createPaginationInfo } from '../utils';
import { subgraphClient, isSubgraphHealthy, type Pool } from '../graphql/client';

// Handler for pools list
export async function handlePoolsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const offset = (page - 1) * limit;
    
    // Check if subgraph is available and healthy
    const subgraphHealth = await isSubgraphHealthy();
    
    if (subgraphHealth.healthy) {
      // Use GraphQL subgraph for real-time data
      console.log('🔗 Fetching pools from subgraph...');
      
      try {
        const subgraphPools = await subgraphClient.getPools(limit, offset, 'createdAtTimestamp', 'desc');
        
        // Transform subgraph data to API format
        const transformedPools = subgraphPools.map(pool => ({
          id: pool.id,
          pairAddress: pool.pairAddress,
          chain: 'bsc-testnet', // From env or config
          name: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
          status: 'active',
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
          reserveX: pool.reserveX,
          reserveY: pool.reserveY,
          totalSupply: pool.totalSupply,
          createdAt: new Date(parseInt(pool.createdAtTimestamp) * 1000).toISOString(),
          liquidityUsd: pool.liquidityUsd || 0,
          volume24h: pool.volume24h || '0',
          fees24h: pool.fees24h || '0'
        }));

        // Get total count from subgraph (for pagination)
        // Note: This is a simplified approach. For better performance, 
        // you might want to implement a separate count query
        const totalPools = await subgraphClient.getPools(1000, 0); // Get more for counting
        const total = totalPools.length;
        
        const pagination = createPaginationInfo(page, limit, total);

        return createApiResponse(transformedPools, corsHeaders, 200, pagination);
        
      } catch (subgraphError) {
        console.error('❌ Subgraph query failed, falling back to database:', subgraphError);
        // Fall through to database fallback
      }
    } else {
      console.log('⚠️ Subgraph not healthy, using database fallback:', subgraphHealth.error);
    }

    // Fallback to database if subgraph is not available
    console.log('📦 Fetching pools from database...');
    const pools = await env.D1_DATABASE.prepare(`
      SELECT 
        id,
        address,
        chain,
        token_x,
        token_y,
        bin_step,
        name,
        status,
        version,
        created_at
      FROM pools 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Get total count
    const countResult = await env.D1_DATABASE.prepare(`
      SELECT COUNT(*) as total FROM pools
    `).first();

    const total = countResult?.total || 0;
    const pagination = createPaginationInfo(page, limit, total);

    return createApiResponse(pools.results || [], corsHeaders, 200, pagination);
  } catch (error) {
    console.error('Error fetching pools:', error);
    const { corsHeaders } = getRequestContext(env);
    return createErrorResponse(
      'Database error',
      'Failed to fetch pools data',
      corsHeaders,
      500,
      'DATABASE_ERROR'
    );
  }
}

// Handler for tokens list
export async function handleTokensList(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { corsHeaders } = getRequestContext(env);
  
  try {
    const tokens = await env.D1_DATABASE.prepare(`
      SELECT 
        id,
        symbol,
        name,
        address,
        chain,
        decimals,
        logo_uri
      FROM tokens 
      ORDER BY symbol ASC
      LIMIT 50
    `).all();

    return createApiResponse({
      count: tokens.results?.length || 0,
      tokens: tokens.results || []
    }, corsHeaders);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return createErrorResponse(
      'Database error',
      'Failed to fetch tokens data',
      corsHeaders,
      500,
      'DATABASE_ERROR'
    );
  }
}

// Handler for DEX analytics
export async function handleDexAnalytics(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { corsHeaders } = getRequestContext(env);
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const version = url.searchParams.get('version') || 'all';

  try {
    // Mock analytics data
    const analyticsData = [
      {
        date: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
        reserveUsd: 51000000,
        volumeUsd: 1500000,
        feesUsd: 4500,
        txCount: 750,
        userCount: 125
      }
    ];

    return createApiResponse(analyticsData, corsHeaders);
  } catch (error) {
    console.error('Error fetching DEX analytics:', error);
    return createErrorResponse(
      'Analytics error',
      'Failed to fetch DEX analytics',
      corsHeaders,
      500,
      'ANALYTICS_ERROR'
    );
  }
}

// Handler for pools by chain
export async function handlePoolsByChain(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const chainId = routeParams.chainId;
  const { page, limit } = parseQueryParams(url);

  try {
    const pools = await env.D1_DATABASE.prepare(`
      SELECT 
        address as pairAddress,
        chain,
        name,
        status,
        version,
        token_x,
        token_y,
        bin_step as lbBinStep,
        created_at
      FROM pools 
      WHERE chain = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(chainId, limit, (page - 1) * limit).all();

    // Mock additional data for each pool
    const poolsWithData = (pools.results || []).map((pool: any) => ({
      pairAddress: pool.pairAddress,
      chain: pool.chain,
      name: pool.name,
      status: pool.status,
      version: pool.version,
      tokenX: {
        address: pool.token_x,
        name: "Token X",
        symbol: "TX",
        decimals: 18,
        priceUsd: 25.50,
        priceNative: "1.0"
      },
      tokenY: {
        address: pool.token_y,
        name: "Token Y", 
        symbol: "TY",
        decimals: 6,
        priceUsd: 1.00,
        priceNative: "0.039216"
      },
      reserveX: 1000000,
      reserveY: 25500000,
      lbBinStep: pool.lbBinStep,
      liquidityUsd: 51000000,
      volume24hUsd: 1500000,
      fees24hUsd: 4500,
      apr: 15.25,
      apy: 16.42
    }));

    return createApiResponse(poolsWithData, corsHeaders);
  } catch (error) {
    console.error('Error fetching pools by chain:', error);
    return createErrorResponse(
      'Database error',
      'Failed to fetch pools by chain',
      corsHeaders,
      500,
      'DATABASE_ERROR'
    );
  }
}

// Handler for pool details
export async function handlePoolDetails(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const { routeParams, corsHeaders } = getRequestContext(env);
  const poolId = routeParams.poolId;

  if (!poolId) {
    return createErrorResponse(
      'Invalid request',
      'Pool ID is required',
      corsHeaders,
      400,
      'INVALID_REQUEST'
    );
  }

  try {
    // Check if subgraph is available and healthy
    const subgraphHealth = await isSubgraphHealthy();
    
    if (subgraphHealth.healthy) {
      // Try to get pool data from subgraph first
      console.log('🔗 Fetching pool details from subgraph for:', poolId);
      
      try {
        let subgraphPool: Pool | null = null;
        
        // Try to find pool by address first
        if (poolId.startsWith('0x')) {
          subgraphPool = await subgraphClient.getPool(poolId);
        } else {
          // If poolId is not an address, search by ID
          const pools = await subgraphClient.getPools(1000, 0);
          subgraphPool = pools.find(p => p.id === poolId) || null;
        }
        
        if (subgraphPool) {
          // Get 24h stats for the pool
          const stats24h = await subgraphClient.getPool24hStats(subgraphPool.pairAddress);
          
          // Transform subgraph data to API format
          const poolDetails = {
            id: subgraphPool.id,
            pairAddress: subgraphPool.pairAddress,
            chain: 'bsc-testnet', // From env or config
            name: `${subgraphPool.tokenX.symbol}/${subgraphPool.tokenY.symbol}`,
            status: 'active',
            version: '2.1',
            tokenX: {
              address: subgraphPool.tokenX.id,
              name: subgraphPool.tokenX.name,
              symbol: subgraphPool.tokenX.symbol,
              decimals: subgraphPool.tokenX.decimals,
              priceUsd: 1.0 // TODO: Get from price oracle
            },
            tokenY: {
              address: subgraphPool.tokenY.id,
              name: subgraphPool.tokenY.name,
              symbol: subgraphPool.tokenY.symbol,
              decimals: subgraphPool.tokenY.decimals,
              priceUsd: 1.0 // TODO: Get from price oracle
            },
            reserveX: subgraphPool.reserveX,
            reserveY: subgraphPool.reserveY,
            lbBinStep: subgraphPool.binStep,
            liquidityUsd: 0, // TODO: Calculate from reserves and prices
            volume24hUsd: stats24h.volume24h,
            fees24hUsd: stats24h.fees24h,
            swapCount24h: stats24h.swapCount,
            apr: 15.25, // TODO: Calculate based on fees and liquidity
            apy: 16.42,
            createdAt: new Date(parseInt(subgraphPool.createdAtTimestamp) * 1000).toISOString(),
            totalSupply: subgraphPool.totalSupply
          };

          return createApiResponse({ pool: poolDetails }, corsHeaders);
        }
        
      } catch (subgraphError) {
        console.error('❌ Subgraph query failed for pool details, falling back to database:', subgraphError);
        // Fall through to database fallback
      }
    } else {
      console.log('⚠️ Subgraph not healthy for pool details, using database fallback:', subgraphHealth.error);
    }

    // Fallback to database if subgraph is not available or pool not found
    console.log('📦 Fetching pool details from database...');
    const pool = await env.D1_DATABASE.prepare(`
      SELECT 
        id,
        address,
        chain,
        token_x,
        token_y,
        bin_step,
        name,
        status,
        version,
        created_at
      FROM pools 
      WHERE id = ? OR address = ?
    `).bind(poolId, poolId).first();

    if (!pool) {
      return createErrorResponse(
        'Pool not found',
        `Pool with ID ${poolId} does not exist`,
        corsHeaders,
        404,
        'POOL_NOT_FOUND'
      );
    }

    // Mock detailed pool data for database fallback
    const poolDetails = {
      id: pool.id,
      pairAddress: pool.address,
      chain: pool.chain,
      name: pool.name,
      status: pool.status,
      version: pool.version,
      tokenX: {
        address: pool.token_x,
        name: "Token X",
        symbol: "TX",
        decimals: 18,
        priceUsd: 25.50
      },
      tokenY: {
        address: pool.token_y,
        name: "Token Y", 
        symbol: "TY",
        decimals: 6,
        priceUsd: 1.00
      },
      reserveX: 1000000,
      reserveY: 25500000,
      lbBinStep: pool.bin_step,
      liquidityUsd: 51000000,
      volume24hUsd: 1500000,
      fees24hUsd: 4500,
      apr: 15.25,
      apy: 16.42,
      createdAt: pool.created_at
    };

    return createApiResponse({ pool: poolDetails }, corsHeaders);
  } catch (error) {
    console.error('Error fetching pool details:', error);
    return createErrorResponse(
      'Database error',
      'Failed to fetch pool details',
      corsHeaders,
      500,
      'DATABASE_ERROR'
    );
  }
}
