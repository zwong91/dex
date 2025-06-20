/**
 * Very simple test handler to verify basic functionality
 * This avoids all complex database queries until we resolve typing issues
 */

export async function createSimpleTestHandler(env: any) {
  return async function handleSimpleTestRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log('Simple test handler received request:', url.pathname);
    
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
      // Basic health check
      if (url.pathname === '/test/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV || 'unknown',
          database: env.D1_DATABASE ? 'available' : 'not configured',
          version: '2.0.0-simple-test'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Environment info
      if (url.pathname === '/test/env') {
        return new Response(JSON.stringify({
          success: true,
          environment: {
            NODE_ENV: env.NODE_ENV,
            BSC_RPC_URL: env.BSC_RPC_URL ? 'configured' : 'missing',
            D1_DATABASE: env.D1_DATABASE ? 'available' : 'missing',
            API_RATE_LIMIT: env.API_RATE_LIMIT
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Basic database test using raw SQL
      if (url.pathname === '/test/db') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const result = await env.D1_DATABASE.prepare('SELECT 1 as test').first();
          return new Response(JSON.stringify({
            success: true,
            database: 'connected',
            test_result: result
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Database query failed',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Count tables
      if (url.pathname === '/test/tables') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const tables = await env.D1_DATABASE.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
          `).all();

          return new Response(JSON.stringify({
            success: true,
            table_count: tables.results?.length || 0,
            tables: tables.results?.map((t: any) => t.name) || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Failed to query tables',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Query permissions data
      if (url.pathname === '/test/permissions') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const permissions = await env.D1_DATABASE.prepare(`
            SELECT id, name, description, category, tier 
            FROM permissions 
            ORDER BY tier, category, name
            LIMIT 10
          `).all();

          return new Response(JSON.stringify({
            success: true,
            count: permissions.results?.length || 0,
            permissions: permissions.results || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Failed to query permissions',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Query tokens data
      if (url.pathname === '/test/tokens') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const tokens = await env.D1_DATABASE.prepare(`
            SELECT id, symbol, name, address, chain, decimals
            FROM tokens 
            ORDER BY chain, symbol
            LIMIT 10
          `).all();

          return new Response(JSON.stringify({
            success: true,
            count: tokens.results?.length || 0,
            tokens: tokens.results || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Failed to query tokens',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Query users data
      if (url.pathname === '/test/users') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const users = await env.D1_DATABASE.prepare(`
            SELECT id, email, username, status, created_at
            FROM users 
            ORDER BY created_at DESC
            LIMIT 5
          `).all();

          return new Response(JSON.stringify({
            success: true,
            count: users.results?.length || 0,
            users: users.results || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Failed to query users',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Data summary endpoint
      if (url.pathname === '/test/data') {
        if (!env.D1_DATABASE) {
          return new Response(JSON.stringify({
            error: 'D1 database not configured'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const [permissions, tokens, users, apiKeys] = await Promise.all([
            env.D1_DATABASE.prepare('SELECT COUNT(*) as count FROM permissions').first(),
            env.D1_DATABASE.prepare('SELECT COUNT(*) as count FROM tokens').first(),
            env.D1_DATABASE.prepare('SELECT COUNT(*) as count FROM users').first(),
            env.D1_DATABASE.prepare('SELECT COUNT(*) as count FROM api_keys').first()
          ]);

          return new Response(JSON.stringify({
            success: true,
            database_summary: {
              permissions: permissions?.count || 0,
              tokens: tokens?.count || 0,
              users: users?.count || 0,
              api_keys: apiKeys?.count || 0
            },
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (dbError) {
          return new Response(JSON.stringify({
            error: 'Failed to query data summary',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 404 for unknown test endpoints
      return new Response(JSON.stringify({
        error: 'Test endpoint not found',
        available: ['/test/health', '/test/env', '/test/db', '/test/tables', '/test/permissions', '/test/tokens', '/test/users', '/test/data']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Simple test handler error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  };
}
