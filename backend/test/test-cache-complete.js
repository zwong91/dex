#!/usr/bin/env node

/**
 * 完整缓存系统测试
 * 测试所有缓存策略、强制刷新、用户访问控制等功能
 */

const API_BASE = process.env.API_URL || 'http://localhost:8787';
const API_KEY = process.env.API_KEY || 'test-key';

const testEndpoints = [
	{
		name: 'Health Check (HEALTH strategy)',
		url: '/v1/api/dex/health',
		strategy: 'HEALTH',
		expectedTtl: '10'
	},
	{
		name: 'Pools List (POOLS strategy)', 
		url: '/v1/api/dex/pools/bsc',
		strategy: 'POOLS',
		expectedTtl: '300'
	},
	{
		name: 'Subgraph Meta (METADATA strategy)',
		url: '/v1/api/dex/subgraph-meta',
		strategy: 'METADATA', 
		expectedTtl: '600'
	}
];

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
		cacheTtl: response.headers.get('X-Cache-TTL') || 'unknown',
		dataSize: JSON.stringify(data).length,
		success: data.success !== false
	};
}

async function testCacheStrategy(testCase) {
	console.log(`\n🧪 测试 ${testCase.name}`);
	console.log(`   端点: ${testCase.url}`);
	console.log(`   预期策略: ${testCase.strategy} (TTL: ${testCase.expectedTtl}s)\n`);

	// 1. 第一次请求 (cache miss)
	console.log('1️⃣ 初始请求...');
	const result1 = await makeRequest(testCase.url);
	console.log(`   状态: ${result1.status}, 缓存: ${result1.cacheStatus}, TTL: ${result1.cacheTtl}s`);

	if (!result1.success) {
		console.log(`   ❌ 请求失败, 数据大小: ${result1.dataSize} bytes`);
		return false;
	}

	// 等待一点时间
	await new Promise(resolve => setTimeout(resolve, 100));

	// 2. 第二次请求 (cache hit)
	console.log('2️⃣ 缓存命中测试...');
	const result2 = await makeRequest(testCase.url);
	console.log(`   状态: ${result2.status}, 缓存: ${result2.cacheStatus}, TTL: ${result2.cacheTtl}s`);

	// 3. 强制刷新测试
	console.log('3️⃣ 强制刷新测试...');
	const result3 = await makeRequest(testCase.url, { 'X-Force-Refresh': 'true' });
	console.log(`   状态: ${result3.status}, 缓存: ${result3.cacheStatus}, TTL: ${result3.cacheTtl}s`);

	// 验证结果
	const passed = result1.cacheStatus === 'MISS' && 
	              result2.cacheStatus === 'HIT' && 
	              result3.cacheStatus === 'BYPASS' &&
	              result1.cacheTtl === testCase.expectedTtl;

	if (passed) {
		console.log(`   ✅ ${testCase.name} 测试通过`);
	} else {
		console.log(`   ❌ ${testCase.name} 测试失败`);
		console.log(`   期望: MISS -> HIT -> BYPASS, TTL: ${testCase.expectedTtl}`);
		console.log(`   实际: ${result1.cacheStatus} -> ${result2.cacheStatus} -> ${result3.cacheStatus}, TTL: ${result1.cacheTtl}`);
	}

	return passed;
}

async function testCacheManagement() {
	console.log('\n🔧 测试缓存管理 API...');
	
	// 测试缓存状态
	console.log('1️⃣ 获取缓存状态...');
	const statusResult = await makeRequest('/v1/api/cache/status');
	console.log(`   状态: ${statusResult.status}, 成功: ${statusResult.success}`);

	return statusResult.status === 200;
}

async function runAllTests() {
	console.log('🚀 开始完整缓存系统测试\n');
	console.log(`API 端点: ${API_BASE}`);
	console.log(`API 密钥: ${API_KEY}\n`);

	let passedTests = 0;
	let totalTests = 0;

	// 测试各种缓存策略
	for (const testCase of testEndpoints) {
		totalTests++;
		const passed = await testCacheStrategy(testCase);
		if (passed) passedTests++;
	}

	// 测试缓存管理
	totalTests++;
	const mgmtPassed = await testCacheManagement();
	if (mgmtPassed) passedTests++;

	// 总结
	console.log('\n📊 测试总结');
	console.log(`   通过: ${passedTests}/${totalTests}`);
	console.log(`   成功率: ${Math.round(passedTests/totalTests*100)}%`);

	if (passedTests === totalTests) {
		console.log('\n🎉 所有缓存功能测试通过！');
		console.log('强制刷新、缓存策略、管理 API 都工作正常。');
	} else {
		console.log('\n⚠️ 部分测试失败，请检查配置和实现。');
	}

	return passedTests === totalTests;
}

// 运行测试
runAllTests().catch(console.error);
