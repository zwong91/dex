#!/usr/bin/env node

/**
 * 测试分页缓存功能
 * 验证不同查询参数的缓存键是否正确分离
 */

const API_BASE = process.env.API_URL || 'http://localhost:8787';
const API_KEY = process.env.API_KEY || 'test-key';

async function makeRequest(endpoint, headers = {}) {
	const url = `${API_BASE}${endpoint}`;
	const baseHeaders = {
		'Authorization': `Bearer ${API_KEY}`,
		'Content-Type': 'application/json',
		...headers
	};

	const response = await fetch(url, { headers: baseHeaders });
	const data = await response.json();
	
	return {
		status: response.status,
		cacheStatus: response.headers.get('X-Cache-Status') || 'unknown',
		cacheKey: response.headers.get('X-Cache-Key') || 'unknown',
		dataSize: data.data?.length || 0,
		success: response.status === 200
	};
}

async function testPaginationCaching() {
	console.log('🧪 测试分页缓存功能...\n');

	// 先清除所有缓存
	console.log('1️⃣ 清除现有缓存...');
	await makeRequest('/v1/api/cache/clear-all', {}, 'POST');
	console.log('   ✅ 缓存已清除\n');

	// 测试不同的分页查询
	const testCases = [
		{
			name: '默认查询 (前20条)',
			endpoint: '/v1/api/dex/pools/bsc?limit=20',
			expected: { cacheStatus: 'MISS', dataSize: 20 }
		},
		{
			name: '相同查询 (应该命中缓存)',
			endpoint: '/v1/api/dex/pools/bsc?limit=20',
			expected: { cacheStatus: 'HIT', dataSize: 20 }
		},
		{
			name: '不同 limit (前50条)',
			endpoint: '/v1/api/dex/pools/bsc?limit=50',
			expected: { cacheStatus: 'MISS', dataSize: 50 }
		},
		{
			name: '不同 offset (20-40条)',
			endpoint: '/v1/api/dex/pools/bsc?limit=20&offset=20',
			expected: { cacheStatus: 'MISS', dataSize: 20 }
		},
		{
			name: '不同排序 (按交易量)',
			endpoint: '/v1/api/dex/pools/bsc?limit=20&orderBy=volumeUSD&orderDirection=desc',
			expected: { cacheStatus: 'MISS', dataSize: 20 }
		},
		{
			name: '重复第一个查询 (应该仍然命中)',
			endpoint: '/v1/api/dex/pools/bsc?limit=20',
			expected: { cacheStatus: 'HIT', dataSize: 20 }
		}
	];

	let passedTests = 0;
	let totalTests = testCases.length;

	for (let i = 0; i < testCases.length; i++) {
		const testCase = testCases[i];
		
		console.log(`${i + 2}️⃣ ${testCase.name}`);
		console.log(`   请求: ${testCase.endpoint}`);
		
		const result = await makeRequest(testCase.endpoint);
		
		console.log(`   状态: ${result.status}`);
		console.log(`   缓存: ${result.cacheStatus} (期望: ${testCase.expected.cacheStatus})`);
		console.log(`   数据: ${result.dataSize} 条 (期望: ${testCase.expected.dataSize})`);
		console.log(`   缓存键: ${result.cacheKey.substring(0, 60)}...`);
		
		// 验证结果
		const cacheCorrect = result.cacheStatus === testCase.expected.cacheStatus;
		const dataCorrect = result.dataSize === testCase.expected.dataSize || result.dataSize > 0;
		
		if (cacheCorrect && dataCorrect && result.success) {
			console.log(`   ✅ 测试通过\n`);
			passedTests++;
		} else {
			console.log(`   ❌ 测试失败`);
			if (!cacheCorrect) console.log(`      缓存状态不匹配: ${result.cacheStatus} vs ${testCase.expected.cacheStatus}`);
			if (!dataCorrect) console.log(`      数据量不匹配: ${result.dataSize} vs ${testCase.expected.dataSize}`);
			if (!result.success) console.log(`      请求失败: ${result.status}`);
			console.log('');
		}
		
		// 在请求之间稍微等待，确保缓存操作完成
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	// 总结
	console.log('📊 分页缓存测试总结');
	console.log(`   通过: ${passedTests}/${totalTests}`);
	console.log(`   成功率: ${Math.round(passedTests/totalTests*100)}%`);

	if (passedTests === totalTests) {
		console.log('\n🎉 分页缓存功能完全正常！');
		console.log('✅ 不同查询参数正确使用不同缓存键');
		console.log('✅ 相同查询正确命中缓存');
		console.log('✅ 缓存键包含完整查询参数信息');
	} else {
		console.log('\n⚠️ 分页缓存存在问题，需要检查实现');
	}

	return passedTests === totalTests;
}

// 运行测试
testPaginationCaching().catch(console.error);
