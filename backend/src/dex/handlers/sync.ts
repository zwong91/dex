/**
 * DEX Sync Handler
 * 处理同步相关的端点
 */

import { SyncCoordinator } from '../sync/sync-coordinator';
import { PoolDiscoveryService } from '../sync/pool-discovery';
import type { Env } from '../../index';

/**
 * 触发完整同步
 */
export async function handleTriggerSync(request: Request, env: Env): Promise<Response> {
  console.log('🔄 Triggering manual sync...');
  
  try {
    const coordinator = new SyncCoordinator(env);
    await coordinator.start();
    
    // 触发完整同步
    await coordinator.triggerFullSync();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Manual sync triggered successfully',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Sync trigger failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Sync trigger failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取同步状态
 */
export async function handleSyncStatus(request: Request, env: Env): Promise<Response> {
  console.log('📊 Getting sync status...');
  
  try {
    const coordinator = new SyncCoordinator(env);
    const status = await coordinator.getSystemStatus();
    
    return new Response(JSON.stringify({
      success: true,
      status,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Failed to get sync status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 触发池发现
 */
export async function handlePoolDiscovery(request: Request, env: Env): Promise<Response> {
  console.log('🔍 Triggering pool discovery...');
  
  try {
    const discoveryService = new PoolDiscoveryService(env);
    const result = await discoveryService.performDiscoveryScan();
    
    return new Response(JSON.stringify({
      success: true,
      result,
      message: 'Pool discovery completed',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Pool discovery failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Pool discovery failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取数据库统计信息
 */
export async function handleDatabaseStats(request: Request, env: Env): Promise<Response> {
  console.log('📊 Getting database stats...');
  
  try {
    const db = env.DB || env.D1_DATABASE;
    if (!db) {
      throw new Error('Database not available');
    }
    
    // 查询各表的记录数
    const [pools, tokens, swapEvents, liquidityEvents] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM pools').first(),
      db.prepare('SELECT COUNT(*) as count FROM tokens').first(),
      db.prepare('SELECT COUNT(*) as count FROM swap_events').first(),
      db.prepare('SELECT COUNT(*) as count FROM liquidity_events').first()
    ]);
    
    // 查询最新事件
    const latestSwap = await db.prepare(`
      SELECT pool_address, tx_hash, timestamp 
      FROM swap_events 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).first();
    
    const latestLiquidity = await db.prepare(`
      SELECT pool_address, tx_hash, timestamp 
      FROM liquidity_events 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).first();
    
    return new Response(JSON.stringify({
      success: true,
      stats: {
        pools: pools?.count || 0,
        tokens: tokens?.count || 0,
        swapEvents: swapEvents?.count || 0,
        liquidityEvents: liquidityEvents?.count || 0,
        latestSwap: latestSwap ? {
          pool: latestSwap.pool_address,
          tx: latestSwap.tx_hash,
          time: new Date((latestSwap.timestamp as number) * 1000).toISOString()
        } : null,
        latestLiquidity: latestLiquidity ? {
          pool: latestLiquidity.pool_address,
          tx: latestLiquidity.tx_hash,
          time: new Date((latestLiquidity.timestamp as number) * 1000).toISOString()
        } : null
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get database stats',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
