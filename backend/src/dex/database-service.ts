import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import * as schema from '../database/schema';

export class DatabaseService {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  /**
   * 获取流动性池列表
   */
  async getPools(params: {
    chain: string;
    pageSize?: number;
    offset?: number;
    orderBy?: 'liquidity' | 'volume' | 'fees' | 'name';
    orderDirection?: 'asc' | 'desc';
    search?: string;
  }) {
    const { 
      chain, 
      pageSize = 20, 
      offset = 0, 
      orderBy = 'liquidity', 
      orderDirection = 'desc',
      search 
    } = params;

    try {
      let query = this.db
        .select({
          pool: schema.pools,
          stats: schema.poolStats,
          tokenX: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals,
            logoURI: schema.tokens.logoURI
          },
          tokenY: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals,
            logoURI: schema.tokens.logoURI
          }
        })
        .from(schema.pools)
        .leftJoin(
          schema.poolStats,
          eq(schema.pools.address, schema.poolStats.poolAddress)
        )
        .leftJoin(
          schema.tokens,
          eq(schema.pools.tokenX, schema.tokens.address)
        )
        .leftJoin(
          schema.tokens,
          eq(schema.pools.tokenY, schema.tokens.address)
        )
        .where(eq(schema.pools.chain, chain));

      // 添加搜索过滤
      if (search) {
        const searchPattern = `%${search.toLowerCase()}%`;
        query = query.where(
          sql`LOWER(${schema.pools.name}) LIKE ${searchPattern} OR 
              LOWER(${schema.tokens.name}) LIKE ${searchPattern} OR 
              LOWER(${schema.tokens.symbol}) LIKE ${searchPattern}`
        );
      }

      // 添加排序
      const orderColumn = {
        liquidity: schema.poolStats.liquidityUsd,
        volume: schema.poolStats.volume24h,
        fees: schema.poolStats.fees24h,
        name: schema.pools.name
      }[orderBy];

      if (orderColumn) {
        query = orderDirection === 'asc' 
          ? query.orderBy(asc(orderColumn))
          : query.orderBy(desc(orderColumn));
      }

      // 添加分页
      const results = await query.limit(pageSize).offset(offset);

      // 获取总数
      const totalCount = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(eq(schema.pools.chain, chain));

