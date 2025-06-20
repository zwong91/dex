import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql, gte, lte, inArray, count, sum, avg, max, min } from 'drizzle-orm';
import * as schema from '../database/schema';

export interface PoolQueryParams {
  chain: string;
  pageSize?: number;
  offset?: number;
  orderBy?: 'liquidity' | 'volume' | 'fees' | 'name' | 'apy';
  orderDirection?: 'asc' | 'desc';
  search?: string;
  minLiquidity?: number;
  minVolume?: number;
  tokenAddress?: string;
}

export interface TransactionQueryParams {
  chain: string;
  poolAddress?: string;
  userAddress?: string;
  tokenAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  eventType?: 'swap' | 'deposit' | 'withdraw';
  pageSize?: number;
  offset?: number;
}

export interface AnalyticsParams {
  chain: string;
  poolAddress?: string;
  period?: '1h' | '24h' | '7d' | '30d';
  granularity?: 'hour' | 'day';
}

export class EnhancedDatabaseService {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  /**
   * 高级池查询 - 支持复杂过滤和排序
   */
  async getPoolsAdvanced(params: PoolQueryParams) {
    const { 
      chain, 
      pageSize = 20, 
      offset = 0, 
      orderBy = 'liquidity', 
      orderDirection = 'desc',
      search,
      minLiquidity = 0,
      minVolume = 0,
      tokenAddress
    } = params;

    try {
      // 简化查询，分步骤获取数据
      let poolsQuery = this.db
        .select()
        .from(schema.pools)
        .where(eq(schema.pools.chain, chain));

      // 执行基础池查询
      const pools = await poolsQuery.limit(pageSize).offset(offset);

      // 为每个池获取最新统计和token信息
      const enrichedPools = await Promise.all(
        pools.map(async (pool) => {
          // 获取最新统计
          const stats = await this.db
            .select()
            .from(schema.poolStats)
            .where(
              and(
                eq(schema.poolStats.poolAddress, pool.address),
                eq(schema.poolStats.chain, chain)
              )
            )
            .orderBy(desc(schema.poolStats.timestamp))
            .limit(1);

          // 获取token信息
          const [tokenX, tokenY] = await Promise.all([
            this.db
              .select()
              .from(schema.tokens)
              .where(
                and(
                  eq(schema.tokens.address, pool.tokenX),
                  eq(schema.tokens.chain, chain)
                )
              )
              .limit(1),
            this.db
              .select()
              .from(schema.tokens)
              .where(
                and(
                  eq(schema.tokens.address, pool.tokenY),
                  eq(schema.tokens.chain, chain)
                )
              )
              .limit(1)
          ]);

          return {
            pool,
            stats: stats[0] || null,
            tokenX: tokenX[0] || null,
            tokenY: tokenY[0] || null
          };
        })
      );

      // 获取总数
      const totalCount = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(eq(schema.pools.chain, chain));

      return {
        pools: enrichedPools.map(result => ({
          pairAddress: result.pool.address,
          chain: result.pool.chain,
          name: result.pool.name,
          status: result.pool.status,
          version: result.pool.version,
          tokenX: result.tokenX,
          tokenY: result.tokenY,
          reserveX: result.stats?.reserveX || '0',
          reserveY: result.stats?.reserveY || '0',
          lbBinStep: result.pool.binStep,
          activeBinId: result.stats?.activeBinId || 0,
          liquidityUsd: result.stats?.liquidityUsd || 0,
          volume24h: result.stats?.volume24h || 0,
          volume7d: result.stats?.volume7d || 0,
          fees24h: result.stats?.fees24h || 0,
          apy: result.stats?.apy || 0,
          totalSupply: result.stats?.totalSupply || '0'
        })),
        pagination: {
          total: totalCount[0].count,
          page: Math.floor(offset / pageSize) + 1,
          pageSize,
          hasMore: offset + pageSize < totalCount[0].count
        }
      };
    } catch (error) {
      console.error('Error getting advanced pools:', error);
      throw error;
    }
  }

