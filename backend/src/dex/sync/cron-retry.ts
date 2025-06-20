import type { Env } from '../../index';
import { CronMonitor, type JobExecution } from './cron-monitor';

/**
 * Cron 作业重试处理器
 * 提供失败作业的重试机制、回退策略和错误恢复
 */
export class CronRetryHandler {
  private monitor: CronMonitor;

  constructor(private env: Env) {
    this.monitor = new CronMonitor(env);
  }

  /**
   * 执行带重试的 Cron 作业
   */
  async executeWithRetry<T>(
    jobName: string,
    cronPattern: string,
    jobFunction: (execution: JobExecution) => Promise<T>,
    retryConfig?: RetryConfig
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const execution = await this.monitor.startJobMonitoring(
        `${jobName}${attempt > 1 ? `_retry_${attempt - 1}` : ''}`, 
        cronPattern
      );

      try {
        console.log(`🔄 Executing ${jobName} (attempt ${attempt}/${config.maxRetries + 1})`);
        
        const result = await this.executeWithTimeout(
          jobFunction, 
          execution, 
          config.timeoutMs
        );
        
        await this.monitor.completeJobMonitoring(execution, result);
        
        if (attempt > 1) {
          console.log(`✅ ${jobName} succeeded after ${attempt - 1} retries`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        await this.monitor.completeJobMonitoring(execution, null, lastError);
        
        if (attempt <= config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt - 1, config);
          
          console.warn(
            `⚠️ ${jobName} failed (attempt ${attempt}), retrying in ${delay}ms. Error:`, 
            lastError.message
          );
          
          if (config.shouldRetry && !config.shouldRetry(lastError)) {
            console.log(`🚫 Retry skipped for ${jobName}: error not retryable`);
            break;
          }
          
          await this.delay(delay);
        } else {
          console.error(`❌ ${jobName} failed after ${config.maxRetries} retries`);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 批量重试失败的作业
   */
  async retryFailedJobs(timeRange?: { start: number; end: number }): Promise<RetryResult[]> {
    console.log('🔄 Starting batch retry of failed jobs...');
    
    try {
      const failedJobs = await this.getFailedJobs(timeRange);
      const results: RetryResult[] = [];
      
      for (const job of failedJobs) {
        try {
          console.log(`🔄 Retrying failed job: ${job.jobName} (${job.id})`);
          
          // 重新构建作业函数
          const jobFunction = await this.getJobFunction(job.jobName);
          if (!jobFunction) {
            results.push({
              jobId: job.id,
              jobName: job.jobName,
              success: false,
              error: 'Job function not found'
            });
            continue;
          }
          
          await this.executeWithRetry(
            job.jobName,
            job.cronPattern,
            jobFunction,
            { 
              maxRetries: 2, 
              baseDelayMs: 1000,
              maxDelayMs: 10000,
              timeoutMs: 30000,
              backoffStrategy: 'exponential' as const
            }
          );
          
          results.push({
            jobId: job.id,
            jobName: job.jobName,
            success: true
          });
          
        } catch (error) {
          results.push({
            jobId: job.id,
            jobName: job.jobName,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log(`✅ Batch retry completed: ${results.filter(r => r.success).length}/${results.length} succeeded`);
      return results;
      
    } catch (error) {
      console.error('❌ Batch retry failed:', error);
      throw error;
    }
  }

  /**
   * 获取失败作业的恢复建议
   */
  async getRecoveryRecommendations(jobName?: string): Promise<RecoveryRecommendation[]> {
    const recommendations: RecoveryRecommendation[] = [];
    
    try {
      const failedJobs = await this.getFailedJobs(
        { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() }
      );
      
      const jobGroups = this.groupJobsByName(failedJobs);
      
      for (const [name, jobs] of Object.entries(jobGroups)) {
        if (jobName && name !== jobName) continue;
        
        const errorPatterns = this.analyzeErrorPatterns(jobs);
        const recommendation: RecoveryRecommendation = {
          jobName: name,
          failureCount: jobs.length,
          lastFailure: Math.max(...jobs.map(j => j.startTime)),
          errorPatterns,
          recommendations: this.generateRecommendations(name, errorPatterns),
          canAutoRecover: this.canAutoRecover(errorPatterns),
          priority: this.calculatePriority(name, jobs.length, errorPatterns)
        };
        
        recommendations.push(recommendation);
      }
      
      return recommendations.sort((a, b) => b.priority - a.priority);
      
    } catch (error) {
      console.error('❌ Failed to get recovery recommendations:', error);
      return [];
    }
  }

  /**
   * 设置自动恢复策略
   */
  async enableAutoRecovery(config: AutoRecoveryConfig): Promise<void> {
    console.log('🤖 Enabling auto recovery with config:', config);
    
    // 这里可以存储配置到数据库或环境变量
    // 在实际的 Cloudflare Workers 环境中，可以使用 KV 存储或 Durable Objects
    
    console.log('✅ Auto recovery enabled');
  }

  /**
   * 执行自动恢复检查
   */
  async performAutoRecovery(): Promise<AutoRecoveryResult> {
    console.log('🔍 Performing auto recovery check...');
    
    const result: AutoRecoveryResult = {
      checkedJobs: 0,
      recoveredJobs: 0,
      failedRecoveries: 0,
      skippedJobs: 0,
      actions: []
    };
    
    try {
      const recommendations = await this.getRecoveryRecommendations();
      result.checkedJobs = recommendations.length;
      
      for (const rec of recommendations) {
        if (rec.canAutoRecover) {
          try {
            const retryResults = await this.retryFailedJobs({
              start: rec.lastFailure - 60 * 60 * 1000, // 1小时前
              end: rec.lastFailure + 60 * 1000 // 1分钟后
            });
            
            const successful = retryResults.filter(r => r.success).length;
            result.recoveredJobs += successful;
            result.failedRecoveries += retryResults.length - successful;
            
            result.actions.push({
              jobName: rec.jobName,
              action: 'retry',
              success: successful > 0,
              details: `Retried ${retryResults.length} jobs, ${successful} succeeded`
            });
            
          } catch (error) {
            result.failedRecoveries++;
            result.actions.push({
              jobName: rec.jobName,
              action: 'retry',
              success: false,
              details: error instanceof Error ? error.message : String(error)
            });
          }
        } else {
          result.skippedJobs++;
          result.actions.push({
            jobName: rec.jobName,
            action: 'skip',
            success: true,
            details: 'Requires manual intervention'
          });
        }
      }
      
      console.log(`✅ Auto recovery completed: ${result.recoveredJobs} jobs recovered`);
      return result;
      
    } catch (error) {
      console.error('❌ Auto recovery failed:', error);
      throw error;
    }
  }

  /**
   * 使用超时执行作业函数
   */
  private async executeWithTimeout<T>(
    jobFunction: (execution: JobExecution) => Promise<T>,
    execution: JobExecution,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      jobFunction(execution)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 计算回退延迟
   */
  private calculateBackoffDelay(attemptIndex: number, config: RetryConfig): number {
    switch (config.backoffStrategy) {
      case 'exponential':
        return Math.min(
          config.baseDelayMs * Math.pow(2, attemptIndex),
          config.maxDelayMs
        );
      case 'linear':
        return Math.min(
          config.baseDelayMs * (attemptIndex + 1),
          config.maxDelayMs
        );
      case 'fixed':
      default:
        return config.baseDelayMs;
    }
  }

  /**
   * 延迟执行
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取失败的作业
   */
  private async getFailedJobs(timeRange?: { start: number; end: number }): Promise<JobExecution[]> {
    // 这里应该从数据库查询失败的作业
    // 为了演示，返回模拟数据
    return [
      {
        id: 'exec_failed_001',
        jobName: 'frequent-sync',
        cronPattern: '*/5 * * * *',
        startTime: Date.now() - 600000,
        endTime: Date.now() - 590000,
        duration: 10000,
        status: 'failed',
        error: 'Database connection timeout',
        metrics: {
          startMemory: 10 * 1024 * 1024,
          endMemory: 12 * 1024 * 1024,
          memoryDelta: 2 * 1024 * 1024,
          dbQueries: 5,
          blockchainCalls: 2,
          processedRecords: 0
        }
      }
    ];
  }

  /**
   * 获取作业函数
   */
  private async getJobFunction(jobName: string): Promise<((execution: JobExecution) => Promise<any>) | null> {
    // 这里应该根据作业名称返回相应的函数
    // 为了演示，返回一个简单的函数
    switch (jobName) {
      case 'frequent-sync':
        return async (execution: JobExecution) => {
          this.monitor.incrementProcessedRecords(execution, 10);
          return { processed: 10 };
        };
      case 'hourly-stats':
        return async (execution: JobExecution) => {
          this.monitor.incrementProcessedRecords(execution, 50);
          return { processed: 50 };
        };
      default:
        return null;
    }
  }

  /**
   * 按名称分组作业
   */
  private groupJobsByName(jobs: JobExecution[]): Record<string, JobExecution[]> {
    return jobs.reduce((groups, job) => {
      if (!groups[job.jobName]) {
        groups[job.jobName] = [];
      }
      groups[job.jobName]!.push(job);
      return groups;
    }, {} as Record<string, JobExecution[]>);
  }

  /**
   * 分析错误模式
   */
  private analyzeErrorPatterns(jobs: JobExecution[]): ErrorPattern[] {
    const patterns: Record<string, number> = {};
    
    jobs.forEach(job => {
      if (job.error) {
        const pattern = this.categorizeError(job.error);
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    });
    
    return Object.entries(patterns).map(([type, count]) => ({ type, count }));
  }

  /**
   * 分类错误
   */
  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('connection')) return 'connection';
    if (error.includes('permission')) return 'permission';
    if (error.includes('rate limit')) return 'rate_limit';
    return 'unknown';
  }

  /**
   * 生成恢复建议
   */
  private generateRecommendations(jobName: string, patterns: ErrorPattern[]): string[] {
    const recommendations: string[] = [];
    
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'timeout':
          recommendations.push('Increase timeout duration or optimize query performance');
          break;
        case 'connection':
          recommendations.push('Check database connectivity and retry with exponential backoff');
          break;
        case 'rate_limit':
          recommendations.push('Implement rate limiting and request throttling');
          break;
        case 'permission':
          recommendations.push('Verify API keys and permissions are valid');
          break;
        default:
          recommendations.push('Review error logs and implement specific error handling');
      }
    });
    
    return recommendations;
  }

  /**
   * 检查是否可以自动恢复
   */
  private canAutoRecover(patterns: ErrorPattern[]): boolean {
    // 只有超时和连接错误可以自动重试
    return patterns.every(p => ['timeout', 'connection'].includes(p.type));
  }

  /**
   * 计算优先级
   */
  private calculatePriority(jobName: string, failureCount: number, patterns: ErrorPattern[]): number {
    let priority = failureCount;
    
    // 重要作业优先级更高
    if (jobName === 'frequent-sync') priority *= 3;
    if (jobName === 'hourly-stats') priority *= 2;
    
    // 严重错误优先级更高
    if (patterns.some(p => ['permission', 'rate_limit'].includes(p.type))) {
      priority *= 2;
    }
    
    return priority;
  }
}

// 默认重试配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
  backoffStrategy: 'exponential'
};

// 类型定义
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult {
  jobId: string;
  jobName: string;
  success: boolean;
  error?: string;
}

export interface ErrorPattern {
  type: string;
  count: number;
}

export interface RecoveryRecommendation {
  jobName: string;
  failureCount: number;
  lastFailure: number;
  errorPatterns: ErrorPattern[];
  recommendations: string[];
  canAutoRecover: boolean;
  priority: number;
}

export interface AutoRecoveryConfig {
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  checkIntervalMs: number;
  autoRetryPatterns: string[];
}

export interface AutoRecoveryResult {
  checkedJobs: number;
  recoveredJobs: number;
  failedRecoveries: number;
  skippedJobs: number;
  actions: Array<{
    jobName: string;
    action: string;
    success: boolean;
    details: string;
  }>;
}
