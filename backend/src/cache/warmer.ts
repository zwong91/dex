import type { Env } from '../index'
import { CACHE_CONFIG } from './config'

/**
 * Cache warming utility for Cloudflare Workers
 * Preloads critical endpoints to ensure fast response times
 */
export class CacheWarmer {
	constructor(
		private env: Env,
		private baseUrl: string = 'https://your-worker-domain.workers.dev'
	) {}

	/**
	 * Warm up critical endpoints
	 */
	async warmCriticalEndpoints(): Promise<void> {
		console.log('🔥 Starting cache warming...')
		
		const endpoints = CACHE_CONFIG.WARMING.CRITICAL_ENDPOINTS
		const promises = endpoints.map(endpoint => this.warmEndpoint(endpoint))
		
		const results = await Promise.allSettled(promises)
		
		const successful = results.filter(r => r.status === 'fulfilled').length
		const failed = results.filter(r => r.status === 'rejected').length
		
		console.log(`🔥 Cache warming completed: ${successful} successful, ${failed} failed`)
	}

	/**
	 * Warm a specific endpoint
	 */
	private async warmEndpoint(endpoint: string): Promise<void> {
		try {
			const url = `${this.baseUrl}${endpoint}`
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': 'Cache-Warmer/1.0',
					'X-Cache-Warm': 'true',
					'Authorization': `Bearer ${this.env.KEY}` // Use your API key
				}
			})
			
			if (response.ok) {
				console.log(`✅ Warmed: ${endpoint}`)
			} else {
				console.warn(`⚠️ Failed to warm ${endpoint}: ${response.status}`)
			}
		} catch (error) {
			console.error(`❌ Error warming ${endpoint}:`, error)
		}
	}

	/**
	 * Warm specific chain endpoints
	 */
	async warmChainEndpoints(chain: string): Promise<void> {
		const endpoints = [
			`/v1/api/dex/pools/${chain}`,
			`/v1/api/dex/tokens/${chain}`,
			`/v1/api/dex/analytics/${chain}`,
			`/v1/api/dex/farms`
		]
		
		console.log(`🔥 Warming ${chain} endpoints...`)
		
		for (const endpoint of endpoints) {
			await this.warmEndpoint(endpoint)
		}
	}

	/**
	 * Warm user-specific endpoints (used after user connects wallet)
	 */
	async warmUserEndpoints(userAddress: string, chain: string): Promise<void> {
		const endpoints = [
			`/v1/api/dex/user/pool-ids/${userAddress}/${chain}`,
			`/v1/api/dex/user/${userAddress}/rewards`,
			`/v1/api/dex/user/${userAddress}/farms`
		]
		
		console.log(`🔥 Warming user endpoints for ${userAddress}...`)
		
		for (const endpoint of endpoints) {
			await this.warmEndpoint(endpoint)
		}
	}
}

/**
 * Cache warming scheduler for cron jobs
 */
export async function runCacheWarming(env: Env): Promise<void> {
	if (!env.KV) {
		console.warn('⚠️ KV not available, skipping cache warming')
		return
	}

	const warmer = new CacheWarmer(env)
	
	try {
		// Warm critical endpoints
		await warmer.warmCriticalEndpoints()
		
		// Warm main chain endpoints
		await warmer.warmChainEndpoints('bsc')
		
		console.log('🔥 Cache warming completed successfully')
	} catch (error) {
		console.error('❌ Cache warming failed:', error)
		throw error
	}
}
