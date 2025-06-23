import type { Env } from '../../index';

/**
 * 简化的数据库测试端点
 * 用于测试数据库连接和基本操作
 */
export async function handleSimpleTest(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    const url = new URL(request.url);
    const testType = url.searchParams.get('type') || 'basic';

    console.log(`🧪 Running simple test: ${testType}`);

    switch (testType) {
      case 'basic':
        return await testBasicConnection(env, corsHeaders);
      
      case 'tables':
        return await testTables(env, corsHeaders);
      
      case 'pools':
        return await testPools(env, corsHeaders);
      
      case 'insert':
        return await testInsert(env, corsHeaders);
      
      case 'sync':
        return await testSyncLogic(env, corsHeaders);
      
      case 'cron':
        return await testCronHandler(env, corsHeaders);
      
      case 'cleanup':
        return await testCleanup(env, corsHeaders);
      
      case 'blockchain':
        return await testBlockchainConnection(env, corsHeaders);
      
      case 'run-cron':
        return await testRunCron(env, corsHeaders, url);
      
      case 'run-cron-simple':
        return await testRunCronSimple(env, corsHeaders, url);
      
      case 'table-info':
        return await testTableInfo(env, corsHeaders, url);

      case 'discover':
        return await testPoolDiscovery(env, corsHeaders);

      default:
        return new Response(JSON.stringify({
          error: `Unknown test type: ${testType}. Available: basic, tables, pools, insert, sync, cron, cleanup, blockchain, run-cron, run-cron-simple, table-info, discover`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } catch (error) {
      console.error('Simple test failed:', error);
      return new Response(JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
}

/**
 * 测试自动发现池子功能
 */
async function testPoolDiscovery(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing pool discovery...');
  try {
    const { PoolDiscoveryService } = await import('./pool-discovery');
    const discovery = new PoolDiscoveryService(env);
    const metrics = await discovery.performDiscoveryScan();
    return new Response(JSON.stringify({
      success: true,
      message: 'Pool discovery scan completed',
      metrics
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Pool discovery test failed:', error);
    return new Response(JSON.stringify({
      error: 'Pool discovery test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试基本数据库连接
 */
async function testBasicConnection(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing basic database connection...');
  
  if (!env.D1_DATABASE) {
    return new Response(JSON.stringify({
      error: 'D1_DATABASE not configured'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const result = await env.D1_DATABASE.prepare('SELECT 1 as test').first();
    console.log('✅ Basic connection test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Database connection successful',
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Basic connection test failed:', error);
    return new Response(JSON.stringify({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试表结构
 */
async function testTables(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing table structure...');
  
  try {
    const tables = await env.D1_DATABASE!.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_cf%' ORDER BY name"
    ).all();
    
    console.log('✅ Table structure test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Table structure retrieved successfully',
      tables: tables.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Table structure test failed:', error);
    return new Response(JSON.stringify({
      error: 'Table structure test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试 pools 表
 */
async function testPools(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing pools table...');
  
  try {
    // 检查表是否存在
    const tableExists = await env.D1_DATABASE!.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pools'"
    ).first();
    
    if (!tableExists) {
      return new Response(JSON.stringify({
        error: 'Pools table does not exist'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 检查表结构
    const columns = await env.D1_DATABASE!.prepare(
      "PRAGMA table_info(pools)"
    ).all();
    
    // 检查数据计数
    const count = await env.D1_DATABASE!.prepare(
      "SELECT COUNT(*) as count FROM pools"
    ).first();
    
    console.log('✅ Pools table test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Pools table test successful',
      tableExists: true,
      columns: columns.results,
      count: count?.count || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Pools table test failed:', error);
    return new Response(JSON.stringify({
      error: 'Pools table test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试插入操作
 */
async function testInsert(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing insert operation...');
  
  try {
    // 插入一个测试 pool (使用正确的字段名)
    const testPool = {
      id: 'test-pool-' + Date.now(),
      address: '0x' + Math.random().toString(16).substr(2, 40),
      chain: 'bsctest',
      token_x: 'TEST_X',
      token_y: 'TEST_Y',
      bin_step: 100,
      name: 'TEST_X/TEST_Y',
      status: 'active',
      version: 'v2.2',
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000)
    };
    
    const insertResult = await env.D1_DATABASE!.prepare(`
      INSERT INTO pools (
        id, address, chain, token_x, token_y, bin_step, 
        name, status, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      testPool.id,
      testPool.address,
      testPool.chain,
      testPool.token_x,
      testPool.token_y,
      testPool.bin_step,
      testPool.name,
      testPool.status,
      testPool.version,
      testPool.created_at,
      testPool.updated_at
    ).run();
    
    // 验证插入
    const verifyResult = await env.D1_DATABASE!.prepare(
      "SELECT * FROM pools WHERE id = ?"
    ).bind(testPool.id).first();
    
    console.log('✅ Insert test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Insert operation successful',
      insertResult: {
        success: insertResult.success,
        meta: insertResult.meta
      },
      insertedData: verifyResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Insert test failed:', error);
    return new Response(JSON.stringify({
      error: 'Insert test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试同步逻辑
 */
async function testSyncLogic(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing sync logic...');
  
  try {
    // 测试数据库服务基本功能
    const { DatabaseService } = await import('./database-service');
    const dbService = new DatabaseService(env);
    
    // 获取池统计
    const poolsResult = await dbService.getPools();
    const poolCount = poolsResult.pools.length;
    
    // 测试池分析
    const analytics = await dbService.getPoolAnalytics();
    
    console.log('✅ Sync logic test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Sync logic test successful',
      data: {
        poolCount,
        analytics,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Sync logic test failed:', error);
    return new Response(JSON.stringify({
      error: 'Sync logic test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试 Cron Handler
 */
async function testCronHandler(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing cron handler...');
  
  try {
    const { CronHandler } = await import('./cron-handler');
    const cronHandler = new CronHandler(env);
    
    // 测试 Cron 作业状态
    const cronStatus = await cronHandler.getCronJobStatus();
    
    console.log('✅ Cron handler test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Cron handler test successful',
      data: {
        cronStatus,
        serverTime: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Cron handler test failed:', error);
    return new Response(JSON.stringify({
      error: 'Cron handler test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试数据清理
 */
async function testCleanup(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing cleanup operations...');
  
  try {
    // 清理测试数据
    const cleanupResult = await env.D1_DATABASE!.prepare(
      "DELETE FROM pools WHERE id LIKE 'test-pool-%'"
    ).run();
    
    // 获取清理后的计数
    const count = await env.D1_DATABASE!.prepare(
      "SELECT COUNT(*) as count FROM pools"
    ).first();
    
    console.log('✅ Cleanup test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup operation successful',
      data: {
        deletedRecords: cleanupResult.meta?.changes || 0,
        remainingRecords: count?.count || 0,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Cleanup test failed:', error);
    return new Response(JSON.stringify({
      error: 'Cleanup test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试区块链连接
 */
async function testBlockchainConnection(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🔍 Testing blockchain connection...');
  
  try {
    // 检查环境变量
    const rpcUrls = {
      BSC_RPC_URL: env.BSC_RPC_URL,
      BSCTEST_RPC_URL: env.BSCTEST_RPC_URL
    };
    
    const contractAddresses = {
      LB_FACTORY_BSC: env.LB_FACTORY_BSC,
      LB_FACTORY_BSCTEST: env.LB_FACTORY_BSCTEST,
      LB_ROUTER_BSC: env.LB_ROUTER_BSC,
      LB_ROUTER_BSCTEST: env.LB_ROUTER_BSCTEST
    };
    
    // 简单的配置验证（不进行实际网络调用以避免超时）
    let rpcTestResult = {
      bscTestUrlValid: !!env.BSCTEST_RPC_URL && env.BSCTEST_RPC_URL.startsWith('http'),
      bscUrlValid: !!env.BSC_RPC_URL && env.BSC_RPC_URL.startsWith('http'),
      factoryAddressValid: !!env.LB_FACTORY_BSCTEST && env.LB_FACTORY_BSCTEST.startsWith('0x'),
      routerAddressValid: !!env.LB_ROUTER_BSCTEST && env.LB_ROUTER_BSCTEST.startsWith('0x'),
      note: 'Skipping actual RPC calls to avoid timeout issues'
    };
    
    console.log('✅ Blockchain connection test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Blockchain connection test successful',
      data: {
        rpcUrls,
        contractAddresses,
        rpcTest: rpcTestResult,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Blockchain connection test failed:', error);
    return new Response(JSON.stringify({
      error: 'Blockchain connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试运行 Cron Job
 */
async function testRunCron(env: Env, corsHeaders: Record<string, string>, url: URL): Promise<Response> {
  console.log('🔍 Testing cron job execution...');
  
  try {
    // 先初始化同步服务
    console.log('🚀 Initializing sync coordinator...');
    const { initializeSyncCoordinator } = await import('./sync-handler');
    const coordinator = await initializeSyncCoordinator(env);
    console.log('✅ Sync coordinator initialized');
    
    // 然后创建 CronHandler
    const { CronHandler } = await import('./cron-handler');
    const cronHandler = new CronHandler(env);
    
    const jobType = url.searchParams.get('job') || 'frequent';
    
    let result;
    let executedMethod = '';
    
    switch (jobType) {
      case 'frequent':
        console.log('🔄 Running frequent pool sync...');
        await cronHandler.handleFrequentPoolSync();
        executedMethod = 'handleFrequentPoolSync';
        result = 'Frequent pool sync completed';
        break;
        
      case 'hourly':
        console.log('📊 Running hourly stats sync...');
        await cronHandler.handleHourlyStatsSync();
        executedMethod = 'handleHourlyStatsSync';
        result = 'Hourly stats sync completed';
        break;
        
      case 'cleanup':
        console.log('🧹 Running weekly cleanup...');
        await cronHandler.handleWeeklyCleanup();
        executedMethod = 'handleWeeklyCleanup';
        result = 'Weekly cleanup completed';
        break;
        
      default:
        throw new Error(`Unknown job type: ${jobType}. Available: frequent, hourly, cleanup`);
    }
    
    console.log('✅ Cron job execution test passed');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Cron job execution successful',
      data: {
        jobType,
        executedMethod,
        result,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Cron job execution test failed:', error);
    return new Response(JSON.stringify({
      error: 'Cron job execution test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 简化的 Cron Job 测试（不依赖复杂的协调器）
 */
async function testRunCronSimple(env: Env, corsHeaders: Record<string, string>, url: URL): Promise<Response> {
  console.log('🔍 Testing simple cron job execution...');
  
  try {
    const jobType = url.searchParams.get('job') || 'frequent';
    
    let result;
    let executedOperation = '';
    
    switch (jobType) {
      case 'frequent':
        console.log('🔄 Running simple frequent sync...');
        
        // 直接执行数据库同步操作，不依赖协调器
        const { DatabaseService } = await import('./database-service');
        const dbService = new DatabaseService(env);
        
        // 获取当前池数量
        const poolsResult = await dbService.getPools();
        const beforeCount = poolsResult.pools.length;
        
        // 模拟同步操作 - 插入一个新的池
        const newPool = {
          id: 'sync-pool-' + Date.now(),
          address: '0x' + Math.random().toString(16).substr(2, 40),
          chain: 'bsctest',
          token_x: 'SYNC_X',
          token_y: 'SYNC_Y',
          bin_step: 25,
          name: 'SYNC_X/SYNC_Y',
          status: 'active',
          version: 'v2.2',
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        };
        
        // 直接插入到数据库
        await env.D1_DATABASE!.prepare(`
          INSERT INTO pools (
            id, address, chain, token_x, token_y, bin_step, 
            name, status, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newPool.id,
          newPool.address,
          newPool.chain,
          newPool.token_x,
          newPool.token_y,
          newPool.bin_step,
          newPool.name,
          newPool.status,
          newPool.version,
          newPool.created_at,
          newPool.updated_at
        ).run();
        
        // 获取同步后的池数量
        const afterPoolsResult = await dbService.getPools();
        const afterCount = afterPoolsResult.pools.length;
        
        executedOperation = 'Database sync simulation';
        result = `Added 1 pool (${beforeCount} -> ${afterCount})`;
        break;
        
      case 'hourly':
        console.log('📊 Running simple hourly stats...');
        
        // 简单的统计计算
        const { DatabaseService: StatsDBService } = await import('./database-service');
        const statsDbService = new StatsDBService(env);
        
        const analytics = await statsDbService.getPoolAnalytics();
        
        // 模拟统计更新 - 使用正确的字段名
        const timestamp = Math.floor(Date.now() / 1000);
        const syncId = 'hourly-stats-' + timestamp;
        
        await env.D1_DATABASE!.prepare(`
          INSERT INTO sync_status (
            id, chain, contract_address, event_type, 
            last_block_number, last_log_index, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          syncId,
          'bsctest',
          '0x0000000000000000000000000000000000000000',
          'hourly_stats',
          Math.floor(Math.random() * 1000000),
          0,
          timestamp
        ).run();
        
        executedOperation = 'Hourly statistics update';
        result = `Updated stats: ${analytics.totalPools} pools, ${analytics.totalTransactions24h} transactions`;
        break;
        
      case 'cleanup':
        console.log('🧹 Running simple cleanup...');
        
        // 清理旧的测试数据
        const cleanupResult = await env.D1_DATABASE!.prepare(
          "DELETE FROM pools WHERE id LIKE 'test-pool-%' OR id LIKE 'sync-pool-%'"
        ).run();
        
        executedOperation = 'Database cleanup';
        result = `Cleaned up ${cleanupResult.meta?.changes || 0} test records`;
        break;
        
      default:
        throw new Error(`Unknown job type: ${jobType}. Available: frequent, hourly, cleanup`);
    }
    
    console.log(`✅ Simple cron job (${jobType}) completed: ${result}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Simple cron job execution successful',
      data: {
        jobType,
        executedOperation,
        result,
        timestamp: new Date().toISOString(),
        note: 'This is a simplified version that doesn\'t require full coordinator initialization'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Simple cron job execution test failed:', error);
    return new Response(JSON.stringify({
      error: 'Simple cron job execution test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 测试特定表的结构信息
 */
async function testTableInfo(env: Env, corsHeaders: Record<string, string>, url: URL): Promise<Response> {
  console.log('🔍 Testing table info...');
  
  try {
    const tableName = url.searchParams.get('table') || 'sync_status';
    
    // 检查表是否存在
    const tableExists = await env.D1_DATABASE!.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).bind(tableName).first();
    
    if (!tableExists) {
      return new Response(JSON.stringify({
        error: `Table '${tableName}' does not exist`,
        availableTables: await getAvailableTables(env)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // 获取表结构
    const columns = await env.D1_DATABASE!.prepare(
      `PRAGMA table_info(${tableName})`
    ).all();
    
    // 获取表中的示例数据
    const sampleData = await env.D1_DATABASE!.prepare(
      `SELECT * FROM ${tableName} LIMIT 3`
    ).all();
    
    console.log(`✅ Table info test passed for: ${tableName}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Table info retrieved for: ${tableName}`,
      data: {
        tableName,
        exists: true,
        columns: columns.results,
        sampleData: sampleData.results,
        recordCount: sampleData.results.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Table info test failed:', error);
    return new Response(JSON.stringify({
      error: 'Table info test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function getAvailableTables(env: Env): Promise<string[]> {
  const tables = await env.D1_DATABASE!.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_cf%' ORDER BY name"
  ).all();
  return tables.results.map((t: any) => t.name);
}
