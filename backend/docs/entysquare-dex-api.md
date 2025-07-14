# EntySquare Dex API 文档

## 📋 API 基本信息

| 属性 | 值 |
|------|-----|
| **API 名称** | EntySquare Dex API |
| **版本** | 1.0.0 |
| **OpenAPI 版本** | 3.0.2 |
| **基础 URL** | <https://api.dex.jongun2038.win> |
| **许可证** | Apache 2.0 |

## 🔑 认证方式

**必需的请求头**:

```http
x-api-key: {your-key}
```

## 📝 API 描述

EntySquare 是一个领先的去中心化交易所，让用户可以：

- 交易各种代币
- 获得奖励
- 参与安全的点对点交易
- 让 DeFi 变得简单易用

## 🌐 支持的区块链

```javascript
// 支持的区块链
const supportedChains = [
  "binance",      // 币安智能链
  "ethereum",     // 以太坊
];
```

## 🏷️ API 分类

### 1. 📊 DEX Analytics (1个接口)

- **GET** `/v1/api/dex/analytics/{chain}` - 获取每日交易所分析数据 ✅ (已完整实现)
  - 支持参数：startTime, endTime, version
  - 权限要求：`analytics_read`

### 2. 🏊 Pools (流动性池相关接口) (2个接口)

- **GET** `/v1/api/dex/pools/{chain}` - 按链获取池列表 ✅ (已完整实现)
- **GET** `/v1/api/dex/pools/{chain}/{address}` - 获取指定池详情 ✅ (已完整实现)
  - 支持分页、排序、过滤
  - 权限要求：`pools_read`

### 3. 👤 User (用户相关接口) (7个接口)

- **GET** `/v1/api/dex/user/bin-ids/{user_address}/{chain}/{pool_address}` - 获取用户Bin IDs ✅ (已完整实现)
- **GET** `/v1/api/dex/user/pool-ids/{user_address}/{chain}` - 获取用户池IDs ✅ (已完整实现)
- **GET** `/v1/api/dex/user/pool-user-balances` - 池用户余额查询 ✅ (已完整实现)
- **GET** `/v1/api/dex/user/fees-earned/{chain}/{user_address}/{pool_address}` - 获取用户费用收益 ✅ (已完整实现)

- **GET** `/v1/api/dex/user/{chain}/{user_address}/farms` - 获取用户农场仓位
- **GET** `/v1/api/dex/user/{chain}/{user_address}/farms/{vault_id}` - 获取用户指定农场仓位
- **GET** `/v1/api/dex/user/{chain}/history/{user_address}/{pool_address}` - 获取用户历史记录
  - 权限要求：`user_read`

### 4. 🎁 Rewards (奖励相关接口) (4个接口)

- **GET** `/v1/api/dex/rewards/{chain}/{user_address}` - 获取用户奖励证明
- **POST** `/v1/api/dex/rewards/batch-proof/{chain}/{user_address}` - 批量获取奖励证明
- **GET** `/v1/api/dex/rewards/claimable/{chain}/{user_address}` - 获取可领取奖励
- **GET** `/v1/api/dex/rewards/history/{chain}/{user_address}` - 获取奖励历史记录
  - 权限要求：`rewards_read`

### 5. 📈 User Lifetime Stats (用户汇总统计) (1个接口)

- **GET** `/v1/api/dex/user-lifetime-stats/{chain}/users/{user_address}/swap-stats` - 用户交易统计数据
  - 权限要求：`user_read`

### 6. 🏛️ Vaults (资金库相关接口) (8个接口)

- **GET** `/v1/api/dex/vaults` - 获取所有资金库列表
- **GET** `/v1/api/dex/vaults/{chain}` - 按链获取资金库列表
- **GET** `/v1/api/dex/vaults/{chain}/{vault_address}/share-price` - 获取资金库份额价格
- **GET** `/v1/api/dex/vaults/{chain}/{vault_address}` - 获取资金库详情
- **GET** `/v1/api/dex/vaults/{chain}/{vault_address}/tvl-history` - 获取资金库TVL历史
- **GET** `/v1/api/dex/vaults/{chain}/{vault_address}/recent-activity` - 获取资金库最近活动
- **GET** `/v1/api/dex/vaults/{chain}/withdrawals/{user_address}` - 获取用户提取记录
- **GET** `/v1/api/dex/vaults/{chain}/{vault_address}/withdrawals/{user_address}` - 获取用户在指定资金库的提取记录
  - 权限要求：`vaults_read`

## 🏗️ 技术架构特点

### ✅ 统一路由系统

- 所有新接口通过 `routeDexEndpoints` 函数统一处理
- 清晰的路径解析和参数提取
- 统一的错误处理和响应格式

### ✅ 权限控制

- 基于角色的访问控制 (RBAC)
- 细粒度权限验证
- 支持多种权限级别：
  - `analytics_read` - 分析数据访问
  - `pools_read` - 池数据访问
  - `rewards_read` - 奖励数据访问
  - `user_read` - 用户数据访问
  - `vaults_read` - 资金库数据访问

### ✅ 数据库驱动

- 所有数据从 D1 数据库查询
- 支持复杂的过滤、排序、分页
- 优化的 SQL 查询性能

Entysquare DEX API后端v1.0，采用基于数据库的架构，通过监听Trader Joe合约事件和调用链上合约并缓存到Cloudflare D1数据库，实现了极快的API响应速度和高并发支持。

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   区块链网络     │───▶│   事件监听器     │───▶│   D1 数据库     │
│   (BSC/测试网)   │    │   (Event Listener)│    │   (缓存层)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   客户端应用     │◀───│   API Gateway    │◀───│   数据库服务     │
│   (DApp/Page)    │    │   (认证+限制)    │    │   (查询优化)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

✅ **性能飞跃**: 从2-5秒响应优化到50-200ms（提升10-25倍）  
✅ **事件驱动**: 实时监听链上合约事件并同步到数据库  
✅ **智能缓存**: 预计算的池统计和用户数据  
✅ **自动同步**: 定时任务自动更新数据  
✅ **错误恢复**: 可靠的增量同步机制  
✅ **可扩展性**: 模块化设计，易于扩展新功能

### 关键技术组件

