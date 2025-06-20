/**
 * Simple test handler to verify database connectivity and basic API functionality
 * This bypasses the complex TypeScript issues in the main v2 handler
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

export async function createTestHandler(env: any) {
  // Initialize database connection with error handling
  let db;
  try {
    db = drizzle(env.D1_DATABASE || env.DB, { schema });
  } catch (error) {
    console.error('Database initialization error:', error);
  }

  return async function handleTestRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log('Test handler received request:', url.pathname);
    
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
      // Test endpoints
      if (url.pathname === '/test/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          database: db ? 'connected' : 'error',
          version: '2.0.0-test'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/test/db') {
        if (!db) {
          return new Response(JSON.stringify({
            error: 'Database not initialized'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Simple database test
        const result = await db.run(`SELECT 1 as test`);
        return new Response(JSON.stringify({
          success: true,
          database: 'connected',
          test: result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/test/permissions') {
        if (!db) {
          return new Response(JSON.stringify({ error: 'Database not initialized' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const permissions = await db.query.permissions.findMany({
          limit: 10
        });
        return new Response(JSON.stringify({
          success: true,
          count: permissions.length,
          permissions: permissions.map((p: any) => ({
            id: p.id,
            name: p.name,
            tier: p.tier,
            category: p.category
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/test/tokens') {
        const tokens = await db.query.tokens.findMany({
          limit: 10
        });
        return new Response(JSON.stringify({
          success: true,
          count: tokens.length,
          tokens: tokens.map(t => ({
            id: t.id,
            symbol: t.symbol,
            name: t.name,
            chain: t.chain
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/test/users') {
        const users = await db.query.users.findMany({
          limit: 5
        });
        return new Response(JSON.stringify({
          success: true,
          count: users.length,
          users: users.map(u => ({
            id: u.id,
            email: u.email,
            status: u.status
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown test endpoints
      return new Response(JSON.stringify({
        error: 'Test endpoint not found',
        available: ['/test/health', '/test/permissions', '/test/tokens', '/test/users']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Test handler error:', error);
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
