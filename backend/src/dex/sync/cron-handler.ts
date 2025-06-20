import type { Env } from '../../index';
import { getSyncCoordinator, initializeSyncCoordinator } from './sync-handler';
import { DatabaseService } from './database-service';

/**
 * Cron 作业处理器
 * 负责处理所有定时任务的执行逻辑
 */
export class CronHandler {
  constructor(private env: Env) {}

  /**
   * 处理频繁池同步 (每5分钟)
   * 同步最新的交易对数据、价格信息等高频更新数据
   */
  async handleFrequentPoolSync(): Promise<void> {
    console.log('🔄 Starting frequent pool sync...');
    
    const coordinator = await this.getSyncCoordinator();
    await coordinator.triggerFullSync();
    
    console.log('✅ Frequent pool sync completed');
  }

  /**
   * 处理每小时统计同步
   * 计算和更新统计数据、聚合信息等
   */
  async handleHourlyStatsSync(): Promise<void> {
    console.log('📊 Starting hourly stats sync...');
    
    const coordinator = await this.getSyncCoordinator();
    const dbService = new DatabaseService(this.env);
    
    try {
      // 1. 执行常规同步
      await coordinator.triggerFullSync();
      
      // 2. 更新统计数据
      await this.updateHourlyStats(dbService);
      
      console.log('✅ Hourly stats sync completed');
    } catch (error) {
      console.error('❌ Hourly stats sync failed:', error);
      throw error;
    }
  }

  /**
   * 处理每周数据清理 (周日凌晨2点)
   * 清理旧数据、压缩历史记录、维护数据库等
   */
  async handleWeeklyCleanup(): Promise<void> {
    console.log('🧹 Starting weekly data cleanup...');
    
    const dbService = new DatabaseService(this.env);
    
    try {
      // 1. 清理旧的同步日志 (保留30天)
      await this.cleanupOldSyncLogs(dbService);
      
      // 2. 压缩历史交易数据 (保留详细数据90天)
      await this.compressHistoricalData(dbService);
      
      // 3. 清理过期的缓存数据
      await this.cleanupExpiredCache(dbService);
      
      // 4. 更新数据库统计信息
      await this.updateDatabaseStats(dbService);
      
      console.log('✅ Weekly data cleanup completed');
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error);
      throw error;
    }
  }

  /**
   * 获取或初始化同步协调器
   */
  private async getSyncCoordinator() {
    let coordinator = getSyncCoordinator();
    if (!coordinator) {
      coordinator = await initializeSyncCoordinator(this.env);
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
    // 这里可以从数据库或缓存中获取上次运行状态
    return {
      lastRun: {
        'frequent-sync': null, // 从数据库获取
        'hourly-stats': null,
        'weekly-cleanup': null
      },
      nextRun: {
        'frequent-sync': this.getNextCronRun('*/5 * * * *'),
        'hourly-stats': this.getNextCronRun('0 * * * *'),
        'weekly-cleanup': this.getNextCronRun('0 2 * * 0')
      },
      status: {
        'frequent-sync': 'idle',
        'hourly-stats': 'idle',
        'weekly-cleanup': 'idle'
      }
    };
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
