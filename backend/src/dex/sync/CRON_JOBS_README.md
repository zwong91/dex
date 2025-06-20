# DEX Worker Cron Jobs 

## 概述

DEX 后端使用 Cloudflare Worker 的 Cron 触发器来执行定期的数据同步和维护任务。这个系统确保了 DEX 数据的实时性和系统的稳定运行。

## Cron 作业配置

在 `wrangler.toml` 中配置了以下 Cron 触发器：

### 1. 频繁池同步 (sync-pools-frequent)
- **调度**: `*/5 * * * *` (每5分钟)
- **功能**: 同步最新的交易对数据、价格信息等高频更新数据
- **重要性**: 保证用户看到的是最新的市场数据

### 2. 每小时统计同步 (sync-stats-hourly)
- **调度**: `0 * * * *` (每小时整点)
- **功能**: 计算和更新统计数据、聚合信息
- **内容**: 
  - 交易量统计
  - 流动性变化统计
  - 用户活跃度统计
  - 价格历史数据

### 3. 每周数据清理 (cleanup-old-data)
- **调度**: `0 2 * * 0` (每周日凌晨2点)
- **功能**: 数据库维护和清理
- **内容**:
  - 清理30天前的同步日志
  - 压缩90天前的详细交易数据为日摘要
  - 清理过期的缓存数据
  - 更新数据库统计信息

## 架构设计

### 核心组件

1. **主 Worker (`src/index.ts`)**
   - 实现 `scheduled` 方法处理 Cron 触发器
   - 根据 cron 表达式路由到相应的处理器

2. **Cron 处理器 (`src/dex/sync/cron-handler.ts`)**
   - 封装具体的 Cron 作业逻辑
   - 提供错误处理和日志记录
   - 支持状态查询和监控

3. **同步协调器 (`src/dex/sync/sync-coordinator.ts`)**
   - 管理实际的数据同步操作
   - 提供故障恢复和重试机制

## API 端点

### 查看 Cron 作业状态
```
GET /v1/api/admin/sync/cron
```

返回所有 Cron 作业的状态信息：
```json
{
  "success": true,
  "data": {
    "cronJobs": {
      "sync-pools-frequent": {
        "name": "Frequent Pool Sync",
        "description": "Syncs pool data every 5 minutes",
        "schedule": "*/5 * * * *",
        "lastRun": "2025-06-20T10:15:00.000Z",
        "nextRun": "2025-06-20T10:20:00.000Z",
        "status": "success"
      },
      "sync-stats-hourly": {
        "name": "Hourly Stats Sync", 
        "description": "Updates statistics and aggregated data every hour",
        "schedule": "0 * * * *",
        "lastRun": "2025-06-20T10:00:00.000Z",
        "nextRun": "2025-06-20T11:00:00.000Z",
        "status": "success"
      },
      "cleanup-old-data": {
        "name": "Weekly Data Cleanup",
        "description": "Cleans up old data and maintains database every Sunday at 2 AM",
        "schedule": "0 2 * * 0",
        "lastRun": "2025-06-16T02:00:00.000Z",
        "nextRun": "2025-06-23T02:00:00.000Z",
        "status": "success"
      }
    },
    "serverTime": "2025-06-20T10:17:30.000Z"
  }
}
```

## 监控和错误处理

### 错误处理策略
1. **自动重试**: 每个 Cron 作业都有内置的错误重试机制
2. **错误日志**: 所有错误都会被记录到 Cloudflare Workers 日志中
3. **优雅降级**: 单个作业失败不会影响其他作业的执行

### 监控指标
- Cron 作业执行时间
- 成功/失败率
- 数据同步延迟
- 系统健康状态

## 部署和配置

### 1. 环境要求
- Cloudflare Workers 账户
- D1 数据库配置
- 必要的环境变量

### 2. 部署步骤
```bash
# 1. 安装依赖
npm install

# 2. 配置 wrangler.toml
# 确保 cron triggers 正确配置

# 3. 部署到 Cloudflare Workers
npm run deploy
```

### 3. 验证部署
```bash
# 检查 Cron 作业状态
curl https://your-worker.your-subdomain.workers.dev/v1/api/admin/sync/cron

# 手动触发同步进行测试
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/api/admin/sync/trigger
```

## 性能优化

### 1. 动态导入
- Cron 处理器使用动态导入减少启动时间
- 只在需要时加载同步模块

### 2. 批量处理
- 数据同步使用批量操作提高效率
- 避免单个记录的频繁数据库操作

### 3. 缓存策略
- 合理使用缓存减少数据库压力
- 定期清理过期缓存

## 故障排除

### 常见问题

1. **Cron 作业未执行**
   - 检查 wrangler.toml 中的 cron 配置
   - 确认 Worker 已正确部署
   - 查看 Cloudflare Workers 控制台日志

2. **同步超时**
   - 检查数据库连接状态
   - 调整同步批次大小
   - 增加错误重试次数

3. **内存不足**
   - 优化数据处理逻辑
   - 使用流式处理大数据集
   - 考虑分拆大型作业为多个小作业

### 调试技巧

1. **启用详细日志**
   ```typescript
   // 在环境变量中设置
   DEBUG_SYNC=true
   ```

2. **手动触发测试**
   ```bash
   # 手动触发同步
   curl -X POST /v1/api/admin/sync/trigger
   ```

3. **查看详细状态**
   ```bash
   # 获取详细的同步状态
   curl /v1/api/admin/sync/status
   ```

## 最佳实践

1. **监控**: 定期检查 Cron 作业的执行状态
2. **备份**: 在数据清理前创建备份
3. **测试**: 在生产环境部署前在测试环境验证
4. **文档**: 记录任何配置更改和维护操作
5. **告警**: 设置必要的错误告警机制

## 扩展指南

### 添加新的 Cron 作业

1. **更新 wrangler.toml**
   ```toml
   [[triggers.crons]]
   name = "new-job"
   cron = "0 */6 * * *"  # 每6小时
   ```

2. **扩展 CronHandler**
   ```typescript
   async handleNewJob(): Promise<void> {
     // 实现新的作业逻辑
   }
   ```

3. **更新路由逻辑**
   ```typescript
   case "0 */6 * * *":
     await cronHandler.handleNewJob();
     break;
   ```

4. **添加 API 端点** (可选)
   - 为新作业添加状态查询端点
   - 提供手动触发功能

### 性能调优

1. **批次大小优化**: 根据数据量调整处理批次
2. **并发控制**: 避免多个作业同时执行造成资源竞争
3. **数据库索引**: 确保查询有适当的索引支持
4. **缓存策略**: 合理使用缓存减少重复计算

这个 Cron 作业系统为 DEX 提供了强大的自动化数据维护能力，确保系统的稳定性和数据的一致性。
