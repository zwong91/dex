/**
 * DEX Pools and Analytics Handlers
 * Handles all pool-related and analytics endpoints
 */

import type { PoolData, TokenInfo, DexAnalytics } from '../types';
import { createApiResponse, createErrorResponse, parseQueryParams, getRequestContext, createPaginationInfo } from '../utils';

// Handler for pools list
export async function handlePoolsList(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { corsHeaders } = getRequestContext(env);
    
    const offset = (page - 1) * limit;
    
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

  try {
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

    // Mock detailed pool data
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
