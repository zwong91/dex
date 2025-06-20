import { IndustrialSyncCoordinator, DEFAULT_COORDINATOR_CONFIG } from './sync-coordinator';
import { DatabaseService } from './database-service';
import type { Env } from '../../index';

let syncCoordinator: IndustrialSyncCoordinator | null = null;

/**
 * 检查数据库健康状态
 */
async function checkDatabaseHealth(env: Env): Promise<void> {
  console.log('🔍 Checking database health...');
  
  if (!env.D1_DATABASE) {
    throw new Error('D1_DATABASE is not configured');
  }
  
  try {
    // 测试基本的数据库连接
    const result = await env.D1_DATABASE.prepare('SELECT 1 as test').first();
    console.log('✅ Database connection successful');
    
    // 检查 pools 表是否存在
    try {
      await env.D1_DATABASE.prepare('SELECT COUNT(*) FROM pools LIMIT 1').first();
      console.log('✅ Pools table exists');
    } catch (error) {
      console.error('❌ Pools table check failed:', error);
      throw new Error('Pools table not accessible. Please run database migrations.');
    }
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 初始化同步协调器
 */
async function initializeSyncCoordinator(env: Env): Promise<IndustrialSyncCoordinator> {
  if (!syncCoordinator) {
    syncCoordinator = new IndustrialSyncCoordinator(env, DEFAULT_COORDINATOR_CONFIG);
    await syncCoordinator.start();
  }
  return syncCoordinator;
}

/**
 * 获取同步协调器实例
 */
function getSyncCoordinator(): IndustrialSyncCoordinator | null {
  return syncCoordinator;
}

/**
 * 处理同步相关的API请求
 */
export async function handleSync(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    // 处理CORS预检请求
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由处理
    if (pathname === '/v1/api/admin/sync/status') {
      return await handleSyncStatus(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/start') {
      return await handleSyncStart(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/stop') {
      return await handleSyncStop(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/trigger') {
      return await handleSyncTrigger(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/health') {
      return await handleSyncHealth(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/metrics') {
      return await handleSyncMetrics(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/config') {
      return await handleSyncConfig(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/report') {
      return await handleSyncReport(request, env, corsHeaders);
    }

    if (pathname === '/v1/api/admin/sync/cron') {
      return await handleCronStatus(request, env, corsHeaders);
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Sync API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取同步状态
 * GET /v1/api/admin/sync/status
 */
async function handleSyncStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        isRunning: false,
        status: 'not_initialized',
        message: 'Sync coordinator not initialized'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const status = await coordinator.getSystemStatus();
    
    return new Response(JSON.stringify({
      success: true,
      data: status
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 启动同步服务
 * POST /v1/api/admin/sync/start
 */
async function handleSyncStart(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    console.log('Starting sync coordinator via API...');
    
    // 先检查数据库连接和表结构
    await checkDatabaseHealth(env);
    
    const coordinator = await initializeSyncCoordinator(env);
    const status = await coordinator.getSystemStatus();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Sync coordinator started successfully',
      data: status
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to start sync coordinator:', error);
    return new Response(JSON.stringify({
      error: 'Failed to start sync coordinator',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 停止同步服务
 * POST /v1/api/admin/sync/stop
 */
async function handleSyncStop(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sync coordinator was not running'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await coordinator.stop();
    syncCoordinator = null;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Sync coordinator stopped successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to stop sync coordinator:', error);
    return new Response(JSON.stringify({
      error: 'Failed to stop sync coordinator',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 手动触发同步
 * POST /v1/api/admin/sync/trigger
 */
async function handleSyncTrigger(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        error: 'Sync coordinator not running'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await coordinator.triggerFullSync();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Full sync triggered successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    return new Response(JSON.stringify({
      error: 'Failed to trigger sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取健康状态
 * GET /v1/api/admin/sync/health
 */
async function handleSyncHealth(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        status: 'unhealthy',
        message: 'Sync coordinator not running'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const status = await coordinator.getSystemStatus();
    const isHealthy = status.health?.overall === 'healthy';
    
    return new Response(JSON.stringify({
      status: status.health?.overall || 'unknown',
      isRunning: status.isRunning,
      uptime: status.uptime,
      health: status.health
    }), {
      status: isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to get health status:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取同步指标
 * GET /v1/api/admin/sync/metrics
 */
async function handleSyncMetrics(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        error: 'Sync coordinator not running'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const status = await coordinator.getSystemStatus();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        metrics: status.metrics,
        uptime: status.uptime,
        isRunning: status.isRunning
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 配置管理
 * GET/PUT /v1/api/admin/sync/config
 */
async function handleSyncConfig(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      return new Response(JSON.stringify({
        error: 'Sync coordinator not running'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (request.method === 'GET') {
      // 获取当前配置
      const report = await coordinator.getDetailedReport();
      
      return new Response(JSON.stringify({
        success: true,
        data: report.configuration
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (request.method === 'PUT') {
      // 更新配置
      const body = await request.json() as any;
      
      if (body.coordinator) {
        await coordinator.updateConfiguration(body.coordinator);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Configuration updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to handle config request:', error);
    return new Response(JSON.stringify({
      error: 'Failed to handle config request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取详细报告
 * GET /v1/api/admin/sync/report
 */
async function handleSyncReport(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const coordinator = getSyncCoordinator();
    
    if (!coordinator) {
      // 如果同步器未运行，返回基本信息
      const databaseService = new DatabaseService(env);
      const analytics = await databaseService.getPoolAnalytics();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          system: {
            isRunning: false,
            uptime: 0,
            health: null,
            metrics: {
              syncService: null,
              totalPools: analytics.totalPools,
              totalUsers: analytics.activeUsers24h,
              totalTransactions: analytics.totalTransactions24h,
              lastSyncDuration: 0,
              avgSyncDuration: 0,
              errorRate: 0,
              uptime: 0
            }
          },
          analytics,
          configuration: null
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const report = await coordinator.getDetailedReport();
    
    return new Response(JSON.stringify({
      success: true,
      data: report
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('Failed to get detailed report:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get detailed report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取 Cron 作业状态
 * GET /v1/api/admin/sync/cron
 */
async function handleCronStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const { CronHandler } = await import('./cron-handler');
    const cronHandler = new CronHandler(env);
    
    const cronStatus = await cronHandler.getCronJobStatus();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        cronJobs: {
          'sync-pools-frequent': {
            name: 'Frequent Pool Sync',
            description: 'Syncs pool data every 5 minutes',
            schedule: '*/5 * * * *',
            ...cronStatus.lastRun['frequent-sync'] && { lastRun: cronStatus.lastRun['frequent-sync'] },
            nextRun: cronStatus.nextRun['frequent-sync'],
            status: cronStatus.status['frequent-sync']
          },
          'sync-stats-hourly': {
            name: 'Hourly Stats Sync',
            description: 'Updates statistics and aggregated data every hour',
            schedule: '0 * * * *',
            ...cronStatus.lastRun['hourly-stats'] && { lastRun: cronStatus.lastRun['hourly-stats'] },
            nextRun: cronStatus.nextRun['hourly-stats'],
            status: cronStatus.status['hourly-stats']
          },
          'cleanup-old-data': {
            name: 'Weekly Data Cleanup',
            description: 'Cleans up old data and maintains database every Sunday at 2 AM',
            schedule: '0 2 * * 0',
            ...cronStatus.lastRun['weekly-cleanup'] && { lastRun: cronStatus.lastRun['weekly-cleanup'] },
            nextRun: cronStatus.nextRun['weekly-cleanup'],
            status: cronStatus.status['weekly-cleanup']
          }
        },
        serverTime: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Failed to get cron status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get cron status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 导出同步协调器实例（用于其他模块）
 */
export { getSyncCoordinator, initializeSyncCoordinator };