1. **EventListener** (`src/dex/event-listener.ts`)
   - 监听Trader Joe LiquiBook合约事件
   - 实时解析Swap、DepositedToBins、WithdrawnFromBins事件
   - 增量同步，避免重复处理
   - 批量处理大区块范围

2. **DatabaseService** (`src/dex/database-service.ts`)
   - 高性能数据库查询服务
   - 支持分页、排序、搜索
   - 聚合统计计算
   - 用户数据分析

3. **SyncService** (`src/dex/sync-service.ts`)
   - 定时同步服务
   - 池管理和状态追踪
   - 错误处理和重试机制
   - 数据清理和维护

4. **新数据库架构**

   ```sql
   pools          -- 流动性池信息
   tokens         -- 代币详情  
   pool_stats     -- 池统计数据(实时)
   swap_events    -- 交易事件记录
   liquidity_events -- 流动性变化事件
   user_positions -- 用户仓位
   price_history  -- 价格历史
   sync_status    -- 同步状态追踪
   ```

## 🔗 主要 API 端点

### 1. 交易分析

```http
GET /v1/api/dex/analytics/{chain}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 描述 |
|------|------|------|----------|--------|------|
| `chain` | 路径参数 | 是 | string | - | 区块链名称 |
| `startTime` | 查询参数 | 是 | integer | - | 开始时间戳 (Unix timestamp) |
| `endTime` | 查询参数 | 否 | integer | - | 结束时间戳 (Unix timestamp) |
| `version` | 查询参数 | 否 | string | "all" | 版本过滤，可选值: "v2.2", "all" |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/dex/analytics/bsc?startTime=1672531200" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "date": "2019-08-24T14:15:22Z",           // 数据日期，ISO 8601 格式
    "timestamp": 0,                           // Unix 时间戳
    "reserveUsd": 0,                         // 流动性储备总值 (美元)
    "reserveNative": 0,                      // 流动性储备总值 (原生代币)
    "volumeUsd": 0,                          // 24小时交易量 (美元)
    "volumeNative": 0,                       // 24小时交易量 (原生代币)
    "feesUsd": 0,                           // 24小时手续费收入 (美元)
    "feesNative": 0,                        // 24小时手续费收入 (原生代币)
    "protocolFeesUsd": 0,                   // 24小时协议费用 (美元)
    "protocolFeesNative": 0                 // 24小时协议费用 (原生代币)
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}
```

### 2. 流动性池列表

