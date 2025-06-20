/**
 * Cron Jobs 测试的 Jest/Vitest Mock 配置
 * 提供测试 Cloudflare Worker scheduled 函数所需的 Mock 和工具
 */

import { vi } from 'vitest';

// Mock Cloudflare Worker 全局对象
export const mockCloudflareGlobals = () => {
  // Mock ScheduledController
  global.ScheduledController = vi.fn();
  
  // Mock ExecutionContext
  global.ExecutionContext = vi.fn();
  
  // Mock D1Database
  global.D1Database = vi.fn();
  
  // Mock R2Bucket
  global.R2Bucket = vi.fn();
};

// 创建 Mock ScheduledController
export const createMockScheduledController = (
  cron: string,
  scheduledTime: Date = new Date(),
  noRetry: boolean = false
): ScheduledController => ({
  cron,
  scheduledTime: scheduledTime.getTime(),
  noRetry: vi.fn().mockReturnValue(noRetry)
});

// 创建 Mock ExecutionContext
export const createMockExecutionContext = (): ExecutionContext => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn()
});

// Mock 环境变量
export const createMockEnv = (overrides: Partial<any> = {}): any => ({
  AI: {},
  DB: createMockD1Database(),
  D1_DATABASE: createMockD1Database(),
  R2: createMockR2Bucket(),
  KEY: "test-secret-key",
  NODE_ENV: "test",
  BSC_RPC_URL: "https://bsc-dataseed1.binance.org/",
  BSCTEST_RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  LB_FACTORY_BSC: "0x43646A8e839B2f2766392C1BF8f60F6e587B6960",
  LB_FACTORY_BSCTEST: "0x6E77932A92582f504FF6c4BdbCef7Da6c198aEEf",
  LB_ROUTER_BSC: "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",
  LB_ROUTER_BSCTEST: "0xD711E80C2a9C7Fd5E9eE2af45d8B7ff0e21bFAE8",
  LB_QUOTER_BSC: "0x64b91FeD3d2572e2b8C8E0f945F0E7BF7f4b4B8c",
  LB_QUOTER_BSCTEST: "0xd76b82cf80b7cd43c16c87ce9b4eeed6a7c5cd2e",
  PRICE_API_URL: "https://api.coingecko.com/api/v3",
  PRICE_API_KEY: "test-api-key",
  API_RATE_LIMIT: "100",
  ...overrides
});

// Mock D1Database
export const createMockD1Database = (): D1Database => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [], meta: {} }),
    run: vi.fn().mockResolvedValue({ success: true, meta: {} })
  }),
  dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  batch: vi.fn().mockResolvedValue([]),
  exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 })
} as any);

// Mock R2Bucket
export const createMockR2Bucket = (): R2Bucket => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue({} as R2Object),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  head: vi.fn().mockResolvedValue(null)
} as any);

// Cron 表达式测试数据
export const cronTestCases = [
  {
    pattern: "*/5 * * * *",
    description: "每5分钟",
    expectedHandler: "handleFrequentPoolSync"
  },
  {
    pattern: "0 * * * *",
    description: "每小时",
    expectedHandler: "handleHourlyStatsSync"
  },
  {
    pattern: "0 2 * * 0",
    description: "每周日凌晨2点",
    expectedHandler: "handleWeeklyCleanup"
  }
];

// 错误测试数据
export const errorTestCases = [
  {
    name: "Network Error",
    error: new Error("Network connection failed"),
    expectedLog: "Cron job failed"
  },
  {
    name: "Database Error",
    error: new Error("Database connection timeout"),
    expectedLog: "Cron job failed"
  },
  {
    name: "Sync Error",
    error: new Error("Sync operation failed"),
    expectedLog: "Cron job failed"
  }
];

// Mock CronHandler 类
export const createMockCronHandler = () => ({
  handleFrequentPoolSync: vi.fn().mockResolvedValue(undefined),
  handleHourlyStatsSync: vi.fn().mockResolvedValue(undefined),
  handleWeeklyCleanup: vi.fn().mockResolvedValue(undefined)
});

// 时间相关的测试工具
export const timeUtils = {
  // 创建特定时间的 Date 对象
  createTestDate: (year: number, month: number, day: number, hour: number = 0, minute: number = 0) => 
    new Date(year, month - 1, day, hour, minute),
  
  // 创建周日凌晨2点的时间
  createSundayTwoAM: () => {
    const date = new Date();
    const dayOfWeek = date.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    date.setDate(date.getDate() + daysUntilSunday);
    date.setHours(2, 0, 0, 0);
    return date;
  },
  
  // 创建整点时间
  createHourlyTime: (hour: number = new Date().getHours()) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date;
  },
  
  // 创建5分钟间隔时间
  createFiveMinuteInterval: () => {
    const date = new Date();
    const minutes = Math.floor(date.getMinutes() / 5) * 5;
    date.setMinutes(minutes, 0, 0);
    return date;
  }
};

// 日志断言工具
export const logAssertions = {
  expectCronStartLog: (cronPattern: string, timestamp: string) => {
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`🕐 Cron job triggered: ${cronPattern} at ${timestamp}`)
    );
  },
  
  expectCronErrorLog: (cronPattern: string, error: Error) => {
    expect(console.error).toHaveBeenCalledWith(
      `❌ Cron job failed for pattern ${cronPattern}:`,
      error
    );
  },
  
  expectUnknownPatternWarning: (cronPattern: string) => {
    expect(console.warn).toHaveBeenCalledWith(
      `⚠️ Unknown cron pattern: ${cronPattern}`
    );
  }
};

// 性能测试工具
export const performanceUtils = {
  measureExecutionTime: async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
  
  expectExecutionTimeUnder: (duration: number, maxDuration: number) => {
    expect(duration).toBeLessThan(maxDuration);
  }
};

// 集成测试工具
export const integrationUtils = {
  // 模拟 Wrangler 环境
  setupWranglerEnvironment: () => {
    process.env.NODE_ENV = 'test';
    process.env.CLOUDFLARE_WORKER = 'true';
  },
  
  // 清理测试环境
  cleanupTestEnvironment: () => {
    delete process.env.CLOUDFLARE_WORKER;
  }
};

// 导出所有工具
export const cronTestUtils = {
  mockCloudflareGlobals,
  createMockScheduledController,
  createMockExecutionContext,
  createMockEnv,
  createMockD1Database,
  createMockR2Bucket,
  createMockCronHandler,
  cronTestCases,
  errorTestCases,
  timeUtils,
  logAssertions,
  performanceUtils,
  integrationUtils
};
