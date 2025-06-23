import { EventListener } from './event-listener';
import { DatabaseService } from './database-service';
import { OnChainService } from './onchain-service';
import { PriceService } from './price-service';
import type { Env } from '../../index';

export interface SyncConfig {
  chains: string[];
  poolAddresses: string[];
  batchSize: number;
  maxBlockRange: number;
  syncInterval: number; // 毫秒
  retryAttempts: number;
  retryDelay: number; // 毫秒
}

export interface SyncMetrics {
  lastSyncTime: number;
  totalSyncedBlocks: number;
  totalSwapEvents: number;
  totalLiquidityEvents: number;
  totalErrors: number;
  averageSyncTime: number;
  activePools: number;
}

export interface SyncStatus {
  isRunning: boolean;
  currentPhase: 'idle' | 'syncing_events' | 'updating_stats' | 'calculating_positions' | 'updating_prices';
  progress: number; // 0-100
  error?: string;
  metrics: SyncMetrics;
  phaseStartTime?: number; // 当前阶段开始时间
  lastUpdate?: number; // 最后更新时间
}

export class SyncService {
  private eventListeners: Map<string, EventListener> = new Map();
  private databaseService: DatabaseService;
  private onChainService: OnChainService;
  private priceService: PriceService;
  private syncStatus: SyncStatus;
  private syncTimer?: number;
  private isShuttingDown = false;

  constructor(private env: Env, private config: SyncConfig) {
    this.databaseService = new DatabaseService(env);
    this.onChainService = new OnChainService(env);
    this.priceService = new PriceService(env);
    
    // 初始化事件监听器
    for (const chain of config.chains) {
      if (chain === 'bsc' || chain === 'bsc-testnet') {
        this.eventListeners.set(chain, new EventListener(env, chain as 'bsc' | 'bsc-testnet'));
      }
    }

    // 初始化同步状态
    this.syncStatus = {
      isRunning: false,
      currentPhase: 'idle',
      progress: 0,
      phaseStartTime: Date.now(),
      lastUpdate: Date.now(),
      metrics: {
        lastSyncTime: 0,
        totalSyncedBlocks: 0,
        totalSwapEvents: 0,
        totalLiquidityEvents: 0,
        totalErrors: 0,
        averageSyncTime: 0,
        activePools: 0
      }
    };
  }

