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
      if (url.pathname === '/v1/api/dex' || url.pathname === '/v1/api/dex/') {
        return new Response(JSON.stringify({
          name: 'Entysquare DEX API',
          version: '2.0.0',
          description: 'Professional DEX analytics and trading API for Trader Joe on Avalanche',
          documentation: 'https://docs.entysquare.com/dex-api',
          endpoints: {
            public: [
              'GET /v1/api/dex - API information',
              'GET /v1/api/dex/health - Health check'
            ],
            authenticated: [
              'GET /v1/api/dex/pools - List pools',
              'GET /v1/api/dex/tokens - List tokens',
              'GET /v1/api/dex/analytics/{chain} - DEX analytics',
              'GET /v1/api/dex/pools/{chain} - Pools by chain',
              'GET /v1/api/dex/pools/{chain}/{address} - Pool details',
              'GET /v1/api/dex/rewards/{chain}/{user_address} - User rewards',
              'POST /v1/api/dex/rewards/batch-proof/{chain}/{user_address} - Batch rewards proof',
              'GET /v1/api/dex/rewards/claimable/{chain}/{user_address} - Claimable rewards',
              'GET /v1/api/dex/rewards/history/{chain}/{user_address} - Rewards history',
              'GET /v1/api/dex/user/bin-ids/{user_address}/{chain}/{pool_address} - User bin IDs',
              'GET /v1/api/dex/user/pool-ids/{user_address}/{chain} - User pool IDs',
              'GET /v1/api/dex/user/pool-user-balances - Pool user balances',
              'GET /v1/api/dex/user/{chain}/{user_address}/farms - User farms',
              'GET /v1/api/dex/user/{chain}/{user_address}/farms/{vault_id} - User farm details',
              'GET /v1/api/dex/user/{chain}/history/{user_address}/{pool_address} - User history',
              'GET /v1/api/dex/user/fees-earned/{chain}/{user_address}/{pool_address} - User fees earned',
              'GET /v1/api/dex/user-lifetime-stats/{chain}/users/{user_address}/swap-stats - User lifetime stats',
              'GET /v1/api/dex/vaults - All vaults',
              'GET /v1/api/dex/vaults/{chain} - Vaults by chain',
              'GET /v1/api/dex/vaults/{chain}/{vault_address}/share-price - Vault share price',
              'GET /v1/api/dex/vaults/{chain}/{vault_address} - Vault details',
              'GET /v1/api/dex/vaults/{chain}/{vault_address}/tvl-history - Vault TVL history',
              'GET /v1/api/dex/vaults/{chain}/{vault_address}/recent-activity - Vault recent activity',
              'GET /v1/api/dex/vaults/{chain}/withdrawals/{user_address} - Vault withdrawals by user',
              'GET /v1/api/dex/vaults/{chain}/{vault_address}/withdrawals/{user_address} - Vault withdrawals by user and vault'
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
      if (url.pathname === '/v1/api/dex/health') {
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
      
      // GET /v1/api/dex/pools
      if (pathSegments[3] === 'pools' && request.method === 'GET' && pathSegments.length === 4) {
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

      // GET /v1/api/dex/tokens
      if (pathSegments[3] === 'tokens' && request.method === 'GET') {
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

      // Route to other endpoints based on the URL pattern
      const basePath = '/' + pathSegments.slice(0, 3).join('/'); // /v1/api/dex
      
      if (basePath === '/v1/api/dex') {
        return await routeDexEndpoints(env, url, request, permissions, tier, corsHeaders);
      }

      // 404 for unknown endpoints
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        message: `The endpoint ${url.pathname} does not exist`,
        available_endpoints: ['/v1/api/dex', '/v1/api/dex/health', '/v1/api/dex/pools', '/v1/api/dex/tokens']
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

    // For demo purposes, handle the test keys directly
    if (apiKey === 'test-key') {
      return {
        valid: true,
        user: {
          id: 'test-user-001',
          email: 'test@example.com'
        },
        permissions: ['pools_read', 'swaps_read', 'liquidity_read', 'analytics_basic', 'price_history', 'tokens_read'],
        tier: 'basic'
      };
    }
    
    if (apiKey === 'admin-key') {
      return {
        valid: true,
        user: {
          id: 'admin-001',
          email: 'admin@entysquare.com'
        },
        permissions: ['pools_read', 'pools_create', 'swaps_read', 'swaps_write', 'liquidity_read', 'liquidity_write', 'portfolio_read', 'portfolio_write', 'analytics_basic', 'analytics_advanced', 'price_history', 'admin_users', 'admin_api', 'admin_system', 'tokens_read', 'analytics_read', 'rewards_read', 'user_read', 'vaults_read'],
        tier: 'enterprise'
      };
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

// Route handler for all remaining DEX endpoints
async function routeDexEndpoints(env: any, url: URL, request: Request, permissions: string[], tier: string, corsHeaders: any) {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const method = request.method;
  
  try {
    // DEX Analytics endpoints
    if (pathSegments[3] === 'analytics') {
      if (method === 'GET' && pathSegments[4]) {
        if (!hasPermission(permissions, 'analytics_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires analytics_read permission',
            required_permission: 'analytics_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleDexAnalytics(env, url);
      }
    }

    // Pool specific endpoints
    if (pathSegments[3] === 'pools') {
      const chain = pathSegments[4];
      const poolAddress = pathSegments[5];
      
      // GET /v1/api/dex/pools/{chain}
      if (method === 'GET' && chain && !poolAddress) {
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
        return await handlePoolsByChain(env, url);
      }
      
      // GET /v1/api/dex/pools/{chain}/{address}
      if (method === 'GET' && chain && poolAddress) {
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
        return await handlePoolDetails(env, url);
      }
    }

    // Rewards endpoints
    if (pathSegments[3] === 'rewards') {
      // POST /v1/api/dex/rewards/batch-proof/{chain}/{user_address}
      if (method === 'POST' && pathSegments[4] === 'batch-proof' && pathSegments[5] && pathSegments[6]) {
        if (!hasPermission(permissions, 'rewards_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires rewards_read permission',
            required_permission: 'rewards_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleBatchRewardsProof(env, url, request);
      }
      
      // GET /v1/api/dex/rewards/claimable/{chain}/{user_address}
      if (method === 'GET' && pathSegments[4] === 'claimable' && pathSegments[5] && pathSegments[6]) {
        if (!hasPermission(permissions, 'rewards_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires rewards_read permission',
            required_permission: 'rewards_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleClaimableRewards(env, url);
      }
      
      // GET /v1/api/dex/rewards/history/{chain}/{user_address}
      if (method === 'GET' && pathSegments[4] === 'history' && pathSegments[5] && pathSegments[6]) {
        if (!hasPermission(permissions, 'rewards_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires rewards_read permission',
            required_permission: 'rewards_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleRewardsHistory(env, url);
      }

      const chain = pathSegments[4];
      const userAddress = pathSegments[5];
      
      // GET /v1/api/dex/rewards/{chain}/{user_address}
      if (method === 'GET' && chain && userAddress) {
        if (!hasPermission(permissions, 'rewards_read')) {
          return new Response(JSON.stringify({
            error: 'Insufficient permissions',
            message: 'This endpoint requires rewards_read permission',
            required_permission: 'rewards_read',
            your_tier: tier
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleUserRewards(env, url);
      }
    }

    // User endpoints
    if (pathSegments[3] === 'user') {
      if (!hasPermission(permissions, 'user_read')) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions',
          message: 'This endpoint requires user_read permission',
          required_permission: 'user_read',
          your_tier: tier
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /v1/api/dex/user/bin-ids/{user_address}/{chain}/{pool_address}
      if (method === 'GET' && pathSegments[4] === 'bin-ids' && pathSegments[5] && pathSegments[6] && pathSegments[7]) {
        return await handleUserBinIds(env, url);
      }
      
      // GET /v1/api/dex/user/pool-ids/{user_address}/{chain}
      if (method === 'GET' && pathSegments[4] === 'pool-ids' && pathSegments[5] && pathSegments[6]) {
        return await handleUserPoolIds(env, url);
      }
      
      // GET /v1/api/dex/user/pool-user-balances
      if (method === 'GET' && pathSegments[4] === 'pool-user-balances') {
        return await handlePoolUserBalances(env, url);
      }
      
      // GET /v1/api/dex/user/{chain}/{user_address}/farms
      if (method === 'GET' && pathSegments[5] && pathSegments[6] === 'farms') {
        return await handleUserFarms(env, url);
      }
      
      // GET /v1/api/dex/user/{chain}/{user_address}/farms/{vault_id}
      if (method === 'GET' && pathSegments[5] && pathSegments[6] === 'farms' && pathSegments[7]) {
        return await handleUserFarmDetails(env, url);
      }
      
      // GET /v1/api/dex/user/{chain}/history/{user_address}/{pool_address}
      if (method === 'GET' && pathSegments[5] === 'history' && pathSegments[6] && pathSegments[7]) {
        return await handleUserHistory(env, url);
      }
      
      // GET /v1/api/dex/user/fees-earned/{chain}/{user_address}/{pool_address}
      if (method === 'GET' && pathSegments[4] === 'fees-earned' && pathSegments[5] && pathSegments[6] && pathSegments[7]) {
        return await handleUserFeesEarned(env, url);
      }
    }

    // User lifetime stats endpoints
    if (pathSegments[3] === 'user-lifetime-stats') {
      if (!hasPermission(permissions, 'user_read')) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions',
          message: 'This endpoint requires user_read permission',
          required_permission: 'user_read',
          your_tier: tier
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /v1/api/dex/user-lifetime-stats/{chain}/users/{user_address}/swap-stats
      if (method === 'GET' && pathSegments[5] === 'users' && pathSegments[6] && pathSegments[7] === 'swap-stats') {
        return await handleUserLifetimeStats(env, url);
      }
    }

    // Vaults endpoints
    if (pathSegments[3] === 'vaults') {
      if (!hasPermission(permissions, 'vaults_read')) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions',
          message: 'This endpoint requires vaults_read permission',
          required_permission: 'vaults_read',
          your_tier: tier
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /v1/api/dex/vaults
      if (method === 'GET' && pathSegments.length === 4) {
        return await handleVaultsList(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}
      if (method === 'GET' && pathSegments[4] && pathSegments.length === 5) {
        return await handleVaultsByChain(env, url);
      }
      
      const chain = pathSegments[4];
      const vaultAddress = pathSegments[5];
      
      // Handle withdrawals routes first (before vault details)
      // GET /v1/api/dex/vaults/{chain}/withdrawals/{user_address}
      if (method === 'GET' && chain && pathSegments[5] === 'withdrawals' && pathSegments[6]) {
        return await handleVaultWithdrawalsByUser(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}/{vault_address}/share-price
      if (method === 'GET' && chain && vaultAddress && pathSegments[6] === 'share-price') {
        return await handleVaultSharePrice(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}/{vault_address}/tvl-history
      if (method === 'GET' && chain && vaultAddress && pathSegments[6] === 'tvl-history') {
        return await handleVaultTvlHistory(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}/{vault_address}/recent-activity
      if (method === 'GET' && chain && vaultAddress && pathSegments[6] === 'recent-activity') {
        return await handleVaultRecentActivity(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}/{vault_address}/withdrawals/{user_address}
      if (method === 'GET' && chain && vaultAddress && pathSegments[6] === 'withdrawals' && pathSegments[7]) {
        return await handleVaultWithdrawalsByUserAndVault(env, url);
      }
      
      // GET /v1/api/dex/vaults/{chain}/{vault_address}
      if (method === 'GET' && chain && vaultAddress && pathSegments.length === 6) {
        return await handleVaultDetails(env, url);
      }
    }

    // If no endpoint matches, return 404
    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      message: `The endpoint ${url.pathname} does not exist`,
      available_endpoints: [
        'GET /v1/api/dex - API information',
        'GET /v1/api/dex/health - Health check',
        'GET /v1/api/dex/pools - List pools',
        'GET /v1/api/dex/tokens - List tokens',
        'GET /v1/api/dex/analytics/{chain} - DEX analytics',
        'GET /v1/api/dex/pools/{chain} - Pools by chain',
        'GET /v1/api/dex/pools/{chain}/{address} - Pool details',
        'GET /v1/api/dex/rewards/{chain}/{user_address} - User rewards',
        'POST /v1/api/dex/rewards/batch-proof/{chain}/{user_address} - Batch rewards proof',
        'GET /v1/api/dex/rewards/claimable/{chain}/{user_address} - Claimable rewards',
        'GET /v1/api/dex/rewards/history/{chain}/{user_address} - Rewards history',
        'GET /v1/api/dex/user/bin-ids/{user_address}/{chain}/{pool_address} - User bin IDs',
        'GET /v1/api/dex/user/pool-ids/{user_address}/{chain} - User pool IDs',
        'GET /v1/api/dex/user/pool-user-balances - Pool user balances',
        'GET /v1/api/dex/user/{chain}/{user_address}/farms - User farms',
        'GET /v1/api/dex/user/{chain}/{user_address}/farms/{vault_id} - User farm details',
        'GET /v1/api/dex/user/{chain}/history/{user_address}/{pool_address} - User history',
        'GET /v1/api/dex/user/fees-earned/{chain}/{user_address}/{pool_address} - User fees earned',
        'GET /v1/api/dex/user-lifetime-stats/{chain}/users/{user_address}/swap-stats - User lifetime stats',
        'GET /v1/api/dex/vaults - All vaults',
        'GET /v1/api/dex/vaults/{chain} - Vaults by chain',
        'GET /v1/api/dex/vaults/{chain}/{vault_address}/share-price - Vault share price',
        'GET /v1/api/dex/vaults/{chain}/{vault_address} - Vault details',
        'GET /v1/api/dex/vaults/{chain}/{vault_address}/tvl-history - Vault TVL history',
        'GET /v1/api/dex/vaults/{chain}/{vault_address}/recent-activity - Vault recent activity',
        'GET /v1/api/dex/vaults/{chain}/withdrawals/{user_address} - Vault withdrawals by user',
        'GET /v1/api/dex/vaults/{chain}/{vault_address}/withdrawals/{user_address} - Vault withdrawals by user and vault'
      ]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Route handler error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler functions for all the endpoints
async function handleDexAnalytics(env: any, url: URL) {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const version = url.searchParams.get('version') || 'all';

  try {
    // For now, return mock data - in production this would query the database
    return new Response(JSON.stringify([
      {
        date: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
        reserveUsd: 51000000,
        reserveNative: 2000000,
        volumeUsd: 1500000,
        volumeNative: 58824,
        feesUsd: 4500,
        feesNative: 176.47,
        protocolFeesUsd: 900,
        protocolFeesNative: 35.29
      }
    ]), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new Error(`Failed to fetch DEX analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handlePoolsByChain(env: any, url: URL) {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const pageNum = parseInt(url.searchParams.get('pageNum') || '1');
  const orderBy = url.searchParams.get('orderBy') || 'volume';
  const filterBy = url.searchParams.get('filterBy') || '1d';
  const status = url.searchParams.get('status') || 'all';
  const version = url.searchParams.get('version') || 'all';
  const excludeLowVolumePools = url.searchParams.get('excludeLowVolumePools') === 'true';

  try {
    let query = `
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
    `;
    const params = [chain];

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (version !== 'all') {
      query += ' AND version = ?';
      params.push(version);
    }

    // Add ordering
    switch (orderBy) {
      case 'liquidity':
        query += ' ORDER BY created_at DESC';
        break;
      case 'volume':
        query += ' ORDER BY created_at DESC';
        break;
      case 'name':
        query += ' ORDER BY name ASC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(pageSize.toString(), ((pageNum - 1) * pageSize).toString());

    const pools = await env.D1_DATABASE.prepare(query).bind(...params).all();

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
      lbBaseFeePct: 0.15,
      lbMaxFeePct: 1.5,
      activeBinId: 8388608,
      liquidityUsd: 51000000,
      liquidityNative: "2000000.0",
      liquidityDepthMinus: 500000,
      liquidityDepthPlus: 500000,
      volume24hUsd: 1500000,
      volume24hNative: "58824.0",
      volume7dUsd: 10500000,
      volume7dNative: "411768.0",
      fees24hUsd: 4500,
      fees24hNative: "176.47",
      fees7dUsd: 31500,
      fees7dNative: "1235.29",
      apr: 15.25,
      apy: 16.42
    }));

    return new Response(JSON.stringify(poolsWithData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new Error(`Failed to fetch pools by chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handlePoolDetails(env: any, url: URL) {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const address = pathSegments[5];

  try {
    const pool = await env.D1_DATABASE.prepare(`
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
      WHERE chain = ? AND address = ?
    `).bind(chain, address).first();

    if (!pool) {
      return new Response(JSON.stringify({
        error: 'Pool not found',
        message: `Pool ${address} not found on ${chain}`,
        code: 'POOL_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mock detailed pool data
    const poolDetails = {
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
      lbBaseFeePct: 0.15,
      lbMaxFeePct: 1.5,
      activeBinId: 8388608,
      liquidityUsd: 51000000,
      liquidityNative: "2000000.0",
      liquidityDepthMinus: 500000,
      liquidityDepthPlus: 500000,
      volume24hUsd: 1500000,
      volume24hNative: "58824.0",
      volume7dUsd: 10500000,
      volume7dNative: "411768.0",
      fees24hUsd: 4500,
      fees24hNative: "176.47",
      fees7dUsd: 31500,
      fees7dNative: "1235.29",
      apr: 15.25,
      apy: 16.42,
      createdAt: pool.created_at
    };

    return new Response(JSON.stringify(poolDetails), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new Error(`Failed to fetch pool details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Placeholder implementations for the remaining handlers
// These should be implemented with actual database queries and business logic

async function handleUserRewards(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/rewards/{chain}/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[5];

  // Mock rewards data structure
  const mockRewards = {
    userAddress: userAddress,
    chain: chain,
    totalRewards: "15000.50",
    claimableRewards: "5000.25",
    rewardsHistory: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        amount: "1500.75",
        timestamp: Math.floor(Date.now() / 1000),
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        status: "claimed"
      },
      {
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "REWARD",
        amount: "3500.25",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        status: "pending"
      }
    ],
    merkleProofs: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        amount: "1500.75",
        proof: ["0xproof1", "0xproof2", "0xproof3"]
      }
    ]
  };

  return new Response(JSON.stringify(mockRewards), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleBatchRewardsProof(env: any, url: URL, request: Request) {
  // Implementation for POST /v1/api/dex/rewards/batch-proof/{chain}/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];

  // Mock batch rewards proof response
  const mockBatchProof = {
    userAddress: userAddress,
    chain: chain,
    batchProofs: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        totalAmount: "5000.50",
        merkleRoot: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        proofs: [
          {
            amount: "2500.25",
            proof: ["0xproof1a", "0xproof1b", "0xproof1c"]
          },
          {
            amount: "2500.25", 
            proof: ["0xproof2a", "0xproof2b", "0xproof2c"]
          }
        ]
      }
    ],
    expirationTimestamp: Math.floor(Date.now() / 1000) + 604800, // 7 days from now
    signature: "0xsignature1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  };

  return new Response(JSON.stringify(mockBatchProof), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleClaimableRewards(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/rewards/claimable/{chain}/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  // Path: /v1/api/dex/rewards/claimable/bsc/0x742d35...
  // Index:  0  1   2   3       4         5   6
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];

  const mockClaimableRewards = {
    userAddress: userAddress,
    chain: chain,
    totalClaimable: "8500.75",
    claimableTokens: [
      {
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        tokenName: "Unicorn Token",
        decimals: 18,
        amount: "5000.50",
        amountUsd: "12500.75",
        lastUpdated: Math.floor(Date.now() / 1000)
      },
      {
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", 
        tokenSymbol: "REWARD",
        tokenName: "Reward Token",
        decimals: 18,
        amount: "3500.25",
        amountUsd: "7000.50",
        lastUpdated: Math.floor(Date.now() / 1000)
      }
    ],
    estimatedGasCost: "0.005",
    nextClaimAvailable: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };

  return new Response(JSON.stringify(mockClaimableRewards), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRewardsHistory(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/rewards/history/{chain}/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[5];
  const userAddress = pathSegments[6];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const mockRewardsHistory = {
    userAddress: userAddress,
    chain: chain,
    pagination: {
      page: page,
      limit: limit,
      total: 125,
      hasMore: page * limit < 125
    },
    history: [
      {
        id: "reward_001",
        tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "UNC",
        tokenName: "Unicorn Token",
        amount: "1500.75",
        amountUsd: "3751.88",
        type: "liquidity_provision",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        blockNumber: 12345678,
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        status: "claimed",
        claimedAt: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: "reward_002",
        tokenAddress: "0x9e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        tokenSymbol: "REWARD",
        tokenName: "Reward Token",
        amount: "3500.25",
        amountUsd: "7000.50",
        type: "trading_fees",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        blockNumber: 12345123,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        status: "pending",
        claimedAt: null
      }
    ],
    summary: {
      totalEarned: "25000.75",
      totalEarnedUsd: "62500.00",
      totalClaimed: "15000.50",
      totalClaimedUsd: "37500.00",
      totalPending: "10000.25",
      totalPendingUsd: "25000.00"
    }
  };

  return new Response(JSON.stringify(mockRewardsHistory), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUserBinIds(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/bin-ids/{user_address}/{chain}/{pool_address}
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

async function handleUserPoolIds(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/pool-ids/{user_address}/{chain}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const userAddress = pathSegments[5];
  const chain = pathSegments[6];

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
}

async function handlePoolUserBalances(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/pool-user-balances
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

async function handleUserFarms(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/{chain}/{user_address}/farms
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[5];

  const mockUserFarms = {
    userAddress: userAddress,
    chain: chain,
    farms: [
      {
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        name: "High Yield ETH-USDC Farm",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        strategy: "auto_compound",
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
        userPosition: {
          shares: "1500.75",
          valueUsd: "76500.00",
          depositedAt: Math.floor(Date.now() / 1000) - 604800,
          lastHarvest: Math.floor(Date.now() / 1000) - 86400
        },
        rewards: {
          pending: "250.50",
          pendingUsd: "500.25",
          totalEarned: "1250.75",
          totalEarnedUsd: "2501.50"
        },
        apy: 18.5,
        tvl: "5100000.0",
        status: "active"
      },
      {
        vaultId: "vault_002", 
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        name: "Stable Yield BNB-BUSD Farm",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        strategy: "yield_optimization",
        tokenX: {
          address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          symbol: "BNB",
          name: "Binance Coin"
        },
        tokenY: {
          address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
          symbol: "BUSD",
          name: "Binance USD"
        },
        userPosition: {
          shares: "750.25",
          valueUsd: "22500.00",
          depositedAt: Math.floor(Date.now() / 1000) - 1209600,
          lastHarvest: Math.floor(Date.now() / 1000) - 172800
        },
        rewards: {
          pending: "125.25",
          pendingUsd: "250.50",
          totalEarned: "625.75",
          totalEarnedUsd: "1251.50"
        },
        apy: 12.3,
        tvl: "2250000.0",
        status: "active"
      }
    ],
    summary: {
      totalFarms: 2,
      totalValueUsd: "99000.00",
      totalPendingRewardsUsd: "750.75",
      totalEarnedRewardsUsd: "3753.00",
      averageApy: 15.4
    }
  };

  return new Response(JSON.stringify(mockUserFarms), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUserFarmDetails(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/{chain}/{user_address}/farms/{vault_id}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[5];
  const vaultId = pathSegments[7];

  const mockUserFarmDetails = {
    vaultId: vaultId,
    vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
    userAddress: userAddress,
    chain: chain,
    farmDetails: {
      name: "High Yield ETH-USDC Farm",
      description: "Automated yield farming strategy for ETH-USDC liquidity pool",
      poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
      strategy: "auto_compound",
      riskLevel: "medium",
      managementFee: 0.5,
      performanceFee: 10.0,
      tokenX: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18
      },
      tokenY: {
        address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6
      }
    },
    userPosition: {
      shares: "1500.75",
      totalShares: "75000.0",
      sharePercent: 2.0,
      valueUsd: "76500.00",
      depositHistory: [
        {
          amount: "1000.0",
          valueUsd: "51000.00",
          timestamp: Math.floor(Date.now() / 1000) - 604800,
          txHash: "0xdeposit1234567890abcdef1234567890abcdef123"
        },
        {
          amount: "500.75",
          valueUsd: "25500.00",
          timestamp: Math.floor(Date.now() / 1000) - 259200,
          txHash: "0xdeposit2abcdef1234567890abcdef1234567890ab"
        }
      ],
      withdrawalHistory: [],
      lastAction: Math.floor(Date.now() / 1000) - 259200
    },
    rewards: {
      pending: "250.50",
      pendingUsd: "500.25",
      totalEarned: "1250.75",
      totalEarnedUsd: "2501.50",
      harvestHistory: [
        {
          amount: "500.25",
          amountUsd: "1000.50",
          timestamp: Math.floor(Date.now() / 1000) - 86400,
          txHash: "0xharvest1234567890abcdef1234567890abcdef12"
        }
      ],
      nextHarvestAvailable: Math.floor(Date.now() / 1000) + 3600
    },
    performance: {
      apy: 18.5,
      dailyYield: 0.05,
      weeklyYield: 0.35,
      monthlyYield: 1.5,
      totalReturn: 3.27,
      impermanentLoss: -0.15
    },
    vaultStats: {
      tvl: "5100000.0",
      totalShares: "75000.0",
      sharePrice: "68.0",
      lastUpdate: Math.floor(Date.now() / 1000) - 300
    }
  };

  return new Response(JSON.stringify(mockUserFarmDetails), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUserHistory(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/{chain}/history/{user_address}/{pool_address}
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

async function handleUserFeesEarned(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user/fees-earned/{chain}/{user_address}/{pool_address}
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

async function handleUserLifetimeStats(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/user-lifetime-stats/{chain}/users/{user_address}/swap-stats
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

async function handleVaultsList(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const status = url.searchParams.get('status') || 'all'; // active, paused, deprecated
  const sortBy = url.searchParams.get('sortBy') || 'tvl'; // tvl, apy, name

  const mockVaultsList = {
    pagination: {
      page: page,
      limit: limit,
      total: 45,
      hasMore: page * limit < 45
    },
    filters: {
      status: status,
      sortBy: sortBy
    },
    vaults: [
      {
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        name: "High Yield ETH-USDC Vault",
        description: "Automated yield farming for ETH-USDC liquidity",
        chain: "bsc",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        strategy: "auto_compound",
        riskLevel: "medium",
        tokenX: {
          symbol: "ETH",
          name: "Ethereum",
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        },
        tokenY: {
          symbol: "USDC",
          name: "USD Coin",
          address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10"
        },
        tvl: "5100000.0",
        apy: 18.5,
        totalShares: "75000.0",
        sharePrice: "68.0",
        managementFee: 0.5,
        performanceFee: 10.0,
        status: "active",
        createdAt: "2024-01-15T00:00:00Z",
        lastUpdate: Math.floor(Date.now() / 1000) - 300
      },
      {
        vaultId: "vault_002",
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        name: "Stable Yield BNB-BUSD Vault",
        description: "Conservative yield strategy for BNB-BUSD",
        chain: "bsc",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        strategy: "yield_optimization",
        riskLevel: "low",
        tokenX: {
          symbol: "BNB",
          name: "Binance Coin",
          address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
        },
        tokenY: {
          symbol: "BUSD",
          name: "Binance USD",
          address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
        },
        tvl: "2250000.0",
        apy: 12.3,
        totalShares: "45000.0",
        sharePrice: "50.0",
        managementFee: 0.3,
        performanceFee: 8.0,
        status: "active",
        createdAt: "2024-02-01T00:00:00Z",
        lastUpdate: Math.floor(Date.now() / 1000) - 600
      }
    ],
    summary: {
      totalVaults: 45,
      totalTvl: "15750000.0",
      averageApy: 15.8,
      activeVaults: 42,
      pausedVaults: 2,
      deprecatedVaults: 1
    }
  };

  return new Response(JSON.stringify(mockVaultsList), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultsByChain(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const status = url.searchParams.get('status') || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'tvl';

  const mockVaultsByChain = {
    chain: chain,
    filters: {
      status: status,
      sortBy: sortBy
    },
    vaults: [
      {
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        name: "High Yield ETH-USDC Vault",
        poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
        strategy: "auto_compound",
        riskLevel: "medium",
        tokenPair: "ETH/USDC",
        tvl: "5100000.0",
        apy: 18.5,
        totalShares: "75000.0",
        sharePrice: "68.0",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.051,
          weeklyYield: 0.357,
          monthlyYield: 1.54,
          totalReturn: 18.5
        }
      },
      {
        vaultId: "vault_002", 
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        name: "Stable Yield BNB-BUSD Vault",
        poolAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
        strategy: "yield_optimization",
        riskLevel: "low",
        tokenPair: "BNB/BUSD",
        tvl: "2250000.0",
        apy: 12.3,
        totalShares: "45000.0",
        sharePrice: "50.0",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.034,
          weeklyYield: 0.238,
          monthlyYield: 1.03,
          totalReturn: 12.3
        }
      },
      {
        vaultId: "vault_003",
        vaultAddress: "0xvault3fedcba0987654321fedcba0987654321fedc",
        name: "Aggressive Growth CAKE-BNB Vault",
        poolAddress: "0xfedcba0987654321fedcba0987654321fedcba09",
        strategy: "leveraged_farming",
        riskLevel: "high",
        tokenPair: "CAKE/BNB",
        tvl: "850000.0",
        apy: 25.7,
        totalShares: "12500.0",
        sharePrice: "68.0",
        status: "active",
        performanceMetrics: {
          dailyYield: 0.070,
          weeklyYield: 0.494,
          monthlyYield: 2.14,
          totalReturn: 25.7
        }
      }
    ],
    chainSummary: {
      totalVaults: 28,
      totalTvl: "12750000.0",
      averageApy: 17.2,
      highestApy: 25.7,
      lowestApy: 8.5,
      mostPopularStrategy: "auto_compound"
    }
  };

  return new Response(JSON.stringify(mockVaultsByChain), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultSharePrice(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/{vault_address}/share-price
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];

  const mockVaultSharePrice = {
    vaultAddress: vaultAddress,
    chain: chain,
    sharePrice: {
      current: "68.0",
      previous24h: "67.2",
      change24h: "0.8",
      changePercent24h: 1.19
    },
    priceHistory: [
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        price: "67.2"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        price: "66.8"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 259200,
        price: "66.5"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 345600,
        price: "66.1"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 432000,
        price: "65.8"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 518400,
        price: "65.4"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 604800,
        price: "65.0"
      }
    ],
    vaultInfo: {
      name: "High Yield ETH-USDC Vault",
      totalShares: "75000.0",
      totalAssets: "5100000.0",
      nav: "68.0",
      lastUpdate: Math.floor(Date.now() / 1000) - 300
    },
    performance: {
      daily: 1.19,
      weekly: 4.62,
      monthly: 6.15,
      quarterly: 15.25,
      yearly: 18.5
    },
    breakdown: {
      principalValue: "51.0",
      accruedYield: "17.0",
      yieldPercent: 33.33
    }
  };

  return new Response(JSON.stringify(mockVaultSharePrice), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultDetails(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/{vault_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];

  const mockVaultDetails = {
    vaultId: "vault_001",
    vaultAddress: vaultAddress,
    chain: chain,
    basicInfo: {
      name: "High Yield ETH-USDC Vault",
      description: "Automated yield farming strategy that maximizes returns through dynamic liquidity provision and fee compounding",
      category: "Liquidity Mining",
      strategy: "auto_compound",
      riskLevel: "medium",
      status: "active",
      createdAt: "2024-01-15T00:00:00Z",
      lastUpdate: Math.floor(Date.now() / 1000) - 300
    },
    poolInfo: {
      poolAddress: "0x1234567890abcdef1234567890abcdef12345678",
      poolName: "ETH/USDC Pool",
      binStep: 15,
      tokenX: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18
      },
      tokenY: {
        address: "0xA0b86a33E6441C1a40Fb9BB1b3F3C3b8F79e0d10",
        symbol: "USDC", 
        name: "USD Coin",
        decimals: 6
      }
    },
    vaultMetrics: {
      tvl: "5100000.0",
      totalShares: "75000.0",
      sharePrice: "68.0",
      apy: 18.5,
      dailyYield: 0.051,
      weeklyYield: 0.357,
      monthlyYield: 1.54,
      totalUsers: 247,
      averageDepositSize: "20648.58"
    },
    fees: {
      managementFee: 0.5,
      performanceFee: 10.0,
      withdrawalFee: 0.1,
      description: "Management fee: 0.5% annually, Performance fee: 10% of profits, Withdrawal fee: 0.1% (waived after 30 days)"
    },
    strategy: {
      type: "auto_compound",
      description: "Automatically compounds liquidity provision rewards by reinvesting fees and rewards back into the pool",
      targetBinRange: "±5% from active bin",
      rebalanceFrequency: "Daily",
      harvestFrequency: "Every 6 hours",
      lastRebalance: Math.floor(Date.now() / 1000) - 3600,
      lastHarvest: Math.floor(Date.now() / 1000) - 1800
    },
    performance: {
      inception: {
        date: "2024-01-15",
        initialSharePrice: "50.0",
        totalReturn: 36.0
      },
      historical: [
        {
          period: "1D",
          return: 1.19,
          volatility: 2.5
        },
        {
          period: "7D", 
          return: 4.62,
          volatility: 8.7
        },
        {
          period: "30D",
          return: 6.15,
          volatility: 12.3
        },
        {
          period: "90D",
          return: 15.25,
          volatility: 18.9
        }
      ],
      sharpeRatio: 1.85,
      maxDrawdown: -8.2,
      winRate: 72.5
    },
    riskMetrics: {
      level: "medium",
      score: 6.5,
      factors: [
        "Impermanent loss risk",
        "Smart contract risk", 
        "Market volatility",
        "Liquidity risk"
      ],
      mitigation: [
        "Active range management",
        "Regular rebalancing",
        "Audited smart contracts",
        "Insurance coverage"
      ]
    },
    contractInfo: {
      vaultContract: vaultAddress,
      strategyContract: "0xstrategy123456789abcdef123456789abcdef123",
      poolContract: "0x1234567890abcdef1234567890abcdef12345678",
      verified: true,
      audited: true,
      auditReports: [
        {
          auditor: "CertiK",
          date: "2024-01-10",
          status: "Passed",
          reportUrl: "https://certik.com/projects/entysquare"
        }
      ]
    }
  };

  return new Response(JSON.stringify(mockVaultDetails), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultTvlHistory(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/{vault_address}/tvl-history
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');
  const interval = url.searchParams.get('interval') || '1d'; // 1h, 4h, 1d, 7d

  const mockVaultTvlHistory = {
    vaultAddress: vaultAddress,
    chain: chain,
    interval: interval,
    timeRange: {
      startTime: startTime || Math.floor(Date.now() / 1000) - 2592000, // 30 days ago
      endTime: endTime || Math.floor(Date.now() / 1000)
    },
    currentTvl: "5100000.0",
    tvlHistory: [
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 30,
        tvl: "3500000.0",
        totalShares: "60000.0",
        sharePrice: "58.33",
        deposits: "125000.0",
        withdrawals: "75000.0",
        netFlow: "50000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 25,
        tvl: "3750000.0",
        totalShares: "62500.0",
        sharePrice: "60.0",
        deposits: "175000.0",
        withdrawals: "50000.0",
        netFlow: "125000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 20,
        tvl: "4100000.0",
        totalShares: "65000.0",
        sharePrice: "63.08",
        deposits: "200000.0",
        withdrawals: "25000.0",
        netFlow: "175000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 15,
        tvl: "4500000.0",
        totalShares: "68000.0",
        sharePrice: "66.18",
        deposits: "150000.0",
        withdrawals: "100000.0",
        netFlow: "50000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 10,
        tvl: "4800000.0",
        totalShares: "71000.0",
        sharePrice: "67.61",
        deposits: "100000.0",
        withdrawals: "75000.0",
        netFlow: "25000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
        tvl: "4950000.0",
        totalShares: "73000.0",
        sharePrice: "67.81",
        deposits: "80000.0",
        withdrawals: "30000.0",
        netFlow: "50000.0"
      },
      {
        timestamp: Math.floor(Date.now() / 1000),
        tvl: "5100000.0",
        totalShares: "75000.0",
        sharePrice: "68.0",
        deposits: "120000.0",
        withdrawals: "70000.0",
        netFlow: "50000.0"
      }
    ],
    analytics: {
      growth: {
        absolute: "1600000.0",
        percentage: 45.71,
        annualized: 548.57
      },
      volatility: {
        daily: 2.5,
        weekly: 8.7,
        monthly: 15.3
      },
      flow: {
        totalDeposits: "950000.0",
        totalWithdrawals: "425000.0",
        netFlow: "525000.0",
        averageDailyFlow: "17500.0"
      },
      milestones: [
        {
          milestone: "1M TVL",
          date: "2024-02-01",
          daysFromLaunch: 17
        },
        {
          milestone: "2M TVL",
          date: "2024-03-15",
          daysFromLaunch: 60
        },
        {
          milestone: "5M TVL",
          date: new Date().toISOString().split('T')[0],
          daysFromLaunch: 156
        }
      ]
    }
  };

  return new Response(JSON.stringify(mockVaultTvlHistory), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultRecentActivity(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/{vault_address}/recent-activity
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const activityType = url.searchParams.get('type') || 'all'; // deposit, withdrawal, harvest, rebalance

  const mockVaultRecentActivity = {
    vaultAddress: vaultAddress,
    chain: chain,
    filters: {
      limit: limit,
      activityType: activityType
    },
    activities: [
      {
        id: "activity_001",
        type: "deposit",
        userAddress: "0x742d35Cc6548C1Ad35C7c8e36fC76CE23a3c3c89",
        amount: "10000.0",
        amountUsd: "10000.0",
        shares: "147.06",
        sharePrice: "68.0",
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        blockNumber: 12345678,
        gasUsed: "125000",
        gasFeeUsd: "15.25"
      },
      {
        id: "activity_002",
        type: "harvest",
        executor: "0xstrategy123456789abcdef123456789abcdef123",
        harvestedTokens: [
          {
            token: "ETH",
            amount: "2.5",
            amountUsd: "6375.0"
          },
          {
            token: "USDC",
            amount: "6375.0",
            amountUsd: "6375.0"
          }
        ],
        totalHarvestedUsd: "12750.0",
        compoundedBackUsd: "11475.0",
        performanceFeeUsd: "1275.0",
        timestamp: Math.floor(Date.now() / 1000) - 7200,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        blockNumber: 12345456,
        gasUsed: "250000",
        gasFeeUsd: "30.50"
      },
      {
        id: "activity_003",
        type: "withdrawal",
        userAddress: "0x8ba1f109551bD432803012645Hac136c22C6c4C6",
        amount: "5000.0",
        amountUsd: "5000.0",
        shares: "73.53",
        sharePrice: "68.0",
        withdrawalFee: "5.0",
        netAmount: "4995.0",
        timestamp: Math.floor(Date.now() / 1000) - 10800,
        txHash: "0xfedcba0987654321fedcba0987654321fedcba09",
        blockNumber: 12345234,
        gasUsed: "150000",
        gasFeeUsd: "18.75"
      },
      {
        id: "activity_004",
        type: "rebalance",
        executor: "0xstrategy123456789abcdef123456789abcdef123",
        oldRange: {
          minBin: 8388600,
          maxBin: 8388615
        },
        newRange: {
          minBin: 8388605,
          maxBin: 8388610
        },
        liquidityMoved: "255000.0",
        reason: "Price moved outside optimal range",
        timestamp: Math.floor(Date.now() / 1000) - 14400,
        txHash: "0x9876543210fedcba9876543210fedcba98765432",
        blockNumber: 12345012,
        gasUsed: "180000",
        gasFeeUsd: "22.50"
      },
      {
        id: "activity_005",
        type: "deposit",
        userAddress: "0x456789abcdef0123456789abcdef0123456789ab",
        amount: "25000.0",
        amountUsd: "25000.0",
        shares: "367.65",
        sharePrice: "68.0",
        timestamp: Math.floor(Date.now() / 1000) - 18000,
        txHash: "0x2468ace02468ace02468ace02468ace02468ace0",
        blockNumber: 12344890,
        gasUsed: "135000",
        gasFeeUsd: "16.75"
      }
    ],
    summary: {
      last24h: {
        deposits: {
          count: 8,
          totalAmount: "125000.0",
          totalShares: "1838.24"
        },
        withdrawals: {
          count: 3,
          totalAmount: "22500.0",
          totalShares: "330.88"
        },
        harvests: {
          count: 4,
          totalHarvestedUsd: "51000.0",
          totalFeesUsd: "5100.0"
        },
        rebalances: {
          count: 1,
          gasSpentUsd: "22.50"
        }
      },
      netFlow24h: "102500.0",
      uniqueUsers24h: 11,
      totalGasSpentUsd: "103.75"
    }
  };

  return new Response(JSON.stringify(mockVaultRecentActivity), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultWithdrawalsByUser(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/withdrawals/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const userAddress = pathSegments[6];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const status = url.searchParams.get('status') || 'all'; // completed, pending, failed

  const mockVaultWithdrawalsByUser = {
    userAddress: userAddress,
    chain: chain,
    pagination: {
      page: page,
      limit: limit,
      total: 15,
      hasMore: page * limit < 15
    },
    filters: {
      status: status
    },
    withdrawals: [
      {
        id: "withdrawal_001",
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        vaultName: "High Yield ETH-USDC Vault",
        amount: "5000.0",
        amountUsd: "5000.0",
        shares: "73.53",
        sharePrice: "68.0",
        withdrawalFee: "5.0",
        netAmount: "4995.0",
        status: "completed",
        requestedAt: Math.floor(Date.now() / 1000) - 86400,
        completedAt: Math.floor(Date.now() / 1000) - 85800,
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        blockNumber: 12345678,
        gasUsed: "150000",
        gasFeeUsd: "18.75"
      },
      {
        id: "withdrawal_002",
        vaultId: "vault_002",
        vaultAddress: "0xvault2abcdef1234567890abcdef1234567890abcd",
        vaultName: "Stable Yield BNB-BUSD Vault",
        amount: "10000.0",
        amountUsd: "10000.0",
        shares: "200.0",
        sharePrice: "50.0",
        withdrawalFee: "10.0",
        netAmount: "9990.0",
        status: "completed",
        requestedAt: Math.floor(Date.now() / 1000) - 259200,
        completedAt: Math.floor(Date.now() / 1000) - 258600,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        blockNumber: 12344567,
        gasUsed: "145000",
        gasFeeUsd: "17.25"
      },
      {
        id: "withdrawal_003",
        vaultId: "vault_001",
        vaultAddress: "0xvault1234567890abcdef1234567890abcdef12345",
        vaultName: "High Yield ETH-USDC Vault",
        amount: "2500.0",
        amountUsd: "2500.0",
        shares: "36.76",
        sharePrice: "68.0",
        withdrawalFee: "0.0", // Fee waived after 30 days
        netAmount: "2500.0",
        status: "pending",
        requestedAt: Math.floor(Date.now() / 1000) - 3600,
        completedAt: null,
        txHash: null,
        blockNumber: null,
        gasUsed: null,
        gasFeeUsd: null,
        estimatedCompletionTime: Math.floor(Date.now() / 1000) + 600 // 10 minutes from now
      }
    ],
    summary: {
      totalWithdrawals: 15,
      totalAmountUsd: "127500.0",
      totalFeesUsd: "127.50",
      totalNetAmountUsd: "127372.50",
      averageWithdrawalUsd: "8500.0",
      largestWithdrawalUsd: "25000.0",
      completedWithdrawals: 14,
      pendingWithdrawals: 1,
      failedWithdrawals: 0,
      totalGasSpentUsd: "245.75"
    },
    vaultBreakdown: [
      {
        vaultId: "vault_001",
        vaultName: "High Yield ETH-USDC Vault",
        withdrawalCount: 8,
        totalAmountUsd: "85000.0",
        totalFeesUsd: "42.50"
      },
      {
        vaultId: "vault_002",
        vaultName: "Stable Yield BNB-BUSD Vault",
        withdrawalCount: 5,
        totalAmountUsd: "32500.0",
        totalFeesUsd: "65.0"
      },
      {
        vaultId: "vault_003",
        vaultName: "Aggressive Growth CAKE-BNB Vault",
        withdrawalCount: 2,
        totalAmountUsd: "10000.0",
        totalFeesUsd: "20.0"
      }
    ]
  };

  return new Response(JSON.stringify(mockVaultWithdrawalsByUser), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleVaultWithdrawalsByUserAndVault(env: any, url: URL) {
  // Implementation for GET /v1/api/dex/vaults/{chain}/{vault_address}/withdrawals/{user_address}
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const chain = pathSegments[4];
  const vaultAddress = pathSegments[5];
  const userAddress = pathSegments[7];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const status = url.searchParams.get('status') || 'all';

  const mockVaultWithdrawalsByUserAndVault = {
    userAddress: userAddress,
    vaultAddress: vaultAddress,
    chain: chain,
    pagination: {
      page: page,
      limit: limit,
      total: 8,
      hasMore: page * limit < 8
    },
    filters: {
      status: status
    },
    vaultInfo: {
      vaultId: "vault_001",
      name: "High Yield ETH-USDC Vault",
      currentSharePrice: "68.0",
      userCurrentShares: "1426.47", // User's remaining shares
      userCurrentValueUsd: "97000.0"
    },
    withdrawals: [
      {
        id: "withdrawal_001",
        amount: "5000.0",
        amountUsd: "5000.0",
        shares: "73.53",
        sharePrice: "68.0",
        withdrawalFee: "5.0",
        feePercent: 0.1,
        netAmount: "4995.0",
        status: "completed",
        requestedAt: Math.floor(Date.now() / 1000) - 86400,
        completedAt: Math.floor(Date.now() / 1000) - 85800,
        processingTime: 600, // 10 minutes
        txHash: "0x1234567890abcdef1234567890abcdef12345678",
        blockNumber: 12345678,
        gasUsed: "150000",
        gasFeeUsd: "18.75",
        receiptTokens: [
          {
            token: "ETH",
            amount: "1.96",
            amountUsd: "4995.0"
          }
        ]
      },
      {
        id: "withdrawal_002",
        amount: "7500.0",
        amountUsd: "7500.0", 
        shares: "115.38",
        sharePrice: "65.0",
        withdrawalFee: "0.0", // Fee waived after 30 days
        feePercent: 0.0,
        netAmount: "7500.0",
        status: "completed",
        requestedAt: Math.floor(Date.now() / 1000) - 432000,
        completedAt: Math.floor(Date.now() / 1000) - 431400,
        processingTime: 600,
        txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        blockNumber: 12340123,
        gasUsed: "155000",
        gasFeeUsd: "19.50",
        receiptTokens: [
          {
            token: "ETH",
            amount: "1.5",
            amountUsd: "3825.0"
          },
          {
            token: "USDC",
            amount: "3675.0",
            amountUsd: "3675.0"
          }
        ]
      },
      {
        id: "withdrawal_003",
        amount: "2500.0",
        amountUsd: "2500.0",
        shares: "36.76",
        sharePrice: "68.0",
        withdrawalFee: "0.0",
        feePercent: 0.0,
        netAmount: "2500.0",
        status: "pending",
        requestedAt: Math.floor(Date.now() / 1000) - 3600,
        completedAt: null,
        processingTime: null,
        txHash: null,
        blockNumber: null,
        gasUsed: null,
        gasFeeUsd: null,
        estimatedCompletionTime: Math.floor(Date.now() / 1000) + 600,
        receiptTokens: null
      }
    ],
    summary: {
      totalWithdrawals: 8,
      totalAmountUsd: "62500.0",
      totalFeesUsd: "62.50",
      totalNetAmountUsd: "62437.50",
      totalSharesWithdrawn: "918.75",
      averageWithdrawalUsd: "7812.50",
      largestWithdrawalUsd: "15000.0",
      smallestWithdrawalUsd: "1000.0",
      completedWithdrawals: 7,
      pendingWithdrawals: 1,
      failedWithdrawals: 0,
      totalGasSpentUsd: "133.75",
      averageProcessingTime: 720 // 12 minutes
    },
    performance: {
      averageSharePriceAtWithdrawal: "66.8",
      totalProfitFromWithdrawals: "8750.0", // Profit made from share price appreciation
      bestWithdrawalTiming: {
        date: "2024-05-15",
        sharePrice: "72.5",
        profitUsd: "2250.0"
      },
      worstWithdrawalTiming: {
        date: "2024-03-10", 
        sharePrice: "58.0",
        lossUsd: "-500.0"
      }
    }
  };

  return new Response(JSON.stringify(mockVaultWithdrawalsByUserAndVault), {
    headers: { 'Content-Type': 'application/json' }
  });
}
