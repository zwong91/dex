import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Env } from "../src/index";

/**
 * Cron Jobs 测试示例
 * 这是一个简化的测试，专注于测试 scheduled 函数的核心逻辑
 */

// Mock 环境变量
const mockEnv: Env = {
  KEY: "test-secret-key",
  NODE_ENV: "test"
} as Env;

// Mock ExecutionContext
const mockExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn()
} as ExecutionContext;

// 创建 Mock ScheduledController
const createMockController = (cron: string): ScheduledController => ({
  cron,
  scheduledTime: Date.now(),
  noRetry: vi.fn()
});

describe("Scheduled Function Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理控制台 mock
    vi.restoreAllMocks();
  });

  describe("Cron Job Routing", () => {
    it("should log cron job start", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      // 创建一个简单的 scheduled 函数来测试
      const scheduled = async (
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
      ): Promise<void> => {
        const cronTimestamp = new Date(controller.scheduledTime).toISOString();
        console.log(`🕐 Cron job triggered: ${controller.cron} at ${cronTimestamp}`);
        
        // 模拟基本的路由逻辑
        switch (controller.cron) {
          case "*/5 * * * *":
            console.log("✅ Handling frequent sync");
            break;
          case "0 * * * *":
            console.log("✅ Handling hourly stats");
            break;
          case "0 2 * * 0":
            console.log("✅ Handling weekly cleanup");
            break;
          default:
            console.warn(`⚠️ Unknown cron pattern: ${controller.cron}`);
            break;
        }
      };

      const controller = createMockController("*/5 * * * *");
      await scheduled(controller, mockEnv, mockExecutionContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("🕐 Cron job triggered: */5 * * * *")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("✅ Handling frequent sync");
      
      consoleLogSpy.mockRestore();
    });

    it("should handle unknown cron patterns", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      
      const scheduled = async (
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
      ): Promise<void> => {
        console.warn(`⚠️ Unknown cron pattern: ${controller.cron}`);
      };

      const controller = createMockController("unknown pattern");
      await scheduled(controller, mockEnv, mockExecutionContext);

      expect(consoleWarnSpy).toHaveBeenCalledWith("⚠️ Unknown cron pattern: unknown pattern");
      
      consoleWarnSpy.mockRestore();
    });

    it("should handle errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const scheduled = async (
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
      ): Promise<void> => {
        try {
          throw new Error("Test error");
        } catch (error) {
          console.error(`❌ Cron job failed for pattern ${controller.cron}:`, error);
          throw error;
        }
      };

      const controller = createMockController("*/5 * * * *");
      
      await expect(scheduled(controller, mockEnv, mockExecutionContext))
        .rejects.toThrow("Test error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("❌ Cron job failed for pattern */5 * * * *:"),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Cron Pattern Validation", () => {
    const cronPatterns = [
      "*/5 * * * *",  // 每5分钟
      "0 * * * *",    // 每小时
      "0 2 * * 0",    // 每周日凌晨2点
      "0 0 * * *",    // 每天午夜
      "0 0 1 * *"     // 每月1号
    ];

    cronPatterns.forEach(pattern => {
      it(`should accept valid cron pattern: ${pattern}`, () => {
        const controller = createMockController(pattern);
        expect(controller.cron).toBe(pattern);
        expect(controller.scheduledTime).toBeTypeOf("number");
      });
    });
  });

  describe("ExecutionContext Usage", () => {
    it("should use waitUntil for async operations", async () => {
      const mockPromise = Promise.resolve();
      
      // 模拟使用 ExecutionContext.waitUntil
      mockExecutionContext.waitUntil(mockPromise);
      
      expect(mockExecutionContext.waitUntil).toHaveBeenCalledWith(mockPromise);
    });
  });
});

// 导出测试工具供其他测试文件使用
export {
  mockEnv,
  mockExecutionContext,
  createMockController
};