  /**
   * 启动同步服务
   */
  async start(): Promise<void> {
    if (this.syncStatus.isRunning) {
      console.log('Sync service is already running');
      return;
    }

    console.log('Starting DEX sync service...');
    this.syncStatus.isRunning = true;
    this.syncStatus.currentPhase = 'idle';
    this.isShuttingDown = false;

    try {
      // 初始同步
      await this.performFullSync();

      // 启动定期同步
      this.scheduleNextSync();

      console.log('DEX sync service started successfully');
    } catch (error) {
      console.error('Failed to start sync service:', error);
      this.syncStatus.isRunning = false;
      this.syncStatus.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * 停止同步服务
   */
  async stop(): Promise<void> {
    console.log('Stopping DEX sync service...');
    this.isShuttingDown = true;
    this.syncStatus.isRunning = false;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = undefined;
    }

    console.log('DEX sync service stopped');
  }

  /**
   * 获取同步状态
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 手动触发同步
   */
  async triggerSync(): Promise<void> {
    if (this.syncStatus.currentPhase !== 'idle') {
      throw new Error('Sync is already in progress');
    }

    await this.performFullSync();
  }

  /**
   * 执行完整同步
   */
  private async performFullSync(): Promise<void> {
    const startTime = Date.now();
    let totalEvents = 0;

    try {
      console.log('Starting full sync...');
      
      // 阶段1: 同步事件
      this.updateSyncPhase('syncing_events', 10);

      const eventStats = await this.syncAllEvents();
      totalEvents = eventStats.totalSwapEvents + eventStats.totalLiquidityEvents;

      // 阶段2: 更新池统计
      this.updateSyncPhase('updating_stats', 40);

      await this.updateAllPoolStats();

      // 阶段3: 计算用户仓位
      this.updateSyncPhase('calculating_positions', 70);

      await this.updateUserPositions();

      // 阶段4: 更新价格数据
      this.updateSyncPhase('updating_prices', 90);

      await this.updatePriceData();

      // 完成
      this.updateSyncPhase('idle', 100);

      // 更新指标
      const syncTime = Date.now() - startTime;
      this.updateMetrics(syncTime, eventStats);

      console.log(`Full sync completed in ${syncTime}ms, processed ${totalEvents} events`);
    } catch (error) {
      console.error('Full sync failed:', error);
      this.syncStatus.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncStatus.currentPhase = 'idle';
      this.syncStatus.progress = 0;
      this.syncStatus.metrics.totalErrors++;
      throw error;
    }
  }

  /**
   * 同步所有事件
   */
  private async syncAllEvents(): Promise<{
    totalSwapEvents: number;
    totalLiquidityEvents: number;
  }> {
    let totalSwapEvents = 0;
    let totalLiquidityEvents = 0;

    console.log(`🔄 Starting event sync for ${this.config.chains.length} chains and ${this.config.poolAddresses.length} pools`);

    for (const chain of this.config.chains) {
      const eventListener = this.eventListeners.get(chain);
      if (!eventListener) {
        console.warn(`⚠️  No event listener found for chain: ${chain}`);
        continue;
      }

      console.log(`📡 Syncing events for chain: ${chain}`);

      // 检查是否有有效的池地址
      if (this.config.poolAddresses.length === 0) {
        console.warn(`⚠️  No pool addresses configured for chain: ${chain}`);
        continue;
      }

      for (const poolAddress of this.config.poolAddresses) {
        // 跳过无效的池地址
        if (!poolAddress || typeof poolAddress !== 'string') {
          console.warn(`⚠️  Skipping invalid pool address: ${poolAddress}`);
          continue;
        }
        
        try {
          console.log(`🏊 Starting sync for pool: ${poolAddress} on ${chain}`);
          
          // 获取同步前的事件计数（用于验证同步是否成功）
          const beforeSwaps = await this.databaseService.getSwapEvents(
            { poolAddress, chain },
            { limit: 1 }
          );
          const beforeLiquidity = await this.databaseService.getLiquidityEvents(
            { poolAddress, chain },
            { limit: 1 }
          );

          console.log(`📊 Before sync - Pool ${poolAddress}: ${beforeSwaps.total} swaps, ${beforeLiquidity.total} liquidity events`);
          
          // 增量同步每个池
          await eventListener.incrementalSync(poolAddress);
          
          // 获取同步后的事件计数
          const afterSwaps = await this.databaseService.getSwapEvents(
            { poolAddress, chain },
            { limit: 1000 }
          );
          const afterLiquidity = await this.databaseService.getLiquidityEvents(
            { poolAddress, chain },
            { limit: 1000 }
          );

          const newSwaps = afterSwaps.total - beforeSwaps.total;
          const newLiquidity = afterLiquidity.total - beforeLiquidity.total;
          
          console.log(`📈 After sync - Pool ${poolAddress}: +${newSwaps} new swaps, +${newLiquidity} new liquidity events`);
          console.log(`📊 Total for pool ${poolAddress}: ${afterSwaps.total} swaps, ${afterLiquidity.total} liquidity events`);

          totalSwapEvents += afterSwaps.total;
          totalLiquidityEvents += afterLiquidity.total;

          // 如果没有新事件，记录警告
          if (newSwaps === 0 && newLiquidity === 0) {
            console.warn(`⚠️  No new events found for pool ${poolAddress} - this might indicate:
              1. Pool has no recent activity
              2. Sync progress is already up to date
              3. RPC connection issues
              4. Pool address is incorrect`);
          }

          // 添加延迟避免过载
          await this.sleep(100);
        } catch (error) {
          console.error(`❌ Failed to sync events for pool ${poolAddress} on ${chain}:`, error);
          
          // 检查是否是 RPC 相关错误
          if (error instanceof Error) {
            if (error.message.includes('timeout') || error.message.includes('network')) {
              console.error(`🌐 Network/RPC error for pool ${poolAddress} - this may cause missing data`);
            } else if (error.message.includes('address') || error.message.includes('contract')) {
              console.error(`📍 Contract address error for pool ${poolAddress} - check if address is valid`);
            }
          }
          
          // 继续处理其他池，不抛出错误
        }
      }
    }

    console.log(`✅ Event sync completed - Total: ${totalSwapEvents} swap events, ${totalLiquidityEvents} liquidity events across all pools`);

    // 如果没有同步到任何事件，记录详细警告
    if (totalSwapEvents === 0 && totalLiquidityEvents === 0) {
      console.warn(`🚨 WARNING: No events were synchronized! This could indicate:
        1. All pools have no activity
        2. RPC connection issues
        3. Incorrect pool addresses
        4. Database write permissions
        5. Event listener configuration issues`);
    }

    return { totalSwapEvents, totalLiquidityEvents };
  }

  /**
   * 更新所有池的统计数据
   */
  private async updateAllPoolStats(): Promise<void> {
    console.log('Updating pool statistics...');

    for (const chain of this.config.chains) {
      for (const poolAddress of this.config.poolAddresses) {
        // 跳过无效的池地址
        if (!poolAddress || typeof poolAddress !== 'string') {
          console.warn(`⚠️  Skipping invalid pool address in stats update: ${poolAddress}`);
          continue;
        }
        
        try {
          // 从链上获取最新池状态
          const poolStats = await this.onChainService.getPoolStats(poolAddress, chain);
          
          if (poolStats) {
            await this.databaseService.updatePoolStats(poolStats);
          }

          await this.sleep(50);
        } catch (error) {
          console.error(`Failed to update stats for pool ${poolAddress} on ${chain}:`, error);
        }
      }
    }
  }

  /**
   * 更新用户仓位
   */
  private async updateUserPositions(): Promise<void> {
    console.log('Updating user positions...');

    // 获取所有活跃用户
    const activeUsers = await this.getActiveUsers();

    for (const user of activeUsers) {
      try {
        // 计算用户在所有池中的仓位
        const positions = await this.onChainService.getUserPositions(user);
        
        if (positions.length > 0) {
          await this.databaseService.updateUserPositions(positions);
        }

        await this.sleep(100);
      } catch (error) {
        console.error(`Failed to update positions for user ${user}:`, error);
      }
    }
  }

  /**
   * 更新价格数据
   */
  private async updatePriceData(): Promise<void> {
    console.log('Updating price data...');

    try {
      // 获取所有代币列表
      const tokens = await this.getAllTokens();
      
      // 批量更新价格
      await this.priceService.updateTokenPrices(tokens);
    } catch (error) {
      console.error('Failed to update price data:', error);
    }
  }

  /**
   * 获取活跃用户列表
   */
  private async getActiveUsers(): Promise<string[]> {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      // 从交易事件中获取活跃用户
      const swapEvents = await this.databaseService.getSwapEvents(
        { startTime: oneDayAgo },
        { limit: 10000 }
      );

      // 从流动性事件中获取活跃用户
      const liquidityEvents = await this.databaseService.getLiquidityEvents(
        { startTime: oneDayAgo },
        { limit: 10000 }
      );

      const users = new Set<string>();
      
      swapEvents.events.forEach(event => {
        users.add(event.sender);
        users.add(event.to);
      });

      liquidityEvents.events.forEach(event => {
        users.add(event.user);
      });

      return Array.from(users);
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  /**
   * 获取所有代币
   */
  private async getAllTokens(): Promise<string[]> {
    try {
      const pools = await this.databaseService.getPools({}, { limit: 1000 });
      const tokens = new Set<string>();

      pools.pools.forEach(pool => {
        if (pool.tokenX && typeof pool.tokenX === 'string') {
          tokens.add(pool.tokenX);
        }
        if (pool.tokenY && typeof pool.tokenY === 'string') {
          tokens.add(pool.tokenY);
        }
      });

      return Array.from(tokens);
    } catch (error) {
      console.error('Failed to get all tokens:', error);
      return [];
    }
  }

  /**
   * 更新指标
   */
  private updateMetrics(syncTime: number, eventStats: { totalSwapEvents: number; totalLiquidityEvents: number }): void {
    const metrics = this.syncStatus.metrics;
    
    metrics.lastSyncTime = Date.now();
    metrics.totalSwapEvents += eventStats.totalSwapEvents;
    metrics.totalLiquidityEvents += eventStats.totalLiquidityEvents;
    
    // 计算平均同步时间
    if (metrics.averageSyncTime === 0) {
      metrics.averageSyncTime = syncTime;
    } else {
      metrics.averageSyncTime = (metrics.averageSyncTime + syncTime) / 2;
    }

    metrics.activePools = this.config.poolAddresses.length;
  }

  /**
   * 调度下次同步
   */
  private scheduleNextSync(): void {
    if (this.isShuttingDown) return;

    this.syncTimer = setTimeout(async () => {
      if (!this.isShuttingDown && this.syncStatus.isRunning) {
        try {
          await this.performFullSync();
        } catch (error) {
          console.error('Scheduled sync failed:', error);
        }
        
        // 调度下次同步
        this.scheduleNextSync();
      }
    }, this.config.syncInterval);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取同步配置
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * 更新同步配置
   */
  async updateConfig(newConfig: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // 如果更新了链配置，重新初始化事件监听器
    if (newConfig.chains) {
      this.eventListeners.clear();
      for (const chain of this.config.chains) {
        if (chain === 'bsc' || chain === 'bsc-testnet') {
          this.eventListeners.set(chain, new EventListener(this.env, chain as 'bsc' | 'bsc-testnet'));
        }
      }
    }

    console.log('Sync configuration updated');
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      isRunning: boolean;
      currentPhase: string;
      timeSinceLastSync: number;
      errorRate: number;
      dbHealthy: boolean;
      metrics: SyncMetrics;
      phaseStartTime?: number;
      lastUpdate?: number;
    } | { error: string };
  }> {
    try {
      const now = Date.now();
      const lastSync = this.syncStatus.metrics.lastSyncTime;
      const timeSinceLastSync = now - lastSync;
      
      // 检查同步是否及时
      const syncIsRecent = timeSinceLastSync < this.config.syncInterval * 2;
      
      // 检查错误率
      const errorRate = this.syncStatus.metrics.totalErrors / Math.max(1, this.syncStatus.metrics.totalSwapEvents);
      const lowErrorRate = errorRate < 0.1; // 10%以下错误率

      // 检查数据库连接
      const dbHealthy = await this.checkDatabaseHealth();

      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (syncIsRecent && lowErrorRate && dbHealthy) {
        status = 'healthy';
      } else if (dbHealthy && (syncIsRecent || lowErrorRate)) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        details: {
          isRunning: this.syncStatus.isRunning,
          currentPhase: this.syncStatus.currentPhase,
          timeSinceLastSync,
          errorRate,
          dbHealthy,
          metrics: this.syncStatus.metrics,
          phaseStartTime: this.syncStatus.phaseStartTime,
          lastUpdate: this.syncStatus.lastUpdate
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // 尝试查询一个简单的记录
      await this.databaseService.getPools({}, { limit: 1 });
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * 更新同步阶段
   */
  private updateSyncPhase(phase: 'idle' | 'syncing_events' | 'updating_stats' | 'calculating_positions' | 'updating_prices', progress: number): void {
    this.syncStatus.currentPhase = phase;
    this.syncStatus.progress = progress;
    this.syncStatus.phaseStartTime = Date.now();
    this.syncStatus.lastUpdate = Date.now();
  }
}

// 默认同步配置
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  chains: [/*'bsc', */'bsc-testnet'],
  poolAddresses: [], // 空数组，依赖池发现功能
  batchSize: 500,
  maxBlockRange: 10000,
  syncInterval: 2 * 60 * 1000, // 2分钟
  retryAttempts: 3,
  retryDelay: 1000 // 1秒
};
