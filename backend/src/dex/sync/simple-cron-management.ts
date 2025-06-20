import type { Env } from '../../index';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';

/**
 * 简化的 Cron 管理 API 处理器
 * 直接使用数据库操作，不依赖复杂的同步协调器
 */
export async function handleSimpleCronManagement(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const jobName = url.searchParams.get('job');

    console.log(`🔧 Simple cron management request: ${action}`);

    switch (action) {
      case 'status':
        return await getSimpleCronStatus(env, corsHeaders);
      
      case 'health':
        return await getSimpleCronHealth(env, corsHeaders);
      
      case 'trigger':
        return await triggerSimpleJob(env, jobName, corsHeaders);
      
      case 'dashboard':
        return await getSimpleCronDashboard(env, corsHeaders);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['status', 'health', 'trigger', 'dashboard']
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

  } catch (error) {
    console.error('❌ Simple cron management error:', error);
    return new Response(JSON.stringify({
      error: 'Simple cron management failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取简单的 Cron 作业状态
 */
async function getSimpleCronStatus(
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = drizzle(env.D1_DATABASE!, { schema });
  
  // 检查数据库连接
  const dbTest = await env.D1_DATABASE!.prepare('SELECT 1 as test').first();
  
  // 检查同步状态表
  const syncStatus = await db.select().from(schema.syncStatus).limit(5);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Simple cron status retrieved successfully',
    data: {
      cronJobs: {
        'frequent-sync': { status: 'ready', lastRun: null },
        'hourly-stats': { status: 'ready', lastRun: null },
        'weekly-cleanup': { status: 'ready', lastRun: null }
      },
      database: {
        connected: !!dbTest,
        syncRecords: syncStatus.length
      },
      serverTime: new Date().toISOString(),
      mode: 'simplified'
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 获取简单的健康状态
 */
async function getSimpleCronHealth(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // 测试数据库连接
    const dbTest = await env.D1_DATABASE!.prepare('SELECT 1 as test').first();
    
    // 测试表访问
    const tableTest = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM pools').first();
    
    return new Response(JSON.stringify({
      success: true,
      health: 'healthy',
      checks: {
        database: !!dbTest ? 'healthy' : 'unhealthy',
        tables: !!tableTest ? 'healthy' : 'unhealthy'
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      health: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 手动触发简单作业
 */
async function triggerSimpleJob(
  env: Env,
  jobName: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!jobName) {
    return new Response(JSON.stringify({ 
      error: 'Job name is required for trigger action' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const db = drizzle(env.D1_DATABASE!, { schema });
    let result;

    switch (jobName) {
      case 'frequent-sync':
        result = await performFrequentSync(env, db);
        break;
      case 'hourly-stats':
        result = await performHourlyStats(env, db);
        break;
      case 'weekly-cleanup':
        result = await performWeeklyCleanup(env, db);
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${jobName} triggered successfully`,
      data: { 
        jobName, 
        triggerTime: new Date().toISOString(),
        result 
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error(`❌ Job trigger failed for ${jobName}:`, error);
    return new Response(JSON.stringify({
      error: 'Job trigger failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      jobName
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取简单的仪表板数据
 */
async function getSimpleCronDashboard(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = drizzle(env.D1_DATABASE!, { schema });
  
  try {
    // 获取基本统计
    const poolCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM pools').first();
    const tokenCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM tokens').first();
    const syncCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM sync_status').first();
    
    return new Response(JSON.stringify({
      success: true,
      dashboard: {
        summary: {
          totalPools: poolCount?.count || 0,
          totalTokens: tokenCount?.count || 0,
          syncRecords: syncCount?.count || 0
        },
        jobs: {
          'frequent-sync': { 
            name: 'Frequent Pool Sync', 
            status: 'ready',
            schedule: '*/5 * * * *',
            description: 'Syncs pool data every 5 minutes'
          },
          'hourly-stats': { 
            name: 'Hourly Statistics', 
            status: 'ready',
            schedule: '0 * * * *',
            description: 'Updates hourly statistics'
          },
          'weekly-cleanup': { 
            name: 'Weekly Cleanup', 
            status: 'ready',
            schedule: '0 2 * * 0',
            description: 'Cleans up old data weekly'
          }
        },
        lastUpdate: new Date().toISOString(),
        mode: 'simplified'
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Dashboard data retrieval failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 执行频繁同步
 */
async function performFrequentSync(env: Env, db: any): Promise<any> {
  console.log('🔄 Performing frequent sync...');
  
  // 简单的模拟同步操作
  const currentCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM pools').first();
  
  // 记录同步状态（使用正确的字段）
  await db.insert(schema.syncStatus).values({
    chain: 'bsctest',
    contractAddress: '0x0000000000000000000000000000000000000000',
    eventType: 'frequent_sync',
    lastBlockNumber: 120000 + Math.floor(Math.random() * 1000),
    lastLogIndex: 0,
  });
  
  return {
    operation: 'frequent-sync',
    poolsFound: currentCount?.count || 0,
    recordsProcessed: 1,
    status: 'completed'
  };
}

/**
 * 执行每小时统计
 */
async function performHourlyStats(env: Env, db: any): Promise<any> {
  console.log('📊 Performing hourly stats...');
  
  // 简单的统计计算
  const poolCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM pools').first();
  const tokenCount = await env.D1_DATABASE!.prepare('SELECT COUNT(*) as count FROM tokens').first();
  
  // 记录同步状态（使用正确的字段）
  await db.insert(schema.syncStatus).values({
    chain: 'bsctest',
    contractAddress: '0x0000000000000000000000000000000000000000',
    eventType: 'hourly_stats',
    lastBlockNumber: 120000 + Math.floor(Math.random() * 1000),
    lastLogIndex: 0,
  });
  
  return {
    operation: 'hourly-stats',
    poolCount: poolCount?.count || 0,
    tokenCount: tokenCount?.count || 0,
    status: 'completed'
  };
}

/**
 * 执行每周清理
 */
async function performWeeklyCleanup(env: Env, db: any): Promise<any> {
  console.log('🧹 Performing weekly cleanup...');
  
  // 清理30天前的同步日志（使用正确的字段名）
  const cutoffTimestamp = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  
  const cleanupResult = await env.D1_DATABASE!.prepare(
    'DELETE FROM sync_status WHERE updated_at < ?'
  ).bind(cutoffTimestamp).run();
  
  return {
    operation: 'weekly-cleanup',
    recordsDeleted: cleanupResult.meta?.changes || 0,
    cutoffTimestamp,
    status: 'completed'
  };
}