```http
GET /v1/api/pools/{chain}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `pageSize` | 查询参数 | 否 | integer | 20 | 1-100 | 页大小，每页返回的记录数 |
| `pageNum` | 查询参数 | 否 | integer | 1 | > 0 | 页码，从1开始 |
| `orderBy` | 查询参数 | 否 | string | "volume" | "liquidity", "volume", "name" | 排序方式：按流动性、交易量或名称排序 |
| `filterBy` | 查询参数 | 否 | string | "1d" | "1h", "1d", "7d", "14d", "30d" | 时间过滤：1小时、1天、7天、14天、30天 |
| `status` | 查询参数 | 否 | string | "all" | "main", "all" | 状态过滤：主要池或全部 |
| `version` | 查询参数 | 否 | string | "all" | "v2.2", "all" | 版本过滤 |
| `excludeLowVolumePools` | 查询参数 | 否 | boolean | true | true, false | 是否排除低交易量池 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/pools/bsc?pageSize=10&orderBy=volume&filterBy=1d" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "pairAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c", // 流动性池合约地址
    "chain": "bsc",                                        // 区块链名称
    "name": "BNB/USDC",                                        // 交易对名称
    "status": "main",                                           // 池状态 (main: 主要池)
    "version": "v2.2",                                          // 协议版本
    "tokenX": {                                                 // 代币 X 信息
      "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // 代币合约地址
      "name": "Binance Coin",                                      // 代币全名
      "symbol": "BNB",                                         // 代币符号
      "decimals": 18,                                           // 小数位数
      "priceUsd": 25.50,                                        // 美元价格
      "priceNative": "1.0"                                      // 原生代币价格
    },
    "tokenY": {                                                 // 代币 Y 信息
      "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // 代币合约地址
      "name": "USD Coin",                                       // 代币全名
      "symbol": "USDC",                                         // 代币符号
      "decimals": 6,                                            // 小数位数
      "priceUsd": 1.00,                                         // 美元价格
      "priceNative": "0.039216"                                 // 原生代币价格
    },
    "reserveX": 1000000,                                        // 代币 X 储备量
    "reserveY": 25500000,                                       // 代币 Y 储备量
    "lbBinStep": 25,                                           // LB 池的 bin step 参数
    "lbBaseFeePct": 0.15,                                      // 基础手续费百分比
    "lbMaxFeePct": 1.5,                                        // 最大手续费百分比
    "activeBinId": 8388608,                                    // 当前活跃 bin ID
    "liquidityUsd": 51000000,                                  // 流动性总值 (美元)
    "liquidityNative": "2000000.0",                           // 流动性总值 (原生代币)
    "liquidityDepthMinus": 500000,                             // 负方向流动性深度
    "liquidityDepthPlus": 500000,                              // 正方向流动性深度
    "liquidityDepthTokenX": 1000000,                           // 代币 X 流动性深度
    "liquidityDepthTokenY": 25500000,                          // 代币 Y 流动性深度
    "volumeUsd": 2500000,                                      // 24小时交易量 (美元)
    "volumeNative": "98039.2",                                 // 24小时交易量 (原生代币)
    "feesUsd": 2500,                                           // 24小时手续费收入 (美元)
    "feesNative": "98.039",                                    // 24小时手续费收入 (原生代币)
    "protocolSharePct": 10                                     // 协议费用分成百分比
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 3. 获取指定池信息

```http
GET /v1/api/pools/{chain}/{address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana" | 区块链名称 |
| `address` | 路径参数 | 是 | string | - | 有效的合约地址 | 流动性池合约地址 (支持大小写混合) |
| `filterBy` | 查询参数 | 否 | string | "1d" | "1h", "1d", "7d", "14d", "30d" | 时间过滤：1小时、1天、7天、14天、30天 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/pools/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c?filterBy=1d" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
{
  "pairAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c", // 流动性池合约地址
  "chain": "bsc",                                        // 区块链名称
  "name": "BNB/USDC",                                        // 交易对名称
  "status": "main",                                           // 池状态 (main: 主要池, old: 旧池)
  "version": "v2.2",                                          // 协议版本
  "tokenX": {                                                 // 代币 X 信息
    "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // 代币合约地址
    "name": "Binance Coin",                                      // 代币全名
    "symbol": "BNB",                                         // 代币符号
    "decimals": 18,                                           // 小数位数
    "priceUsd": 25.50,                                        // 美元价格
    "priceNative": "1.0"                                      // 原生代币价格
  },
  "tokenY": {                                                 // 代币 Y 信息
    "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // 代币合约地址
    "name": "USD Coin",                                       // 代币全名
    "symbol": "USDC",                                         // 代币符号
    "decimals": 6,                                            // 小数位数
    "priceUsd": 1.00,                                         // 美元价格
    "priceNative": "0.039216"                                 // 原生代币价格
  },
  "reserveX": 1000000,                                        // 代币 X 储备量
  "reserveY": 25500000,                                       // 代币 Y 储备量
  "lbBinStep": 25,                                           // LB 池的 bin step 参数
  "lbBaseFeePct": 0.15,                                      // 基础手续费百分比
  "lbMaxFeePct": 1.5,                                        // 最大手续费百分比
  "activeBinId": 8388608,                                    // 当前活跃 bin ID
  "liquidityUsd": 51000000,                                  // 流动性总值 (美元)
  "liquidityNative": "2000000.0",                           // 流动性总值 (原生代币)
  "liquidityDepthMinus": 500000,                             // 负方向流动性深度
  "liquidityDepthPlus": 500000,                              // 正方向流动性深度
  "liquidityDepthTokenX": 1000000,                           // 代币 X 流动性深度
  "liquidityDepthTokenY": 25500000,                          // 代币 Y 流动性深度
  "volumeUsd": 2500000,                                      // 指定时间段交易量 (美元)
  "volumeNative": "98039.2",                                 // 指定时间段交易量 (原生代币)
  "feesUsd": 2500,                                           // 指定时间段手续费收入 (美元)
  "feesNative": "98.039",                                    // 指定时间段手续费收入 (原生代币)
  "protocolSharePct": 10                                     // 协议费用分成百分比
}
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 4. 获取用户奖励证明 Get Proof

```http
GET /v1/api/rewards/{chain}/{user_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `market` | 查询参数 | 是 | string | - | 有效的市场标识 | 市场标识符 |
| `epoch` | 查询参数 | 是 | integer | - | > 0 | 奖励轮次编号 |
| `token` | 查询参数 | 是 | string | - | 有效的代币地址 | 奖励代币合约地址 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/rewards/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c?market=lb&epoch=15&token=0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  "string"
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}

### 4.1 批量获取用户奖励证明 Get User Proofs

```http
POST /v1/api/rewards/batch-proof/{chain}/{user_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |

**请求体 (JSON)**:

```json
{
  "batch": [                                // 批量查询数组
    {
      "market": "lb",                       // 市场标识符
      "epoch": 15,                          // 奖励轮次编号
      "token": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd" // 奖励代币地址
    },
    {
      "market": "lb",
      "epoch": 16,
      "token": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
    }
  ]
}
```

**示例请求**:

```bash
curl -X POST "https://api.dex.jongun2038.win/v1/api/rewards/batch-proof/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "batch": [
      {
        "market": "lb",
        "epoch": 15,
        "token": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd"
      },
      {
        "market": "lb", 
        "epoch": 16,
        "token": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
      }
    ]
  }'
```

**响应示例**:

**200 - 成功响应**:

```json
[
  [
    "string"
  ],
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}



### 4.2 用户可领取奖励

```http
GET /v1/api/rewards/claimable/{chain}/{user_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `market` | 查询参数 | 否 | string | - | 有效的市场标识 | 市场标识符，不指定则返回所有市场 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/rewards/claimable/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c?market=lb" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "market": "lb",                                             // 市场标识
    "epoch": 15,                                                // 奖励轮次
    "claimableRewards": [                                       // 可领取奖励列表
      {
        "amount": "1000000000000000000",                        // 奖励数量 (wei 格式)
        "tokenAddress": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", // 奖励代币地址
      },
      {
        "amount": "500000000000000000",                         // 另一个奖励
        "tokenAddress": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      }
    ]
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}

### 4.3 用户奖励历史记录

```http
GET /v1/api/rewards/history/{chain}/{user_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `market` | 查询参数 | 是 | string | - | 有效的市场标识 | 市场标识符 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/rewards/history/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c?market=lb" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "epoch": 15,                                                // 奖励轮次
    "epochStart": "2024-01-01T00:00:00Z",                      // 轮次开始时间
    "epochEnd": "2024-01-08T00:00:00Z",                        // 轮次结束时间
    "progress": 100,                                            // 轮次进度百分比 (0-100)
    "rewards": [                                                // 该轮次奖励列表
      {
        "amount": "1000000000000000000",                        // 奖励数量 (wei 格式)
        "tokenAddress": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", // 奖励代币地址
        "tokenSymbol": "UNC",                                   // 代币符号
      },
      {
        "amount": "500000000000000000",
        "tokenAddress": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      }
    ]
  },
  {
    "epoch": 14,                                                // 上一轮次
    "epochStart": "2023-12-25T00:00:00Z",
    "epochEnd": "2024-01-01T00:00:00Z",
    "progress": 100,
    "rewards": [
      {
        "amount": "750000000000000000",
        "tokenAddress": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
      }
    ]
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}

### 5. 用户池相关信息

#### 5.1 获取用户当前 Bin IDs

```http
GET /v1/api/user/bin-ids/{user_address}/{chain}/{pool_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `pool_address` | 路径参数 | 是 | string | - | 有效的合约地址 | 流动性池合约地址 (支持大小写混合) |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/bin-ids/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  8388608,                                  // Bin ID 1
  8388609,                                  // Bin ID 2 
  8388610                                   // Bin ID 3
]
```

#### 5.2 获取用户池 IDs

```http
GET /v1/api/user/pool-ids/{user_address}/{chain}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `pageSize` | 查询参数 | 否 | integer | 20 | 1-100 | 每页返回的记录数量 |
| `pageNum` | 查询参数 | 否 | integer | 1 | >= 1 | 页码 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/pool-ids/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/bsc?pageSize=20&pageNum=1" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "poolAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c",  // 池合约地址
    "pairName": "BNB/USDC",                                    // 交易对名称
    "status": "main",                                           // 池状态
    "version": "v2.2",                                          // 协议版本
    "chain": "bsc",                                            // 区块链
    "lbBinStep": 25,                                           // Bin step
    "lbBaseFeePct": 0.15,                                      // 基础手续费百分比
    "lbMaxFeePct": 1.5,                                        // 最大手续费百分比
    "binIds": [                                                // 用户在该池的 Bin IDs
      8388608,
      8388609,
      8388610
    ],
    "tokenX": {                                                // 代币 X 信息
      "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      "name": "Binance Coin",
      "symbol": "BNB",
      "decimals": 18,
      "priceUsd": 25.50
    },
    "tokenY": {                                                // 代币 Y 信息
      "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "priceUsd": 1.00
    }
  }
]
```

#### 5.3 获取池用户余额

```http
GET /v1/api/user/pool-user-balances
```

**注意**: 此API仅对拥有合作伙伴API密钥的用户开放。

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chainId` | 查询参数 | 是 | integer | - | 有效的链ID | 区块链ID (如: 43114 for Binance Coin) |
| `lpAddress` | 查询参数 | 是 | string | - | 有效的合约地址 | 流动性池合约地址 |
| `poolAddress` | 查询参数 | 是 | string | - | 有效的合约地址 | 池合约地址 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/pool-user-balances?chainId=43114&lpAddress=0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c&poolAddress=0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-partner-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "user": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c",      // 用户地址
    "balance": "1000000000000000000",                          // 余额 (wei)
    "pool": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c",      // 池地址
    "lpTokenAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c", // LP代币地址
    "baseTokenBalance": "500000000000000000",                  // 基础代币余额
    "quoteTokenBalance": "12750000000",                        // 报价代币余额
    "baseTokenAddress": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // 基础代币地址
    "quoteTokenAddress": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" // 报价代币地址
  }
]
```

#### 5.4 获取用户农场仓位列表

```http
GET /v1/api/user/{chain}/{user_address}/farms
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/farms" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "farmId": "farm_001",                                       // 农场ID
    "userPosition": "1500000000000000000",                     // 用户仓位 (wei)
    "userPositionRaw": "1500000000000000000",                  // 原始仓位数据
    "userPositionUsd": "1875.25",                              // 仓位美元价值
    "pendingUn c": 500000000000000000                           // 待领取的UNC奖励 (wei)
  },
  {
    "farmId": "farm_002",
    "userPosition": "750000000000000000",
    "userPositionRaw": "750000000000000000",
    "userPositionUsd": "937.63",
    "pendingUnc": 250000000000000000
  }
]
```

#### 5.5 获取用户指定农场仓位

```http
GET /v1/api/user/{chain}/{user_address}/farms/{vault_id}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `vault_id` | 路径参数 | 是 | string | - | 有效的农场ID | 农场/资金库标识符 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/farms/farm_001" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
{
  "farmId": "farm_001",                                         // 农场ID
  "userPosition": "1500000000000000000",                       // 用户仓位 (wei)
  "userPositionRaw": "1500000000000000000",                    // 原始仓位数据
  "userPositionUsd": "1875.25",                                // 仓位美元价值
  "pendingUnc": 500000000000000000,                            // 待领取的UNC奖励 (wei)
  "farmDetails": {                                             // 农场详细信息
    "vaultAddress": "0x1234567890abcdef1234567890abcdef12345678", // 资金库地址
    "underlyingPoolAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c", // 底层池地址
    "totalStaked": "50000000000000000000",                     // 总质押量
    "apy": "15.25",                                            // 年化收益率
    "rewardTokens": [                                          // 奖励代币列表
      {
        "address": "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
        "symbol": "UNC",
        "pendingRewards": "500000000000000000"                 // 待领取奖励
      }
    ]
  }
}
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}