  /**
   * 获取交易历史 - 支持多种过滤条件
   */
  async getTransactionHistory(params: TransactionQueryParams) {
    const {
      chain,
      poolAddress,
      userAddress,
      tokenAddress,
      fromDate,
      toDate,
      eventType,
      pageSize = 50,
      offset = 0
    } = params;

    try {
      let conditions = [eq(schema.swapEvents.chain, chain)];

      if (poolAddress) {
        conditions.push(eq(schema.swapEvents.poolAddress, poolAddress));
      }

      if (userAddress) {
        conditions.push(
          sql`(${schema.swapEvents.sender} = ${userAddress} OR ${schema.swapEvents.to} = ${userAddress})`
        );
      }

      if (tokenAddress) {
        conditions.push(
          sql`(${schema.swapEvents.tokenInAddress} = ${tokenAddress} OR ${schema.swapEvents.tokenOutAddress} = ${tokenAddress})`
        );
      }

      if (fromDate) {
        conditions.push(gte(schema.swapEvents.timestamp, fromDate));
      }

      if (toDate) {
        conditions.push(lte(schema.swapEvents.timestamp, toDate));
      }

      // 执行swap事件查询
      const swapResults = await this.db
        .select({
          id: schema.swapEvents.id,
          txHash: schema.swapEvents.txHash,
          poolAddress: schema.swapEvents.poolAddress,
          sender: schema.swapEvents.sender,
          to: schema.swapEvents.to,
          tokenInAddress: schema.swapEvents.tokenInAddress,
          tokenOutAddress: schema.swapEvents.tokenOutAddress,
          amountIn: schema.swapEvents.amountIn,
          amountOut: schema.swapEvents.amountOut,
          amountInUsd: schema.swapEvents.amountInUsd,
          amountOutUsd: schema.swapEvents.amountOutUsd,
          fees: schema.swapEvents.fees,
          feesUsd: schema.swapEvents.feesUsd,
          blockNumber: schema.swapEvents.blockNumber,
          timestamp: schema.swapEvents.timestamp,
          eventType: sql`'swap'`.as('eventType')
        })
        .from(schema.swapEvents)
        .where(and(...conditions))
        .orderBy(desc(schema.swapEvents.timestamp))
        .limit(pageSize)
        .offset(offset);

      // 如果需要流动性事件，也查询它们
      let liquidityResults: any[] = [];
      if (!eventType || eventType === 'deposit' || eventType === 'withdraw') {
        let liquidityConditions = [eq(schema.liquidityEvents.chain, chain)];

        if (poolAddress) {
          liquidityConditions.push(eq(schema.liquidityEvents.poolAddress, poolAddress));
        }

        if (userAddress) {
          liquidityConditions.push(eq(schema.liquidityEvents.user, userAddress));
        }

        if (eventType) {
          liquidityConditions.push(eq(schema.liquidityEvents.eventType, eventType));
        }

        if (fromDate) {
          liquidityConditions.push(gte(schema.liquidityEvents.timestamp, fromDate));
        }

        if (toDate) {
          liquidityConditions.push(lte(schema.liquidityEvents.timestamp, toDate));
        }

        liquidityResults = await this.db
          .select({
            id: schema.liquidityEvents.id,
            txHash: schema.liquidityEvents.txHash,
            poolAddress: schema.liquidityEvents.poolAddress,
            user: schema.liquidityEvents.user,
            eventType: schema.liquidityEvents.eventType,
            binIds: schema.liquidityEvents.binIds,
            amounts: schema.liquidityEvents.amounts,
            liquidity: schema.liquidityEvents.liquidity,
            liquidityUsd: schema.liquidityEvents.liquidityUsd,
            blockNumber: schema.liquidityEvents.blockNumber,
            timestamp: schema.liquidityEvents.timestamp
          })
          .from(schema.liquidityEvents)
          .where(and(...liquidityConditions))
          .orderBy(desc(schema.liquidityEvents.timestamp))
          .limit(pageSize)
          .offset(offset);
      }

      // 合并和排序结果
      const allResults = [
        ...swapResults.map(r => ({ ...r, type: 'swap' })),
        ...liquidityResults.map(r => ({ ...r, type: 'liquidity' }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        transactions: allResults.slice(0, pageSize),
        pagination: {
          total: allResults.length,
          page: Math.floor(offset / pageSize) + 1,
          pageSize,
          hasMore: allResults.length > pageSize
        }
      };

    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * 获取用户仓位信息
   */
  async getUserPositions(userAddress: string, chain: string) {
    try {
      const positions = await this.db
        .select({
          position: schema.userPositions,
          pool: schema.pools,
          tokenX: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals
          },
          tokenY: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals
          }
        })
        .from(schema.userPositions)
        .leftJoin(schema.pools, eq(schema.userPositions.poolAddress, schema.pools.address))
        .leftJoin(schema.tokens, eq(schema.pools.tokenX, schema.tokens.address))
        .leftJoin(schema.tokens, eq(schema.pools.tokenY, schema.tokens.address))
        .where(
          and(
            eq(schema.userPositions.userAddress, userAddress),
            eq(schema.userPositions.chain, chain)
          )
        )
        .orderBy(desc(schema.userPositions.updatedAt));

      return positions.map(p => ({
        id: p.position.id,
        poolAddress: p.position.poolAddress,
        poolName: p.pool?.name || 'Unknown Pool',
        tokenX: p.tokenX,
        tokenY: p.tokenY,
        binId: p.position.binId,
        liquidity: p.position.liquidity,
        liquidityUsd: p.position.liquidityUsd || 0,
        createdAt: p.position.createdAt,
        updatedAt: p.position.updatedAt
      }));

    } catch (error) {
      console.error('Error getting user positions:', error);
      throw error;
    }
  }

  /**
   * 获取池的分析数据
   */
  async getPoolAnalytics(params: AnalyticsParams) {
    const { chain, poolAddress, period = '24h', granularity = 'hour' } = params;

    try {
      const now = new Date();
      let fromDate: Date;
      let timeFormat: string;
      let groupBy: string;

      // 设置时间范围和分组
      switch (period) {
        case '1h':
          fromDate = new Date(now.getTime() - 60 * 60 * 1000);
          timeFormat = '%Y-%m-%d %H:%M';
          groupBy = "strftime('%Y-%m-%d %H:%M', datetime(timestamp/1000, 'unixepoch'))";
          break;
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          timeFormat = granularity === 'hour' ? '%Y-%m-%d %H' : '%Y-%m-%d';
          groupBy = granularity === 'hour' 
            ? "strftime('%Y-%m-%d %H', datetime(timestamp/1000, 'unixepoch'))"
            : "strftime('%Y-%m-%d', datetime(timestamp/1000, 'unixepoch'))";
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          timeFormat = '%Y-%m-%d';
          groupBy = "strftime('%Y-%m-%d', datetime(timestamp/1000, 'unixepoch'))";
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          timeFormat = '%Y-%m-%d';
          groupBy = "strftime('%Y-%m-%d', datetime(timestamp/1000, 'unixepoch'))";
          break;
        default:
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          timeFormat = '%Y-%m-%d %H';
          groupBy = "strftime('%Y-%m-%d %H', datetime(timestamp/1000, 'unixepoch'))";
      }

      let conditions = [
        eq(schema.swapEvents.chain, chain),
        gte(schema.swapEvents.timestamp, fromDate)
      ];

      if (poolAddress) {
        conditions.push(eq(schema.swapEvents.poolAddress, poolAddress));
      }

      // 获取时间序列数据
      const volumeData = await this.db
        .select({
          timeGroup: sql`${groupBy}`.as('timeGroup'),
          volume: sql<number>`SUM(CAST(${schema.swapEvents.amountInUsd} AS REAL))`,
          fees: sql<number>`SUM(CAST(${schema.swapEvents.feesUsd} AS REAL))`,
          txCount: count(schema.swapEvents.id),
          avgAmountUsd: sql<number>`AVG(CAST(${schema.swapEvents.amountInUsd} AS REAL))`
        })
        .from(schema.swapEvents)
        .where(and(...conditions))
        .groupBy(sql`${groupBy}`)
        .orderBy(sql`${groupBy}`);

      // 获取流动性历史 - 简化版本，避免复杂的strftime
      const liquidityData = await this.db
        .select({
          liquidityUsd: avg(schema.poolStats.liquidityUsd),
          timestamp: schema.poolStats.timestamp
        })
        .from(schema.poolStats)
        .where(
          and(
            eq(schema.poolStats.chain, chain),
            poolAddress ? eq(schema.poolStats.poolAddress, poolAddress) : sql`1=1`,
            gte(schema.poolStats.timestamp, fromDate)
          )
        )
        .orderBy(schema.poolStats.timestamp)
        .limit(100); // 限制结果数量;

      return {
        volume: volumeData,
        liquidity: liquidityData,
        summary: {
          totalVolume: volumeData.reduce((sum, d) => sum + (d.volume || 0), 0),
          totalFees: volumeData.reduce((sum, d) => sum + (d.fees || 0), 0),
          totalTransactions: volumeData.reduce((sum, d) => sum + (d.txCount || 0), 0),
          avgLiquidity: liquidityData.length > 0 
            ? liquidityData.reduce((sum, d) => sum + (d.liquidityUsd || 0), 0) / liquidityData.length
            : 0
        }
      };

    } catch (error) {
      console.error('Error getting pool analytics:', error);
      throw error;
    }
  }

  /**
   * 获取顶级统计数据
   */
  async getTopStats(chain: string) {
    try {
      // 顶级流动性池
      const topPoolsByLiquidity = await this.db
        .select({
          pool: schema.pools,
          stats: schema.poolStats
        })
        .from(schema.pools)
        .leftJoin(schema.poolStats, eq(schema.pools.address, schema.poolStats.poolAddress))
        .where(eq(schema.pools.chain, chain))
        .orderBy(desc(schema.poolStats.liquidityUsd))
        .limit(10);

      // 顶级交易量池
      const topPoolsByVolume = await this.db
        .select({
          pool: schema.pools,
          stats: schema.poolStats
        })
        .from(schema.pools)
        .leftJoin(schema.poolStats, eq(schema.pools.address, schema.poolStats.poolAddress))
        .where(eq(schema.pools.chain, chain))
        .orderBy(desc(schema.poolStats.volume24h))
        .limit(10);

      // 最活跃用户（按交易次数）
      const topTraders = await this.db
        .select({
          user: schema.swapEvents.sender,
          txCount: count(schema.swapEvents.id),
          totalVolume: sql<number>`SUM(CAST(${schema.swapEvents.amountInUsd} AS REAL))`
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            gte(schema.swapEvents.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        )
        .groupBy(schema.swapEvents.sender)
        .orderBy(desc(count(schema.swapEvents.id)))
        .limit(10);

      // 最新大额交易
      const largeTransactions = await this.db
        .select({
          txHash: schema.swapEvents.txHash,
          poolAddress: schema.swapEvents.poolAddress,
          amountInUsd: schema.swapEvents.amountInUsd,
          timestamp: schema.swapEvents.timestamp
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            gte(schema.swapEvents.amountInUsd, 10000) // > $10k
          )
        )
        .orderBy(desc(schema.swapEvents.timestamp))
        .limit(20);

      return {
        topPoolsByLiquidity,
        topPoolsByVolume,
        topTraders,
        largeTransactions
      };

    } catch (error) {
      console.error('Error getting top stats:', error);
      throw error;
    }
  }

  /**
   * 添加或更新池
   */
  async upsertPool(poolData: {
    address: string;
    chain: string;
    tokenX: string;
    tokenY: string;
    binStep: number;
    name: string;
    status?: string;
    version?: string;
  }) {
    try {
      await this.db.insert(schema.pools).values({
        address: poolData.address,
        chain: poolData.chain,
        tokenX: poolData.tokenX,
        tokenY: poolData.tokenY,
        binStep: poolData.binStep,
        name: poolData.name,
        status: poolData.status || 'active',
        version: poolData.version || 'v2.2',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      // 如果池已存在，更新它
      await this.db
        .update(schema.pools)
        .set({
          name: poolData.name,
          status: poolData.status || 'active',
          updatedAt: new Date()
        })
        .where(eq(schema.pools.address, poolData.address));
    }
  }

  /**
   * 添加或更新代币
   */
  async upsertToken(tokenData: {
    address: string;
    chain: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }) {
    try {
      await this.db.insert(schema.tokens).values({
        address: tokenData.address,
        chain: tokenData.chain,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        logoURI: tokenData.logoURI,
        createdAt: new Date()
      });
    } catch (error) {
      // 如果代币已存在，更新它
      await this.db
        .update(schema.tokens)
        .set({
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals,
          logoURI: tokenData.logoURI
        })
        .where(
          and(
            eq(schema.tokens.address, tokenData.address),
            eq(schema.tokens.chain, tokenData.chain)
          )
        );
    }
  }

  /**
   * 批量插入交换事件
   */
  async batchInsertSwapEvents(events: any[]) {
    if (events.length === 0) return;

    try {
      // 分批插入以避免超出限制
      const batchSize = 100;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await this.db.insert(schema.swapEvents).values(batch);
      }
    } catch (error) {
      console.error('Error batch inserting swap events:', error);
      throw error;
    }
  }

  /**
   * 批量插入流动性事件
   */
  async batchInsertLiquidityEvents(events: any[]) {
    if (events.length === 0) return;

    try {
      const batchSize = 100;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await this.db.insert(schema.liquidityEvents).values(batch);
      }
    } catch (error) {
      console.error('Error batch inserting liquidity events:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const result = await this.db.select({ count: count() }).from(schema.pools);
      return {
        status: 'healthy',
        totalPools: result[0].count,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}

export function createEnhancedDatabaseService(db: DrizzleD1Database<typeof schema>): EnhancedDatabaseService {
  return new EnhancedDatabaseService(db);
}
