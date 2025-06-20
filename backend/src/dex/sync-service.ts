import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { EventListener } from './event-listener';
import { DatabaseService } from './database-service';

export class SyncService {
  private db: DrizzleD1Database<typeof schema>;
  private databaseService: DatabaseService;
  private eventListeners: Map<string, EventListener> = new Map();
  private isRunning = false;
  private syncInterval: number = 60000; // 1分钟

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
    this.databaseService = new DatabaseService(db);
    
    // 初始化支持的链
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    const supportedChains = ['binance', 'bsctest'];
    
    for (const chain of supportedChains) {
      try {
        const listener = new EventListener(this.db, chain);
        this.eventListeners.set(chain, listener);
        console.log(`Initialized event listener for chain: ${chain}`);
      } catch (error) {
        console.error(`Failed to initialize event listener for chain ${chain}:`, error);
      }
    }
  }

  /**
   * 启动同步服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync service is already running');
      return;
    }

    console.log('Starting sync service...');
    this.isRunning = true;

    // 立即执行一次同步
    await this.performSync();

    // 设置定时器
    this.scheduleNextSync();
  }

  /**
   * 停止同步服务
   */
  async stop(): Promise<void> {
    console.log('Stopping sync service...');
    this.isRunning = false;
  }

  /**
   * 调度下一次同步
   */
  private scheduleNextSync(): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      if (this.isRunning) {
        await this.performSync();
        this.scheduleNextSync();
      }
    }, this.syncInterval);
  }

  /**
   * 执行同步操作
   */
  private async performSync(): Promise<void> {
    console.log('Starting sync operation...');
    
    try {
      // 并行同步所有支持的链
      const syncPromises = Array.from(this.eventListeners.entries()).map(
        ([chainName, listener]) => this.syncChain(chainName, listener)
      );

      await Promise.allSettled(syncPromises);
      
      console.log('Sync operation completed');
    } catch (error) {
      console.error('Error during sync operation:', error);
    }
  }

  /**
   * 同步单个链的数据
   */
  private async syncChain(chainName: string, listener: EventListener): Promise<void> {
    try {
      console.log(`Syncing chain: ${chainName}`);
      
      // 1. 发现新的池（如果需要）
      await this.discoverNewPools(chainName);
      
      // 2. 同步所有池的事件
      await listener.syncAllPools();
      
      // 3. 更新池统计数据
      await this.updateAllPoolStats(chainName, listener);
      
      console.log(`Chain ${chainName} sync completed`);
    } catch (error) {
      console.error(`Error syncing chain ${chainName}:`, error);
    }
  }

  /**
   * 发现新的池（从工厂合约事件）
   */
  private async discoverNewPools(chainName: string): Promise<void> {
    try {
      // TODO: 实现从LBFactory合约监听PairCreated事件来发现新池
      // 这里先跳过，假设池已经手动添加到数据库
      console.log(`Pool discovery for ${chainName} - skipped (TODO: implement)`);
    } catch (error) {
      console.error(`Error discovering pools for ${chainName}:`, error);
    }
  }

  /**
   * 更新所有池的统计数据
   */
  private async updateAllPoolStats(chainName: string, listener: EventListener): Promise<void> {
    try {
      const pools = await this.db
        .select({ address: schema.pools.address })
        .from(schema.pools)
        .where(schema.pools.chain.eq(chainName));

      console.log(`Updating stats for ${pools.length} pools on ${chainName}`);

      // 批量更新池统计（限制并发数）
      const batchSize = 5;
      for (let i = 0; i < pools.length; i += batchSize) {
        const batch = pools.slice(i, i + batchSize);
        const updatePromises = batch.map(pool => 
          listener.updatePoolStats(pool.address).catch(error => {
            console.error(`Error updating stats for pool ${pool.address}:`, error);
          })
        );
        
        await Promise.allSettled(updatePromises);
      }
    } catch (error) {
      console.error(`Error updating pool stats for ${chainName}:`, error);
    }
  }

  /**
   * 手动同步指定池
   */
  async syncPool(chainName: string, poolAddress: string): Promise<void> {
    const listener = this.eventListeners.get(chainName);
    if (!listener) {
      throw new Error(`No event listener found for chain: ${chainName}`);
    }

    try {
      console.log(`Manual sync for pool ${poolAddress} on ${chainName}`);
      
      await listener.syncPoolEvents(poolAddress);
      await listener.updatePoolStats(poolAddress);
      
      console.log(`Manual sync completed for pool ${poolAddress}`);
    } catch (error) {
      console.error(`Error in manual sync for pool ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * 添加新池到数据库并开始同步
   */
  async addPool(poolData: {
    address: string;
    chain: string;
    tokenX: string;
    tokenY: string;
    binStep: number;
    name: string;
  }): Promise<void> {
    try {
      // 添加池到数据库
      await this.databaseService.upsertPool(poolData);
      
      console.log(`Added pool ${poolData.address} to database`);
      
      // 立即开始同步这个池
      await this.syncPool(poolData.chain, poolData.address);
    } catch (error) {
      console.error(`Error adding pool ${poolData.address}:`, error);
      throw error;
    }
  }

  /**
   * 添加代币信息
   */
  async addToken(tokenData: {
    address: string;
    chain: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }): Promise<void> {
    try {
      await this.databaseService.upsertToken(tokenData);
      console.log(`Added/updated token ${tokenData.symbol} (${tokenData.address})`);
    } catch (error) {
      console.error(`Error adding token ${tokenData.address}:`, error);
      throw error;
    }
  }

  /**
   * 设置同步间隔
   */
  setSyncInterval(intervalMs: number): void {
    this.syncInterval = intervalMs;
    console.log(`Sync interval set to ${intervalMs}ms`);
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    isRunning: boolean;
    syncInterval: number;
    supportedChains: string[];
  } {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncInterval,
      supportedChains: Array.from(this.eventListeners.keys())
    };
  }

  /**
   * 清理旧数据（可选）
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      console.log(`Cleaning up data older than ${daysToKeep} days...`);
      
      // 清理旧的价格历史
      await this.db
        .delete(schema.priceHistory)
        .where(schema.priceHistory.timestamp.lt(cutoffTime));
      
      // 清理旧的池统计数据（保留最新的）
      // 这里需要更复杂的逻辑来只保留必要的历史数据
      
      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Error during data cleanup:', error);
    }
  }
}

/**
 * 创建同步服务实例
 */
export function createSyncService(db: DrizzleD1Database<typeof schema>): SyncService {
  return new SyncService(db);
}

/**
 * Cloudflare Workers Cron 任务处理器
 */
export async function handleScheduledEvent(
  event: ScheduledEvent,
  env: any,
  ctx: ExecutionContext
): Promise<void> {
  // 这里可以根据 cron 表达式来执行不同的任务
  console.log('Scheduled event triggered:', event.cron);
  
  try {
    // 创建数据库连接
    const db = env.D1_DATABASE; // 从环境变量获取D1数据库
    
    // 创建同步服务
    const syncService = createSyncService(db);
    
    // 执行同步
    await syncService.start();
    
    // 等待一段时间后停止（因为这是定时任务）
    setTimeout(() => {
      syncService.stop();
    }, 50000); // 50秒后停止，给Worker足够时间完成
    
  } catch (error) {
    console.error('Error in scheduled event:', error);
    throw error;
  }
}
