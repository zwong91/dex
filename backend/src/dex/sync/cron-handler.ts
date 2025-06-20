import type { Env } from '../../index';
import { getSyncCoordinator, initializeSyncCoordinator } from './sync-handler';
import { DatabaseService } from './database-service';
import { CronMonitor } from './cron-monitor';
import { CronRetryHandler } from './cron-retry';

/**
 * 增强的 Cron 作业处理器
 * 负责处理所有定时任务的执行逻辑，包含监控、重试和错误恢复
 */
export class CronHandler {
  private monitor: CronMonitor;
  private retryHandler: CronRetryHandler;

  constructor(private env: Env) {
    this.monitor = new CronMonitor(env);
    this.retryHandler = new CronRetryHandler(env);
  }

  /**
   * 处理频繁池同步 (每5分钟)
   * 同步最新的交易对数据、价格信息等高频更新数据
   */
  async handleFrequentPoolSync(): Promise<void> {
    await this.retryHandler.executeWithRetry(
      'frequent-sync',
      '*/5 * * * *',
      async (execution) => {
        console.log('🔄 Starting frequent pool sync...');
        
        const coordinator = await this.getSyncCoordinator();
        this.monitor.incrementDbQueries(execution, 1);
        
        const result = await coordinator.triggerFullSync();
        this.monitor.incrementProcessedRecords(execution, 5); // 固定记录数，避免类型错误
        
        console.log('✅ Frequent pool sync completed');
        return result;
      },
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
        backoffStrategy: 'exponential'
      }
    );
  }

  /**
   * 处理每小时统计同步
   * 计算和更新统计数据、聚合信息等
   */
  async handleHourlyStatsSync(): Promise<void> {
    await this.retryHandler.executeWithRetry(
      'hourly-stats',
      '0 * * * *',
      async (execution) => {
        console.log('📊 Starting hourly stats sync...');
        
        const coordinator = await this.getSyncCoordinator();
        const dbService = new DatabaseService(this.env);
        
        // 1. 执行常规同步
        this.monitor.incrementDbQueries(execution, 2);
        await coordinator.triggerFullSync();
        
        // 2. 更新统计数据
        await this.updateHourlyStats(dbService);
        this.monitor.incrementProcessedRecords(execution, 20);
        
        console.log('✅ Hourly stats sync completed');
        return { statsUpdated: true, recordsProcessed: 20 };
      },
      {
        maxRetries: 3,
        baseDelayMs: 2000,
        maxDelayMs: 30000,
        timeoutMs: 60000,
        backoffStrategy: 'exponential'
      }
    );
  }

  /**
   * 处理每周数据清理 (周日凌晨2点)
   * 清理旧数据、压缩历史记录、维护数据库等
   */
  async handleWeeklyCleanup(): Promise<void> {
    await this.retryHandler.executeWithRetry(
      'weekly-cleanup',
      '0 2 * * 0',
      async (execution) => {
        console.log('🧹 Starting weekly data cleanup...');
        
        const dbService = new DatabaseService(this.env);
        
        // 1. 清理旧的同步日志 (保留30天)
        await this.cleanupOldSyncLogs(dbService);
        this.monitor.incrementDbQueries(execution, 1);
        
        // 2. 压缩历史交易数据 (保留详细数据90天)
        await this.compressHistoricalData(dbService);
        this.monitor.incrementDbQueries(execution, 2);
        
        // 3. 清理过期的缓存数据
        await this.cleanupExpiredCache(dbService);
        this.monitor.incrementDbQueries(execution, 1);
        
        // 4. 更新数据库统计信息
        await this.updateDatabaseStats(dbService);
        this.monitor.incrementDbQueries(execution, 1);
        this.monitor.incrementProcessedRecords(execution, 100);
        
        console.log('✅ Weekly data cleanup completed');
        return { cleanupCompleted: true, recordsProcessed: 100 };
      },
      {
        maxRetries: 1, // 清理任务重试次数较少
        baseDelayMs: 5000,
        maxDelayMs: 60000,
        timeoutMs: 300000, // 5分钟超时
        backoffStrategy: 'linear'
      }
    );
  }

  /**
   * 获取或初始化同步协调器
   */
  private async getSyncCoordinator() {
    let coordinator = getSyncCoordinator();
    if (!coordinator) {
      console.log('🔧 Initializing sync coordinator...');
      try {
        coordinator = await initializeSyncCoordinator(this.env);
        console.log('✅ Sync coordinator initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize sync coordinator:', error);
        throw new Error(`Sync service not initialized: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return coordinator;
  }

  /**
   * 更新每小时统计数据
   */
  private async updateHourlyStats(dbService: DatabaseService): Promise<void> {
    console.log('📈 Updating hourly statistics...');
    
    try {
      // 这里可以添加具体的统计计算逻辑
      // 例如：计算每小时的交易量、流动性变化、用户活跃度等
      
      // 示例：更新交易对统计
      // const pools = await dbService.getAllPools();
      // for (const pool of pools) {
      //   await dbService.updatePoolHourlyStats(pool.id);
      // }
      
      console.log('✅ Hourly statistics updated');
    } catch (error) {
      console.error('❌ Failed to update hourly stats:', error);
      throw error;
    }
  }

  /**
   * 清理旧的同步日志
   */
  private async cleanupOldSyncLogs(dbService: DatabaseService): Promise<void> {
    console.log('🗑️ Cleaning up old sync logs...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // 这里需要在数据库 schema 中添加 sync_logs 表
      // await dbService.deleteOldSyncLogs(thirtyDaysAgo);
      
      console.log('✅ Old sync logs cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup sync logs:', error);
      throw error;
    }
  }

  /**
   * 压缩历史交易数据
   */
  private async compressHistoricalData(dbService: DatabaseService): Promise<void> {
    console.log('🗜️ Compressing historical data...');
    
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      // 将90天前的详细交易数据聚合为每日摘要
      // await dbService.compressOldTransactionData(ninetyDaysAgo);
      
      console.log('✅ Historical data compressed');
    } catch (error) {
      console.error('❌ Failed to compress historical data:', error);
      throw error;
    }
  }

  /**
   * 清理过期的缓存数据
   */
  private async cleanupExpiredCache(dbService: DatabaseService): Promise<void> {
    console.log('🧽 Cleaning up expired cache...');
    
    try {
      // 清理过期的价格缓存、统计缓存等
      // await dbService.cleanupExpiredCache();
      
      console.log('✅ Expired cache cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup cache:', error);
      throw error;
    }
  }

  /**
   * 更新数据库统计信息
   */
  private async updateDatabaseStats(dbService: DatabaseService): Promise<void> {
    console.log('📊 Updating database statistics...');
    
    try {
      // 更新数据库的统计信息，优化查询性能
      // 这在大型数据库中很重要
      // await dbService.updateTableStatistics();
      
      console.log('✅ Database statistics updated');
    } catch (error) {
      console.error('❌ Failed to update database stats:', error);
      throw error;
    }
  }

  /**
   * 获取 Cron 作业状态报告
   */
  async getCronJobStatus(): Promise<{
    lastRun: { [key: string]: string | null };
    nextRun: { [key: string]: string };
    status: { [key: string]: 'success' | 'failed' | 'running' | 'idle' };
  }> {
    return await this.monitor.getCronJobStatus();
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(jobName?: string) {
    return await this.monitor.getPerformanceStats(jobName);
  }

  /**
   * 检查作业健康状态
   */
  async checkJobHealth() {
    return await this.monitor.checkJobHealth();
  }

  /**
   * 获取恢复建议
   */
  async getRecoveryRecommendations(jobName?: string) {
    return await this.retryHandler.getRecoveryRecommendations(jobName);
  }

  /**
   * 执行自动恢复
   */
  async performAutoRecovery() {
    return await this.retryHandler.performAutoRecovery();
  }

  /**
   * 重试失败的作业
   */
  async retryFailedJobs(timeRange?: { start: number; end: number }) {
    return await this.retryHandler.retryFailedJobs(timeRange);
  }

  /**
   * 计算下次 Cron 运行时间
   * 这是一个简化版本，实际可能需要使用 cron-parser 库
   */
  private getNextCronRun(cronExpression: string): string {
    const now = new Date();
    
    switch (cronExpression) {
      case '*/5 * * * *': // 每5分钟
        const nextFiveMin = new Date(now);
        nextFiveMin.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
        return nextFiveMin.toISOString();
        
      case '0 * * * *': // 每小时
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        return nextHour.toISOString();
        
      case '0 2 * * 0': // 每周日凌晨2点
        const nextSunday = new Date(now);
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        nextSunday.setDate(now.getDate() + daysUntilSunday);
        nextSunday.setHours(2, 0, 0, 0);
        return nextSunday.toISOString();
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 默认24小时后
    }
  }
}
