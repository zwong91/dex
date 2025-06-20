import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, lte, desc, asc, like, sql, gt, count, sum, avg, max, min } from 'drizzle-orm';
import * as schema from '../../database/schema';
import type { Env } from '../../index';

export interface PoolQueryFilters {
  chain?: string;
  tokenX?: string;
  tokenY?: string;
  minLiquidity?: number;
  maxLiquidity?: number;
  status?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SwapEventFilters {
  poolAddress?: string;
  chain?: string;
  sender?: string;
  tokenIn?: string;
  tokenOut?: string;
  minAmount?: string;
  maxAmount?: string;
  startTime?: number;
  endTime?: number;
}

export interface LiquidityEventFilters {
  poolAddress?: string;
  chain?: string;
  user?: string;
  eventType?: 'deposit' | 'withdraw';
  startTime?: number;
  endTime?: number;
}

export interface UserPositionFilters {
  userAddress?: string;
  poolAddress?: string;
  chain?: string;
  minLiquidity?: string;
}

export interface PoolStatsData {
  poolAddress: string;
  chain: string;
  reserveX: string;
  reserveY: string;
  activeBinId: number;
  totalSupply: string;
  liquidityUsd: number;
  volume24h: number;
  volume7d: number;
  fees24h: number;
  apy: number;
  blockNumber: number;
  timestamp: number;
}

export interface PoolAnalytics {
  totalPools: number;
  totalLiquidity: number;
  totalVolume24h: number;
  totalFees24h: number;
  averageApy: number;
  activeUsers24h: number;
  totalTransactions24h: number;
}

export interface UserAnalytics {
  userAddress: string;
  totalLiquidity: number;
  activePools: number;
  totalSwaps: number;
  totalFees: number;
  lastActivityTime: number;
  topPools: Array<{
    poolAddress: string;
    liquidity: number;
    percentage: number;
  }>;
}

export class DatabaseService {
  private db: ReturnType<typeof drizzle>;
  
  constructor(env: Env) {
    if (!env.D1_DATABASE) {
      throw new Error('D1_DATABASE not configured');
    }
    this.db = drizzle(env.D1_DATABASE, { schema });
  }

