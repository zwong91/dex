import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import * as schema from '../database/schema';
import { FixedEventListener } from './fixed-event-listener';
import { EnhancedOnChainService } from './enhanced-onchain-service';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';

// Factory ABI for discovering new pools
const LB_PAIR_CREATED_EVENT = parseAbiItem('event LBPairCreated(address indexed tokenX, address indexed tokenY, uint256 indexed binStep, address lbPair, uint256 pid)');

const FACTORY_ABI = [
  parseAbiItem('function getNumberOfLBPairs() external view returns (uint256)'),
  parseAbiItem('function getLBPairAtIndex(uint256 index) external view returns (address)'),
];

interface SyncMetrics {
  totalPools: number;
  syncedPools: number;
  failedPools: number;
  totalEvents: number;
  syncDuration: number;
  errors: string[];
  lastSyncTime: number;
}

interface ChainSyncStatus {
  chain: string;
  lastBlockSynced: number;
  isActive: boolean;
  lastSyncTime: number;
  poolsCount: number;
  eventsCount: number;
}

export class IndustrialSyncCoordinator {
  private db: DrizzleD1Database<typeof schema>;
  private onChainService: EnhancedOnChainService;
  private eventListeners: Map<string, FixedEventListener> = new Map();
  private isRunning = false;
  private syncMetrics: Map<string, SyncMetrics> = new Map();
  private chainConfigs: Map<string, any> = new Map();
  private readonly maxRetries = 3;
  private readonly batchSize = 50;
  private readonly concurrencyLimit = 5;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
    this.onChainService = new EnhancedOnChainService();
    this.initializeChains();
  }

  private initializeChains() {
    const configs = {
      'binance': {
        chain: bsc,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
        factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
        startBlock: 21000000n // BSC起始区块
      },
      'bsctest': {
        chain: bscTestnet,
        rpcUrl: process.env.BSCTEST_RPC_URL || 'https://bsc-testnet.public.blastapi.io',
        factoryAddress: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e' as Address,
        startBlock: 25000000n // BSC Testnet起始区块
      }
    };

    for (const [chainName, config] of Object.entries(configs)) {
      try {
        this.chainConfigs.set(chainName, config);
        const listener = new FixedEventListener(this.db, chainName);
        this.eventListeners.set(chainName, listener);
        
        this.syncMetrics.set(chainName, {
          totalPools: 0,
          syncedPools: 0,
          failedPools: 0,
          totalEvents: 0,
          syncDuration: 0,
          errors: [],
          lastSyncTime: 0
        });

        console.log(`✅ Initialized chain: ${chainName}`);
      } catch (error) {
        console.error(`❌ Failed to initialize chain ${chainName}:`, error);
      }
    }
  }

  /**
   * 主同步协调器 - 启动完整的同步流程
   */
  async startFullSync(): Promise<SyncMetrics[]> {
    if (this.isRunning) {
      throw new Error('Sync is already running');
    }

    console.log('🚀 Starting industrial-grade sync coordinator...');
    this.isRunning = true;
    const startTime = Date.now();

    try {
      const syncPromises = Array.from(this.chainConfigs.keys()).map(
        chainName => this.syncChainComprehensive(chainName)
      );

      const results = await Promise.allSettled(syncPromises);
      
      // 处理结果并更新指标
      const metrics: SyncMetrics[] = [];
      results.forEach((result, index) => {
        const chainName = Array.from(this.chainConfigs.keys())[index];
        const chainMetrics = this.syncMetrics.get(chainName)!;
        
        if (result.status === 'rejected') {
          chainMetrics.errors.push(`Chain sync failed: ${result.reason}`);
          chainMetrics.failedPools++;
        }
        
        chainMetrics.syncDuration = Date.now() - startTime;
        chainMetrics.lastSyncTime = Date.now();
        metrics.push(chainMetrics);
      });

      console.log('✅ Full sync completed');
      return metrics;

    } catch (error) {
      console.error('❌ Critical error in sync coordinator:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 综合链同步 - 包含池发现、事件同步、统计更新
   */
  private async syncChainComprehensive(chainName: string): Promise<void> {
    console.log(`🔄 Starting comprehensive sync for ${chainName}`);
    const metrics = this.syncMetrics.get(chainName)!;
    
    try {
      // 1. 发现新池
      await this.discoverNewPools(chainName);
      
      // 2. 获取所有池
      const pools = await this.getAllPoolsForChain(chainName);
      metrics.totalPools = pools.length;
      
      // 3. 批量同步池事件
      await this.batchSyncPoolEvents(chainName, pools);
      
      // 4. 更新池统计数据
      await this.batchUpdatePoolStats(chainName, pools);
      
      // 5. 计算聚合统计
      await this.updateAggregateStats(chainName);
      
      // 6. 清理过期数据
      await this.cleanupExpiredData(chainName);
      
      console.log(`✅ Comprehensive sync completed for ${chainName}`);
      
    } catch (error) {
      console.error(`❌ Error in comprehensive sync for ${chainName}:`, error);
      metrics.errors.push(`Sync error: ${error}`);
      throw error;
    }
  }

  /**
   * 工业级池发现 - 从Factory合约事件发现新池
   */
  private async discoverNewPools(chainName: string): Promise<void> {
    console.log(`🔍 Discovering new pools for ${chainName}`);
    
    const config = this.chainConfigs.get(chainName)!;      const client = createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl, {
          timeout: 30000, // 30秒超时
          retryCount: 2,
          retryDelay: 1000
        })
      });

    try {
      // 获取最后处理的区块
      const lastSyncedBlock = await this.getLastFactorySyncBlock(chainName);
      const currentBlock = await client.getBlockNumber();
      
      if (lastSyncedBlock >= currentBlock) {
        console.log(`Pool discovery up to date for ${chainName}`);
        return;
      }

      console.log(`Scanning blocks ${lastSyncedBlock} to ${currentBlock} for new pools`);

      // 分批获取 LBPairCreated 事件
      const batchSize = 10000n;
      let discoveredPools = 0;

      for (let start = BigInt(lastSyncedBlock); start < currentBlock; start += batchSize) {
        const end = start + batchSize > currentBlock ? currentBlock : start + batchSize;
        
        try {
          const logs = await client.getLogs({
            address: config.factoryAddress,
            event: LB_PAIR_CREATED_EVENT,
            fromBlock: start,
            toBlock: end
          });

          console.log(`Found ${logs.length} new pools in blocks ${start}-${end}`);
          
          // 处理发现的池
          for (const log of logs) {
            try {
              await this.processNewPoolEvent(chainName, log, client);
              discoveredPools++;
            } catch (error) {
              console.error(`Error processing pool event:`, error);
            }
          }

          // 更新同步状态
          await this.updateFactorySyncStatus(chainName, Number(end));
          
        } catch (error) {
          console.error(`Error fetching logs for blocks ${start}-${end}:`, error);
        }
      }

      console.log(`✅ Discovered ${discoveredPools} new pools for ${chainName}`);
      
    } catch (error) {
      console.error(`Error in pool discovery for ${chainName}:`, error);
      throw error;
    }
  }

  /**
   * 处理新池事件并添加到数据库
   */
  private async processNewPoolEvent(chainName: string, log: any, client: any): Promise<void> {
    try {
      // 手动解析事件数据
      const { topics, data } = log;
      const tokenX = topics[1] ? `0x${topics[1].slice(26)}` : '';
      const tokenY = topics[2] ? `0x${topics[2].slice(26)}` : '';
      const binStep = topics[3] ? parseInt(topics[3], 16) : 0;
      
      // 从data中解析lbPair地址（前32字节是lbPair，后32字节是pid）
      const lbPair = data ? `0x${data.slice(26, 66)}` : '';

      if (!tokenX || !tokenY || !lbPair) {
        console.error('Invalid event data:', { tokenX, tokenY, lbPair });
        return;
      }

      // 检查池是否已存在
      const existingPool = await this.db
        .select()
        .from(schema.pools)
        .where(eq(schema.pools.address, lbPair))
        .limit(1);

      if (existingPool.length > 0) {
        return; // 池已存在
      }

      // 获取token信息
      const [tokenXInfo, tokenYInfo] = await Promise.all([
        this.onChainService.getTokenInfo(chainName, tokenX as `0x${string}`),
        this.onChainService.getTokenInfo(chainName, tokenY as `0x${string}`)
      ]);

      // 添加tokens到数据库
      await Promise.all([
        this.upsertToken(chainName, tokenXInfo),
        this.upsertToken(chainName, tokenYInfo)
      ]);

      // 添加池到数据库
      await this.db.insert(schema.pools).values({
        address: lbPair,
        chain: chainName,
        tokenX: tokenX,
        tokenY: tokenY,
        binStep: binStep,
        name: `${tokenXInfo.symbol}/${tokenYInfo.symbol}`,
        status: 'active',
        version: 'v2.2',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Added new pool: ${tokenXInfo.symbol}/${tokenYInfo.symbol} (${lbPair})`);

    } catch (error) {
      console.error('Error processing new pool event:', error);
      // 不抛出错误，继续处理其他池
    }
  }

  /**
   * 批量同步池事件 - 高效的并发处理
   */
  private async batchSyncPoolEvents(chainName: string, pools: any[]): Promise<void> {
    console.log(`⚡ Batch syncing events for ${pools.length} pools on ${chainName}`);
    
    const listener = this.eventListeners.get(chainName)!;
    const metrics = this.syncMetrics.get(chainName)!;
    
    // 分批处理以控制并发
    for (let i = 0; i < pools.length; i += this.batchSize) {
      const batch = pools.slice(i, i + this.batchSize);
      
      const semaphore = new Array(this.concurrencyLimit).fill(null);
      const syncPromises = batch.map(async (pool, index) => {
        // 简单的信号量实现
        await semaphore[index % this.concurrencyLimit];
        
        let retries = 0;
        while (retries < this.maxRetries) {
          try {
            await listener.syncPoolEvents(pool.address);
            metrics.syncedPools++;
            metrics.totalEvents += await this.getPoolEventCount(pool.address);
            break;
          } catch (error) {
            retries++;
            if (retries >= this.maxRetries) {
              console.error(`Failed to sync pool ${pool.address} after ${this.maxRetries} retries:`, error);
              metrics.failedPools++;
              metrics.errors.push(`Pool ${pool.address}: ${error}`);
            } else {
              console.warn(`Retry ${retries}/${this.maxRetries} for pool ${pool.address}`);
              await this.delay(1000 * retries); // 指数退避
            }
          }
        }
      });

      await Promise.allSettled(syncPromises);
      
      // 进度报告
      console.log(`📊 Synced ${Math.min(i + this.batchSize, pools.length)}/${pools.length} pools`);
    }
  }

  /**
   * 批量更新池统计数据
   */
  private async batchUpdatePoolStats(chainName: string, pools: any[]): Promise<void> {
    console.log(`📊 Updating statistics for ${pools.length} pools on ${chainName}`);
    
    for (let i = 0; i < pools.length; i += this.batchSize) {
      const batch = pools.slice(i, i + this.batchSize);
      
      const updatePromises = batch.map(async (pool) => {
        try {
          // 获取链上实时数据
          const poolInfo = await this.onChainService.getPoolInfo(chainName, pool.address);
          
          // 计算24小时统计
          const stats24h = await this.calculate24hStats(pool.address, chainName);
          
          // 更新数据库
          await this.db.insert(schema.poolStats).values({
            poolAddress: pool.address,
            chain: chainName,
            reserveX: poolInfo.reserves.reserveX.toString(),
            reserveY: poolInfo.reserves.reserveY.toString(),
            activeBinId: poolInfo.activeId,
            totalSupply: poolInfo.totalSupply.toString(),
            liquidityUsd: stats24h.liquidityUsd,
            volume24h: stats24h.volume24h,
            volume7d: stats24h.volume7d,
            fees24h: stats24h.fees24h,
            apy: stats24h.apy,
            blockNumber: Number(await this.onChainService.getClient(chainName).getBlockNumber()),
            timestamp: new Date()
          });

        } catch (error) {
          console.error(`Error updating stats for pool ${pool.address}:`, error);
        }
      });

      await Promise.allSettled(updatePromises);
    }
  }

  /**
   * 计算24小时统计数据
   */
  private async calculate24hStats(poolAddress: string, chainName: string): Promise<{
    liquidityUsd: number;
    volume24h: number;
    volume7d: number;
    fees24h: number;
    apy: number;
  }> {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    try {
      // 24小时交易量
      const swaps24h = await this.db
        .select({
          volume: sql<number>`SUM(CAST(${schema.swapEvents.amountInUsd} AS REAL))`,
          fees: sql<number>`SUM(CAST(${schema.swapEvents.feesUsd} AS REAL))`
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.poolAddress, poolAddress),
            eq(schema.swapEvents.chain, chainName),
            gte(schema.swapEvents.timestamp, oneDayAgo)
          )
        );

      // 7天交易量
      const swaps7d = await this.db
        .select({
          volume: sql<number>`SUM(CAST(${schema.swapEvents.amountInUsd} AS REAL))`
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.poolAddress, poolAddress),
            eq(schema.swapEvents.chain, chainName),
            gte(schema.swapEvents.timestamp, sevenDaysAgo)
          )
        );

      const volume24h = swaps24h[0]?.volume || 0;
      const fees24h = swaps24h[0]?.fees || 0;
      const volume7d = swaps7d[0]?.volume || 0;

      // 计算流动性USD价值（需要价格数据）
      const liquidityUsd = await this.calculateLiquidityUSD(poolAddress, chainName);
      
      // 计算APY
      const apy = liquidityUsd > 0 ? (fees24h * 365 / liquidityUsd) * 100 : 0;

      return {
        liquidityUsd,
        volume24h,
        volume7d,
        fees24h,
        apy
      };

    } catch (error) {
      console.error('Error calculating 24h stats:', error);
      return {
        liquidityUsd: 0,
        volume24h: 0,
        volume7d: 0,
        fees24h: 0,
        apy: 0
      };
    }
  }

  /**
   * 计算流动性USD价值
   */
  private async calculateLiquidityUSD(poolAddress: string, chainName: string): Promise<number> {
    try {
      const poolInfo = await this.onChainService.getPoolInfo(chainName, poolAddress);
      
      // 获取token价格
      const [priceX, priceY] = await Promise.all([
        this.onChainService.getTokenPriceUSD(chainName, poolInfo.tokenX.address as `0x${string}`),
        this.onChainService.getTokenPriceUSD(chainName, poolInfo.tokenY.address as `0x${string}`)
      ]);

      // 计算USD价值
      const reserveXUsd = Number(poolInfo.reserves.reserveX) / Math.pow(10, poolInfo.tokenX.decimals) * priceX;
      const reserveYUsd = Number(poolInfo.reserves.reserveY) / Math.pow(10, poolInfo.tokenY.decimals) * priceY;

      return reserveXUsd + reserveYUsd;

    } catch (error) {
      console.error('Error calculating liquidity USD:', error);
      return 0;
    }
  }

  /**
   * 更新聚合统计数据
   */
  private async updateAggregateStats(chainName: string): Promise<void> {
    try {
      console.log(`📈 Updating aggregate stats for ${chainName}`);
      
      // 计算链级别的统计数据
      const aggregateStats = await this.db
        .select({
          totalPools: count(schema.pools.id),
          totalLiquidity: sql<number>`SUM(CAST(${schema.poolStats.liquidityUsd} AS REAL))`,
          totalVolume24h: sql<number>`SUM(CAST(${schema.poolStats.volume24h} AS REAL))`,
          totalFees24h: sql<number>`SUM(CAST(${schema.poolStats.fees24h} AS REAL))`
        })
        .from(schema.pools)
        .leftJoin(schema.poolStats, eq(schema.pools.address, schema.poolStats.poolAddress))
        .where(eq(schema.pools.chain, chainName));

      // 这里可以将聚合统计保存到专门的表中
      console.log(`📊 Chain ${chainName} stats:`, aggregateStats[0]);

    } catch (error) {
      console.error('Error updating aggregate stats:', error);
    }
  }

  /**
   * 清理过期数据
   */
  private async cleanupExpiredData(chainName: string): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
      
      // 清理旧的价格历史
      await this.db
        .delete(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.chain, chainName),
            lte(schema.priceHistory.timestamp, cutoffDate)
          )
        );

      console.log(`🧹 Cleaned up expired data for ${chainName}`);

    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }

  // 辅助方法

  private async getAllPoolsForChain(chainName: string): Promise<any[]> {
    return await this.db
      .select()
      .from(schema.pools)
      .where(eq(schema.pools.chain, chainName));
  }

  private async getLastFactorySyncBlock(chainName: string): Promise<number> {
    const result = await this.db
      .select({ lastBlockNumber: schema.syncStatus.lastBlockNumber })
      .from(schema.syncStatus)
      .where(
        and(
          eq(schema.syncStatus.chain, chainName),
          eq(schema.syncStatus.contractAddress, 'factory'),
          eq(schema.syncStatus.eventType, 'pool_discovery')
        )
      )
      .orderBy(desc(schema.syncStatus.updatedAt))
      .limit(1);

    return result[0]?.lastBlockNumber || Number(this.chainConfigs.get(chainName)?.startBlock || 0);
  }

  private async updateFactorySyncStatus(chainName: string, blockNumber: number): Promise<void> {
    await this.db.insert(schema.syncStatus).values({
      chain: chainName,
      contractAddress: 'factory',
      eventType: 'pool_discovery',
      lastBlockNumber: blockNumber,
      lastLogIndex: 0,
      updatedAt: new Date()
    });
  }

  private async getPoolEventCount(poolAddress: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(schema.swapEvents)
      .where(eq(schema.swapEvents.poolAddress, poolAddress));

    return result[0]?.count || 0;
  }

  private async upsertToken(chainName: string, tokenInfo: any): Promise<void> {
    try {
      await this.db.insert(schema.tokens).values({
        address: tokenInfo.address,
        chain: chainName,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        logoURI: tokenInfo.logoURI || null,
        createdAt: new Date()
      });
    } catch (error) {
      // Token可能已存在，忽略错误
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 公共API方法

  /**
   * 获取同步状态
   */
  getSyncStatus(): { [chainName: string]: SyncMetrics } {
    const status: { [chainName: string]: SyncMetrics } = {};
    for (const [chainName, metrics] of this.syncMetrics.entries()) {
      status[chainName] = { ...metrics };
    }
    return status;
  }

  /**
   * 手动同步特定池
   */
  async syncSpecificPool(chainName: string, poolAddress: string): Promise<void> {
    const listener = this.eventListeners.get(chainName);
    if (!listener) {
      throw new Error(`No listener found for chain: ${chainName}`);
    }

    await listener.syncPoolEvents(poolAddress);
    console.log(`✅ Manually synced pool ${poolAddress} on ${chainName}`);
  }

  /**
   * 强制重新发现池
   */
  async forcePoolDiscovery(chainName: string): Promise<void> {
    // 重置factory同步状态
    await this.db
      .delete(schema.syncStatus)
      .where(
        and(
          eq(schema.syncStatus.chain, chainName),
          eq(schema.syncStatus.contractAddress, 'factory')
        )
      );

    await this.discoverNewPools(chainName);
  }

  /**
   * 获取详细的链状态
   */
  async getChainSyncStatus(): Promise<ChainSyncStatus[]> {
    const statuses: ChainSyncStatus[] = [];

    for (const chainName of this.chainConfigs.keys()) {
      const poolsCount = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(eq(schema.pools.chain, chainName));

      const eventsCount = await this.db
        .select({ count: count() })
        .from(schema.swapEvents)
        .where(eq(schema.swapEvents.chain, chainName));

      const lastSync = await this.db
        .select({ blockNumber: schema.syncStatus.lastBlockNumber, updatedAt: schema.syncStatus.updatedAt })
        .from(schema.syncStatus)
        .where(eq(schema.syncStatus.chain, chainName))
        .orderBy(desc(schema.syncStatus.updatedAt))
        .limit(1);

      statuses.push({
        chain: chainName,
        lastBlockSynced: lastSync[0]?.blockNumber || 0,
        isActive: this.eventListeners.has(chainName),
        lastSyncTime: lastSync[0]?.updatedAt?.getTime() || 0,
        poolsCount: poolsCount[0]?.count || 0,
        eventsCount: eventsCount[0]?.count || 0
      });
    }

    return statuses;
  }
}

export function createIndustrialSyncCoordinator(db: DrizzleD1Database<typeof schema>): IndustrialSyncCoordinator {
  return new IndustrialSyncCoordinator(db);
}