#### 5.6 获取用户历史仓位

```http
GET /v1/api/user/{chain}/history/{user_address}/{pool_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `pool_address` | 路径参数 | 是 | string | - | 有效的合约地址 | 流动性池合约地址 (支持大小写混合) |
| `pageSize` | 查询参数 | 否 | integer | 20 | 1-100 | 每页返回的记录数量 |
| `pageNum` | 查询参数 | 否 | integer | 1 | >= 1 | 页码 |
| `startTime` | 查询参数 | 是 | integer | - | Unix 时间戳 | 查询开始时间 |
| `endTime` | 查询参数 | 否 | integer | - | Unix 时间戳 | 查询结束时间 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/bsc/history/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c?pageSize=20&pageNum=1&startTime=1672531200&endTime=1704067200" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "poolAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c",  // 池合约地址
    "pairName": "BNB/USDC",                                    // 交易对名称
    "binId": 8388608,                                           // Bin ID
    "lbBinStep": 25,                                           // Bin step 参数
    "lbBaseFeePct": 0.15,                                      // 基础手续费百分比
    "lbMaxFeePct": 1.5,                                        // 最大手续费百分比
    "tokenX": {                                                // 代币 X 信息
      "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      "name": "Binance Coin",
      "symbol": "BNB",
      "decimals": 18,
      "amount": 1000000000000000000,                           // 数量 (wei)
      "amountRaw": "1.0",                                      // 格式化数量
      "price": 25.50,                                          // 价格 (USD)
      "priceNative": "1.0"                                     // 原生代币价格
    },
    "tokenY": {                                                // 代币 Y 信息
      "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "amount": 25500000,                                      // 数量 (wei)
      "amountRaw": "25.5",                                     // 格式化数量
      "price": 1.00,                                           // 价格 (USD)
      "priceNative": "0.039216"                                // 原生代币价格
    },
    "isDeposit": true,                                         // 是否为存款操作
    "timestamp": "2019-08-24T14:15:22Z",                       // 操作时间戳
    "blockNumber": 12345678                                    // 区块号
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}

#### 5.7 获取用户每个 Bin 的手续费收益

```http
GET /v1/api/user/fees-earned/{chain}/{user_address}/{pool_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "all", "bsc" | 区块链名称 (支持 "all" 查询所有链) |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `pool_address` | 路径参数 | 是 | string | - | 有效的合约地址 | 流动性池合约地址 (支持大小写混合) |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/fees-earned/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-api-key"
```

**示例请求 (查询所有链)**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user/fees-earned/all/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "binId": 8388608,                                           // Bin ID
    "mostRecentDepositTime": "2019-08-24T14:15:22Z",           // 最近存款时间
    "timestamp": 1566569722,                                   // Unix 时间戳
    "accruedFeesX": 500000000000000000,                        // 累计的代币X手续费 (wei)
    "accruedFeesY": 12750000,                                  // 累计的代币Y手续费 (wei)
    "accruedFeesL": 150000000000000000,                        // 累计的流动性手续费 (wei)
    "priceXY": 25.50,                                          // X/Y 价格比率
    "priceYX": 0.039216                                        // Y/X 价格比率
  },
  {
    "binId": 8388609,
    "mostRecentDepositTime": "2019-08-24T14:20:15Z",
    "timestamp": 1566570015,
    "accruedFeesX": 300000000000000000,
    "accruedFeesY": 7650000,
    "accruedFeesL": 90000000000000000,
    "priceXY": 25.52,
    "priceYX": 0.039186
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 5.8. 用户交易统计

```http
GET /v1/api/user-lifetime-stats/{chain}/users/{user_address}/swap-stats
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `user_address` | 路径参数 | 是 | string | - | 有效的钱包地址 | 用户钱包地址 (支持大小写混合) |
| `from_date` | 查询参数 | 否 | string | - | ISO 8601 格式 | 统计开始日期 (例: 2024-01-01) |
| `to_date` | 查询参数 | 否 | string | - | ISO 8601 格式 | 统计结束日期 (例: 2024-12-31) |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/user-lifetime-stats/bsc/users/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/swap-stats?from_date=2024-01-01&to_date=2024-12-31" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
{
  "userAddress": "0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c",    // 用户地址
  "chain": "bsc",                                           // 区块链
  "dateRange": {                                                  // 统计时间范围
    "fromDate": "2024-01-01",                                     // 开始日期
    "toDate": "2024-12-31"                                        // 结束日期
  },
  "volume": "string",
  "swapStats": {                                                  // 交易统计数据
    "totalTransactions": 125,                                     // 总交易次数
    "totalVolumeUsd": "15750.50",                                 // 总交易量 (USD)
    "totalFeesUsd": "47.25",                                      // 总手续费 (USD)
    "avgTransactionSizeUsd": "126.00",                            // 平均交易大小 (USD)
    "uniqueTradingPairs": 8,                                      // 交易过的独特交易对数量
    "mostTradedPair": {                                           // 最常交易的交易对
      "pairAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "name": "BNB/USDC",
      "transactionCount": 45,                                     // 在此交易对的交易次数
      "volumeUsd": "5670.75"                                      // 在此交易对的交易量
    },
    "monthlyBreakdown": [                                         // 月度分解统计
      {
        "month": "2024-01",                                       // 月份
        "transactions": 12,                                       // 该月交易次数
        "volumeUsd": "1520.30",                                   // 该月交易量
        "feesUsd": "4.56"                                         // 该月手续费
      },
      {
        "month": "2024-02",
        "transactions": 18,
        "volumeUsd": "2240.80",
        "feesUsd": "6.72"
      }
    ],
    "favoriteTokens": [                                           // 最常交易的代币
      {
        "tokenAddress": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        "symbol": "BNB",                                         // 代币符号
        "transactionCount": 85,                                   // 涉及此代币的交易次数
        "volumeUsd": "10850.25"                                   // 涉及此代币的交易量
      },
      {
        "tokenAddress": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "symbol": "USDC",
        "transactionCount": 72,
        "volumeUsd": "9120.15"
      }
    ]
  }
}
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 6 Vaults
### 6. 资金库列表 List Vaults

```http
GET /v1/api/vaults
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `pageSize` | 查询参数 | 否 | integer | 20 | 0-100 | 每页返回的记录数量 |
| `pageNum` | 查询参数 | 否 | integer | 1 | > 0 | 页码 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults?pageSize=20&pageNum=1" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "address": "string",                                        // 资金库合约地址
    "chain": "bsc",                                       // 区块链名称
    "chainId": 0,                                              // 区块链ID
    "name": "string",                                          // 资金库名称
    "pair": {                                                  // 交易对信息
      "address": "string",                                     // 交易对地址
      "chain": "bsc",                                    // 区块链
      "version": "v2.2",                                       // 协议版本
      "binStep": 0,                                           // Bin step 参数
      "baseFeePct": 0                                         // 基础手续费百分比
    },
    "tokenX": {                                                // 代币 X 信息
      "address": "string",                                     // 代币地址
      "chain": "bsc",                                    // 区块链
      "symbol": "string",                                      // 代币符号
      "decimals": 0                                           // 小数位数
    },
    "tokenY": {                                                // 代币 Y 信息
      "address": "string",                                     // 代币地址
      "chain": "bsc",                                    // 区块链
      "symbol": "string",                                      // 代币符号
      "decimals": 0                                           // 小数位数
    },
    "tokenX7DayPerformance": 0,                                // 代币X 7日表现
    "tokenY7DayPerformance": 0,                                // 代币Y 7日表现
    "hodl5050Performance": 0,                                  // 50/50持有策略表现
    "tokenX30DayPerformance": 0,                               // 代币X 30日表现
    "tokenY30DayPerformance": 0,                               // 代币Y 30日表现
    "hodl30Day5050Performance": 0,                             // 30日50/50持有策略表现
    "strategy": {                                              // 策略信息
      "address": "string",                                     // 策略地址
      "chain": "bsc",                                    // 区块链
      "aumAnnualFeePct": 0                                    // 资产管理年费百分比
    },
    "aptPrice": 0,                                             // APT价格
    "apt1dPriceChange": 0,                                     // APT 1日价格变化
    "tvlUsd": 0,                                              // 总锁定价值 (美元)
    "feesUsd": 0,                                             // 手续费 (美元)
    "apr1d": 0,                                               // 1日年化收益率
    "farm": {                                                  // 农场信息
      "farmId": "string",                                      // 农场ID
      "vaultId": "string",                                     // 资金库ID
      "liquidity": "string",                                   // 流动性
      "liquidityRaw": 0,                                       // 原始流动性数据
      "liquidityUsd": 0,                                       // 流动性美元价值
      "aptDecimals": 0,                                        // APT小数位数
      "apr1d": 0,                                             // 农场1日年化收益率
      "rewardsPerSec": 0,                                      // 每秒奖励
      "reward": {                                              // 奖励代币信息
        "id": "string",                                        // 奖励ID
        "name": "string",                                      // 奖励名称
        "symbol": "string",                                    // 奖励符号
        "decimals": 0                                          // 奖励小数位数
      },
      "rewarder": {                                            // 奖励器信息
        "rewarderContract": "string",                          // 奖励器合约地址
        "rewarderTokenId": "string",                           // 奖励器代币ID
        "rewarderTokenName": "string",                         // 奖励器代币名称
        "rewarderTokenSymbol": "string",                       // 奖励器代币符号
        "rewarderTokenDecimals": 0,                            // 奖励器代币小数位数
        "rewarderTokenPerSec": 0,                              // 奖励器每秒代币数
        "rewarderApr1d": 0                                     // 奖励器1日年化收益率
      }
    }
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 6.1 按链获取资金库列表 List Vaults By Chain

```http
GET /v1/api/vaults/{chain}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "all", "bsc" | 区块链名称（支持"all"查询所有链） |
| `pageSize` | 查询参数 | 否 | integer | 20 | 0-100 | 每页返回的记录数量 |
| `pageNum` | 查询参数 | 否 | integer | 1 | > 0 | 页码 |
| `userAddress` | 查询参数 | 否 | string | - | 有效的钱包地址 | 过滤特定用户的资金库 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc?pageSize=20&pageNum=1" \
  -H "x-api-key: your-api-key"
```

**示例请求（查询所有链）**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/all?pageSize=50&pageNum=1" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "address": "string",                                        // 资金库合约地址
    "chain": "bsc",                                       // 区块链名称
    "chainId": 0,                                              // 区块链ID
    "name": "string",                                          // 资金库名称
    "pair": {                                                  // 交易对信息
      "address": "string",                                     // 交易对地址
      "chain": "bsc",                                    // 区块链
      "version": "v2.2",                                       // 协议版本
      "binStep": 0,                                           // Bin step 参数
      "baseFeePct": 0                                         // 基础手续费百分比
    },
    "tokenX": {                                                // 代币 X 信息
      "address": "string",                                     // 代币地址
      "chain": "bsc",                                    // 区块链
      "symbol": "string",                                      // 代币符号
      "decimals": 0                                           // 小数位数
    },
    "tokenY": {                                                // 代币 Y 信息
      "address": "string",                                     // 代币地址
      "chain": "bsc",                                    // 区块链
      "symbol": "string",                                      // 代币符号
      "decimals": 0                                           // 小数位数
    },
    "tokenX7DayPerformance": 0,                                // 代币X 7日表现
    "tokenY7DayPerformance": 0,                                // 代币Y 7日表现
    "hodl5050Performance": 0,                                  // 50/50持有策略表现
    "tokenX30DayPerformance": 0,                               // 代币X 30日表现
    "tokenY30DayPerformance": 0,                               // 代币Y 30日表现
    "hodl30Day5050Performance": 0,                             // 30日50/50持有策略表现
    "strategy": {                                              // 策略信息
      "address": "string",                                     // 策略地址
      "chain": "bsc",                                    // 区块链
      "aumAnnualFeePct": 0                                    // 资产管理年费百分比
    },
    "aptPrice": 0,                                             // APT价格
    "apt1dPriceChange": 0,                                     // APT 1日价格变化
    "tvlUsd": 0,                                              // 总锁定价值 (美元)
    "feesUsd": 0,                                             // 手续费 (美元)
    "apr1d": 0,                                               // 1日年化收益率
    "farm": {                                                  // 农场信息
      "farmId": "string",                                      // 农场ID
      "vaultId": "string",                                     // 资金库ID
      "liquidity": "string",                                   // 流动性
      "liquidityRaw": 0,                                       // 原始流动性数据
      "liquidityUsd": 0,                                       // 流动性美元价值
      "aptDecimals": 0,                                        // APT小数位数
      "apr1d": 0,                                             // 农场1日年化收益率
      "rewardsPerSec": 0,                                      // 每秒奖励
      "reward": {                                              // 奖励代币信息
        "id": "string",                                        // 奖励ID
        "name": "string",                                      // 奖励名称
        "symbol": "string",                                    // 奖励符号
        "decimals": 0                                          // 奖励小数位数
      },
      "rewarder": {                                            // 奖励器信息
        "rewarderContract": "string",                          // 奖励器合约地址
        "rewarderTokenId": "string",                           // 奖励器代币ID
        "rewarderTokenName": "string",                         // 奖励器代币名称
        "rewarderTokenSymbol": "string",                       // 奖励器代币符号
        "rewarderTokenDecimals": 0,                            // 奖励器代币小数位数
        "rewarderTokenPerSec": 0,                              // 奖励器每秒代币数
        "rewarderApr1d": 0                                     // 奖励器1日年化收益率
      }
    }
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 6.2 获取资金库份额价格 Get Vault Share Price

```http
GET /v1/api/vaults/{chain}/{vault_address}/share-price
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `vault_address` | 路径参数 | 是 | string | - | 有效的资金库地址 | 资金库合约地址 (支持大小写混合) |
| `fromTimestamp` | 查询参数 | 是 | integer | - | Unix 时间戳 | 查询开始时间戳 |
| `toTimestamp` | 查询参数 | 否 | integer | - | Unix 时间戳 | 查询结束时间 |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/share-price?fromTimestamp=1672531200&toTimestamp=1704067200" \
  -H "x-api-key: your-api-key"
```

**示例请求 (仅开始时间)**:

```bash
curl -X GET "https://api.entySquare.dev/v1/api/vaults/b s c/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/share-price?fromTimestamp=1672531200" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
{
  "chain": "bsc",                                         // 区块链名称
  "vaultAddress": "string",                                     // 资金库合约地址
  "blockNumber": 0,                                            // 区块号
  "sharePrice": "string",                                      // 份额价格
  "timestamp": "2019-08-24T14:15:22Z"                          // 时间戳 (ISO 8601格式)
}
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}