  /**
   * 获取流动性池列表（带分页和过滤）
   */
  async getPools(filters: PoolQueryFilters = {}, pagination: PaginationOptions = {}): Promise<{
    pools: any[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    try {
      const {
        chain,
        tokenX,
        tokenY,
        minLiquidity,
        maxLiquidity,
        status = 'active',
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'liquidityUsd',
        sortOrder = 'desc'
      } = pagination;

      const offset = (page - 1) * limit;

      // 构建查询条件
      const conditions = [];
      
      if (chain) {
        conditions.push(eq(schema.pools.chain, chain));
      }
      
      if (tokenX) {
        conditions.push(eq(schema.pools.tokenX, tokenX.toLowerCase()));
      }
      
      if (tokenY) {
        conditions.push(eq(schema.pools.tokenY, tokenY.toLowerCase()));
      }
      
      if (status) {
        conditions.push(eq(schema.pools.status, status));
      }
      
      if (search) {
        conditions.push(
          sql`(${schema.pools.name} LIKE ${`%${search}%`} OR 
               ${schema.pools.address} LIKE ${`%${search}%`})`
        );
      }

      // 获取总数
      const totalResult = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult[0]?.count || 0;

      // 获取池列表（关联统计数据）
      const pools = await this.db
        .select({
          id: schema.pools.id,
          address: schema.pools.address,
          chain: schema.pools.chain,
          tokenX: schema.pools.tokenX,
          tokenY: schema.pools.tokenY,
          binStep: schema.pools.binStep,
          name: schema.pools.name,
          status: schema.pools.status,
          version: schema.pools.version,
          createdAt: schema.pools.createdAt,
          // 关联统计数据
          reserveX: schema.poolStats.reserveX,
          reserveY: schema.poolStats.reserveY,
          activeBinId: schema.poolStats.activeBinId,
          totalSupply: schema.poolStats.totalSupply,
          liquidityUsd: schema.poolStats.liquidityUsd,
          volume24h: schema.poolStats.volume24h,
          volume7d: schema.poolStats.volume7d,
          fees24h: schema.poolStats.fees24h,
          apy: schema.poolStats.apy,
          // 代币信息
          tokenXSymbol: sql`tokenX.symbol`,
          tokenXDecimals: sql`tokenX.decimals`,
          tokenXLogo: sql`tokenX.logo_uri`,
          tokenYSymbol: sql`tokenY.symbol`,
          tokenYDecimals: sql`tokenY.decimals`,
          tokenYLogo: sql`tokenY.logo_uri`,
        })
        .from(schema.pools)
        .leftJoin(
          schema.poolStats,
          eq(schema.pools.address, schema.poolStats.poolAddress)
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenX`,
          sql`${schema.pools.tokenX} = tokenX.address AND ${schema.pools.chain} = tokenX.chain`
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenY`,
          sql`${schema.pools.tokenY} = tokenY.address AND ${schema.pools.chain} = tokenY.chain`
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(sql`${sortBy}`)
            : asc(sql`${sortBy}`)
        )
        .limit(limit)
        .offset(offset);

      return {
        pools,
        total,
        page,
        limit,
        hasMore: offset + pools.length < total
      };
    } catch (error) {
      console.error('Failed to get pools:', error);
      throw error;
    }
  }

  /**
   * 获取单个池的详细信息
   */
  async getPoolDetails(poolAddress: string, chain?: string): Promise<any> {
    try {
      const conditions = [eq(schema.pools.address, poolAddress.toLowerCase())];
      
      if (chain) {
        conditions.push(eq(schema.pools.chain, chain));
      }

      const result = await this.db
        .select({
          // 池基本信息
          id: schema.pools.id,
          address: schema.pools.address,
          chain: schema.pools.chain,
          tokenX: schema.pools.tokenX,
          tokenY: schema.pools.tokenY,
          binStep: schema.pools.binStep,
          name: schema.pools.name,
          status: schema.pools.status,
          version: schema.pools.version,
          createdAt: schema.pools.createdAt,
          // 最新统计数据
          reserveX: schema.poolStats.reserveX,
          reserveY: schema.poolStats.reserveY,
          activeBinId: schema.poolStats.activeBinId,
          totalSupply: schema.poolStats.totalSupply,
          liquidityUsd: schema.poolStats.liquidityUsd,
          volume24h: schema.poolStats.volume24h,
          volume7d: schema.poolStats.volume7d,
          fees24h: schema.poolStats.fees24h,
          apy: schema.poolStats.apy,
          blockNumber: schema.poolStats.blockNumber,
          timestamp: schema.poolStats.timestamp,
          // 代币信息
          tokenXSymbol: sql`tokenX.symbol`,
          tokenXName: sql`tokenX.name`,
          tokenXDecimals: sql`tokenX.decimals`,
          tokenXLogo: sql`tokenX.logo_uri`,
          tokenYSymbol: sql`tokenY.symbol`,
          tokenYName: sql`tokenY.name`,
          tokenYDecimals: sql`tokenY.decimals`,
          tokenYLogo: sql`tokenY.logo_uri`,
        })
        .from(schema.pools)
        .leftJoin(
          schema.poolStats,
          eq(schema.pools.address, schema.poolStats.poolAddress)
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenX`,
          sql`${schema.pools.tokenX} = tokenX.address AND ${schema.pools.chain} = tokenX.chain`
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenY`,
          sql`${schema.pools.tokenY} = tokenY.address AND ${schema.pools.chain} = tokenY.chain`
        )
        .where(and(...conditions))
        .orderBy(desc(schema.poolStats.timestamp))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Failed to get pool details:', error);
      throw error;
    }
  }

  /**
   * 获取池的历史统计数据
   */
  async getPoolHistory(
    poolAddress: string,
    startTime: number,
    endTime: number,
    interval: '1h' | '4h' | '1d' | '1w' = '1h'
  ): Promise<PoolStatsData[]> {
    try {
      const conditions = [
        eq(schema.poolStats.poolAddress, poolAddress.toLowerCase()),
        gte(schema.poolStats.timestamp, new Date(startTime)),
        lte(schema.poolStats.timestamp, new Date(endTime))
      ];

      // 根据时间间隔分组数据
      let timeGrouping: any;
      switch (interval) {
        case '1h':
          timeGrouping = sql`(${schema.poolStats.timestamp} / 3600000) * 3600000`;
          break;
        case '4h':
          timeGrouping = sql`(${schema.poolStats.timestamp} / 14400000) * 14400000`;
          break;
        case '1d':
          timeGrouping = sql`(${schema.poolStats.timestamp} / 86400000) * 86400000`;
          break;
        case '1w':
          timeGrouping = sql`(${schema.poolStats.timestamp} / 604800000) * 604800000`;
          break;
      }

      const result = await this.db
        .select({
          poolAddress: schema.poolStats.poolAddress,
          chain: schema.poolStats.chain,
          reserveX: schema.poolStats.reserveX,
          reserveY: schema.poolStats.reserveY,
          activeBinId: schema.poolStats.activeBinId,
          totalSupply: schema.poolStats.totalSupply,
          liquidityUsd: avg(schema.poolStats.liquidityUsd),
          volume24h: sum(schema.poolStats.volume24h),
          volume7d: sum(schema.poolStats.volume7d),
          fees24h: sum(schema.poolStats.fees24h),
          apy: avg(schema.poolStats.apy),
          blockNumber: max(schema.poolStats.blockNumber),
          timestamp: timeGrouping,
        })
        .from(schema.poolStats)
        .where(and(...conditions))
        .groupBy(timeGrouping)
        .orderBy(asc(timeGrouping));

      return result.map(item => ({
        poolAddress: item.poolAddress,
        chain: item.chain,
        reserveX: item.reserveX,
        reserveY: item.reserveY,
        activeBinId: item.activeBinId,
        totalSupply: item.totalSupply,
        liquidityUsd: Number(item.liquidityUsd) || 0,
        volume24h: Number(item.volume24h) || 0,
        volume7d: Number(item.volume7d) || 0,
        fees24h: Number(item.fees24h) || 0,
        apy: Number(item.apy) || 0,
        blockNumber: item.blockNumber || 0,
        timestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : Number(item.timestamp)
      })) as PoolStatsData[];
    } catch (error) {
      console.error('Failed to get pool history:', error);
      throw error;
    }
  }

  /**
   * 获取交易事件列表
   */
  async getSwapEvents(
    filters: SwapEventFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    try {
      const {
        poolAddress,
        chain,
        sender,
        startTime,
        endTime
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      const offset = (page - 1) * limit;

      // 构建查询条件
      const conditions = [];
      
      if (poolAddress) {
        conditions.push(eq(schema.swapEvents.poolAddress, poolAddress.toLowerCase()));
      }
      
      if (chain) {
        conditions.push(eq(schema.swapEvents.chain, chain));
      }
      
      if (sender) {
        conditions.push(eq(schema.swapEvents.sender, sender.toLowerCase()));
      }
      
      if (startTime) {
        conditions.push(gte(schema.swapEvents.timestamp, new Date(startTime)));
      }
      
      if (endTime) {
        conditions.push(lte(schema.swapEvents.timestamp, new Date(endTime)));
      }

      // 获取总数
      const totalResult = await this.db
        .select({ count: count() })
        .from(schema.swapEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult?.[0]?.count || 0;

      // 获取事件列表
      const events = await this.db
        .select()
        .from(schema.swapEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(sql`${sortBy}`)
            : asc(sql`${sortBy}`)
        )
        .limit(limit)
        .offset(offset);

      return {
        events,
        total,
        page,
        limit,
        hasMore: offset + events.length < total
      };
    } catch (error) {
      console.error('Failed to get swap events:', error);
      throw error;
    }
  }

  /**
   * 获取流动性事件列表
   */
  async getLiquidityEvents(
    filters: LiquidityEventFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    try {
      const {
        poolAddress,
        chain,
        user,
        eventType,
        startTime,
        endTime
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      const offset = (page - 1) * limit;

      // 构建查询条件
      const conditions = [];
      
      if (poolAddress) {
        conditions.push(eq(schema.liquidityEvents.poolAddress, poolAddress.toLowerCase()));
      }
      
      if (chain) {
        conditions.push(eq(schema.liquidityEvents.chain, chain));
      }
      
      if (user) {
        conditions.push(eq(schema.liquidityEvents.user, user.toLowerCase()));
      }
      
      if (eventType) {
        conditions.push(eq(schema.liquidityEvents.eventType, eventType));
      }
      
      if (startTime) {
        conditions.push(gte(schema.liquidityEvents.timestamp, new Date(startTime)));
      }
      
      if (endTime) {
        conditions.push(lte(schema.liquidityEvents.timestamp, new Date(endTime)));
      }

      // 获取总数
      const totalResult = await this.db
        .select({ count: count() })
        .from(schema.liquidityEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult?.[0]?.count || 0;

      // 获取事件列表
      const events = await this.db
        .select()
        .from(schema.liquidityEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(sql`${sortBy}`)
            : asc(sql`${sortBy}`)
        )
        .limit(limit)
        .offset(offset);

      return {
        events,
        total,
        page,
        limit,
        hasMore: offset + events.length < total
      };
    } catch (error) {
      console.error('Failed to get liquidity events:', error);
      throw error;
    }
  }

  /**
   * 获取用户流动性仓位
   */
  async getUserPositions(
    filters: UserPositionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    positions: any[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    try {
      const {
        userAddress,
        poolAddress,
        chain,
        minLiquidity
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'liquidityUsd',
        sortOrder = 'desc'
      } = pagination;

      const offset = (page - 1) * limit;

      // 构建查询条件
      const conditions = [];
      
      if (userAddress) {
        conditions.push(eq(schema.userPositions.userAddress, userAddress.toLowerCase()));
      }
      
      if (poolAddress) {
        conditions.push(eq(schema.userPositions.poolAddress, poolAddress.toLowerCase()));
      }
      
      if (chain) {
        conditions.push(eq(schema.userPositions.chain, chain));
      }
      
      if (minLiquidity) {
        conditions.push(gt(schema.userPositions.liquidity, minLiquidity));
      }

      // 获取总数
      const totalResult = await this.db
        .select({ count: count() })
        .from(schema.userPositions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult?.[0]?.count || 0;

      // 获取仓位列表（关联池信息）
      const positions = await this.db
        .select({
          // 仓位信息
          id: schema.userPositions.id,
          userAddress: schema.userPositions.userAddress,
          poolAddress: schema.userPositions.poolAddress,
          chain: schema.userPositions.chain,
          binId: schema.userPositions.binId,
          liquidity: schema.userPositions.liquidity,
          liquidityUsd: schema.userPositions.liquidityUsd,
          createdAt: schema.userPositions.createdAt,
          updatedAt: schema.userPositions.updatedAt,
          // 池信息
          poolName: schema.pools.name,
          tokenX: schema.pools.tokenX,
          tokenY: schema.pools.tokenY,
          binStep: schema.pools.binStep,
          // 代币信息
          tokenXSymbol: sql`tokenX.symbol`,
          tokenXDecimals: sql`tokenX.decimals`,
          tokenYSymbol: sql`tokenY.symbol`,
          tokenYDecimals: sql`tokenY.decimals`,
        })
        .from(schema.userPositions)
        .leftJoin(
          schema.pools,
          eq(schema.userPositions.poolAddress, schema.pools.address)
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenX`,
          sql`${schema.pools.tokenX} = tokenX.address AND ${schema.pools.chain} = tokenX.chain`
        )
        .leftJoin(
          sql`${schema.tokens} AS tokenY`,
          sql`${schema.pools.tokenY} = tokenY.address AND ${schema.pools.chain} = tokenY.chain`
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(sql`${sortBy}`)
            : asc(sql`${sortBy}`)
        )
        .limit(limit)
        .offset(offset);

      return {
        positions,
        total,
        page,
        limit,
        hasMore: offset + positions.length < total
      };
    } catch (error) {
      console.error('Failed to get user positions:', error);
      throw error;
    }
  }

  /**
   * 获取平台整体分析数据
   */
  async getPoolAnalytics(chain?: string): Promise<PoolAnalytics> {
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const conditions = [];
      if (chain) {
        conditions.push(eq(schema.pools.chain, chain));
      }

      // 获取总池数
      const totalPoolsResult = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // 获取总流动性和其他聚合数据
      const aggregateResult = await this.db
        .select({
          totalLiquidity: sum(schema.poolStats.liquidityUsd),
          totalVolume24h: sum(schema.poolStats.volume24h),
          totalFees24h: sum(schema.poolStats.fees24h),
          averageApy: avg(schema.poolStats.apy),
        })
        .from(schema.poolStats)
        .leftJoin(schema.pools, eq(schema.poolStats.poolAddress, schema.pools.address))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // 获取24小时内活跃用户数
      const activeUsersResult = await this.db
        .select({
          count: sql`COUNT(DISTINCT ${schema.swapEvents.sender})`
        })
        .from(schema.swapEvents)
        .leftJoin(schema.pools, eq(schema.swapEvents.poolAddress, schema.pools.address))
        .where(
          and(
            gte(schema.swapEvents.timestamp, new Date(oneDayAgo)),
            ...(conditions.length > 0 ? conditions : [])
          )
        );

      // 获取24小时内总交易数
      const totalTransactionsResult = await this.db
        .select({ count: count() })
        .from(schema.swapEvents)
        .leftJoin(schema.pools, eq(schema.swapEvents.poolAddress, schema.pools.address))
        .where(
          and(
            gte(schema.swapEvents.timestamp, new Date(oneDayAgo)),
            ...(conditions.length > 0 ? conditions : [])
          )
        );

      return {
        totalPools: totalPoolsResult?.[0]?.count || 0,
        totalLiquidity: Number(aggregateResult?.[0]?.totalLiquidity) || 0,
        totalVolume24h: Number(aggregateResult?.[0]?.totalVolume24h) || 0,
        totalFees24h: Number(aggregateResult?.[0]?.totalFees24h) || 0,
        averageApy: Number(aggregateResult?.[0]?.averageApy) || 0,
        activeUsers24h: Number(activeUsersResult?.[0]?.count) || 0,
        totalTransactions24h: Number(totalTransactionsResult?.[0]?.count) || 0
      };
    } catch (error) {
      console.error('Failed to get pool analytics:', error);
      throw error;
    }
  }

  /**
   * 获取用户分析数据
   */
  async getUserAnalytics(userAddress: string, chain?: string): Promise<UserAnalytics> {
    try {
      const user = userAddress.toLowerCase();
      
      const conditions = [eq(schema.userPositions.userAddress, user)];
      if (chain) {
        conditions.push(eq(schema.userPositions.chain, chain));
      }

      // 获取用户总流动性和活跃池数
      const liquidityResult = await this.db
        .select({
          totalLiquidity: sum(schema.userPositions.liquidityUsd),
          activePools: count(sql`DISTINCT ${schema.userPositions.poolAddress}`)
        })
        .from(schema.userPositions)
        .where(and(...conditions));

      // 获取用户交易统计
      const swapConditions = [eq(schema.swapEvents.sender, user)];
      if (chain) {
        swapConditions.push(eq(schema.swapEvents.chain, chain));
      }

      const swapResult = await this.db
        .select({
          totalSwaps: count(),
          totalFees: sum(schema.swapEvents.feesUsd),
          lastActivityTime: max(schema.swapEvents.timestamp)
        })
        .from(schema.swapEvents)
        .where(and(...swapConditions));

      // 获取用户前5大流动性池
      const topPoolsResult = await this.db
        .select({
          poolAddress: schema.userPositions.poolAddress,
          liquidity: sum(schema.userPositions.liquidityUsd),
        })
        .from(schema.userPositions)
        .where(and(...conditions))
        .groupBy(schema.userPositions.poolAddress)
        .orderBy(desc(sum(schema.userPositions.liquidityUsd)))
        .limit(5);

      const totalLiquidity = Number(liquidityResult?.[0]?.totalLiquidity) || 0;
      const topPools = topPoolsResult?.map(pool => ({
        poolAddress: pool.poolAddress,
        liquidity: Number(pool.liquidity) || 0,
        percentage: totalLiquidity > 0 ? ((Number(pool.liquidity) || 0) / totalLiquidity) * 100 : 0
      })) || [];

      return {
        userAddress,
        totalLiquidity,
        activePools: Number(liquidityResult?.[0]?.activePools) || 0,
        totalSwaps: Number(swapResult?.[0]?.totalSwaps) || 0,
        totalFees: Number(swapResult?.[0]?.totalFees) || 0,
        lastActivityTime: swapResult?.[0]?.lastActivityTime ? 
          (swapResult[0].lastActivityTime instanceof Date ? 
            swapResult[0].lastActivityTime.getTime() : 
            Number(swapResult[0].lastActivityTime)) : 0,
        topPools
      };
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      throw error;
    }
  }

  /**
   * 搜索代币
   */
  async searchTokens(query: string, chain?: string, limit: number = 20): Promise<any[]> {
    try {
      const conditions = [
        sql`(${schema.tokens.name} LIKE ${`%${query}%`} OR 
             ${schema.tokens.symbol} LIKE ${`%${query}%`} OR 
             ${schema.tokens.address} LIKE ${`%${query}%`})`
      ];

      if (chain) {
        conditions.push(eq(schema.tokens.chain, chain));
      }

      const result = await this.db
        .select()
        .from(schema.tokens)
        .where(and(...conditions))
        .orderBy(asc(schema.tokens.symbol))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Failed to search tokens:', error);
      throw error;
    }
  }

  /**
   * 更新池统计数据
   */
  async updatePoolStats(stats: PoolStatsData): Promise<void> {
    try {
      await this.db.insert(schema.poolStats).values({
        poolAddress: stats.poolAddress,
        chain: stats.chain,
        reserveX: stats.reserveX,
        reserveY: stats.reserveY,
        activeBinId: stats.activeBinId,
        totalSupply: stats.totalSupply,
        liquidityUsd: stats.liquidityUsd,
        volume24h: stats.volume24h,
        volume7d: stats.volume7d,
        fees24h: stats.fees24h,
        apy: stats.apy,
        blockNumber: stats.blockNumber,
        timestamp: new Date(stats.timestamp)
      });
    } catch (error) {
      console.error('Failed to update pool stats:', error);
      throw error;
    }
  }

  /**
   * 批量更新用户仓位
   */
  async updateUserPositions(positions: Array<{
    userAddress: string;
    poolAddress: string;
    chain: string;
    binId: number;
    liquidity: string;
    liquidityUsd?: number;
  }>): Promise<void> {
    try {
      if (positions.length === 0) return;

      // 批量插入或更新
      await this.db.insert(schema.userPositions).values(
        positions.map(pos => ({
          userAddress: pos.userAddress.toLowerCase(),
          poolAddress: pos.poolAddress.toLowerCase(),
          chain: pos.chain,
          binId: pos.binId,
          liquidity: pos.liquidity,
          liquidityUsd: pos.liquidityUsd,
          updatedAt: new Date()
        }))
      );
    } catch (error) {
      console.error('Failed to update user positions:', error);
      throw error;
    }
  }
}

export { schema };
