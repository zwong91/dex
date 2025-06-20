/**
 * DEX API V2 Handler - Core implementation with authentication
 */

export async function createDexHandler(env: any) {
  return async function handleDexRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log('DEX V2 API request:', request.method, url.pathname);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Extract API key from headers
      const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
      
      // Basic API info endpoint (no auth required)
      if (url.pathname === '/api/dex' || url.pathname === '/api/dex/') {
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
              'GET /api/dex/pools/{address} - Pool details',
              'GET /api/dex/pools/{address}/stats - Pool statistics',
              'GET /api/dex/swaps - Recent swaps',
              'GET /api/dex/liquidity - Liquidity events',
              'GET /api/dex/price/{token} - Token price'
            ]
          },
          authentication: {
            type: 'API Key',
            header: 'X-API-Key',
            alternative: 'Authorization: Bearer {api_key}'
          },
          rate_limits: {
            free: '50 requests/hour',
            basic: '1000 requests/hour', 
            pro: '10000 requests/hour',
            enterprise: 'Unlimited'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check (no auth required)
      if (url.pathname === '/api/dex/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          database: env.D1_DATABASE ? 'connected' : 'disconnected',
          services: {
            database: env.D1_DATABASE ? 'online' : 'offline',
            blockchain_rpc: env.BSC_RPC_URL ? 'configured' : 'missing',
            price_api: env.PRICE_API_URL ? 'configured' : 'missing'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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

      // Track API usage (async, don't wait)
      trackApiUsage(env, apiKey, url.pathname, request.method, user.id).catch(console.error);

      // Rate limiting check
      const rateLimitResult = await checkRateLimit(env, user.id, tier);
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

      // Route to specific handlers based on path
      const pathSegments = url.pathname.split('/').filter(Boolean);
      
      // GET /api/dex/pools
      if (pathSegments[2] === 'pools' && request.method === 'GET' && pathSegments.length === 3) {
        if (!hasPermission(permissions, 'pools_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires pools_read permission',
            required_permission: 'pools_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return await handlePoolsList(env, url);
      }

      // GET /api/dex/tokens
      if (pathSegments[2] === 'tokens' && request.method === 'GET') {
        if (!hasPermission(permissions, 'tokens_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires tokens_read permission',
            required_permission: 'tokens_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return await handleTokensList(env, url);
      }

      // 404 for unknown endpoints
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        message: `The endpoint ${url.pathname} does not exist`,
        available_endpoints: ['/api/dex', '/api/dex/health', '/api/dex/pools', '/api/dex/tokens']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

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

// Helper function to validate API key
async function validateApiKey(env: any, apiKey: string) {
  try {
    if (!env.D1_DATABASE) {
      return { valid: false, error: 'Database not available' };
    }

    // Find API key by key hash (simplified - in production use proper hashing)
    const keyRecord = await env.D1_DATABASE.prepare(`
      SELECT ak.*, u.id as user_id, u.email, u.status as user_status,
             ak.permissions
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = ? AND ak.status = 'active' AND u.status = 'active'
    `).bind(apiKey).first();

    if (!keyRecord) {
      return { valid: false, error: 'API key not found or inactive' };
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Parse permissions
    let permissions = [];
    try {
      permissions = JSON.parse(keyRecord.permissions || '[]');
    } catch (e) {
      console.error('Failed to parse permissions:', e);
    }

    return {
      valid: true,
      user: {
        id: keyRecord.user_id,
        email: keyRecord.email
      },
      permissions,
      tier: keyRecord.tier
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

// Helper function to check permissions
function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || userPermissions.includes('admin_system');
}

// Helper function to check rate limits
async function checkRateLimit(env: any, userId: string, tier: string) {
  // Simplified rate limiting - in production use Redis or more sophisticated approach
  const limits = {
    free: 50,
    basic: 1000,
    pro: 10000,
    enterprise: 999999
  };

  const limit = limits[tier as keyof typeof limits] || limits.free;
  
  // For now, return not exceeded (implement proper rate limiting later)
  return {
    exceeded: false,
    limit,
    resetTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
}

// Helper function to track API usage
async function trackApiUsage(env: any, apiKey: string, endpoint: string, method: string, userId: string) {
  try {
    if (!env.D1_DATABASE) return;

    await env.D1_DATABASE.prepare(`
      INSERT INTO api_usage (api_key_id, user_id, endpoint, method, status_code, timestamp, date)
      VALUES (?, ?, ?, ?, 200, ?, ?)
    `).bind(
      apiKey, // Simplified - should be actual API key ID
      userId,
      endpoint,
      method,
      Date.now(),
      new Date().toISOString().split('T')[0]
    ).run();
  } catch (error) {
    console.error('Failed to track API usage:', error);
  }
}

// Handler for pools list
async function handlePoolsList(env: any, url: URL) {
  try {
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
      LIMIT 20
    `).all();

    return new Response(JSON.stringify({
      success: true,
      count: pools.results?.length || 0,
      pools: pools.results || [],
      pagination: {
        page: 1,
        limit: 20,
        has_more: false
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new Error(`Failed to fetch pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handler for tokens list
async function handleTokensList(env: any, url: URL) {
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
      ORDER BY symbol
      LIMIT 50
    `).all();

    return new Response(JSON.stringify({
      success: true,
      count: tokens.results?.length || 0,
      tokens: tokens.results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new Error(`Failed to fetch tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
