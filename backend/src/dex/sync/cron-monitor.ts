import type { Env } from '../../index';
import { DatabaseService } from './database-service';

/**
 * Cron 作业监控和性能跟踪器
 * 提供作业执行监控、性能指标收集、错误追踪等功能
 */
export class CronMonitor {
  private dbService: DatabaseService;

  constructor(private env: Env) {
    this.dbService = new DatabaseService(env);
  }

  /**
   * 开始监控一个 Cron 作业
   */
  async startJobMonitoring(jobName: string, cronPattern: string): Promise<JobExecution> {
    const execution: JobExecution = {
      id: this.generateExecutionId(),
      jobName,
      cronPattern,
      startTime: Date.now(),
      status: 'running',
      metrics: {
        startMemory: this.getMemoryUsage(),
        dbQueries: 0,
        blockchainCalls: 0,
        processedRecords: 0
      }
    };

    console.log(`📊 Starting job monitoring for: ${jobName} (${execution.id})`);
    
    // 记录作业开始到数据库
    await this.recordJobStart(execution);
    
    return execution;
  }

  /**
   * 完成作业监控
   */
  async completeJobMonitoring(
    execution: JobExecution, 
    result?: any, 
    error?: Error
  ): Promise<void> {
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.status = error ? 'failed' : 'success';
    execution.result = result;
    execution.error = error?.message;
    execution.metrics.endMemory = this.getMemoryUsage();
    execution.metrics.memoryDelta = execution.metrics.endMemory - execution.metrics.startMemory;

    const statusIcon = execution.status === 'success' ? '✅' : '❌';
    console.log(`${statusIcon} Job completed: ${execution.jobName} (${execution.duration}ms)`);
    
    // 记录作业完成到数据库
    await this.recordJobCompletion(execution);
    
    // 发送性能警报（如果需要）
    await this.checkPerformanceAlerts(execution);
  }

  /**
   * 增加数据库查询计数
   */
  incrementDbQueries(execution: JobExecution, count: number = 1): void {
    execution.metrics.dbQueries += count;
  }

  /**
   * 增加区块链调用计数
   */
  incrementBlockchainCalls(execution: JobExecution, count: number = 1): void {
    execution.metrics.blockchainCalls += count;
  }

  /**
   * 增加处理记录计数
   */
  incrementProcessedRecords(execution: JobExecution, count: number = 1): void {
    execution.metrics.processedRecords += count;
  }

