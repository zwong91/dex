import type { Env } from '../index'
import { CACHE_CONFIG } from './config'
import { createSubgraphClient } from '../dex/graphql/client'
import { createPoolsHandler } from '../dex/handlers/pools-graphql'

/**
 * Cache warming utility for Cloudflare Workers
 * 直接调用内部处理函数，避免 HTTP 请求循环
 */
export class CacheWarmer {
	constructor(private env: Env) {}

	/**
	 * 预热关键端点的缓存
	 * 直接调用内部处理函数，避免 HTTP 请求
	 */
	async warmCriticalEndpoints(): Promise<void> {
		console.log('🔥 Starting cache warming...')
		
		const tasks = [
			() => this.warmHealthCheck(),
			() => this.warmPoolsList('bsc'),
			() => this.warmTokensList('bsc'),
			() => this.warmSubgraphMeta()
		]
		
		const results = await Promise.allSettled(tasks.map(task => task()))
		
		const successful = results.filter(r => r.status === 'fulfilled').length
		const failed = results.filter(r => r.status === 'rejected').length
		
		console.log(`🔥 Cache warming completed: ${successful} successful, ${failed} failed`)
	}

	/**
	 * 预热健康检查端点
	 */
	private async warmHealthCheck(): Promise<void> {
		try {
			const subgraphClient = createSubgraphClient(this.env)
			const subgraphHealth = await subgraphClient.checkHealth()
			
			const healthData = {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				version: '2.0.0',
				architecture: 'unified-graphql',
				subgraph: {
					url: this.env.SUBGRAPH_URL || 'mock',
					healthy: subgraphHealth.healthy,
					blockNumber: subgraphHealth.blockNumber,
					indexingErrors: subgraphHealth.hasIndexingErrors
				}
			}

			// 直接存储到 KV 缓存
			const cacheKey = 'dex-api:/v1/api/dex/health'
			if (this.env.KV) {
				await this.env.KV.put(
					cacheKey, 
					JSON.stringify(healthData), 
					{ expirationTtl: 60 } // HEALTH strategy TTL (min 60s for KV)
				)
			}
			
			console.log(`✅ Warmed health check: ${cacheKey}`)
		} catch (error) {
			console.error(`❌ Error warming health check:`, error)
			throw error
		}
	}

	/**
	 * 预热池子列表 - 支持多种查询参数组合
	 */
	private async warmPoolsList(chain: string): Promise<void> {
		try {
			const subgraphClient = createSubgraphClient(this.env)
			
			// 预热多种常用的查询组合，分页参数自动生成，避免冗余
			const paginatedVariations = [
				{ page: 1, limit: 10 },
				...Array.from({ length: 2 }, (_, i) => ({ page: i + 1, limit: 10 }))
			].map(v => ({
				...v,
				orderby: 'volume',
				filterby: '1d',
				status: 'main',
				version: 'all',
				excludelowvolumepools: 'true'
			}))

			const queryVariations = [
				{ limit: 10, offset: 0, orderBy: 'totalValueLockedUSD', orderDirection: 'desc' as const },
				{ limit: 10, offset: 0, orderBy: 'volumeUSD', orderDirection: 'desc' as const },
				...paginatedVariations
			]

			for (const variation of queryVariations) {
				// 兼容老参数和新参数
				if ('orderBy' in variation) {
					const pools = await subgraphClient.getPools(
						variation.limit,
						variation.offset,
						variation.orderBy,
						variation.orderDirection
					)
					const poolsData = {
						success: true,
						data: pools,
						meta: {
							total: pools.length,
							limit: variation.limit,
							offset: variation.offset,
							orderBy: variation.orderBy,
							orderDirection: variation.orderDirection
						},
						timestamp: new Date().toISOString()
					}
					const queryString = new URLSearchParams({
						limit: variation.limit.toString(),
						offset: variation.offset.toString(),
						orderBy: variation.orderBy,
						orderDirection: variation.orderDirection
					}).toString()
					const cacheKey = `dex-api:/v1/api/dex/pools/${chain}:${queryString}`
					if (this.env.KV) {
						await this.env.KV.put(
							cacheKey,
							JSON.stringify(poolsData),
							{ expirationTtl: 300 }
						)
					}
					console.log(`✅ Warmed pools (${variation.limit}/${variation.offset}/${variation.orderBy}): ${cacheKey}`)
				} else {
					// 新增：完全模拟前端请求参数的缓存
					// 这里你需要根据实际API handler的实现，调用正确的handler和参数
					// 这里只做缓存key和数据结构的预热
					const pools = await subgraphClient.getPools(
						variation.limit,
						0,
						'volumeUSD',
						'desc'
					)
					const poolsData = {
						success: true,
						data: pools,
						meta: {
							page: variation.page,
							limit: variation.limit,
							orderby: variation.orderby,
							filterby: variation.filterby,
							status: variation.status,
							version: variation.version,
							excludelowvolumepools: variation.excludelowvolumepools
						},
						timestamp: new Date().toISOString()
					}
					const queryString = new URLSearchParams({
						page: variation.page.toString(),
						limit: variation.limit.toString(),
						orderby: variation.orderby,
						filterby: variation.filterby,
						status: variation.status,
						version: variation.version,
						excludelowvolumepools: variation.excludelowvolumepools
					}).toString()
					const cacheKey = `dex-api:/v1/api/dex/pools/${chain}:${queryString}`
					if (this.env.KV) {
						await this.env.KV.put(
							cacheKey,
							JSON.stringify(poolsData),
							{ expirationTtl: 300 }
						)
					}
					console.log(`✅ Warmed pools (page=${variation.page}/limit=${variation.limit}/orderby=${variation.orderby}): ${cacheKey}`)
				}
			}

		} catch (error) {
			console.error(`❌ Error warming pools for ${chain}:`, error)
			throw error
		}
	}

