/**
 * DEX 同步模块
 * 
 * 提供完整的 Trader Joe LiquiBook 合约数据同步功能，包括：
 * - 事件监听和数据抓取
 * - 高性能数据库服务
 * - 自动同步服务
 * - 链上数据验证
 * - 价格数据更新
 * - 监控和恢复
 */

// 核心服务
export { EventListener, TRADER_JOE_EVENTS } from './event-listener';
export { DatabaseService } from './database-service';
export { SyncService, DEFAULT_SYNC_CONFIG } from './sync-service';
export { OnChainService } from './onchain-service';
export { PriceService } from './price-service';
export { PoolDiscoveryService } from './pool-discovery';

// 池配置
export { getPoolDiscoveryConfig } from './pool-config';

// 同步协调器
export {
  SyncCoordinator
} from './sync-coordinator';
export {
  handleSync,
  getSyncCoordinator,
  initializeSyncCoordinator
} from './sync-handler';

// Cron 处理器
export { CronHandler } from './cron-handler';

// 类型定义
export type {
  // 事件监听器类型
  SyncProgress,
  ParsedSwapEvent,
  ParsedLiquidityEvent
} from './event-listener';

export type {
  // 数据库服务类型
  PoolQueryFilters,
  PaginationOptions,
  SwapEventFilters,
  LiquidityEventFilters,
  UserPositionFilters,
  PoolStatsData,
  PoolAnalytics,
  UserAnalytics
} from './database-service';

export type {
  // 同步服务类型
  SyncConfig
} from './sync-service';

export type {
  // 同步协调器类型
  SyncCoordinatorConfig,
  SystemHealth,
  SyncMetrics
} from './sync-coordinator';

/**
 * 默认的同步协调器配置
 */
export const DEFAULT_COORDINATOR_CONFIG = {
  syncInterval: 5 * 60 * 1000,      // 5分钟同步
  healthCheckInterval: 30 * 1000,    // 30秒健康检查
  maxRetries: 3,                     // 最大重试次数
  retryDelay: 5000,                  // 重试延迟
  enableAutoRestart: true,           // 启用自动恢复
  enableMetrics: true               // 启用指标收集
};

import { SyncCoordinator } from './sync-coordinator';

/**
 * 创建同步协调器实例
 */
export function createSyncCoordinator(env: any, config?: any) {
  return new SyncCoordinator(env, {
    ...DEFAULT_COORDINATOR_CONFIG,
    ...config
  });
}

/**
 * 初始化并启动同步服务
 */
export async function initializeAndStartSync(env: any, config?: any) {
  const coordinator = createSyncCoordinator(env, config);
  await coordinator.start();
  return coordinator;
}
