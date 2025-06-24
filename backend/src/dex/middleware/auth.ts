import type { Context, Next } from 'hono';
import type { Env } from '../../index';

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
		const isValid = await validateApiKey(apiKey, c.env);
		
		if (!isValid.valid) {
			return c.json({
				error: 'Invalid API key',
				message: isValid.error || 'API key validation failed',
				timestamp: new Date().toISOString()
			}, 401);
		}

		// Check rate limits
		const rateLimit = await checkRateLimit(apiKey, c.env);
		
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
		await trackApiUsage(apiKey, c.req.path, c.env);

		await next();
	};
}

/**
 * Validate API key
 */
async function validateApiKey(apiKey: string, env: Env) {
	// For development/testing, accept the admin key and test key
	if (apiKey === 'admin-key' || apiKey === 'test-key' || apiKey === env.KEY) {
		return {
			valid: true,
			user: {
				id: apiKey === 'test-key' ? 'test-user' : 'admin',
				email: apiKey === 'test-key' ? 'test@entysquare.com' : 'admin@entysquare.com'
			},
			permissions: ['read', 'write', 'admin'],
			tier: 'premium'
		};
	}

	// In production, this would validate against a database or external service
	// For now, return invalid for unknown keys
	return {
		valid: false,
		error: 'Invalid API key'
	};
}

/**
 * Check rate limits
 */
async function checkRateLimit(apiKey: string, env: Env) {
	// Simple rate limiting logic
	// In production, this would use KV storage or external rate limiting service
	
	// For admin/test keys, no rate limiting
	if (apiKey === 'admin-key' || apiKey === 'test-key' || apiKey === env.KEY) {
		return {
			exceeded: false,
			limit: 10000,
			resetTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
		};
	}

	// Default rate limit for other keys
	return {
		exceeded: false,
		limit: 1000,
		resetTime: new Date(Date.now() + 3600000).toISOString()
	};
}

/**
 * Track API usage
 */
async function trackApiUsage(apiKey: string, endpoint: string, env: Env) {
	// In production, this would track usage statistics
	// For now, just log the usage
	console.log(`API Usage: ${apiKey} -> ${endpoint} at ${new Date().toISOString()}`);
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
