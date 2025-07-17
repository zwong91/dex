#!/usr/bin/env tsx
/**
 * 测试缓存清理功能
 * 直接调用 API 端点来清理缓存
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://your-worker.workers.dev'

async function testCacheClear() {
	console.log('🧪 测试缓存清理功能...')
	
	try {
		// 1. 检查当前缓存状态
		console.log('📋 检查缓存状态...')
		const statusResponse = await fetch(`${API_BASE_URL}/v1/api/cache/status`)
		const statusData = await statusResponse.json()
		console.log('缓存状态:', statusData)
		
		// 2. 清理所有缓存
		console.log('🗑️ 清理所有缓存...')
		const clearResponse = await fetch(`${API_BASE_URL}/v1/api/cache/clear-all`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		
		const clearData = await clearResponse.json()
		console.log('清理结果:', clearData)
		
		if (clearData.success) {
			console.log(`✅ 成功清理了 ${clearData.deletedCount} 个缓存条目`)
		} else {
			console.log('❌ 清理失败:', clearData.error)
			if (clearData.errors && clearData.errors.length > 0) {
				console.log('错误详情:', clearData.errors)
			}
		}
		
		// 3. 再次检查缓存状态
		console.log('📋 再次检查缓存状态...')
		const newStatusResponse = await fetch(`${API_BASE_URL}/v1/api/cache/status`)
		const newStatusData = await newStatusResponse.json()
		console.log('清理后缓存状态:', newStatusData)
		
	} catch (error) {
		console.error('💥 测试过程中发生错误:', error)
	}
}

async function forceRefreshHealthCheck() {
	console.log('🔄 强制刷新健康检查...')
	
	try {
		const response = await fetch(`${API_BASE_URL}/v1/api/dex/health`, {
			headers: {
				'X-Force-Refresh': 'true'
			}
		})
		
		const data = await response.json()
		console.log('健康检查结果:', data)
		console.log('响应头:')
		console.log('  X-Cache-Status:', response.headers.get('X-Cache-Status'))
		console.log('  X-Cache-Key:', response.headers.get('X-Cache-Key'))
		console.log('  X-Cache-TTL:', response.headers.get('X-Cache-TTL'))
		
	} catch (error) {
		console.error('💥 强制刷新健康检查失败:', error)
	}
}

async function main() {
	console.log('🚀 缓存管理测试工具')
	console.log('='.repeat(50))
	
	const action = process.argv[2]
	
	switch (action) {
		case 'clear':
			await testCacheClear()
			break
		case 'refresh':
			await forceRefreshHealthCheck()
			break
		case 'all':
			await testCacheClear()
			console.log('\n' + '-'.repeat(30) + '\n')
			await forceRefreshHealthCheck()
			break
		default:
			console.log('用法:')
			console.log('  tsx test-cache.ts clear    # 清理所有缓存')
			console.log('  tsx test-cache.ts refresh  # 强制刷新健康检查')
			console.log('  tsx test-cache.ts all      # 执行所有操作')
			console.log('')
			console.log('环境变量:')
			console.log('  API_BASE_URL  # API 基础 URL (默认: https://your-worker.workers.dev)')
			break
	}
}

main().catch(console.error)
