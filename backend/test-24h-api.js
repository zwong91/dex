/**
 * 测试24小时数据API调用
 * 调试为什么volume24hUsd和fees24hUsd是0
 */

async function testPoolDayDataAPI() {
  const API_BASE = 'https://api.dex.jongun2038.win/v1/api/dex';
  const POOL_ID = '0x30540774ce85dcec6e3acbcb89209b2e01a29723';
  
  console.log('🔍 测试24小时数据API调用...');
  console.log('目标池子:', POOL_ID);
  
  // 1. 测试pools端点获取的24h数据
  console.log('\n1. 测试 /pools/bsc 端点的24h数据:');
  try {
    const poolsResponse = await fetch(`${API_BASE}/pools/bsc?limit=1&page=1`, {
      headers: { 'Authorization': 'Bearer test-key' }
    });
    
    if (poolsResponse.ok) {
      const poolsData = await poolsResponse.json();
      const pool = poolsData.data[0];
      
      console.log('池子基本信息:', {
        id: pool.id,
        name: pool.name,
        txCount: pool.txCount,
        liquidityUsd: pool.liquidityUsd,
        volume24hUsd: pool.volume24hUsd,
        fees24hUsd: pool.fees24hUsd,
        apr: pool.apr
      });
    } else {
      console.error('❌ 获取pools数据失败:', poolsResponse.status, await poolsResponse.text());
    }
  } catch (error) {
    console.error('❌ API调用错误:', error.message);
  }
  
  // 2. 测试health端点查看subgraph状态
  console.log('\n2. 测试 /health 端点查看subgraph状态:');
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Subgraph状态:', {
        status: healthData.status,
        healthy: healthData.subgraph?.healthy,
        blockNumber: healthData.subgraph?.blockNumber,
        indexingErrors: healthData.subgraph?.indexingErrors,
        url: healthData.subgraph?.url
      });
    } else {
      console.error('❌ Health检查失败:', healthResponse.status);
    }
  } catch (error) {
    console.error('❌ Health检查错误:', error.message);
  }
  
  // 3. 检查当前时间和24小时计算
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 24 * 60 * 60;
  
  console.log('\n3. 时间戳计算验证:');
  console.log('当前时间戳:', now, '(', new Date(now * 1000).toISOString(), ')');
  console.log('24小时前:', dayAgo, '(', new Date(dayAgo * 1000).toISOString(), ')');
  
  // 我们知道swap发生在 2025-07-24T15:33:49.000Z
  const swapTime = Math.floor(new Date('2025-07-24T15:33:49.000Z').getTime() / 1000);
  console.log('已知swap时间:', swapTime, '(', new Date(swapTime * 1000).toISOString(), ')');
  console.log('Swap是否在24h内:', swapTime >= dayAgo ? '✅ 是' : '❌ 不是');
  
  // 4. 如果可能，尝试直接检查subgraph meta信息
  console.log('\n4. 测试 /subgraph/meta 端点:');
  try {
    const metaResponse = await fetch(`${API_BASE}/subgraph/meta`);
    
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      console.log('Subgraph Meta:', {
        success: metaData.success,
        blockNumber: metaData.data?.block?.number,
        deployment: metaData.data?.deployment,
        hasIndexingErrors: metaData.data?.hasIndexingErrors
      });
    } else {
      console.error('❌ Meta数据获取失败:', metaResponse.status);
    }
  } catch (error) {
    console.error('❌ Meta数据错误:', error.message);
  }
}

testPoolDayDataAPI().catch(console.error);
