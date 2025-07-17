/**
 * Cloudflare KV Caching Configuration for DEX API
 * 
 * This file contains comprehensive caching strategies and utilities
 * for optimizing API response times using Cloudflare Workers KV.
 */

export const CACHE_CONFIG = {
	/**
	 * Cache key prefixes for different types of data
	 */
	PREFIXES: {
		API: 'dex-api',
		USER: 'dex-user',
		POOL: 'dex-pool',
		ANALYTICS: 'dex-analytics',
		PRICE: 'dex-price',
		HEALTH: 'dex-health'
	},

	/**
	 * TTL configurations in seconds
	 */
	TTL: {
		// Static data that rarely changes (tokens, vault strategies)
		STATIC: 24 * 60 * 60, // 24 hours
		
		// Pool data that changes moderately
		POOLS: 5 * 60, // 5 minutes
		
		// Price data that changes frequently
		PRICE: 60, // 1 minute
		
		// User-specific data
		USER_DATA: 60, // 60 seconds (KV minimum)
		
		// Analytics data
		ANALYTICS: 60 * 60, // 1 hour
		
		// Health check data
		HEALTH: 60, // 60 seconds (KV minimum)
		
		// Subgraph metadata
		METADATA: 10 * 60, // 10 minutes
		
		// Vault data
		VAULTS: 5 * 60, // 5 minutes
		
		// Farm data
		FARMS: 2 * 60, // 2 minutes
		
		// Rewards data (changes frequently due to block rewards)
		REWARDS: 60, // 60 seconds (KV minimum)
	},

	/**
	 * Cache headers for client-side caching
	 */
	HEADERS: {
		CACHE_CONTROL: {
			STATIC: 'public, max-age=86400, s-maxage=86400', // 24h
			POOLS: 'public, max-age=300, s-maxage=300', // 5m
			PRICE: 'public, max-age=60, s-maxage=60', // 1m
			USER: 'private, max-age=60, s-maxage=60', // 60s (KV minimum)
			ANALYTICS: 'public, max-age=3600, s-maxage=3600', // 1h
			HEALTH: 'public, max-age=60, s-maxage=60', // 60s (KV minimum)
		}
	},

	/**
	 * Cache warming strategies
	 */
	WARMING: {
		// Endpoints to warm up on deployment
		CRITICAL_ENDPOINTS: [
			'/v1/api/dex/health',
			'/v1/api/dex/subgraph/meta',
			'/v1/api/dex/pools/bsc',
			'/v1/api/dex/tokens/bsc',
			'/v1/api/dex/analytics/bsc'
		],
		
		// Warm up interval in milliseconds
		INTERVAL: 5 * 60 * 1000, // 5 minutes
	}
} as const

/**
 * Cache invalidation patterns
 * Define which caches to invalidate when certain events occur
 */
export const INVALIDATION_PATTERNS = {
	// When a new pool is created
	NEW_POOL: [
		'dex-api:/v1/api/dex/pools/{chain}',
		'dex-api:/v1/api/dex/tokens/{chain}',
		'dex-api:/v1/api/dex/analytics/{chain}'
	],
	
	// When liquidity is added/removed
	LIQUIDITY_CHANGE: [
		'dex-api:/v1/api/dex/pools/{chain}/{poolId}',
		'dex-api:/v1/api/dex/pools/{chain}/{poolId}/bins',
		'dex-api:/v1/api/dex/analytics/{chain}',
		'dex-user:/v1/api/dex/user:user:{userAddress}'
	],
	
	// When a swap occurs
	SWAP: [
		'dex-price:/v1/api/dex/price',
		'dex-api:/v1/api/dex/pools/{chain}/{poolId}',
		'dex-api:/v1/api/dex/swaps',
		'dex-user:/v1/api/dex/user:user:{userAddress}'
	],
	
	// When rewards are distributed
	REWARDS: [
		'dex-api:/v1/api/dex/user/{address}/rewards',
		'dex-api:/v1/api/dex/user/{address}/claimable-rewards',
		'dex-api:/v1/api/dex/farms'
	]
} as const

/**
 * Cache performance monitoring
 */
export interface CacheMetrics {
	hits: number
	misses: number
	errors: number
	totalRequests: number
	avgResponseTime: number
	lastUpdated: string
}

/**
 * Default cache metrics
 */
export const DEFAULT_CACHE_METRICS: CacheMetrics = {
	hits: 0,
	misses: 0,
	errors: 0,
	totalRequests: 0,
	avgResponseTime: 0,
	lastUpdated: new Date().toISOString()
}

/**
 * Cache key generators for different data types
 */
export const CACHE_KEY_GENERATORS = {
	/**
	 * Generate cache key for pool data
	 */
	pool: (chain: string, poolId?: string, action?: string) => {
		let key = `${CACHE_CONFIG.PREFIXES.POOL}:${chain}`
		if (poolId) key += `:${poolId}`
		if (action) key += `:${action}`
		return key.toLowerCase()
	},
	
	/**
	 * Generate cache key for user data
	 */
	user: (userAddress: string, chain?: string, poolId?: string, action?: string) => {
		let key = `${CACHE_CONFIG.PREFIXES.USER}:${userAddress.toLowerCase()}`
		if (chain) key += `:${chain}`
		if (poolId) key += `:${poolId}`
		if (action) key += `:${action}`
		return key
	},
	
	/**
	 * Generate cache key for price data
	 */
	price: (token?: string, chain?: string) => {
		let key = `${CACHE_CONFIG.PREFIXES.PRICE}:latest`
		if (token) key += `:${token}`
		if (chain) key += `:${chain}`
		return key.toLowerCase()
	},
	
	/**
	 * Generate cache key for analytics data
	 */
	analytics: (chain: string, timeframe?: string) => {
		let key = `${CACHE_CONFIG.PREFIXES.ANALYTICS}:${chain}`
		if (timeframe) key += `:${timeframe}`
		return key.toLowerCase()
	}
}

/**
 * Cache middleware options for different endpoint types
 */
export const MIDDLEWARE_OPTIONS = {
	STATIC_DATA: {
		ttl: CACHE_CONFIG.TTL.STATIC,
		cacheControl: CACHE_CONFIG.HEADERS.CACHE_CONTROL.STATIC,
		bypassAuth: true
	},
	
	POOL_DATA: {
		ttl: CACHE_CONFIG.TTL.POOLS,
		cacheControl: CACHE_CONFIG.HEADERS.CACHE_CONTROL.POOLS,
		bypassAuth: false
	},
	
	PRICE_DATA: {
		ttl: CACHE_CONFIG.TTL.PRICE,
		cacheControl: CACHE_CONFIG.HEADERS.CACHE_CONTROL.PRICE,
		bypassAuth: false
	},
	
	USER_DATA: {
		ttl: CACHE_CONFIG.TTL.USER_DATA,
		cacheControl: CACHE_CONFIG.HEADERS.CACHE_CONTROL.USER,
		bypassAuth: false,
		includeUserInKey: true
	},
	
	ANALYTICS_DATA: {
		ttl: CACHE_CONFIG.TTL.ANALYTICS,
		cacheControl: CACHE_CONFIG.HEADERS.CACHE_CONTROL.ANALYTICS,
		bypassAuth: false
	}
} as const
