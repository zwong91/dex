# GraphQL Subgraph Integration

这个模块为 DEX API 提供了与 GraphQL subgraph 的集成，允许从已部署的 subgraph 获取实时链上数据。

## 功能特性

- 🔗 **自动健康检查**: 自动检测 subgraph 是否可用和健康
- 📊 **实时数据**: 从 subgraph 获取最新的池数据、用户持仓等
- 🔄 **智能回退**: 当 subgraph 不可用时自动回退到数据库
- 🚀 **高性能**: 使用 GraphQL 批量查询优化性能
- 🛡️ **错误处理**: 完善的错误处理和日志记录

## 目录结构

```
src/dex/graphql/
├── client.ts          # GraphQL 客户端实现
└── README.md         # 本文档

handlers/
├── pools.ts          # 池相关端点 (已集成)
├── users.ts          # 用户相关端点 (已集成)
└── ...

test-graphql.mjs      # 测试脚本
```

## 核心组件

### SubgraphClient

主要的 GraphQL 客户端类，提供以下方法：

```typescript
// 获取池列表
const pools = await subgraphClient.getPools(100, 0, 'createdAtTimestamp', 'desc');

// 获取特定池详情
const pool = await subgraphClient.getPool('0x...');

// 获取用户持仓
const positions = await subgraphClient.getUserPositions('0x...', 100);

// 获取池的24小时统计
const stats = await subgraphClient.getPool24hStats('0x...');

// 搜索池
const results = await subgraphClient.searchPools('ETH', 50);
```

### 健康检查

```typescript
import { isSubgraphHealthy } from './graphql/client';

const health = await isSubgraphHealthy();
if (health.healthy) {
  console.log('Subgraph is healthy, block:', health.blockNumber);
} else {
  console.log('Subgraph issue:', health.error);
}
```

## API 端点集成

### 已集成的端点

以下 API 端点已经集成了 GraphQL 查询：

#### 1. 池相关端点

- `GET /v1/api/dex/pools` - 池列表
- `GET /v1/api/dex/pools/{poolId}` - 池详情

#### 2. 用户相关端点

- `GET /v1/api/dex/user/{userAddress}/pool-ids` - 用户池 ID 列表

### 集成模式

每个端点都遵循以下模式：

```typescript
export async function handleApiEndpoint(request: Request, env: any): Promise<Response> {
  try {
    // 1. 检查 subgraph 健康状态
    const subgraphHealth = await isSubgraphHealthy();
    
    if (subgraphHealth.healthy) {
      // 2. 使用 GraphQL 查询获取实时数据
      console.log('🔗 Fetching from subgraph...');
      const data = await subgraphClient.someQuery();
      
      // 3. 转换数据格式并返回
      return createApiResponse(transformedData, corsHeaders);
      
    } else {
      console.log('⚠️ Subgraph not healthy, using fallback');
    }
    
    // 4. 回退到数据库或模拟数据
    const fallbackData = await getFallbackData();
    return createApiResponse(fallbackData, corsHeaders);
    
  } catch (error) {
    // 5. 错误处理
    return createErrorResponse('Error message', corsHeaders, 500);
  }
}
```

## 配置

### Subgraph 端点

默认使用本地 Graph Node 端点：
```
http://localhost:8000/subgraphs/name/entysquare/indexer-bnb
```

可以通过环境变量自定义：
```typescript
const client = new SubgraphClient(process.env.SUBGRAPH_ENDPOINT);
```

### 超时设置

GraphQL 请求使用标准的 fetch 超时机制。可以根据需要调整。

## 测试

运行集成测试：

```bash
cd /Users/es/dex/backend
node test-graphql.mjs
```

测试包括：
- Subgraph 健康检查
- 元数据查询
- 池数据查询
- 用户持仓查询
- 搜索功能

## 数据流

```
Frontend Request
     ↓
API Endpoint
     ↓
Subgraph Health Check
     ↓
   Healthy? ─── No ──→ Database/Mock Fallback
     │                        ↓
    Yes                   Response
     ↓
GraphQL Query to Subgraph
     ↓
Transform Data Format
     ↓
Response to Frontend
```

## 性能优化

1. **缓存**: GraphQL 查询可以添加缓存层
2. **批量查询**: 使用 GraphQL 的批量查询能力
3. **分页**: 实现适当的分页机制
4. **字段选择**: 只查询需要的字段

## 错误处理

1. **网络错误**: 自动重试和回退
2. **GraphQL 错误**: 详细的错误日志和用户友好的错误消息
3. **数据验证**: 验证 subgraph 返回的数据格式
4. **超时**: 合理的超时设置避免长时间等待

## 未来改进

1. **价格集成**: 集成价格预言机计算 USD 价值
2. **实时订阅**: 使用 GraphQL 订阅实现实时数据更新
3. **多链支持**: 支持多个网络的 subgraph
4. **缓存策略**: 实现智能缓存减少查询频率
5. **监控**: 添加详细的性能监控和告警

## 故障排除

### 常见问题

1. **Subgraph 不健康**
   - 检查 Graph Node 是否运行
   - 检查网络连接
   - 验证 subgraph 部署状态

2. **查询超时**
   - 检查网络延迟
   - 优化查询复杂度
   - 考虑增加超时时间

3. **数据不一致**
   - 检查 subgraph 同步状态
   - 验证区块高度
   - 比较数据库和 subgraph 数据

### 调试

启用详细日志：
```typescript
// 在 client.ts 中添加调试日志
console.log('GraphQL Query:', query);
console.log('GraphQL Variables:', variables);
console.log('GraphQL Response:', result);
```

## 贡献指南

1. 遵循现有的代码风格
2. 添加适当的类型定义
3. 包含错误处理
4. 更新相关文档
5. 添加测试用例
