import type { Context, Next } from 'hono'
import type { Env } from '../index'

/**
 * KV Cache Configuration
 */
export interface CacheConfig {
	ttl: number // Time to live in seconds
	key: string // Cache key
	bypassAuth?: boolean // Whether to bypass auth for cache hits
	vary?: string[] // Headers to vary cache by
}

/**
 * Cache strategies for different types of data
 */
export const CACHE_STRATEGIES = {
	// Static data that rarely changes
	STATIC: { ttl: 86400 }, // 24 hours
	
	// Pool data that changes moderately
	POOLS: { ttl: 300 }, // 5 minutes
	
	// Price data that changes frequently
	PRICE: { ttl: 60 }, // 1 minute
	
	// User-specific data that changes often
	USER: { ttl: 30 }, // 30 seconds
	
	// Analytics data that changes daily
	ANALYTICS: { ttl: 3600 }, // 1 hour
	
	// Health checks that change rapidly
	HEALTH: { ttl: 10 }, // 10 seconds
	
	// Subgraph metadata
	METADATA: { ttl: 600 }, // 10 minutes
} as const

/**
 * Generate cache key based on request
 */
export function generateCacheKey(
	c: Context,
	prefix: string = 'dex',
	includeAuth: boolean = false
): string {
	const url = new URL(c.req.url)
	const path = url.pathname
	const query = url.searchParams.toString()
	
	let key = `${prefix}:${path}`
	
	if (query) {
		key += `:${query}`
	}
	
	// Include user auth in key for user-specific data
	if (includeAuth) {
		const userAddress = c.get('userAddress') || 'anonymous'
		key += `:user:${userAddress}`
	}
	
	return key.toLowerCase()
}

/**
 * KV Cache Middleware Factory
 * Creates middleware for caching API responses in Cloudflare KV
 */
export function createKVCacheMiddleware(
	strategy: keyof typeof CACHE_STRATEGIES,
	options: Partial<CacheConfig> = {}
) {
	return async (c: Context<{ Bindings: Env }>, next: Next) => {
		const kv = c.env.KV
		
		// Skip caching if KV is not available
		if (!kv) {
			console.warn('⚠️ KV not available, skipping cache')
			return await next()
		}
		
		// Skip caching for non-GET requests
		if (c.req.method !== 'GET') {
			return await next()
		}
		
		const config = {
			...CACHE_STRATEGIES[strategy],
			...options
		}
		
		const cacheKey = options.key || generateCacheKey(
			c, 
			'dex-api', 
			strategy === 'USER'
		)
		
		try {
			// Try to get from cache
			const cached = await kv.get(cacheKey, 'json')
			
			if (cached) {
				console.log(`✅ Cache HIT: ${cacheKey}`)
				
				// Add cache headers
				c.header('X-Cache', 'HIT')
				c.header('X-Cache-Key', cacheKey)
				c.header('X-Cache-TTL', config.ttl.toString())
				
				return c.json(cached)
			}
			
			console.log(`❌ Cache MISS: ${cacheKey}`)
			
			// Execute the handler
			await next()
			
			// Cache the response if it's successful
			const response = c.res.clone()
			if (response.status === 200) {
				try {
					const data = await response.json()
					
					// Only cache successful responses with data
					if (data && typeof data === 'object' && (data as any).success !== false) {
						await kv.put(
							cacheKey, 
							JSON.stringify(data), 
							{ expirationTtl: config.ttl }
						)
						
						console.log(`💾 Cached response: ${cacheKey} (TTL: ${config.ttl}s)`)
						
						// Add cache headers to original response
						c.header('X-Cache', 'MISS')
						c.header('X-Cache-Key', cacheKey)
						c.header('X-Cache-TTL', config.ttl.toString())
					}
				} catch (error) {
					console.error(`Failed to cache response for ${cacheKey}:`, error)
				}
			}
			
		} catch (error) {
			console.error(`KV cache error for ${cacheKey}:`, error)
			// Continue without cache on error
			await next()
		}
	}
}

/**
 * Cache invalidation helper
 */
export async function invalidateCache(
	kv: KVNamespace,
	pattern: string
): Promise<number> {
	try {
		// KV doesn't support pattern deletion directly
		// We'll need to maintain a list of keys or use a different approach
		// For now, we'll use a simple key deletion
		await kv.delete(pattern)
		return 1
	} catch (error) {
		console.error('Cache invalidation error:', error)
		return 0
	}
}

/**
 * Cache management utilities
 */
export class CacheManager {
	constructor(private kv: KVNamespace) {}
	
	/**
	 * Invalidate all caches for a specific pool
	 */
	async invalidatePool(chain: string, poolId: string): Promise<void> {
		const patterns = [
			`dex-api:/v1/api/dex/pools/${chain}`,
			`dex-api:/v1/api/dex/pools/${chain}/${poolId}`,
			`dex-api:/v1/api/dex/pools/${chain}/${poolId}/bins`,
			`dex-api:/v1/api/dex/analytics/${chain}`,
		]
		
		for (const pattern of patterns) {
			await this.kv.delete(pattern)
		}
	}
	
	/**
	 * Invalidate all user-specific caches
	 */
	async invalidateUser(userAddress: string): Promise<void> {
		// In a real implementation, you'd want to maintain a list of user cache keys
		// For now, we'll use a simple approach
		const patterns = [
			`dex-api:/v1/api/dex/user:user:${userAddress.toLowerCase()}`,
		]
		
		for (const pattern of patterns) {
			await this.kv.delete(pattern)
		}
	}
	
	/**
	 * Clear all caches (use with caution)
	 */
	async clearAll(): Promise<void> {
		// This would require listing all keys with a prefix
		// KV has limitations here, so implement carefully
		console.warn('Clear all caches requested - implement based on your KV naming strategy')
	}
}
