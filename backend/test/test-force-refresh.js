#!/usr/bin/env node

/**
 * 测试强制刷新功能
 * 验证 X-Force-Refresh 和 Cache-Control: no-cache 是否正常工作
 */

const API_BASE = process.env.API_URL || 'http://localhost:8787';
const API_KEY = process.env.API_KEY || 'test-key';

async function testForceRefresh() {
	console.log('🧪 测试强制刷新功能...\n');

	// 测试端点
	const endpoint = '/v1/api/dex/pools/bsc';
	const url = `${API_BASE}${endpoint}`;

	// 配置请求
	const baseHeaders = {
		'Authorization': `Bearer ${API_KEY}`,
		'Content-Type': 'application/json'
	};

	try {
		// 1. 正常请求（会被缓存）
		console.log('1️⃣ 正常请求（建立缓存）...');
		const response1 = await fetch(url, { headers: baseHeaders });
		const data1 = await response1.json();
		const cacheStatus1 = response1.headers.get('X-Cache-Status') || 'unknown';
		console.log(`   状态: ${response1.status}`);
		console.log(`   缓存状态: ${cacheStatus1}`);
		console.log(`   数据条目: ${data1.data?.length || 0}\n`);

		// 等待一秒
		await new Promise(resolve => setTimeout(resolve, 1000));

		// 2. 再次正常请求（应该命中缓存）
		console.log('2️⃣ 再次正常请求（应该命中缓存）...');
		const response2 = await fetch(url, { headers: baseHeaders });
		const data2 = await response2.json();
		const cacheStatus2 = response2.headers.get('X-Cache-Status') || 'unknown';
		console.log(`   状态: ${response2.status}`);
		console.log(`   缓存状态: ${cacheStatus2}`);
		console.log(`   数据条目: ${data2.data?.length || 0}\n`);

		// 3. 使用 X-Force-Refresh 强制刷新
		console.log('3️⃣ 使用 X-Force-Refresh 强制刷新...');
		const response3 = await fetch(url, {
			headers: {
				...baseHeaders,
				'X-Force-Refresh': 'true'
			}
		});
		const data3 = await response3.json();
		const cacheStatus3 = response3.headers.get('X-Cache-Status') || 'unknown';
		console.log(`   状态: ${response3.status}`);
		console.log(`   缓存状态: ${cacheStatus3} (应该是 MISS 或 BYPASS)`);
		console.log(`   数据条目: ${data3.data?.length || 0}\n`);

		// 4. 使用 Cache-Control: no-cache 强制刷新
		console.log('4️⃣ 使用 Cache-Control: no-cache 强制刷新...');
		const response4 = await fetch(url, {
			headers: {
				...baseHeaders,
				'Cache-Control': 'no-cache'
			}
		});
		const data4 = await response4.json();
		const cacheStatus4 = response4.headers.get('X-Cache-Status') || 'unknown';
		console.log(`   状态: ${response4.status}`);
		console.log(`   缓存状态: ${cacheStatus4} (应该是 MISS 或 BYPASS)`);
		console.log(`   数据条目: ${data4.data?.length || 0}\n`);

		// 5. 验证缓存是否重新建立
		console.log('5️⃣ 验证缓存重新建立...');
		const response5 = await fetch(url, { headers: baseHeaders });
		const data5 = await response5.json();
		const cacheStatus5 = response5.headers.get('X-Cache-Status') || 'unknown';
		console.log(`   状态: ${response5.status}`);
		console.log(`   缓存状态: ${cacheStatus5}`);
		console.log(`   数据条目: ${data5.data?.length || 0}\n`);

		// 结果分析
		console.log('📊 测试结果分析:');
		console.log(`   初始请求缓存状态: ${cacheStatus1}`);
		console.log(`   第二次请求缓存状态: ${cacheStatus2} (应该是 HIT)`);
		console.log(`   X-Force-Refresh 状态: ${cacheStatus3} (应该是 BYPASS)`);
		console.log(`   Cache-Control 状态: ${cacheStatus4} (应该是 BYPASS)`);
		console.log(`   最终缓存状态: ${cacheStatus5}`);

		// 验证强制刷新是否有效
		const forceRefreshWorking = (cacheStatus3 === 'BYPASS' || cacheStatus3 === 'MISS') && 
		                           (cacheStatus4 === 'BYPASS' || cacheStatus4 === 'MISS');
		
		if (forceRefreshWorking) {
			console.log('\n✅ 强制刷新功能正常工作！');
		} else {
			console.log('\n❌ 强制刷新功能可能有问题');
		}

	} catch (error) {
		console.error('❌ 测试失败:', error.message);
		process.exit(1);
	}
}

// 运行测试
testForceRefresh().catch(console.error);