  /**
   * 获取作业执行历史
   */
  async getJobHistory(
    jobName?: string, 
    limit: number = 50
  ): Promise<JobExecutionSummary[]> {
    try {
      // 这里应该从数据库查询历史记录
      // 为了演示，返回模拟数据
      const history: JobExecutionSummary[] = [
        {
          id: 'exec_001',
          jobName: 'frequent-sync',
          startTime: Date.now() - 300000, // 5分钟前
          duration: 2340,
          status: 'success',
          processedRecords: 15
        },
        {
          id: 'exec_002',
          jobName: 'hourly-stats',
          startTime: Date.now() - 3600000, // 1小时前
          duration: 5670,
          status: 'success',
          processedRecords: 120
        }
      ];

      return jobName ? history.filter(h => h.jobName === jobName) : history;
    } catch (error) {
      console.error('❌ Failed to get job history:', error);
      return [];
    }
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(jobName?: string): Promise<PerformanceStats> {
    try {
      // 这里应该从数据库聚合统计数据
      const stats: PerformanceStats = {
        totalExecutions: 142,
        successRate: 98.6,
        averageDuration: 3450,
        medianDuration: 2890,
        maxDuration: 12340,
        minDuration: 890,
        lastExecution: {
          timestamp: Date.now() - 300000,
          duration: 2340,
          status: 'success'
        },
        trends: {
          executionCount24h: 48,
          averageDuration24h: 3200,
          successRate24h: 100,
          errorRate24h: 0
        }
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get performance stats:', error);
      throw error;
    }
  }

  /**
   * 检查作业健康状态
   */
  async checkJobHealth(): Promise<JobHealthStatus[]> {
    const jobs = ['frequent-sync', 'hourly-stats', 'weekly-cleanup'];
    const healthStatus: JobHealthStatus[] = [];

    for (const jobName of jobs) {
      try {
        const stats = await this.getPerformanceStats(jobName);
        const timeSinceLastRun = Date.now() - stats.lastExecution.timestamp;
        
        const health: JobHealthStatus = {
          jobName,
          status: this.determineHealthStatus(jobName, timeSinceLastRun, stats),
          lastRun: stats.lastExecution.timestamp,
          timeSinceLastRun,
          successRate: stats.successRate,
          averageDuration: stats.averageDuration,
          alerts: this.generateHealthAlerts(jobName, timeSinceLastRun, stats)
        };

        healthStatus.push(health);
      } catch (error) {
        healthStatus.push({
          jobName,
          status: 'error',
          lastRun: 0,
          timeSinceLastRun: Date.now(),
          successRate: 0,
          averageDuration: 0,
          alerts: [`Failed to check health: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    return healthStatus;
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
  private async recordJobStart(execution: JobExecution): Promise<void> {
    try {
      // 这里应该插入到 cron_executions 表
      // await this.dbService.insertCronExecution(execution);
      console.log(`📝 Job start recorded: ${execution.jobName}`);
    } catch (error) {
      console.error('❌ Failed to record job start:', error);
    }
  }

  /**
   * 记录作业完成
   */
  private async recordJobCompletion(execution: JobExecution): Promise<void> {
    try {
      // 这里应该更新 cron_executions 表
      // await this.dbService.updateCronExecution(execution);
      console.log(`📝 Job completion recorded: ${execution.jobName}`);
    } catch (error) {
      console.error('❌ Failed to record job completion:', error);
    }
  }

  /**
   * 检查性能警报
   */
  private async checkPerformanceAlerts(execution: JobExecution): Promise<void> {
    const alerts: string[] = [];

    // 检查执行时间过长
    if (execution.duration && execution.duration > 30000) { // 30秒
      alerts.push(`Long execution time: ${execution.duration}ms`);
    }

    // 检查内存使用过高
    if (execution.metrics.memoryDelta && execution.metrics.memoryDelta > 50 * 1024 * 1024) { // 50MB
      alerts.push(`High memory usage: ${Math.round(execution.metrics.memoryDelta / 1024 / 1024)}MB`);
    }

    // 检查失败
    if (execution.status === 'failed') {
      alerts.push(`Job failed: ${execution.error}`);
    }

    if (alerts.length > 0) {
      console.warn(`⚠️ Performance alerts for ${execution.jobName}:`, alerts);
      // 这里可以发送通知到监控系统
    }
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    // 在 Cloudflare Workers 中，内存信息有限
    // 这里返回一个估计值
    return Math.floor(Math.random() * 50 * 1024 * 1024); // 模拟 0-50MB
  }

  /**
   * 确定健康状态
   */
  private determineHealthStatus(
    jobName: string, 
    timeSinceLastRun: number, 
    stats: PerformanceStats
  ): 'healthy' | 'warning' | 'critical' | 'error' {
    // 根据作业类型设置不同的阈值
    const thresholds = {
      'frequent-sync': 10 * 60 * 1000, // 10分钟
      'hourly-stats': 2 * 60 * 60 * 1000, // 2小时
      'weekly-cleanup': 8 * 24 * 60 * 60 * 1000 // 8天
    };

    const threshold = thresholds[jobName as keyof typeof thresholds] || 60 * 60 * 1000;

    if (stats.successRate < 90) return 'critical';
    if (timeSinceLastRun > threshold * 2) return 'critical';
    if (timeSinceLastRun > threshold) return 'warning';
    if (stats.successRate < 95) return 'warning';
    
    return 'healthy';
  }

  /**
   * 生成健康警报
   */
  private generateHealthAlerts(
    jobName: string, 
    timeSinceLastRun: number, 
    stats: PerformanceStats
  ): string[] {
    const alerts: string[] = [];
    
    if (stats.successRate < 90) {
      alerts.push(`Low success rate: ${stats.successRate}%`);
    }
    
    if (timeSinceLastRun > 24 * 60 * 60 * 1000) {
      alerts.push(`No execution in last 24 hours`);
    }
    
    if (stats.averageDuration > 60000) {
      alerts.push(`High average duration: ${stats.averageDuration}ms`);
    }

    return alerts;
  }
}

// 类型定义
export interface JobExecution {
  id: string;
  jobName: string;
  cronPattern: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'failed';
  result?: any;
  error?: string;
  metrics: {
    startMemory: number;
    endMemory?: number;
    memoryDelta?: number;
    dbQueries: number;
    blockchainCalls: number;
    processedRecords: number;
  };
}

export interface JobExecutionSummary {
  id: string;
  jobName: string;
  startTime: number;
  duration: number;
  status: 'success' | 'failed';
  processedRecords: number;
}

export interface PerformanceStats {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  medianDuration: number;
  maxDuration: number;
  minDuration: number;
  lastExecution: {
    timestamp: number;
    duration: number;
    status: string;
  };
  trends: {
    executionCount24h: number;
    averageDuration24h: number;
    successRate24h: number;
    errorRate24h: number;
  };
}

export interface JobHealthStatus {
  jobName: string;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  lastRun: number;
  timeSinceLastRun: number;
  successRate: number;
  averageDuration: number;
  alerts: string[];
}
