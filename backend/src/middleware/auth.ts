import type { Context, Next } from 'hono';
import type { Env } from '../index';
import type { ApiKeyValidationResult, RateLimitResult } from '../dex/types';

// Helper function to check permissions
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || userPermissions.includes('admin_system');
}

/**
 * Authentication middleware for Hono
 * Validates API keys and checks permissions
 */
export function createAuthMiddleware() {
	return async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
		// Extract API key from headers
		const apiKey = c.req.header('X-API-Key') || 
					  c.req.header('Authorization')?.replace('Bearer ', '');
		
		if (!apiKey) {
			return c.json({
				error: 'Authentication required',
				message: 'Please provide an API key using the X-API-Key header or Authorization Bearer token',
				timestamp: new Date().toISOString()
			}, 401);
		}

		// Validate API key
		const isValid = await validateApiKey(c.env, apiKey);
		
		if (!isValid.valid) {
			return c.json({
				error: 'Invalid API key',
				message: isValid.error || 'API key validation failed',
				timestamp: new Date().toISOString()
			}, 401);
		}

		// Check rate limits
		const rateLimit = await checkRateLimit(
			c.env,
			isValid.user.id,
			isValid.tier
		);
		
		if (rateLimit.exceeded) {
			return c.json({
				error: 'Rate limit exceeded',
				message: `Rate limit of ${rateLimit.limit} requests exceeded. Reset at ${rateLimit.resetTime}`,
				timestamp: new Date().toISOString()
			}, 429);
		}

		// Store user info in context for handlers
		c.set('user', isValid.user);
		c.set('permissions', isValid.permissions);
		c.set('tier', isValid.tier);

		// Track API usage
		await trackApiUsage(
			c.env,
			apiKey,
			c.req.path,
			c.req.method,
			isValid.user.id
		);

		await next();
	};
}

/**
 * Validate API key
 */
// API key validation function
export async function validateApiKey(env: any, apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
	return { valid: false, error: 'API key is required' };
  }

  try {
	// Support demo API keys for testing
	if (apiKey === 'test-key') {
	  return {
		valid: true,
		user: {
		  id: 'test-user-001',
		  email: 'test@entysquare.com'
		},
		permissions: ['pools_read', 'analytics_read'],
		tier: 'basic'
	  };
	}

	if (apiKey === 'admin-key') {
	  return {
		valid: true,
		user: {
		  id: 'admin-user-001',
		  email: 'admin@entysquare.com'
		},
		permissions: ['admin_system', 'analytics_read', 'pools_read', 'rewards_read', 'user_read', 'vaults_read'],
		tier: 'enterprise'
	  };
	}

	// Database lookup for production keys
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

/**
 * Check rate limits
 */
export async function checkRateLimit(env: any, userId: string, tier: string): Promise<RateLimitResult> {
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

/**
 * Track API usage
 */
export async function trackApiUsage(env: any, apiKey: string, endpoint: string, method: string, userId: string): Promise<void> {
	// In production, this would track usage statistics
	console.log(`API Usage: ${apiKey} -> ${endpoint} at ${new Date().toISOString()}`);
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

/**
 * Permission check middleware
 */
export function requirePermission(permission: string) {
	return async function permissionMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
		const permissions = c.get('permissions') as string[] || [];
		
		if (!permissions.includes(permission) && !permissions.includes('admin')) {
			return c.json({
				error: 'Insufficient permissions',
				message: `This endpoint requires '${permission}' permission`,
				timestamp: new Date().toISOString()
			}, 403);
		}

		await next();
	};
}
