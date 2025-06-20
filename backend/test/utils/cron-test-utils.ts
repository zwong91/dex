/**
 * Cron Jobs Test Mock Configuration for Jest/Vitest
 * Provides mocks and utilities for testing Cloudflare Worker scheduled functions
 */

import { vi } from 'vitest';

// Type definitions for testing
interface MockExecutionContext {
  waitUntil: any;
  passThroughOnException: any;
}

interface MockScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry: any;
}

// Mock Cloudflare Worker global objects
export const mockCloudflareGlobals = () => {
  // Mock ScheduledController
  (global as any).ScheduledController = vi.fn();
  
  // Mock ExecutionContext
  (global as any).ExecutionContext = vi.fn();
  
  // Mock D1Database
  (global as any).D1Database = vi.fn();
  
  // Mock R2Bucket
  (global as any).R2Bucket = vi.fn();
  
  // Mock performance API for testing
  if (!(global as any).performance) {
    (global as any).performance = {
      now: vi.fn(() => Date.now()),
      timeOrigin: Date.now()
    };
  }
};

// Create Mock ScheduledController
export const createMockScheduledController = (
  cron: string,
  scheduledTime: Date = new Date(),
  noRetry: boolean = false
): MockScheduledController => ({
  cron,
  scheduledTime: scheduledTime.getTime(),
  noRetry: vi.fn().mockReturnValue(noRetry)
});

// Create Mock ExecutionContext
export const createMockExecutionContext = (): MockExecutionContext => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn()
});

// Mock environment variables
export const createMockEnv = (overrides: Partial<any> = {}): any => ({
  AI: {},
  DB: createMockD1Database(),
  D1_DATABASE: createMockD1Database(),
  R2: createMockR2Bucket(),
  KEY: "test-secret-key",
  NODE_ENV: "development",
  BSC_RPC_URL: "https://bsc-dataseed1.binance.org/",
  BSCTEST_RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  LB_FACTORY_BSC: "0x7D73A6eFB91C89502331b2137c2803408838218b",
  LB_FACTORY_BSCTEST: "0x7D73A6eFB91C89502331b2137c2803408838218b",
  LB_ROUTER_BSC: "0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98",
  LB_ROUTER_BSCTEST: "0xe98efCE22A8Ec0dd5dDF6C1A81B6ADD740176E98",
  LB_QUOTER_BSC: "0x424EcD545DB744371650B39e353339E9BB8fB64A",
  LB_QUOTER_BSCTEST: "0x424EcD545DB744371650B39e353339E9BB8fB64A",
  PRICE_API_URL: "https://api.coingecko.com/api/v3",
  PRICE_API_KEY: "test-api-key",
  API_RATE_LIMIT: "100",
  ...overrides
});

// Mock D1Database
export const createMockD1Database = (): any => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [], meta: {} }),
    run: vi.fn().mockResolvedValue({ success: true, meta: {} })
  }),
  dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  batch: vi.fn().mockResolvedValue([]),
  exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 })
});

// Mock R2Bucket
export const createMockR2Bucket = (): any => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  head: vi.fn().mockResolvedValue(null)
});

// Cron expression test data
export const cronTestCases = [
  {
    pattern: "*/5 * * * *",
    description: "Every 5 minutes",
    expectedHandler: "handleFrequentPoolSync"
  },
  {
    pattern: "0 * * * *",
    description: "Every hour",
    expectedHandler: "handleHourlyStatsSync"
  },
  {
    pattern: "0 2 * * 0",
    description: "Every Sunday at 2 AM",
    expectedHandler: "handleWeeklyCleanup"
  }
];

// Error test data
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

// Mock CronHandler class
export const createMockCronHandler = () => ({
  handleFrequentPoolSync: vi.fn().mockResolvedValue(undefined),
  handleHourlyStatsSync: vi.fn().mockResolvedValue(undefined),
  handleWeeklyCleanup: vi.fn().mockResolvedValue(undefined)
});

// Time-related test utilities
export const timeUtils = {
  // Create Date object for specific time
  createTestDate: (year: number, month: number, day: number, hour: number = 0, minute: number = 0) => 
    new Date(year, month - 1, day, hour, minute),
  
  // Create Sunday 2 AM time
  createSundayTwoAM: () => {
    const date = new Date();
    const dayOfWeek = date.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    date.setDate(date.getDate() + daysUntilSunday);
    date.setHours(2, 0, 0, 0);
    return date;
  },
  
  // Create hourly time
  createHourlyTime: (hour: number = new Date().getHours()) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date;
  },
  
  // Create 5-minute interval time
  createFiveMinuteInterval: () => {
    const date = new Date();
    const minutes = Math.floor(date.getMinutes() / 5) * 5;
    date.setMinutes(minutes, 0, 0);
    return date;
  }
};