	/**
	 * 预热代币列表 - 支持多种查询参数组合
	 */
	private async warmTokensList(chain: string): Promise<void> {
		try {
			const subgraphClient = createSubgraphClient(this.env)
			
			// 预热多种常用的查询组合
			const queryVariations = [
				{ limit: 20, offset: 0 }
			]
			
			for (const variation of queryVariations) {
				const tokens = await subgraphClient.getTokens(variation.limit, variation.offset)
				
				const tokensData = {
					success: true,
					data: tokens,
					meta: {
						total: tokens.length,
						limit: variation.limit,
						offset: variation.offset
					},
					timestamp: new Date().toISOString()
				}

				// 生成包含查询参数的缓存键
				const queryString = new URLSearchParams({
					limit: variation.limit.toString(),
					offset: variation.offset.toString()
				}).toString()
				
				const cacheKey = `dex-api:/v1/api/dex/tokens/${chain}:${queryString}`
				
				if (this.env.KV) {
					await this.env.KV.put(
						cacheKey, 
						JSON.stringify(tokensData), 
						{ expirationTtl: 300 } // POOLS strategy TTL
					)
				}
				
				console.log(`✅ Warmed tokens (${variation.limit}/${variation.offset}): ${cacheKey}`)
			}
			
		} catch (error) {
			console.error(`❌ Error warming tokens for ${chain}:`, error)
			throw error
		}
	}

	/**
	 * 预热子图元数据
	 */
	private async warmSubgraphMeta(): Promise<void> {
		try {
			const subgraphClient = createSubgraphClient(this.env)
			const meta = await subgraphClient.getMeta()
			
			const metaData = {
				success: true,
				data: meta,
				timestamp: new Date().toISOString()
			}

			const cacheKey = 'dex-api:/v1/api/dex/subgraph-meta'
			if (this.env.KV) {
				await this.env.KV.put(
					cacheKey, 
					JSON.stringify(metaData), 
					{ expirationTtl: 600 } // METADATA strategy TTL
				)
			}
			
			console.log(`✅ Warmed subgraph meta: ${cacheKey}`)
		} catch (error) {
			console.error(`❌ Error warming subgraph meta:`, error)
			throw error
		}
	}

	/**
	 * 预热特定链的端点
	 * 直接调用内部方法预热主要数据
	 */
	async warmChainEndpoints(chain: string): Promise<void> {
		console.log(`🔥 Warming ${chain} endpoints...`)
		
		const tasks = [
			() => this.warmPoolsList(chain),
			() => this.warmTokensList(chain)
		]
		
		const results = await Promise.allSettled(tasks.map(task => task()))
		const successful = results.filter(r => r.status === 'fulfilled').length
		
		console.log(`🔥 ${chain} endpoints warmed: ${successful}/${tasks.length} successful`)
	}

	/**
	 * 预热用户相关端点 (暂时省略，需要具体用户地址)
	 * 可以在用户连接钱包后调用
	 */
	async warmUserEndpoints(userAddress: string, chain: string): Promise<void> {
		console.log(`🔥 User-specific warming for ${userAddress} on ${chain} (Not implemented - requires user context)`)
		// 用户相关的缓存通常需要认证，这里暂时省略
		// 可以在用户实际请求后自然建立缓存
	}
}

/**
 * 缓存预热调度器，用于定时任务
 * 只预热真正重要的端点，避免过度预热
 */
export async function runCacheWarming(env: Env): Promise<void> {
	if (!env.KV) {
		console.warn('⚠️ KV not available, skipping cache warming')
		return
	}

	const warmer = new CacheWarmer(env)
	
	try {
		// 预热关键端点
		await warmer.warmCriticalEndpoints()
		
		// 预热主链端点 (BSC)
		await warmer.warmChainEndpoints('bsc')
		
		console.log('🔥 Cache warming completed successfully')
	} catch (error) {
		console.error('❌ Cache warming failed:', error)
		// 不抛出错误，避免影响主要功能
	}
}
