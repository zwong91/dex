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
	USER: { ttl: 60 }, // 60 seconds (KV minimum)
	
	// Analytics data that changes daily
	ANALYTICS: { ttl: 3600 }, // 1 hour
	
	// Health checks that change rapidly
	HEALTH: { ttl: 60 }, // 60 seconds (KV minimum)
	
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
	
	// For user-specific routes, the user address is already in the path
	// Only include auth user for non-user-specific routes that need user context
	if (includeAuth && !path.includes('/user/')) {
		const userAddress = c.get('userAddress') || 'anonymous'
		key += `:auth:${userAddress}`
	}
	
	return key.toLowerCase()
}

/**
 * Extract user address from URL path for validation
 */
export function extractUserFromPath(path: string): string | null {
	// Match patterns like /user/:address/* or /user-*/:address/*
	// Ethereum addresses are 40 hex characters (without 0x prefix in regex)
	const userPatterns = [
		/\/user\/bin-ids\/(0x[0-9a-fA-F]{40})/, // /user/bin-ids/0x123.../
		/\/user\/pool-ids\/(0x[0-9a-fA-F]{40})/, // /user/pool-ids/0x123.../
		/\/user\/fees-earned\/[^/]+\/(0x[0-9a-fA-F]{40})/, // /user/fees-earned/bsc/0x123.../
		/\/user-lifetime-stats\/[^/]+\/users\/(0x[0-9a-fA-F]{40})/, // /user-lifetime-stats/bsc/users/0x123.../
		/\/user\/(0x[0-9a-fA-F]{40})\/history/, // /user/0x123.../history/
		/\/user\/(0x[0-9a-fA-F]{40})\/farms/, // /user/0x123.../farms
		/\/user\/(0x[0-9a-fA-F]{40})\/rewards/, // /user/0x123.../rewards
		/\/user\/(0x[0-9a-fA-F]{40})\/claimable-rewards/ // /user/0x123.../claimable-rewards
	]
	
	for (const pattern of userPatterns) {
		const match = path.match(pattern)
		if (match && match[1]) {
			return match[1].toLowerCase()
		}
	}
	
	return null
}

/**
 * Validate if the authenticated user can access the requested user data
 */
export function validateUserAccess(c: Context, path: string): boolean {
	const authUserAddress = c.get('userAddress')?.toLowerCase()
	const pathUserAddress = extractUserFromPath(path)?.toLowerCase()
	
	// If no user in path, allow access
	if (!pathUserAddress) {
		return true
	}
	
	// If no authenticated user, deny access to user-specific data
	if (!authUserAddress) {
		return false
	}
	
	// Allow access if authenticated user matches path user
	return authUserAddress === pathUserAddress
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
		
		// Check if force refresh is requested
		const forceRefresh = c.req.header('X-Force-Refresh') === 'true' || 
		                   c.req.header('Cache-Control')?.includes('no-cache')
		
		if (forceRefresh) {
			console.log('🔄 Force refresh requested, skipping cache')
			c.header('X-Cache-Status', 'BYPASS')
			c.header('X-Cache-Reason', 'Force refresh requested')
			await next()
			return
		}
		
		// For USER strategy, validate access permissions
		if (strategy === 'USER') {
			const hasAccess = validateUserAccess(c, c.req.path)
			if (!hasAccess) {
				return c.json({
					success: false,
					error: 'Access denied',
					message: 'You can only access your own user data',
					timestamp: new Date().toISOString()
				}, 403)
			}
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
				c.header('X-Cache-Status', 'HIT')
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
							{ 
								expirationTtl: config.ttl,
								// 添加元数据以便更好地管理缓存
								metadata: {
									cached_at: Date.now(),
									strategy: strategy,
									ttl: config.ttl
								}
							}
						)
						
						console.log(`💾 Cached response: ${cacheKey} (TTL: ${config.ttl}s)`)
						
						// Add cache headers to original response
						c.header('X-Cache-Status', 'MISS')
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
		// Normalize user address
		const normalizedAddress = userAddress.toLowerCase().startsWith('0x') 
			? userAddress.toLowerCase() 
			: `0x${userAddress.toLowerCase()}`
		
		// Generate all possible user cache keys
		const userPatterns = [
			`dex-api:/v1/api/dex/user/bin-ids/${normalizedAddress}`,
			`dex-api:/v1/api/dex/user/pool-ids/${normalizedAddress}`,
			`dex-api:/v1/api/dex/user/fees-earned`,
			`dex-api:/v1/api/dex/user/${normalizedAddress}/history`,
			`dex-api:/v1/api/dex/user-lifetime-stats`,
			`dex-api:/v1/api/dex/user/${normalizedAddress}/rewards`,
			`dex-api:/v1/api/dex/user/${normalizedAddress}/claimable-rewards`,
			`dex-api:/v1/api/dex/user/${normalizedAddress}/farms`
		]
		
		// KV doesn't support pattern matching, so we delete known patterns
		// In a production system, you might want to maintain a registry of user cache keys
		for (const pattern of userPatterns) {
			try {
				await this.kv.delete(pattern)
				console.log(`🗑️ Invalidated user cache: ${pattern}`)
			} catch (error) {
				console.warn(`Failed to invalidate user cache ${pattern}:`, error)
			}
		}
	}
	
	/**
	 * Clear all caches (use with caution)
	 */
	async clearAll(): Promise<{
		success: boolean
		deletedCount: number
		errors: string[]
	}> {
		const errors: string[] = []
		let deletedCount = 0
		
		try {
			console.log('🔍 Scanning all cache keys...')
			
			// 列出所有以 dex-api 开头的键
			let cursor: string | undefined
			const keysToDelete: string[] = []
			
			do {
				const listResult = await this.kv.list({
					prefix: 'dex-api:',
					cursor,
					limit: 1000
				})
				
				keysToDelete.push(...listResult.keys.map(key => key.name))
				cursor = listResult.list_complete ? undefined : listResult.cursor
				
				console.log(`📋 Found ${listResult.keys.length} cache keys (total: ${keysToDelete.length})`)
				
			} while (cursor)
			
			console.log(`🎯 Total ${keysToDelete.length} cache keys to delete`)
			
			if (keysToDelete.length === 0) {
				return { success: true, deletedCount: 0, errors: [] }
			}
			
			// 逐个删除键
			console.log('🗑️ Starting to delete cache keys...')
			
			for (const key of keysToDelete) {
				try {
					await this.kv.delete(key)
					deletedCount++
					
					if (deletedCount % 50 === 0) {
						console.log(`✅ Deleted ${deletedCount}/${keysToDelete.length} cache keys`)
					}
				} catch (error) {
					const errorMsg = `Failed to delete key ${key}: ${error}`
					errors.push(errorMsg)
					console.error(`❌ ${errorMsg}`)
				}
			}
			
			console.log(`🎉 Cache clearing completed! Deleted ${deletedCount} keys`)
			
			return { success: errors.length === 0, deletedCount, errors }
			
		} catch (error) {
			const errorMsg = `Error during cache clearing: ${error}`
			console.error(`💥 ${errorMsg}`)
			return { success: false, deletedCount, errors: [errorMsg, ...errors] }
		}
	}
}