// Log assertion utilities
export const logAssertions = {
  expectCronStartLog: (cronPattern: string, timestamp: string, expectFn: any) => {
    expectFn(console.log).toHaveBeenCalledWith(
      expectFn.stringContaining(`🕐 Cron job triggered: ${cronPattern} at ${timestamp}`)
    );
  },
  
  expectCronErrorLog: (cronPattern: string, error: Error, expectFn: any) => {
    expectFn(console.error).toHaveBeenCalledWith(
      `❌ Cron job failed for pattern ${cronPattern}:`,
      error
    );
  },
  
  expectUnknownPatternWarning: (cronPattern: string, expectFn: any) => {
    expectFn(console.warn).toHaveBeenCalledWith(
      `⚠️ Unknown cron pattern: ${cronPattern}`
    );
  }
};

// Performance test utilities
export const performanceUtils = {
  measureExecutionTime: async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
  
  expectExecutionTimeUnder: (duration: number, maxDuration: number, expectFn: any) => {
    expectFn(duration).toBeLessThan(maxDuration);
  }
};

// Integration test utilities
export const integrationUtils = {
  // Mock Wrangler environment
  setupWranglerEnvironment: () => {
    (process.env as any).NODE_ENV = 'development';
    (process.env as any).CLOUDFLARE_WORKER = 'true';
  },
  
  // Cleanup test environment
  cleanupTestEnvironment: () => {
    delete (process.env as any).CLOUDFLARE_WORKER;
  }
};

// Advanced cron testing utilities
export const advancedCronUtils = {
  // Create mock scheduled event
  createScheduledEvent: (cronPattern: string, scheduledTime?: Date) => ({
    type: 'scheduled',
    cron: cronPattern,
    scheduledTime: (scheduledTime || new Date()).getTime(),
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn()
  }),

  // Validate cron pattern
  validateCronPattern: (pattern: string): boolean => {
    const cronRegex = /^(\*|[0-5]?\d|\*\/\d+)(\s+(\*|[01]?\d|2[0-3]|\*\/\d+)){2}(\s+(\*|[0-2]?\d|3[01]|\*\/\d+))(\s+(\*|[0-1]?\d|\*\/\d+))(\s+(\*|[0-6]|\*\/\d+))?$/;
    return cronRegex.test(pattern);
  },

  // Generate test dates for cron patterns
  generateTestDatesForPattern: (pattern: string, count: number = 5): Date[] => {
    const dates: Date[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const testDate = new Date(now);
      testDate.setMinutes(now.getMinutes() + (i * 5)); // Simple increment for testing
      dates.push(testDate);
    }
    
    return dates;
  },

  // Mock cron execution with timing
  mockCronExecution: async (
    cronPattern: string,
    handler: () => Promise<void>,
    options: { timeout?: number; shouldFail?: boolean } = {}
  ) => {
    const { timeout = 30000, shouldFail = false } = options;
    const startTime = Date.now();
    
    try {
      if (shouldFail) {
        throw new Error(`Simulated failure for cron: ${cronPattern}`);
      }
      
      await Promise.race([
        handler(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cron execution timeout')), timeout)
        )
      ]);
      
      return {
        success: true,
        duration: Date.now() - startTime,
        pattern: cronPattern
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        pattern: cronPattern,
        error
      };
    }
  }
};

// Cron test scenarios
export const cronTestScenarios = {
  // Test frequent sync pattern
  testFrequentSync: {
    pattern: "*/5 * * * *",
    mockData: {
      pools: [
        { id: "pool1", token0: "USDT", token1: "BNB", liquidity: "1000000" },
        { id: "pool2", token0: "USDT", token1: "ETH", liquidity: "500000" }
      ],
      prices: {
        BNB: 400,
        ETH: 3000
      }
    },
    expectedDuration: 5000 // 5 seconds max
  },

  // Test hourly stats pattern
  testHourlyStats: {
    pattern: "0 * * * *",
    mockData: {
      volume24h: "10000000",
      tvl: "50000000",
      transactions: 12500
    },
    expectedDuration: 10000 // 10 seconds max
  },

  // Test weekly cleanup pattern
  testWeeklyCleanup: {
    pattern: "0 2 * * 0",
    mockData: {
      oldRecords: 1000,
      cleanupThreshold: 30 // days
    },
    expectedDuration: 30000 // 30 seconds max
  }
};

// Export all utilities
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
  integrationUtils,
  advancedCronUtils,
  cronTestScenarios
};

// Export individual utilities for convenience
export {
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
  integrationUtils,
  advancedCronUtils,
  cronTestScenarios
};
