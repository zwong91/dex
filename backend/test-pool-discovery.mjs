/**
 * 测试池发现功能
 */

import { PoolDiscoveryService } from './src/dex/sync/pool-discovery.js';

// 模拟环境变量
const mockEnv = {
  // 模拟数据库
  D1_DATABASE: {
    prepare: (query) => ({
      bind: (...args) => ({
        run: () => Promise.resolve({ success: true }),
        all: () => Promise.resolve([]),
        first: () => Promise.resolve(null)
      })
    })
  },
  
  // BSC RPC URLs
  BSC_INFURA_URL: 'https://bsc-dataseed1.binance.org/',
  BSC_TEST_INFURA_URL: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
};

async function testPoolDiscovery() {
  console.log('🧪 开始测试池发现功能...\n');

  try {
    // 创建池发现服务
    const poolDiscovery = new PoolDiscoveryService(mockEnv);
    console.log('✅ 池发现服务初始化成功');

    // 执行一次发现扫描
    console.log('\n🔍 开始执行池发现扫描...');
    const metrics = await poolDiscovery.performDiscoveryScan();

    // 显示结果
    console.log('\n📊 扫描结果:');
    console.log(`  总扫描数: ${metrics.totalScanned}`);
    console.log(`  发现新池: ${metrics.newPoolsFound}`);
    console.log(`  已添加池: ${metrics.poolsAdded}`);
    console.log(`  跳过池数: ${metrics.poolsSkipped}`);
    console.log(`  扫描时长: ${metrics.scanDuration}ms`);
    console.log(`  错误次数: ${metrics.errors}`);

    if (metrics.errors === 0) {
      console.log('\n✅ 池发现测试成功完成!');
    } else {
      console.log('\n⚠️ 池发现测试完成，但有错误');
    }

  } catch (error) {
    console.error('\n❌ 池发现测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testPoolDiscovery().catch(console.error);
}
