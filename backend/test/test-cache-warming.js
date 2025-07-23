#!/usr/bin/env node

/**
 * 测试缓存预热功能
 */

const API_BASE = process.env.API_URL || 'http://localhost:8787';
const API_KEY = process.env.API_KEY || 'test-key';

async function testCacheWarming() {
	console.log('🧪 测试缓存预热功能...\n');

	try {
		// 1. 先清除所有缓存
		console.log('1️⃣ 清除现有缓存...');
		const clearResponse = await fetch(`${API_BASE}/v1/api/cache/clear-all`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json'
			}
		});
		const clearResult = await clearResponse.json();
		console.log(`   清除结果: ${clearResult.success ? '成功' : '失败'}\n`);

		// 2. 手动触发缓存预热
		console.log('2️⃣ 触发缓存预热...');
		const warmResponse = await fetch(`${API_BASE}/v1/api/cache/warm`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${API_KEY}`,
				'Content-Type': 'application/json'
			}
		});
		
		if (warmResponse.status === 404) {
			console.log('   ⚠️ 缓存预热端点不存在，但这是正常的（通常由定时任务自动触发）\n');
		} else {
			const warmResult = await warmResponse.json();
			console.log(`   预热结果: ${warmResult.success ? '成功' : '失败'}\n`);
		}

		// 3. 检查关键端点是否被预热（应该显示缓存命中）
		console.log('3️⃣ 检查关键端点缓存状态...');

		const endpoints = [
			'/v1/api/dex/health',
			'/v1/api/dex/pools/bsc',
			'/v1/api/dex/tokens/bsc'
		];

		for (const endpoint of endpoints) {
			const response = await fetch(`${API_BASE}${endpoint}`, {
				headers: {
					'Authorization': `Bearer ${API_KEY}`
				}
			});

			const cacheStatus = response.headers.get('X-Cache-Status') || 'unknown';
			const success = response.status === 200;

			console.log(`   ${endpoint}`);
			console.log(`     状态: ${response.status}, 缓存: ${cacheStatus}, 成功: ${success}`);
		}

		console.log('\n✅ 缓存预热测试完成！');
		console.log('注意: 真正的缓存预热通常由 Worker 内部的定时任务触发');
		console.log('这里测试的是预热后的效果（缓存命中状态）');

	} catch (error) {
		console.error('❌ 缓存预热测试失败:', error.message);
	}
}

// 运行测试
testCacheWarming().catch(console.error);