### 6.3 获取指定资金库信息 Get Vault

```http
GET /v1/api/vaults/{chain}/{vault_address}
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "binance", "ethereum", "solana"| 区块链名称 |
| `vault_address` | 路径参数 | 是 | string | - | 有效的资金库地址 | 资金库合约地址 (支持大小写混合) |

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
{
  "address": "string",                                        // 资金库合约地址
  "chain": "bsc",                                       // 区块链名称
  "chainId": 0,                                              // 区块链ID
  "name": "string",                                          // 资金库名称
  "pair": {                                                  // 交易对信息
    "address": "string",                                     // 交易对地址
    "chain": "bsc",                                    // 区块链
    "version": "v2.2",                                       // 协议版本
    "binStep": 0,                                           // Bin step 参数
    "baseFeePct": 0                                         // 基础手续费百分比
  },
  "tokenX": {                                                // 代币 X 信息
    "address": "string",                                     // 代币地址
    "chain": "bsc",                                    // 区块链
    "symbol": "string",                                      // 代币符号
    "decimals": 0                                           // 小数位数
  },
  "tokenY": {                                                // 代币 Y 信息
    "address": "string",                                     // 代币地址
    "chain": "bsc",                                    // 区块链
    "symbol": "string",                                      // 代币符号
    "decimals": 0                                           // 小数位数
  },
  "tokenX7DayPerformance": 0,                                // 代币X 7日表现
  "tokenY7DayPerformance": 0,                                // 代币Y 7日表现
  "hodl5050Performance": 0,                                  // 50/50持有策略表现
  "tokenX30DayPerformance": 0,                               // 代币X 30日表现
  "tokenY30DayPerformance": 0,                               // 代币Y 30日表现
  "hodl30Day5050Performance": 0,                             // 30日50/50持有策略表现
  "strategy": {                                              // 策略信息
    "address": "string",                                     // 策略地址
    "chain": "bsc",                                         // 区块链
    "aumAnnualFeePct": 0                                    // 资产管理年费百分比
  },
  "aptPrice": 0,                                             // APT价格
  "apt1dPriceChange": 0,                                     // APT 1日价格变化
  "tvlUsd": 0,                                              // 总锁定价值 (美元)
  "feesUsd": 0,                                             // 手续费 (美元)
  "apr1d": 0,                                               // 1日年化收益率
  "farm": {                                                  // 农场信息
    "farmId": "string",                                      // 农场ID
    "vaultId": "string",                                     // 资金库ID
    "liquidity": "string",                                   // 流动性
    "liquidityRaw": 0,                                       // 原始流动性数据
    "liquidityUsd": 0,                                       // 流动性美元价值
    "aptDecimals": 0,                                        // APT小数位数
    "apr1d": 0,                                             // 农场1日年化收益率
    "rewardsPerSec": 0,                                      // 每秒奖励
    "reward": {                                              // 奖励代币信息
      "id": "string",                                        // 奖励ID
      "name": "string",                                      // 奖励名称
      "symbol": "string",                                    // 奖励符号
      "decimals": 0                                          // 奖励小数位数
    },
    "rewarder": {                                            // 奖励器信息
      "rewarderContract": "string",                          // 奖励器合约地址
      "rewarderTokenId": "string",                           // 奖励器代币ID
      "rewarderTokenName": "string",                         // 奖励器代币名称
      "rewarderTokenSymbol": "string",                       // 奖励器代币符号
      "rewarderTokenDecimals": 0,                            // 奖励器代币小数位数
      "rewarderTokenPerSec": 0,                              // 奖励器每秒代币数
      "rewarderApr1d": 0                                     // 奖励器1日年化收益率
    }
  }
}
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "string"                            // Array of strings or integers (Location)
      ],
      "msg": "string",                      // 错误消息描述
      "type": "string"                      // 错误类型
    }
  ]
}



### 6.4 获取资金库 TVL 历史 Get Vault TVL History

```http
GET /v1/api/vaults/{chain}/{vault_address}/tvl-history
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "all", "bsc" | 区块链名称 |
| `vault_address` | 路径参数 | 是 | string | - | 有效的资金库地址 | 资金库合约地址 (支持大小写混合) |
| `startTime` | 查询参数 | 是 | integer | - | Unix 时间戳 | 查询开始时间戳 |
| `endTime` | 查询参数 | 否 | integer | - | Unix 时间戳 | 查询结束时间戳 |

