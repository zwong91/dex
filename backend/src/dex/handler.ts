/**
 * DEX API Main Handler (Pure GraphQL)
 * 
 * Updated to use GraphQL-only routes and handlers.
 * All data comes from the subgraph - no database dependencies.
 */

import { validateApiKey, hasPermission, checkRateLimit, trackApiUsage } from './auth';
import { matchGraphQLRoute, extractRouteParams } from './routing';
import type { CorsHeaders } from './types';

/**
 * Create the main DEX handler function
 */
export async function createDexHandler(env: any) {
  return async function handleDexRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log('DEX V1 API request:', request.method, url.pathname);
    
    // CORS headers
    const corsHeaders: CorsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Handle public endpoints first (no auth required)
      if ( url.pathname === '/v1/api/dex' || url.pathname === '/v1/api/dex/') {
        return handleApiInfo(corsHeaders);
      }

      if (url.pathname === '/v1/api/dex/health') {
        return handleHealthCheck(env, corsHeaders);
      }

      // Extract API key from headers
      const apiKey = request.headers.get('X-API-Key') || 
                    request.headers.get('Authorization')?.replace('Bearer ', '');
      
      // Authentication required for all other endpoints
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Authentication required',
          message: 'Please provide an API key using the X-API-Key header or Authorization Bearer token',
          code: 'AUTH_REQUIRED'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate API key and get permissions
      const authResult = await validateApiKey(env, apiKey);
      if (!authResult.valid) {
        return new Response(JSON.stringify({
          error: 'Invalid API key',
          message: authResult.error || 'The provided API key is not valid or has been revoked',
          code: 'AUTH_INVALID'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, permissions, tier } = authResult;

      // Ensure user exists
      if (!user) {
        return new Response(JSON.stringify({
          error: 'Authentication error',
          message: 'User information not available',
          code: 'AUTH_USER_MISSING'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Track API usage (async, don't wait)
      trackApiUsage(env, apiKey, url.pathname, request.method, user.id).catch(console.error);

      // Rate limiting check
      const rateLimitResult = await checkRateLimit(env, user.id, tier || 'basic');
      if (rateLimitResult.exceeded) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Rate limit of ${rateLimitResult.limit} requests per hour exceeded`,
          reset_time: rateLimitResult.resetTime,
          code: 'RATE_LIMIT_EXCEEDED'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find matching route using GraphQL-only routes
      const route = matchGraphQLRoute(url.pathname, request.method);
      if (!route) {
        return new Response(JSON.stringify({
          error: 'Endpoint not found',
          message: `The endpoint ${url.pathname} does not exist`,
          code: 'ENDPOINT_NOT_FOUND'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check permissions if required
      if (route.requiresAuth) {
        // For now, we'll use a simplified permission check
        // In the future, this could be made more granular per endpoint
        const hasBasicAccess = (permissions && permissions.length > 0) || tier === 'enterprise';
        
        if (!hasBasicAccess) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires valid API permissions',
            your_tier: tier,
            code: 'INSUFFICIENT_PERMISSIONS'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Extract route parameters
      const routeParams = extractRouteParams(url.pathname, route.path);
      
      // Create enriched request with additional context
      const enrichedRequest = request;
      
      // Add context to the environment for the handler
      const enrichedEnv = {
        ...env,
        _requestContext: {
          user,
          permissions,
          tier,
          routeParams,
          corsHeaders
        }
      };

      // Call the route handler
      const response = await route.handler(enrichedRequest, enrichedEnv);
      
      // Ensure CORS headers are applied to the response
      const responseWithCors = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders
        }
      });

      return responseWithCors;

    } catch (error) {
      console.error('DEX V2 API error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'INTERNAL_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Handle API information endpoint
 */
function handleApiInfo(corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify({
    name: 'Entysquare DEX API',
    version: '2.0.0',
    description: 'Professional DEX analytics and trading API for Trader Joe on Avalanche',
    documentation: 'https://docs.entysquare.com/dex-api',
    endpoints: {
      public: [
        'GET /api/dex - API information',
        'GET /api/dex/health - Health check'
      ],
      authenticated: [
        'GET /api/dex/pools - List pools',
        'GET /api/dex/tokens - List tokens',
        'GET /api/dex/analytics - DEX analytics',
        'GET /api/dex/pools/chain/:chainId - Pools by chain',
        'GET /api/dex/pools/:poolId - Pool details',
        'GET /api/dex/user/:userAddress/rewards - User rewards',
        'POST /api/dex/rewards/batch-proof - Batch rewards proof',
        'GET /api/dex/user/:userAddress/claimable-rewards - Claimable rewards',
        'GET /api/dex/user/:userAddress/rewards/history - Rewards history',
        'GET /api/dex/user/:userAddress/bin-ids - User bin IDs',
        'GET /api/dex/user/:userAddress/pool-ids - User pool IDs',
        'GET /api/dex/pool/:poolId/user/:userAddress/balances - Pool user balances',
        'GET /api/dex/user/:userAddress/history - User history',
        'GET /api/dex/user/:userAddress/fees-earned - User fees earned',
        'GET /api/dex/user/:userAddress/lifetime-stats - User lifetime stats',
        'GET /api/dex/user/:userAddress/farms - User farms',
        'GET /api/dex/user/:userAddress/farms/:farmId - User farm details',
        'GET /api/dex/vaults - All vaults',
        'GET /api/dex/vaults/chain/:chainId - Vaults by chain',
        'GET /api/dex/vault/:vaultId/share-price - Vault share price',
        'GET /api/dex/vault/:vaultId - Vault details',
        'GET /api/dex/vault/:vaultId/tvl-history - Vault TVL history',
        'GET /api/dex/vault/:vaultId/recent-activity - Vault recent activity',
        'GET /api/dex/user/:userAddress/vault-withdrawals - Vault withdrawals by user',
        'GET /api/dex/user/:userAddress/vault/:vaultId/withdrawals - Vault withdrawals by user and vault'
      ]
    },
    authentication: {
      type: 'API Key',
      header: 'X-API-Key',
      alternative: 'Authorization: Bearer {api_key}'
    },
    rate_limits: {
      basic: '100 requests/hour',
      premium: '1000 requests/hour', 
      enterprise: '10000 requests/hour'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(env: any, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: env.D1_DATABASE ? 'connected' : 'disconnected',
    services: {
      database: env.D1_DATABASE ? 'online' : 'offline',
      blockchain_rpc: env.BSC_INFURA_URL ? 'configured' : 'missing',
      price_api: env.PRICE_API_URL ? 'configured' : 'missing'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