      return {
        pools: results.map(result => ({
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
          volumeUsd: result.stats?.volume24h || 0,
          feesUsd: result.stats?.fees24h || 0,
          apy: result.stats?.apy || 0
        })),
        total: totalCount[0].count,
        page: Math.floor(offset / pageSize) + 1,
        pageSize
      };
    } catch (error) {
      console.error('Error getting pools:', error);
      throw error;
    }
  }

  /**
   * 获取指定池的详细信息
   */
  async getPoolDetails(chain: string, poolAddress: string) {
    try {
      const result = await this.db
        .select({
          pool: schema.pools,
          stats: schema.poolStats,
          tokenX: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals,
            logoURI: schema.tokens.logoURI
          },
          tokenY: {
            address: schema.tokens.address,
            name: schema.tokens.name,
            symbol: schema.tokens.symbol,
            decimals: schema.tokens.decimals,
            logoURI: schema.tokens.logoURI
          }
        })
        .from(schema.pools)
        .leftJoin(
          schema.poolStats,
          eq(schema.pools.address, schema.poolStats.poolAddress)
        )
        .leftJoin(
          schema.tokens,
          eq(schema.pools.tokenX, schema.tokens.address)
        )
        .leftJoin(
          schema.tokens,
          eq(schema.pools.tokenY, schema.tokens.address)
        )
        .where(
          and(
            eq(schema.pools.chain, chain),
            eq(schema.pools.address, poolAddress)
          )
        )
        .orderBy(desc(schema.poolStats.timestamp))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const pool = result[0];
      return {
        pairAddress: pool.pool.address,
        chain: pool.pool.chain,
        name: pool.pool.name,
        status: pool.pool.status,
        version: pool.pool.version,
        tokenX: pool.tokenX,
        tokenY: pool.tokenY,
        reserveX: pool.stats?.reserveX || '0',
        reserveY: pool.stats?.reserveY || '0',
        lbBinStep: pool.pool.binStep,
        activeBinId: pool.stats?.activeBinId || 0,
        liquidityUsd: pool.stats?.liquidityUsd || 0,
        volumeUsd: pool.stats?.volume24h || 0,
        feesUsd: pool.stats?.fees24h || 0,
        apy: pool.stats?.apy || 0,
        totalSupply: pool.stats?.totalSupply || '0'
      };
    } catch (error) {
      console.error('Error getting pool details:', error);
      throw error;
    }
  }

  /**
   * 获取用户在指定池的Bin IDs
   */
  async getUserBinIds(userAddress: string, chain: string, poolAddress: string) {
    try {
      const positions = await this.db
        .select({
          binId: schema.userPositions.binId,
          liquidity: schema.userPositions.liquidity,
          liquidityUsd: schema.userPositions.liquidityUsd
        })
        .from(schema.userPositions)
        .where(
          and(
            eq(schema.userPositions.userAddress, userAddress.toLowerCase()),
            eq(schema.userPositions.chain, chain),
            eq(schema.userPositions.poolAddress, poolAddress.toLowerCase())
          )
        )
        .orderBy(asc(schema.userPositions.binId));

      return positions.map(pos => ({
        binId: pos.binId,
        liquidity: pos.liquidity,
        liquidityUsd: pos.liquidityUsd || 0
      }));
    } catch (error) {
      console.error('Error getting user bin IDs:', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有池IDs
   */
  async getUserPoolIds(userAddress: string, chain: string) {
    try {
      const pools = await this.db
        .selectDistinct({
          poolAddress: schema.userPositions.poolAddress,
          totalLiquidity: sql<number>`SUM(CAST(${schema.userPositions.liquidity} AS REAL))`,
          totalLiquidityUsd: sql<number>`SUM(${schema.userPositions.liquidityUsd})`
        })
        .from(schema.userPositions)
        .where(
          and(
            eq(schema.userPositions.userAddress, userAddress.toLowerCase()),
            eq(schema.userPositions.chain, chain)
          )
        )
        .groupBy(schema.userPositions.poolAddress);

      return pools.map(pool => ({
        poolAddress: pool.poolAddress,
        totalLiquidity: pool.totalLiquidity?.toString() || '0',
        totalLiquidityUsd: pool.totalLiquidityUsd || 0
      }));
    } catch (error) {
      console.error('Error getting user pool IDs:', error);
      throw error;
    }
  }

  /**
   * 获取用户代币余额（从交易历史计算）
   */
  async getUserBalances(userAddress: string, chain: string, tokenAddresses?: string[]) {
    try {
      // 这里需要根据用户的交易历史来计算余额
      // 或者从链上实时获取（如果需要精确余额）
      
      let query = this.db
        .select({
          tokenAddress: schema.swapEvents.tokenInAddress,
          // 计算净流入/流出
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            sql`(${schema.swapEvents.sender} = ${userAddress.toLowerCase()} OR ${schema.swapEvents.to} = ${userAddress.toLowerCase()})`
          )
        );

      if (tokenAddresses && tokenAddresses.length > 0) {
        query = query.where(
          sql`${schema.swapEvents.tokenInAddress} IN (${tokenAddresses.join(',')}) OR 
              ${schema.swapEvents.tokenOutAddress} IN (${tokenAddresses.join(',')})`
        );
      }

      // TODO: 实现余额计算逻辑
      // 这是一个复杂的计算，需要考虑所有进出交易
      
      return [];
    } catch (error) {
      console.error('Error getting user balances:', error);
      throw error;
    }
  }

  /**
   * 获取用户交易历史
   */
  async getUserSwapHistory(
    userAddress: string, 
    chain: string, 
    params: {
      pageSize?: number;
      offset?: number;
      startTime?: number;
      endTime?: number;
    } = {}
  ) {
    const { pageSize = 50, offset = 0, startTime, endTime } = params;

    try {
      let query = this.db
        .select({
          swapEvent: schema.swapEvents,
          pool: {
            name: schema.pools.name,
            address: schema.pools.address
          }
        })
        .from(schema.swapEvents)
        .leftJoin(schema.pools, eq(schema.swapEvents.poolAddress, schema.pools.address))
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            sql`(${schema.swapEvents.sender} = ${userAddress.toLowerCase()} OR ${schema.swapEvents.to} = ${userAddress.toLowerCase()})`
          )
        );

      if (startTime) {
        query = query.where(gte(schema.swapEvents.timestamp, startTime));
      }

      if (endTime) {
        query = query.where(lte(schema.swapEvents.timestamp, endTime));
      }

      const results = await query
        .orderBy(desc(schema.swapEvents.timestamp))
        .limit(pageSize)
        .offset(offset);

      return results.map(result => ({
        txHash: result.swapEvent.txHash,
        poolAddress: result.swapEvent.poolAddress,
        poolName: result.pool?.name || 'Unknown Pool',
        sender: result.swapEvent.sender,
        to: result.swapEvent.to,
        tokenInAddress: result.swapEvent.tokenInAddress,
        tokenOutAddress: result.swapEvent.tokenOutAddress,
        amountIn: result.swapEvent.amountIn,
        amountOut: result.swapEvent.amountOut,
        amountInUsd: result.swapEvent.amountInUsd || 0,
        amountOutUsd: result.swapEvent.amountOutUsd || 0,
        fees: result.swapEvent.fees,
        feesUsd: result.swapEvent.feesUsd || 0,
        blockNumber: result.swapEvent.blockNumber,
        timestamp: result.swapEvent.timestamp
      }));
    } catch (error) {
      console.error('Error getting user swap history:', error);
      throw error;
    }
  }

  /**
   * 获取用户流动性历史
   */
  async getUserLiquidityHistory(
    userAddress: string, 
    chain: string, 
    params: {
      pageSize?: number;
      offset?: number;
      startTime?: number;
      endTime?: number;
    } = {}
  ) {
    const { pageSize = 50, offset = 0, startTime, endTime } = params;

    try {
      let query = this.db
        .select({
          liquidityEvent: schema.liquidityEvents,
          pool: {
            name: schema.pools.name,
            address: schema.pools.address
          }
        })
        .from(schema.liquidityEvents)
        .leftJoin(schema.pools, eq(schema.liquidityEvents.poolAddress, schema.pools.address))
        .where(
          and(
            eq(schema.liquidityEvents.chain, chain),
            eq(schema.liquidityEvents.user, userAddress.toLowerCase())
          )
        );

      if (startTime) {
        query = query.where(gte(schema.liquidityEvents.timestamp, startTime));
      }

      if (endTime) {
        query = query.where(lte(schema.liquidityEvents.timestamp, endTime));
      }

      const results = await query
        .orderBy(desc(schema.liquidityEvents.timestamp))
        .limit(pageSize)
        .offset(offset);

      return results.map(result => ({
        txHash: result.liquidityEvent.txHash,
        poolAddress: result.liquidityEvent.poolAddress,
        poolName: result.pool?.name || 'Unknown Pool',
        user: result.liquidityEvent.user,
        eventType: result.liquidityEvent.eventType,
        binIds: JSON.parse(result.liquidityEvent.binIds || '[]'),
        amounts: JSON.parse(result.liquidityEvent.amounts || '[]'),
        liquidity: result.liquidityEvent.liquidity,
        liquidityUsd: result.liquidityEvent.liquidityUsd || 0,
        blockNumber: result.liquidityEvent.blockNumber,
        timestamp: result.liquidityEvent.timestamp
      }));
    } catch (error) {
      console.error('Error getting user liquidity history:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计数据
   */
  async getUserStatistics(userAddress: string, chain: string) {
    try {
      // 获取总交易次数
      const totalSwaps = await this.db
        .select({ count: count() })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            sql`(${schema.swapEvents.sender} = ${userAddress.toLowerCase()} OR ${schema.swapEvents.to} = ${userAddress.toLowerCase()})`
          )
        );

      // 获取总交易量 (USD)
      const totalVolumeResult = await this.db
        .select({
          totalVolume: sql<number>`SUM(${schema.swapEvents.amountInUsd})`
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            sql`(${schema.swapEvents.sender} = ${userAddress.toLowerCase()} OR ${schema.swapEvents.to} = ${userAddress.toLowerCase()})`
          )
        );

      // 获取总手续费支付
      const totalFeesResult = await this.db
        .select({
          totalFees: sql<number>`SUM(${schema.swapEvents.feesUsd})`
        })
        .from(schema.swapEvents)
        .where(
          and(
            eq(schema.swapEvents.chain, chain),
            eq(schema.swapEvents.sender, userAddress.toLowerCase())
          )
        );

      // 获取当前总流动性
      const totalLiquidityResult = await this.db
        .select({
          totalLiquidity: sql<number>`SUM(${schema.userPositions.liquidityUsd})`
        })
        .from(schema.userPositions)
        .where(
          and(
            eq(schema.userPositions.userAddress, userAddress.toLowerCase()),
            eq(schema.userPositions.chain, chain)
          )
        );

      // 获取参与的池数量
      const poolsCountResult = await this.db
        .selectDistinct({ poolAddress: schema.userPositions.poolAddress })
        .from(schema.userPositions)
        .where(
          and(
            eq(schema.userPositions.userAddress, userAddress.toLowerCase()),
            eq(schema.userPositions.chain, chain)
          )
        );

      return {
        userAddress,
        chain,
        totalSwaps: totalSwaps[0].count,
        totalVolumeUsd: totalVolumeResult[0].totalVolume || 0,
        totalFeesUsd: totalFeesResult[0].totalFees || 0,
        totalLiquidityUsd: totalLiquidityResult[0].totalLiquidity || 0,
        activePools: poolsCountResult.length,
        lastActivityTimestamp: null // TODO: 计算最后活动时间
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * 获取DEX分析数据
   */
  async getDexAnalytics(chain: string, params: {
    startTime?: number;
    endTime?: number;
    interval?: 'hour' | 'day' | 'week';
  } = {}) {
    const { startTime, endTime, interval = 'day' } = params;

    try {
      // 基本统计
      const totalPools = await this.db
        .select({ count: count() })
        .from(schema.pools)
        .where(eq(schema.pools.chain, chain));

      const totalLiquidityResult = await this.db
        .select({
          totalLiquidity: sql<number>`SUM(${schema.poolStats.liquidityUsd})`
        })
        .from(schema.poolStats)
        .where(eq(schema.poolStats.chain, chain));

      const volume24hResult = await this.db
        .select({
          volume24h: sql<number>`SUM(${schema.poolStats.volume24h})`
        })
        .from(schema.poolStats)
        .where(eq(schema.poolStats.chain, chain));

      const fees24hResult = await this.db
        .select({
          fees24h: sql<number>`SUM(${schema.poolStats.fees24h})`
        })
        .from(schema.poolStats)
        .where(eq(schema.poolStats.chain, chain));

      return {
        chain,
        totalPools: totalPools[0].count,
        totalLiquidityUsd: totalLiquidityResult[0].totalLiquidity || 0,
        volume24hUsd: volume24hResult[0].volume24h || 0,
        fees24hUsd: fees24hResult[0].fees24h || 0,
        // TODO: 添加历史数据的时间序列
        historicalData: []
      };
    } catch (error) {
      console.error('Error getting DEX analytics:', error);
      throw error;
    }
  }

  /**
   * 添加或更新池信息
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
      await this.db
        .insert(schema.pools)
        .values({
          address: poolData.address.toLowerCase(),
          chain: poolData.chain,
          tokenX: poolData.tokenX.toLowerCase(),
          tokenY: poolData.tokenY.toLowerCase(),
          binStep: poolData.binStep,
          name: poolData.name,
          status: poolData.status || 'active',
          version: poolData.version || 'v2.2',
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        .onConflictDoUpdate({
          target: schema.pools.address,
          set: {
            name: poolData.name,
            status: poolData.status || 'active',
            updatedAt: Date.now()
          }
        });
    } catch (error) {
      console.error('Error upserting pool:', error);
      throw error;
    }
  }

  /**
   * 添加或更新代币信息
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
      await this.db
        .insert(schema.tokens)
        .values({
          address: tokenData.address.toLowerCase(),
          chain: tokenData.chain,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals,
          logoURI: tokenData.logoURI,
          createdAt: Date.now()
        })
        .onConflictDoUpdate({
          target: [schema.tokens.address, schema.tokens.chain],
          set: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            logoURI: tokenData.logoURI
          }
        });
    } catch (error) {
      console.error('Error upserting token:', error);
      throw error;
    }
  }
}

export function createDatabaseService(db: DrizzleD1Database<typeof schema>): DatabaseService {
  return new DatabaseService(db);
}