**示例地址**:

- `0x755e0899e7acd50a55f6b517f1f9c46574c9d7c`
- `0xe755e0899e7acd50a55f6b517f1f9c46574c9d7c`

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc/0xe755e0899e7acd50a55f6b517f1f9c46574c9d7c/tvl-history?startTime=1672531200&endTime=1704067200" \
  -H "x-api-key: your-api-key"
```

**示例请求 (仅开始时间)**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc/0xe755e0899e7acd50a55f6b517f1f9c46574c9d7c/tvl-history?startTime=1672531200" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "date": "2019-08-24T14:15:22Z",           // 数据日期，ISO 8601 格式
    "timestamp": 0,                           // Unix 时间戳
    "amountX": 0,                            // 代币 X 数量
    "amountY": 0,                            // 代币 Y 数量
    "amountXUsd": 0,                         // 代币 X 美元价值
    "amountYUsd": 0,                         // 代币 Y 美元价值
    "tvlUsd": 0                              // 总锁定价值 (美元)
  },
  {
    "date": "2019-08-25T14:15:22Z",
    "timestamp": 1566655722,
    "amountX": 1500000000000000000,
    "amountY": 38250000000,
    "amountXUsd": 38250.0,
    "amountYUsd": 38250.0,
    "tvlUsd": 76500.0
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "query",                            // 参数类型
      ],
      "msg": "field required",              // 错误消息
      "type": "value_error.missing"         // 错误类型
    }
  ]
}
```

