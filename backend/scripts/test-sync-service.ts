/**
 * 测试同步服务是否能够写入事件数据到 D1 数据库
 */
import { SyncCoordinator } from '../src/dex/sync/sync-coordinator';
import { createMockEnv } from './test-utils';

async function testSyncService() {
  console.log('🔄 开始测试同步服务...');
  
  try {
    // 创建测试环境
    const env = createMockEnv();
    
    // 创建同步协调器
    const coordinator = new SyncCoordinator(env);
    
    console.log('📋 检查初始状态...');
    
    // 查询初始池数量
    const pools = await env.DB.prepare('SELECT COUNT(*) as count FROM pools').first();
    console.log(`💰 数据库中的池数量: ${pools?.count || 0}`);
    
    // 查询初始事件数量
    const events = await env.DB.prepare('SELECT COUNT(*) as count FROM swap_events').first();
    console.log(`📊 数据库中的事件数量: ${events?.count || 0}`);
    
    console.log('\n🚀 启动同步服务...');
    
    // 运行一次同步（模拟定期同步）
    await coordinator.triggerFullSync();
    
    console.log('\n✅ 同步完成，检查结果...');
    
    // 再次查询事件数量
    const newEvents = await env.DB.prepare('SELECT COUNT(*) as count FROM swap_events').first();
    console.log(`📊 同步后的事件数量: ${newEvents?.count || 0}`);
    
    // 查询最新的事件
    const latestEvents = await env.DB.prepare(`
      SELECT pool_address, transaction_hash, amount_in, amount_out, timestamp 
      FROM swap_events 
      ORDER BY timestamp DESC 
      LIMIT 3
    `).all();
    
    if (latestEvents.results.length > 0) {
      console.log('\n📈 最新事件:');
      latestEvents.results.forEach((event: any, index: number) => {
        console.log(`  ${index + 1}. Pool: ${event.pool_address.slice(0, 10)}...`);
        console.log(`     TX: ${event.transaction_hash.slice(0, 10)}...`);
        console.log(`     Amount In: ${event.amount_in}`);
        console.log(`     Amount Out: ${event.amount_out}`);
        console.log(`     Time: ${new Date(event.timestamp * 1000).toISOString()}`);
      });
    } else {
      console.log('\n⚠️  没有找到新的事件数据');
    }
    
    console.log('\n🎯 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 执行测试
if (require.main === module) {
  testSyncService().catch(console.error);
}

export { testSyncService };
