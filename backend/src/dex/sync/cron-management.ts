import type { Env } from '../../index';
import { CronHandler } from './cron-handler';
import { CronMonitor } from './cron-monitor';
import { CronRetryHandler } from './cron-retry';

/**
 * Cron 管理 API 处理器
 * 提供完整的 Cron 作业管理、监控和诊断功能
 */
export async function handleCronManagement(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const jobName = url.searchParams.get('job');

    console.log(`🔧 Cron management request: ${action}`);

    const cronHandler = new CronHandler(env);
    const cronMonitor = new CronMonitor(env);
    const retryHandler = new CronRetryHandler(env);

    switch (action) {
      case 'status':
        return await getCronStatus(cronHandler, corsHeaders);
      
      case 'health':
        return await getCronHealth(cronHandler, corsHeaders);
      
      case 'stats':
        return await getCronStats(cronHandler, jobName, corsHeaders);
      
      case 'history':
        return await getCronHistory(cronMonitor, jobName, corsHeaders);
      
      case 'recommendations':
        return await getRecoveryRecommendations(cronHandler, jobName, corsHeaders);
      
      case 'retry':
        return await retryFailedJobs(cronHandler, corsHeaders, url);
      
      case 'auto-recover':
        return await performAutoRecovery(cronHandler, corsHeaders);
      
      case 'trigger':
        return await triggerJob(cronHandler, jobName, corsHeaders);
      
      case 'dashboard':
        return await getCronDashboard(cronHandler, cronMonitor, corsHeaders);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: [
            'status', 'health', 'stats', 'history', 
            'recommendations', 'retry', 'auto-recover', 
            'trigger', 'dashboard'
          ]
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

  } catch (error) {
    console.error('❌ Cron management error:', error);
    return new Response(JSON.stringify({
      error: 'Cron management failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * 获取 Cron 作业状态
 */
async function getCronStatus(
  cronHandler: CronHandler, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const status = await cronHandler.getCronJobStatus();
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Cron status retrieved successfully',
    data: {
      cronJobs: status,
      serverTime: new Date().toISOString(),
      summary: {
        totalJobs: Object.keys(status.status).length,
        activeJobs: Object.values(status.status).filter(s => s === 'running').length,
        idleJobs: Object.values(status.status).filter(s => s === 'idle').length,
        failedJobs: Object.values(status.status).filter(s => s === 'failed').length
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 获取 Cron 作业健康状态
 */
async function getCronHealth(
  cronHandler: CronHandler, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const health = await cronHandler.checkJobHealth();
  
  const overallHealth = health.every(h => h.status === 'healthy') ? 'healthy' :
                       health.some(h => h.status === 'critical') ? 'critical' : 'warning';
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Cron health check completed',
    data: {
      overallHealth,
      jobs: health,
      summary: {
        healthy: health.filter(h => h.status === 'healthy').length,
        warning: health.filter(h => h.status === 'warning').length,
        critical: health.filter(h => h.status === 'critical').length,
        error: health.filter(h => h.status === 'error').length
      },
      alerts: health.flatMap(h => h.alerts).slice(0, 10) // 最多显示10个警报
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 获取 Cron 作业统计
 */
async function getCronStats(
  cronHandler: CronHandler, 
  jobName: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const stats = await cronHandler.getPerformanceStats(jobName || undefined);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Cron statistics retrieved successfully',
    data: {
      jobName: jobName || 'all',
      stats,
      insights: {
        performance: stats.averageDuration < 5000 ? 'good' : 
                    stats.averageDuration < 15000 ? 'fair' : 'poor',
        reliability: stats.successRate > 95 ? 'excellent' :
                    stats.successRate > 90 ? 'good' : 'poor',
        trend: stats.trends.averageDuration24h < stats.averageDuration ? 'improving' : 'stable'
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 获取 Cron 作业历史
 */
async function getCronHistory(
  cronMonitor: CronMonitor, 
  jobName: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const history = await cronMonitor.getJobHistory(jobName || undefined, 20);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Cron history retrieved successfully',
    data: {
      jobName: jobName || 'all',
      history,
      summary: {
        totalExecutions: history.length,
        successfulExecutions: history.filter(h => h.status === 'success').length,
        failedExecutions: history.filter(h => h.status === 'failed').length,
        averageDuration: history.reduce((sum, h) => sum + h.duration, 0) / history.length || 0
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 获取恢复建议
 */
async function getRecoveryRecommendations(
  cronHandler: CronHandler, 
  jobName: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const recommendations = await cronHandler.getRecoveryRecommendations(jobName || undefined);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Recovery recommendations retrieved successfully',
    data: {
      jobName: jobName || 'all',
      recommendations,
      summary: {
        totalJobs: recommendations.length,
        autoRecoverable: recommendations.filter(r => r.canAutoRecover).length,
        highPriority: recommendations.filter(r => r.priority > 5).length
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 重试失败的作业
 */
async function retryFailedJobs(
  cronHandler: CronHandler, 
  corsHeaders: Record<string, string>,
  url: URL
): Promise<Response> {
  const startTime = url.searchParams.get('start');
  const endTime = url.searchParams.get('end');
  
  const timeRange = startTime && endTime ? {
    start: parseInt(startTime),
    end: parseInt(endTime)
  } : undefined;
  
  const results = await cronHandler.retryFailedJobs(timeRange);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Failed jobs retry completed',
    data: {
      timeRange,
      results,
      summary: {
        totalRetried: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 执行自动恢复
 */
async function performAutoRecovery(
  cronHandler: CronHandler, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const result = await cronHandler.performAutoRecovery();
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Auto recovery completed',
    data: result
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

/**
 * 手动触发作业
 */
async function triggerJob(
  cronHandler: CronHandler, 
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
    let result;
    switch (jobName) {
      case 'frequent-sync':
        await cronHandler.handleFrequentPoolSync();
        result = 'Frequent sync triggered successfully';
        break;
      case 'hourly-stats':
        await cronHandler.handleHourlyStatsSync();
        result = 'Hourly stats sync triggered successfully';
        break;
      case 'weekly-cleanup':
        await cronHandler.handleWeeklyCleanup();
        result = 'Weekly cleanup triggered successfully';
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: result,
      data: { jobName, triggerTime: new Date().toISOString() }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
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
 * 获取综合仪表板数据
 */
async function getCronDashboard(
  cronHandler: CronHandler, 
  cronMonitor: CronMonitor,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const [status, health, stats] = await Promise.all([
    cronHandler.getCronJobStatus(),
    cronHandler.checkJobHealth(),
    cronHandler.getPerformanceStats()
  ]);

  const dashboard = {
    overview: {
      totalJobs: Object.keys(status.status).length,
      healthyJobs: health.filter(h => h.status === 'healthy').length,
      failedJobs: health.filter(h => h.status === 'critical' || h.status === 'error').length,
      overallSuccessRate: stats.successRate,
      averageExecutionTime: stats.averageDuration
    },
    jobStatus: status,
    healthCheck: health,
    performanceStats: stats,
    alerts: health.flatMap(h => h.alerts.map(alert => ({
      jobName: h.jobName,
      alert,
      severity: h.status
    }))).slice(0, 5),
    recommendations: health.filter(h => h.status !== 'healthy').map(h => ({
      jobName: h.jobName,
      issue: h.status,
      suggestion: h.status === 'critical' ? 'Immediate attention required' : 
                 h.status === 'warning' ? 'Monitor closely' : 'Review configuration'
    })),
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify({
    success: true,
    message: 'Cron dashboard data retrieved successfully',
    data: dashboard
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