---

## 6.5 获取资金库最近活动 Get Vault Recent Activity

```http
GET /v1/api/vaults/{chain}/{vault_address}/recent-activity
```

**参数**:

| 参数 | 类型 | 必需 | 数据类型 | 默认值 | 取值范围 | 描述 |
|------|------|------|----------|--------|----------|------|
| `chain` | 路径参数 | 是 | string | - | "all", "bsc", "solana" | 区块链名称 (枚举值) |
| `vault_address` | 路径参数 | 是 | string | - | 有效的资金库地址 | 资金库合约地址 (支持大小写混合) |
| `pageSize` | 查询参数 | 否 | integer | 20 | 0-100 | 每页返回的记录数量 |
| `pageNum` | 查询参数 | 否 | integer | 1 | > 0 | 页码 |

**示例地址**:

- `0xe755e0899e7acd50a55f6b517f1f9c46574c9d7c`
- `0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c`

**示例请求**:

```bash
curl -X GET "https://api.dex.jongun2038.win/v1/api/vaults/bsc/0xe755e0899e7acd50a55f6b517f1f9c46574c9d7c/recent-activity?pageSize=20&pageNum=1" \
  -H "x-api-key: your-api-key"
```

**响应示例**:

**200 - 成功响应**:

```json
[
  {
    "date": "2019-08-24T14:15:22Z",          // 活动日期，ISO 8601 格式
    "timestamp": 0,                          // Unix 时间戳
    "transactionHash": "string",             // 交易哈希
    "deposits": [                            // 存款活动列表
      {
        "binId": 0,                          // Bin ID
        "amountX": 0,                        // 代币 X 存款数量
        "amountY": 0                         // 代币 Y 存款数量
      }
    ],
    "withdrawals": [                         // 提款活动列表
      {
        "binId": 0,                          // Bin ID
        "amountX": 0,                        // 代币 X 提款数量
        "amountY": 0                         // 代币 Y 提款数量
      }
    ]
  }
]
```

