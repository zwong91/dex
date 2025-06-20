# Cloudflare Worker Cron Jobs 测试指南

这个文档详细说明了如何测试 Cloudflare Worker 的 `scheduled` 函数（定时任务）。

## 📋 目录

1. [测试策略概述](#测试策略概述)
2. [单元测试](#单元测试)
3. [集成测试](#集成测试)
4. [手动测试](#手动测试)
5. [部署测试](#部署测试)
6. [监控和调试](#监控和调试)

## 🎯 测试策略概述

### 测试层级

```
┌─────────────────┐
│   端到端测试     │  ← 生产环境验证
├─────────────────┤
│   集成测试      │  ← 完整流程测试
├─────────────────┤
│   单元测试      │  ← 函数逻辑测试
└─────────────────┘
```

### 测试范围

- ✅ **路由逻辑**: 不同 cron 表达式的处理
- ✅ **错误处理**: 异常情况的处理和重试
- ✅ **日志记录**: 执行状态和错误日志
- ✅ **性能**: 执行时间和资源使用
- ✅ **数据一致性**: 同步操作的正确性

## 🧪 单元测试

### 快速开始

```bash
# 运行所有 scheduled 相关测试
npm test -- scheduled

# 运行特定测试文件
npx vitest run test/scheduled-simple.spec.ts

# 监听模式运行测试
npx vitest test/scheduled-simple.spec.ts
```

### 测试结构

```typescript
describe("Scheduled Function Tests", () => {
  describe("Cron Job Routing", () => {
    it("should handle frequent pool sync", async () => {
      // 测试每5分钟同步逻辑
    });
    
    it("should handle hourly stats", async () => {
      // 测试每小时统计逻辑
    });
    
    it("should handle weekly cleanup", async () => {
      // 测试每周清理逻辑
    });
  });
});
```

### Mock 策略

```typescript
// Mock CronHandler
vi.mock("../src/dex/sync/cron-handler", () => ({
  CronHandler: vi.fn().mockImplementation(() => ({
    handleFrequentPoolSync: vi.fn().mockResolvedValue(undefined),
    handleHourlyStatsSync: vi.fn().mockResolvedValue(undefined),
    handleWeeklyCleanup: vi.fn().mockResolvedValue(undefined)
  }))
}));
```

## 🔧 集成测试

### 本地环境测试

```bash
# 启动本地开发环境（支持 scheduled 触发）
npx wrangler dev --local

# 在另一个终端运行集成测试脚本
./test-cron-jobs.sh
```

### 测试脚本使用

```bash
# 给脚本添加执行权限
chmod +x test-cron-jobs.sh

# 运行交互式测试脚本
./test-cron-jobs.sh
```

脚本提供以下选项：
1. 运行所有单元测试
2. 启动本地开发服务器并测试 Cron Jobs
3. 仅测试 Cron Jobs (需要服务器已运行)
4. 测试特定 Cron Job
5. 查看 Cron Job 配置
6. 部署后测试 (生产环境)
7. 查看实时日志

## 🚀 手动测试

### 本地测试 Cron Jobs

1. **启动开发服务器**
   ```bash
   npx wrangler dev --local
   ```

2. **触发特定 Cron Job**
   ```bash
   # 每5分钟同步 (URL编码: */5 * * * * → %2A%2F5%20%2A%20%2A%20%2A%20%2A)
   curl -X POST "http://localhost:8787/__scheduled?cron=%2A%2F5%20%2A%20%2A%20%2A%20%2A"
   
   # 每小时统计 (0 * * * * → 0%20%2A%20%2A%20%2A%20%2A)
   curl -X POST "http://localhost:8787/__scheduled?cron=0%20%2A%20%2A%20%2A%20%2A"
   
   # 每周清理 (0 2 * * 0 → 0%202%20%2A%20%2A%200)
   curl -X POST "http://localhost:8787/__scheduled?cron=0%202%20%2A%20%2A%200"
   ```

3. **验证响应**
   - 检查控制台日志输出
   - 验证 HTTP 状态码 (应该是 200)
   - 确认执行了正确的处理器

### Cron 表达式编码参考

| 描述 | Cron 表达式 | URL 编码 |
|------|-------------|-----------|
| 每5分钟 | `*/5 * * * *` | `%2A%2F5%20%2A%20%2A%20%2A%20%2A` |
| 每小时 | `0 * * * *` | `0%20%2A%20%2A%20%2A%20%2A` |
| 每周日2点 | `0 2 * * 0` | `0%202%20%2A%20%2A%200` |

## 🌐 部署测试

### 触发生产环境 Cron Job

```bash
# 触发所有 Cron Job
wrangler cron trigger <worker-name>

# 查看 Worker 列表
wrangler list

# 查看 Cron Job 配置
wrangler cron list <worker-name>
```

### 验证部署配置

```bash
# 检查 wrangler.toml 配置
cat wrangler.toml

# 验证环境变量
wrangler secret list

# 检查 Worker 状态
wrangler status <worker-name>
```

## 📊 监控和调试

### 实时日志监控

```bash
# 查看实时日志
wrangler tail <worker-name>

# 过滤 Cron Job 相关日志
wrangler tail <worker-name> --format=pretty | grep "Cron"
```

### 常见问题排查

#### 1. Cron Job 未触发

**检查项目:**
- ✅ `wrangler.toml` 中的 `[triggers]` 配置
- ✅ Worker 是否正确部署
- ✅ Cron 表达式格式是否正确

**解决方案:**
```toml
# wrangler.toml
[triggers]
crons = [
  "*/5 * * * *",  # 每5分钟
  "0 * * * *",    # 每小时  
  "0 2 * * 0"     # 每周日凌晨2点
]
```

#### 2. 函数执行失败

**检查项目:**
- ✅ CronHandler 是否正确导入
- ✅ 环境变量是否配置完整
- ✅ 数据库连接是否正常

**调试方法:**
```typescript
// 添加详细日志
console.log('🔍 Debug: CronHandler instance:', cronHandler);
console.log('🔍 Debug: Environment:', JSON.stringify(env, null, 2));
```

#### 3. 性能问题

**监控指标:**
- 执行时间
- 内存使用
- CPU 时间
- 外部 API 调用次数

**优化建议:**
```typescript
// 使用 ExecutionContext.waitUntil 处理长时间运行的任务
ctx.waitUntil(longRunningTask());

// 批量处理减少 API 调用
const batchResults = await Promise.allSettled(tasks);
```

## 📝 测试检查清单

### 测试前准备

- [ ] 安装所有依赖 (`npm install`)
- [ ] 配置环境变量
- [ ] 检查 `wrangler.toml` 配置
- [ ] 确认数据库连接

### 单元测试

- [ ] 所有 Cron 表达式路由正确
- [ ] 错误处理机制工作正常
- [ ] 日志输出格式正确
- [ ] Mock 覆盖所有外部依赖

### 集成测试

- [ ] 本地开发环境正常启动
- [ ] 手动触发 Cron Job 成功
- [ ] CronHandler 方法执行正确
- [ ] 数据库操作成功

### 部署测试

- [ ] 生产环境部署成功
- [ ] Cron Job 自动触发正常
- [ ] 监控和日志收集正常
- [ ] 性能指标在预期范围内

## 🛠️ 工具和资源

### 开发工具

- **Wrangler CLI**: Cloudflare Worker 开发工具
- **Vitest**: 测试框架
- **cURL**: HTTP 请求测试工具

### 在线工具

- [Cron Expression Generator](https://crontab.guru/): Cron 表达式生成器
- [URL Encoder](https://www.urlencoder.org/): URL 编码工具
- [Cloudflare Dashboard](https://dash.cloudflare.com/): Worker 管理界面

### 参考文档

- [Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Vitest 测试框架](https://vitest.dev/)

---

## 💡 最佳实践

1. **测试覆盖率**: 保持 80% 以上的测试覆盖率
2. **错误处理**: 所有 Cron Job 都应该有适当的错误处理和重试机制
3. **监控**: 设置适当的监控和告警机制
4. **文档**: 保持测试文档和代码同步更新
5. **性能**: 定期检查 Cron Job 的执行性能和资源使用

通过遵循这个测试指南，你可以确保 Cloudflare Worker 的 scheduled 函数在各种情况下都能正常工作。
