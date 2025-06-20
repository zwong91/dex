# Entysquare DEX API v2.0 - 数据库驱动架构

## 🚀 概览

Entysquare DEX API v2.0 是一个完全重新设计的高性能 DEX API 服务，采用事件监听 + 数据库缓存的架构，解决了直接从链上获取数据的性能问题。

### 主要特性

- ⚡ **高性能**: 数据库缓存，响应时间 < 100ms
- 🔐 **完整认证系统**: API密钥管理、权限控制、速率限制
- 📊 **实时数据同步**: 监听区块链事件，实时更新数据库
- 🏗️ **可扩展架构**: 模块化设计，易于扩展新功能
- 📈 **全面分析**: 用户统计、交易分析、流动性追踪
- 🛡️ **企业级安全**: 多层权限控制、审计日志

## 🏗️ 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   区块链网络     │───▶│   事件监听器     │───▶│   D1 数据库     │
│   (BSC/测试网)   │    │   (Event Listener)│    │   (缓存层)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   客户端应用     │◀───│   API Gateway    │◀───│   数据库服务     │
│   (DApp/网站)    │    │   (认证+限制)    │    │   (查询优化)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 核心组件

1. **事件监听器** (`EventListener`)
   - 监听 Trader Joe 合约事件
   - 实时同步交易、流动性变化
   - 自动重试和错误恢复

2. **数据库服务** (`DatabaseService`) 
   - 高性能数据查询
   - 智能缓存策略
   - 复杂数据聚合

3. **同步服务** (`SyncService`)
   - 定时任务调度
   - 批量数据处理
   - 状态管理

4. **API密钥服务** (`ApiKeyService`)
   - 用户注册和认证
   - 权限管理
   - 速率限制

## 📋 API 端点

### 🔐 认证相关

| 端点 | 方法 | 描述 |
|-----|------|------|
| `/v1/auth/register` | POST | 用户注册 |
| `/v1/auth/apply-api-key` | POST | 申请API密钥 |
| `/v1/auth/api-keys/{userId}` | GET | 获取用户密钥列表 |
| `/v1/auth/api-keys/{keyId}` | DELETE | 撤销API密钥 |
| `/v1/usage/stats/{userId}` | GET | 使用统计 |

### 📊 DEX 数据

| 端点 | 方法 | 描述 | 权限 |
|-----|------|------|------|
| `/v1/dex/analytics/{chain}` | GET | DEX分析数据 | `dex:analytics:read` |
| `/v1/pools/{chain}` | GET | 流动性池列表 | `dex:pools:read` |
| `/v1/pools/{chain}/{address}` | GET | 池详细信息 | `dex:pools:read` |
| `/v1/user/bin-ids/{user}/{chain}/{pool}` | GET | 用户Bin IDs | `dex:user:read` |
| `/v1/user/pool-ids/{user}/{chain}` | GET | 用户池IDs | `dex:user:read` |
| `/v1/user/balances/{user}/{chain}` | GET | 用户余额 | `dex:user:read` |
| `/v1/user/swap-history/{user}/{chain}` | GET | 交易历史 | `dex:user:read` |
| `/v1/user/liquidity-history/{user}/{chain}` | GET | 流动性历史 | `dex:user:read` |
| `/v1/user/statistics/{user}/{chain}` | GET | 用户统计 | `dex:user:read` |

### 🔧 管理功能 (仅企业版)

| 端点 | 方法 | 描述 | 权限 |
|-----|------|------|------|
| `/v1/admin/sync/pool/{chain}/{address}` | POST | 手动同步池 | `admin:sync:manage` |
| `/v1/admin/pools` | POST | 添加新池 | `admin:pools:manage` |
| `/v1/admin/tokens` | POST | 添加代币信息 | `admin:pools:manage` |
| `/v1/admin/sync/status` | GET | 同步状态 | `admin:system:status` |

## 💎 订阅计划

### 🆓 免费版
- **价格**: $0/月
- **请求限制**: 1,000次/天
- **功能**: 基础池数据、公开分析
- **权限**: `dex:pools:read`, `dex:analytics:read`

### 🚀 基础版  
- **价格**: $29/月
- **请求限制**: 10,000次/天
- **功能**: 高级分析、用户数据、事件数据
- **权限**: 基础权限 + `dex:analytics:advanced`, `dex:user:read`, `dex:events:read`

### 💼 专业版
- **价格**: $99/月  
- **请求限制**: 100,000次/天
- **功能**: 实时数据、写操作、优先支持
- **权限**: 基础权限 + `dex:user:write`, `dex:realtime:subscribe`

### 🏢 企业版
- **价格**: $299/月
- **请求限制**: 500,000次/天
- **功能**: 完整访问、管理操作、自定义集成
- **权限**: 所有权限

## 🚀 快速开始

### 1. 用户注册