**422 - 参数验证错误**:

```json
{
  "detail": [                               // 错误详情数组
    {
      "loc": [                              // 错误字段位置
        "query",                            // 参数类型
      ],
      "msg": "field required",              // 错误消息
      "type": "value_error.missing"         // 错误类型
    }
  ]
}
```

### 6.6 Get Vault Withdrawals By User

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | Yes | Blockchain identifier. Enum: "all", "bsc", "solana" |
| `user_address` | string | Yes | The user address (hexadecimal format) |

### Examples

- `user_address`: `0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c`

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageSize` | integer | No | 20 | Number of items per page (0-100) |
| `pageNum` | integer | No | 1 | Page number (>0) |

## Responses

### 200 - Successful Response

Returns an array of withdrawal records for the specified user.

**Content-Type:** `application/json`

**Response Structure:**

```json
[
  {
    "chain": "bsc",
    "vaultAddress": "string",
    "userAddress": "string",
    "round": 0,
    "shares": 0
  }
]
```

**Response Fields:**

- `chain`: The blockchain where the withdrawal occurred
- `vaultAddress`: The vault address (string)
- `userAddress`: The user address (string)
- `round`: The round number (integer)
- `shares`: The number of shares withdrawn (number)

### 422 - Validation Error

Returned when request parameters are invalid or missing required fields.

## Example Usage

```bash
curl -X GET "https://api.example.com/v1/api/vaults/bsc/withdrawals/0xe785E0899E7aCD50a55F6B517F1F9C46574c9D7C?pageSize=20&pageNum=1" \
  -H "accept: application/json"
```

## 6.7 Get Vault Withdrawals By User And Vault

```
GET /vaults/{chain}/{vault_address}/withdrawals/{user_address}
```

## Description

Retrieves withdrawal records for a specific user and vault on a given blockchain.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | Yes | Blockchain identifier. Enum: "all", "bsc" |
| `vault_address` | string | Yes | The vault address (hexadecimal format) |
| `user_address` | string | Yes | The user address (hexadecimal format) |

### Examples

- `vault_address`: `0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c`
- `user_address`: `0xe785E0899E7aCD50a55F6B517F1F9C46574c9D7C`

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageSize` | integer | No | 20 | Number of items per page (0-100) |
| `pageNum` | integer | No | 1 | Page number (>0) |

## Responses

### 200 - Successful Response

Returns an array of withdrawal records for the specified user and vault.

**Content-Type:** `application/json`

**Response Structure:**

```json
[
  {
    "chain": "bsc",
    "vaultAddress": "string",
    "userAddress": "string",
    "round": 0,
    "shares": 0
  }
]
```

## Example Usage

```bash
curl -X GET "https://api.example.com/vaults/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c/withdrawals/0xe785E0899E7aCD50a55F6B517F1F9C46574c9D7C?pageSize=20&pageNum=1" \
  -H "accept: application/json"
```

### 重试机制示例

### 监控和日志记录

## 📈 性能优化建议

### 1. 分页查询

### 2. 缓存策略

## 🔒 安全最佳实践

### 1. API 密钥安全

### 2. 速率限制

## 📚 总结

EntySquare Dex API 提供了完整的去中心化交易所功能：

### 🌟 主要特点

- **多链支持**: 支持 10+ 主流区块链
- **丰富的数据**: 池信息、用户统计、奖励系统
- **RESTful 设计**: 标准的 REST API 设计
- **详细文档**: 完整的 OpenAPI 规范

### 💡 使用建议

1. **缓存数据**: 对频繁访问的数据实施缓存策略
2. **错误处理**: 妥善处理各种错误情况
3. **安全实践**: 保护 API 密钥，使用后端代理
4. **分页查询**: 合理使用分页避免数据量过大

### 🚀 应用场景

- **DeFi 仪表板**: 构建用户友好的 DeFi 界面
- **交易机器人**: 自动化交易策略
- **数据分析**: DeFi 市场研究和分析
- **投资组合管理**: 跟踪和管理 DeFi 投资

这个 API 为开发者提供了构建下一代 DeFi 应用所需的所有工具和数据。

## 🧪 API Testing

All major API endpoints can be tested directly using `curl` commands as shown in the documentation above.  
You can copy and run the provided `curl` examples for each endpoint to verify the API responses.

- Each endpoint section includes a **示例请求** (example request) using `curl`.
- The API supports standard HTTP methods and returns JSON responses.
- Make sure to replace `your-api-key` with your actual API key in the `x-api-key` header.

**Automated tests:**  
If you want to automate endpoint testing, you can use tools like [Postman](https://www.postman.com/), [Hoppscotch](https://hoppscotch.io/), or write your own integration tests using frameworks such as [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/).

**Note:**  

- The backend project includes a `test/` directory for automated test cases, but you can always use `curl` for manual endpoint verification.
- For production or CI/CD, consider writing scripts that use `curl` to check endpoint health and correctness.
