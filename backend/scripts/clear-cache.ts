#!/usr/bin/env tsx
/**
 * Clear Cache Script
 * 清理所有缓存数据，特别是在 TTL 配置变更后使用
 */

import type { KVNamespace } from '@cloudflare/workers-types'

// 模拟 KV 接口用于类型检查
interface MockEnv {
	KV: KVNamespace
}

/**
 * 清理所有 dex-api 相关的缓存
 */
export async function clearAllCache(kv: KVNamespace): Promise<{
	success: boolean
	deletedCount: number
	errors: string[]
}> {
	const errors: string[] = []
	let deletedCount = 0
	
	try {
		console.log('🔍 开始扫描所有缓存键...')
		
		// 列出所有以 dex-api 开头的键
		let cursor: string | undefined
		const keysToDelete: string[] = []
		
		do {
			const listResult = await kv.list({
				prefix: 'dex-api:',
				cursor,
				limit: 1000 // KV 最大限制
			})
			
			keysToDelete.push(...listResult.keys.map(key => key.name))
			cursor = listResult.list_complete ? undefined : listResult.cursor
			
			console.log(`📋 找到 ${listResult.keys.length} 个缓存键 (总计: ${keysToDelete.length})`)
			
		} while (cursor)
		
		console.log(`🎯 总共找到 ${keysToDelete.length} 个缓存键需要删除`)
		
		if (keysToDelete.length === 0) {
			return {
				success: true,
				deletedCount: 0,
				errors: []
			}
		}
		
		// 批量删除键 (KV 不支持批量删除，需要逐个删除)
		console.log('🗑️ 开始删除缓存键...')
		
		for (const key of keysToDelete) {
			try {
				await kv.delete(key)
				deletedCount++
				
				if (deletedCount % 50 === 0) {
					console.log(`✅ 已删除 ${deletedCount}/${keysToDelete.length} 个缓存键`)
				}
			} catch (error) {
				const errorMsg = `删除键 ${key} 失败: ${error}`
				errors.push(errorMsg)
				console.error(`❌ ${errorMsg}`)
			}
		}
		
		console.log(`🎉 缓存清理完成! 删除了 ${deletedCount} 个键`)
		
		return {
			success: errors.length === 0,
			deletedCount,
			errors
		}
		
	} catch (error) {
		const errorMsg = `缓存清理过程中发生错误: ${error}`
		console.error(`💥 ${errorMsg}`)
		return {
			success: false,
			deletedCount,
			errors: [errorMsg, ...errors]
		}
	}
}

/**
 * 清理特定前缀的缓存
 */
export async function clearCacheByPrefix(
	kv: KVNamespace, 
	prefix: string
): Promise<{
	success: boolean
	deletedCount: number
	errors: string[]
}> {
	const errors: string[] = []
	let deletedCount = 0
	
	try {
		console.log(`🔍 扫描前缀为 "${prefix}" 的缓存键...`)
		
		let cursor: string | undefined
		const keysToDelete: string[] = []
		
		do {
			const listResult = await kv.list({
				prefix,
				cursor,
				limit: 1000
			})
			
			keysToDelete.push(...listResult.keys.map(key => key.name))
			cursor = listResult.list_complete ? undefined : listResult.cursor
			
		} while (cursor)
		
		console.log(`🎯 找到 ${keysToDelete.length} 个匹配的缓存键`)
		
		for (const key of keysToDelete) {
			try {
				await kv.delete(key)
				deletedCount++
			} catch (error) {
				const errorMsg = `删除键 ${key} 失败: ${error}`
				errors.push(errorMsg)
				console.error(`❌ ${errorMsg}`)
			}
		}
		
		console.log(`✅ 前缀清理完成! 删除了 ${deletedCount} 个键`)
		
		return {
			success: errors.length === 0,
			deletedCount,
			errors
		}
		
	} catch (error) {
		const errorMsg = `前缀清理过程中发生错误: ${error}`
		console.error(`💥 ${errorMsg}`)
		return {
			success: false,
			deletedCount,
			errors: [errorMsg, ...errors]
		}
	}
}

/**
 * 列出所有缓存键（用于调试）
 */
export async function listAllCacheKeys(kv: KVNamespace): Promise<string[]> {
	const allKeys: string[] = []
	
	try {
		let cursor: string | undefined
		
		do {
			const listResult = await kv.list({
				prefix: 'dex-api:',
				cursor,
				limit: 1000
			})
			
			allKeys.push(...listResult.keys.map(key => key.name))
			cursor = listResult.list_complete ? undefined : listResult.cursor
			
		} while (cursor)
		
		console.log(`📋 找到 ${allKeys.length} 个缓存键:`)
		allKeys.forEach(key => console.log(`  - ${key}`))
		
		return allKeys
		
	} catch (error) {
		console.error(`💥 列出缓存键时发生错误: ${error}`)
		return []
	}
}

// 如果直接运行此脚本
if (typeof process !== 'undefined' && process.argv[1]?.includes('clear-cache')) {
	console.log('🚀 缓存清理脚本')
	console.log('⚠️  此脚本需要在 Cloudflare Workers 环境中运行')
	console.log('💡 你可以通过 API 端点调用这些函数: /v1/api/cache/clear-all')
}
