// 工业级同步服务的快速测试和演示脚本

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { createIndustrialSyncCoordinator } from './industrial-sync-coordinator';
import { createEnhancedDatabaseService } from './enhanced-database-service';

/**
 * 快速测试和演示函数
 */
export async function quickTestIndustrialSync(env: any): Promise<any> {
  console.log('🚀 Starting Quick Industrial Sync Test...');
  
  try {
    if (!env.D1_DATABASE) {
      throw new Error('D1_DATABASE not available');
    }

    const db = drizzle(env.D1_DATABASE, { schema });
    const coordinator = createIndustrialSyncCoordinator(db);
    const dbService = createEnhancedDatabaseService(db);

    // 1. 健康检查
    console.log('🏥 Running health check...');
    const health = await dbService.healthCheck();
    console.log('Health:', health);

    // 2. 获取同步状态
    console.log('📊 Getting sync status...');
    const syncStatus = await coordinator.getSyncStatus();
    console.log('Sync Status:', syncStatus);

    // 3. 获取链状态
    console.log('⛓️ Getting chain status...');
    const chainStatus = await coordinator.getChainSyncStatus();
    console.log('Chain Status:', chainStatus);

    // 4. 添加一些测试池数据
    console.log('🏊 Adding test pool data...');
    await addTestPoolData(dbService);

    // 5. 测试高级查询
    console.log('🔍 Testing advanced queries...');
    const pools = await dbService.getPoolsAdvanced({
      chain: 'binance',
      pageSize: 10,
      orderBy: 'liquidity',
      orderDirection: 'desc'
    });
    console.log('Pools found:', pools.pools.length);

    // 6. 测试统计查询
    console.log('📈 Testing statistics...');
    const topStats = await dbService.getTopStats('binance');
    console.log('Top stats:', {
      topPoolsByLiquidity: topStats.topPoolsByLiquidity.length,
      topPoolsByVolume: topStats.topPoolsByVolume.length,
      topTraders: topStats.topTraders.length,
      largeTransactions: topStats.largeTransactions.length
    });

    return {
      success: true,
      message: 'Quick test completed successfully',
      results: {
        health,
        syncStatus,
        chainStatus,
        poolsCount: pools.pools.length,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 添加测试池数据
 */
async function addTestPoolData(dbService: any): Promise<void> {
  try {
    // 添加测试代币
    const testTokens = [
      {
        address: '0x55d398326f99059fF775485246999027B3197955',
        chain: 'binance',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 18,
        logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png'
      },
      {
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        chain: 'binance',
        name: 'BUSD Token',
        symbol: 'BUSD',
        decimals: 18,
        logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4687.png'
      },
      {
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        chain: 'binance',
        name: 'Wrapped BNB',
        symbol: 'WBNB',
        decimals: 18,
        logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7192.png'
      }
    ];

    for (const token of testTokens) {
      await dbService.upsertToken(token);
    }

    // 添加测试池
    const testPools = [
      {
        address: '0x1234567890123456789012345678901234567890',
        chain: 'binance',
        tokenX: '0x55d398326f99059fF775485246999027B3197955', // USDT
        tokenY: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
        binStep: 1,
        name: 'USDT/BUSD',
        status: 'active',
        version: 'v2.2'
      },
      {
        address: '0x2345678901234567890123456789012345678901',
        chain: 'binance',
        tokenX: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        tokenY: '0x55d398326f99059fF775485246999027B3197955', // USDT
        binStep: 25,
        name: 'WBNB/USDT',
        status: 'active',
        version: 'v2.2'
      }
    ];

    for (const pool of testPools) {
      await dbService.upsertPool(pool);
    }

    console.log('✅ Test data added successfully');

  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
}

/**
 * 添加测试统计数据
 */
export async function addTestStatsData(env: any): Promise<any> {
  try {
    if (!env.D1_DATABASE) {
      throw new Error('D1_DATABASE not available');
    }

    const db = drizzle(env.D1_DATABASE, { schema });

    // 添加测试池统计数据
    const testStats = [
      {
        poolAddress: '0x1234567890123456789012345678901234567890',
        chain: 'binance',
        reserveX: '1000000000000000000000000', // 1M tokens
        reserveY: '1000000000000000000000000', // 1M tokens
        activeBinId: 8388608, // 中间bin ID
        totalSupply: '2000000000000000000000000',
        liquidityUsd: 2000000,
        volume24h: 50000,
        volume7d: 300000,
        fees24h: 150,
        apy: 12.5,
        blockNumber: 35000000,
        timestamp: new Date()
      },
      {
        poolAddress: '0x2345678901234567890123456789012345678901',
        chain: 'binance',
        reserveX: '500000000000000000000', // 500 WBNB
        reserveY: '150000000000000000000000', // 150K USDT
        activeBinId: 8388608,
        totalSupply: '1000000000000000000000',
        liquidityUsd: 300000,
        volume24h: 75000,
        volume7d: 500000,
        fees24h: 225,
        apy: 18.3,
        blockNumber: 35000001,
        timestamp: new Date()
      }
    ];

    for (const stats of testStats) {
      await db.insert(schema.poolStats).values(stats);
    }

    // 添加测试交换事件
    const testSwapEvents = [
      {
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        poolAddress: '0x1234567890123456789012345678901234567890',
        chain: 'binance',
        sender: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        tokenInAddress: '0x55d398326f99059fF775485246999027B3197955',
        tokenOutAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        amountIn: '1000000000000000000000', // 1000 tokens
        amountOut: '998000000000000000000', // 998 tokens
        amountInUsd: 1000,
        amountOutUsd: 998,
        fees: '2000000000000000000', // 2 tokens
        feesUsd: 2,
        blockNumber: 35000000,
        logIndex: 0,
        timestamp: new Date()
      }
    ];

    for (const event of testSwapEvents) {
      await db.insert(schema.swapEvents).values(event);
    }

    return {
      success: true,
      message: 'Test stats data added successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error adding test stats data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 演示高级查询功能
 */
export async function demonstrateAdvancedQueries(env: any): Promise<any> {
  try {
    if (!env.D1_DATABASE) {
      throw new Error('D1_DATABASE not available');
    }

    const db = drizzle(env.D1_DATABASE, { schema });
    const dbService = createEnhancedDatabaseService(db);

    const results = {};

    // 1. 高级池查询
    console.log('🔍 Testing advanced pool queries...');
    results.pools = await dbService.getPoolsAdvanced({
      chain: 'binance',
      pageSize: 10,
      orderBy: 'liquidity',
      orderDirection: 'desc',
      minLiquidity: 100000
    });

    // 2. 交易历史查询
    console.log('📊 Testing transaction history...');
    results.transactions = await dbService.getTransactionHistory({
      chain: 'binance',
      pageSize: 20,
      fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时前
    });

    // 3. 池分析数据
    console.log('📈 Testing pool analytics...');
    if (results.pools.pools.length > 0) {
      const poolAddress = results.pools.pools[0].pairAddress;
      results.analytics = await dbService.getPoolAnalytics({
        chain: 'binance',
        poolAddress,
        period: '24h',
        granularity: 'hour'
      });
    }

    // 4. 顶级统计
    console.log('🏆 Testing top statistics...');
    results.topStats = await dbService.getTopStats('binance');

    return {
      success: true,
      message: 'Advanced queries demonstration completed',
      results,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Advanced queries demonstration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}
