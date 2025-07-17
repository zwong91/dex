import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env } from '../index'
import { CacheManager } from '../middleware/cache'
import { createAuthMiddleware } from '../middleware/auth'

/**
 * Cache Management Routes
 * Provides endpoints for cache invalidation and monitoring
 */
export function createCacheRoutes() {
	const app = new Hono<{ Bindings: Env }>()

	// Internal cache clearing endpoint (no auth required for emergency clearing)
	app.post('/internal/clear-all', async (c) => {
		const kv = c.env.KV
		if (!kv) {
			return c.json({
				success: false,
				error: 'KV not available'
			}, 503)
		}

		try {
			const cacheManager = new CacheManager(kv)
			const result = await cacheManager.clearAll()

			return c.json({
				success: result.success,
				message: result.success ? 'All caches cleared successfully' : 'Cache clearing failed',
				deletedCount: result.deletedCount,
				errors: result.errors,
				warning: 'This operation affects all cached data',
				timestamp: new Date().toISOString()
			})
		} catch (error) {
			console.error('Internal cache clear error:', error)
			return c.json({
				success: false,
				error: 'Cache clear failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			}, 500)
		}
	})

	// Apply auth middleware to all other cache management routes
	app.use('*', createAuthMiddleware())

	// Cache status endpoint
	app.get('/status', async (c) => {
		const kv = c.env.KV
		
		if (!kv) {
			return c.json({
				success: false,
				error: 'KV not available',
				timestamp: new Date().toISOString()
			}, 503)
		}

		return c.json({
			success: true,
			data: {
				kvAvailable: true,
				cacheStrategies: [
					{ name: 'STATIC', ttl: 86400, description: 'Static data (24h)' },
					{ name: 'POOLS', ttl: 300, description: 'Pool data (5m)' },
					{ name: 'PRICE', ttl: 60, description: 'Price data (1m)' },
					{ name: 'USER', ttl: 60, description: 'User data (60s)' },
					{ name: 'ANALYTICS', ttl: 3600, description: 'Analytics (1h)' },
					{ name: 'HEALTH', ttl: 60, description: 'Health checks (60s)' },
					{ name: 'METADATA', ttl: 600, description: 'Metadata (10m)' }
				]
			},
			timestamp: new Date().toISOString()
		})
	})

	// Cache invalidation schemas
	const poolInvalidationSchema = z.object({
		chain: z.string().min(1),
		poolId: z.string().min(1).optional()
	})

	const userInvalidationSchema = z.object({
		userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
	})

	const keyInvalidationSchema = z.object({
		key: z.string().min(1)
	})

	// Invalidate pool caches
	app.post('/invalidate/pool',
		zValidator('json', poolInvalidationSchema),
		async (c) => {
			const kv = c.env.KV
			if (!kv) {
				return c.json({
					success: false,
					error: 'KV not available'
				}, 503)
			}

			const { chain, poolId } = c.req.valid('json')
			const cacheManager = new CacheManager(kv)

			try {
				if (poolId) {
					await cacheManager.invalidatePool(chain, poolId)
				} else {
					// Invalidate all pools for the chain
					const patterns = [
						`dex-api:/v1/api/dex/pools/${chain}`,
						`dex-api:/v1/api/dex/analytics/${chain}`,
						`dex-api:/v1/api/dex/tokens/${chain}`,
					]
					
					for (const pattern of patterns) {
						await kv.delete(pattern)
					}
				}

				return c.json({
					success: true,
					message: poolId 
						? `Invalidated cache for pool ${poolId} on ${chain}`
						: `Invalidated all pool caches for ${chain}`,
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				console.error('Pool cache invalidation error:', error)
				return c.json({
					success: false,
					error: 'Cache invalidation failed',
					message: error instanceof Error ? error.message : 'Unknown error'
				}, 500)
			}
		}
	)

	// Invalidate user caches
	app.post('/invalidate/user',
		zValidator('json', userInvalidationSchema),
		async (c) => {
			const kv = c.env.KV
			if (!kv) {
				return c.json({
					success: false,
					error: 'KV not available'
				}, 503)
			}

			const { userAddress } = c.req.valid('json')
			const cacheManager = new CacheManager(kv)

			try {
				await cacheManager.invalidateUser(userAddress)

				return c.json({
					success: true,
					message: `Invalidated cache for user ${userAddress}`,
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				console.error('User cache invalidation error:', error)
				return c.json({
					success: false,
					error: 'Cache invalidation failed',
					message: error instanceof Error ? error.message : 'Unknown error'
				}, 500)
			}
		}
	)

	// Invalidate specific cache key
	app.post('/invalidate/key',
		zValidator('json', keyInvalidationSchema),
		async (c) => {
			const kv = c.env.KV
			if (!kv) {
				return c.json({
					success: false,
					error: 'KV not available'
				}, 503)
			}

			const { key } = c.req.valid('json')

			try {
				await kv.delete(key)

				return c.json({
					success: true,
					message: `Invalidated cache key: ${key}`,
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				console.error('Key cache invalidation error:', error)
				return c.json({
					success: false,
					error: 'Cache invalidation failed',
					message: error instanceof Error ? error.message : 'Unknown error'
				}, 500)
			}
		}
	)

	// Clear all caches (use with caution)
	app.post('/clear-all', async (c) => {
		const kv = c.env.KV
		if (!kv) {
			return c.json({
				success: false,
				error: 'KV not available'
			}, 503)
		}

		try {
			// List all keys with dex-api prefix and delete them
			// Note: This is a simplified implementation
			// In production, you might want to implement this more carefully
			const cacheManager = new CacheManager(kv)
			await cacheManager.clearAll()

			return c.json({
				success: true,
				message: 'All caches cleared successfully',
				warning: 'This operation affects all cached data',
				timestamp: new Date().toISOString()
			})
		} catch (error) {
			console.error('Clear all caches error:', error)
			return c.json({
				success: false,
				error: 'Cache clear failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			}, 500)
		}
	})

	// Get cache info for a specific key
	app.get('/info/:key', async (c) => {
		const kv = c.env.KV
		if (!kv) {
			return c.json({
				success: false,
				error: 'KV not available'
			}, 503)
		}

		const key = c.req.param('key')

		try {
			const value = await kv.get(key, 'json')
			const metadata = await kv.getWithMetadata(key)

			return c.json({
				success: true,
				data: {
					key,
					exists: value !== null,
					value: value,
					metadata: metadata.metadata,
					size: metadata.value ? JSON.stringify(metadata.value).length : 0
				},
				timestamp: new Date().toISOString()
			})
		} catch (error) {
			console.error('Cache info error:', error)
			return c.json({
				success: false,
				error: 'Failed to get cache info',
				message: error instanceof Error ? error.message : 'Unknown error'
			}, 500)
		}
	})

	return app
}