```bash
curl -X POST "https://api.entysquare.com/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "name": "Your Name",
    "company": "Your Company",
    "website": "https://yourwebsite.com"
  }'
```

### 2. 申请API密钥

```bash
curl -X POST "https://api.entysquare.com/v1/auth/apply-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "requestedTier": "basic",
    "reason": "Building DeFi analytics dashboard",
    "useCase": "Real-time pool monitoring and user analytics",
    "expectedVolume": "1000 requests per day"
  }'
```

### 3. 使用API

```bash
curl -H "x-api-key: your-api-key" \
  "https://api.entysquare.com/v1/pools/binance?pageSize=10&orderBy=liquidity"
```

## 🛠️ 本地开发

### 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd dex/backend

# 安装依赖
npm install

# 配置环境变量
cp wrangler.example.toml wrangler.toml
# 编辑 wrangler.toml 设置数据库ID和RPC端点
```

### 数据库设置

```bash
# 创建数据库
npm run db:create

# 生成迁移
npm run generate

# 运行迁移
npm run migrate:local

# 初始化数据
npm run db:init

# 打开数据库管理界面
npm run studio:local
```

### 启动开发服务器

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 查看覆盖率
npm run test:coverage
```

## 📊 数据库结构

### 核心表

- **pools**: 流动性池信息
- **tokens**: 代币元数据  
- **pool_stats**: 池统计数据（实时更新）
- **swap_events**: 交易事件记录
- **liquidity_events**: 流动性事件记录
- **user_positions**: 用户流动性仓位

### 用户管理表

- **users**: 用户账户
- **api_keys**: API密钥管理
- **permissions**: 权限定义
- **subscriptions**: 订阅管理
- **api_usage**: 使用统计
- **daily_usage_summary**: 每日使用汇总

### 系统表

- **sync_status**: 同步状态跟踪
- **price_history**: 价格历史数据

## ⚙️ 配置选项

### 环境变量

```toml
# 区块链RPC端点
BSC_RPC_URL = "https://bsc-dataseed1.binance.org/"
BSCTEST_RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/"

# 合约地址
LB_FACTORY_BSC = "0x8e42f2F4101563bF679975178e880FD87d3eFd4e"
LB_FACTORY_BSCTEST = "0x8e42f2F4101563bF679975178e880FD87d3eFd4e"

# 价格API
PRICE_API_URL = "https://api.coingecko.com/api/v3"
PRICE_API_KEY = "your-price-api-key"
```

### 定时任务配置

```toml
# 每小时同步池数据
[[triggers.crons]]
name = "sync-pools-hourly"
cron = "0 * * * *"

# 每日统计更新
[[triggers.crons]]
name = "sync-stats-daily"  
cron = "0 0 * * *"

# 每周数据清理
[[triggers.crons]]
name = "cleanup-old-data"
cron = "0 2 * * 0"
```

## 📈 监控和日志

### 性能指标

- 响应时间 < 100ms (99分位)
- 数据同步延迟 < 5分钟
- 数据库查询优化 < 50ms
- API成功率 > 99.9%

### 日志记录

- 所有API请求记录
- 错误堆栈跟踪
- 性能指标收集
- 用户行为分析

### 健康检查

```bash
curl https://api.entysquare.com/health
```

## 🔧 部署

### Cloudflare Workers部署

```bash
# 配置wrangler
npx wrangler login

# 部署到生产环境
npm run deploy

# 运行生产迁移
npm run migrate:prod
```

### 环境管理

- **开发环境**: 本地D1数据库 + 测试网
- **预发布环境**: 云端D1数据库 + 测试网
- **生产环境**: 云端D1数据库 + 主网

## 🛡️ 安全特性

- **API密钥验证**: 所有端点需要有效密钥
- **权限控制**: 细粒度权限管理
- **速率限制**: 防止API滥用
- **IP白名单**: 企业版支持IP限制
- **审计日志**: 完整的操作记录
- **数据加密**: 敏感数据加密存储

## 📚 示例和集成

### JavaScript/TypeScript

```typescript
import { EntysquareAPI } from '@entysquare/dex-api-client';

const api = new EntysquareAPI('your-api-key');

// 获取池列表
const pools = await api.getPools('binance', {
  pageSize: 20,
  orderBy: 'liquidity'
});

// 获取用户统计
const stats = await api.getUserStatistics(
  '0x1234...', 
  'binance'
);
```

### Python

```python
import requests

api_key = "your-api-key"
headers = {"x-api-key": api_key}

# 获取DEX分析数据
response = requests.get(
    "https://api.entysquare.com/v1/dex/analytics/binance",
    headers=headers
)
analytics = response.json()
```

## 🤝 支持和文档

- **API文档**: https://docs.entysquare.com/dex-api
- **技术支持**: support@entysquare.com
- **社区讨论**: https://discord.gg/entysquare
- **状态页面**: https://status.entysquare.com

## 📄 许可证

MIT License - 详见 LICENSE 文件
