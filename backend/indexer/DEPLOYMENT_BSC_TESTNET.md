# BSC 测试网 Indexer 部署指南

## 快速开始

### 自动部署（推荐）

```bash
./deploy-testnet.sh
```

### 手动部署步骤

如果需要手动部署，按以下步骤操作：

#### 1. 安装依赖
```bash
npm install
```

#### 2. 修复 GraphQL Schema
在部署之前，需要修复 `schema.graphql` 中的 `@entity` 指令：

```bash
# 为所有 @entity 添加 immutable 参数
sed -i '' 's/@entity {/@entity(immutable: false) {/g' schema.graphql

# 为包含时间戳的实体设置为 immutable: true
sed -i '' 's/@entity(immutable: false) {\([^}]*timestamp[^}]*\)}/@entity(immutable: true) {\1}/g' schema.graphql

# 为 Trace 实体设置为 immutable: true
sed -i '' 's/type Trace @entity(immutable: false)/type Trace @entity(immutable: true)/g' schema.graphql
```

#### 3. 启动本地服务
```bash
npm run start:node
```

等待约 30 秒让服务完全启动。

#### 4. 准备和构建
```bash
# 生成配置文件
npm run prepare:bsc-testnet

# 生成类型定义
npm run codegen:bsc-testnet

# 构建 subgraph
npm run build:bsc-testnet
```

#### 5. 创建和部署子图
```bash
# 创建子图
npx graph create --node http://localhost:8020/ entysquare/indexer-bnb-testnet

# 部署子图
echo "v0.0.1" | npx graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001/ entysquare/indexer-bnb-testnet subgraph.bsc-testnet.yaml
```

## 访问端点

部署成功后，可以通过以下端点访问：

- **GraphQL 查询**: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet
- **GraphQL Playground**: http://localhost:8000/subgraphs/name/entysquare/indexer-bnb-testnet/graphql

## 管理命令

### 查看日志
```bash
npm run logs:graph      # Graph Node 日志
npm run logs:ipfs       # IPFS 日志
npm run logs:postgres   # PostgreSQL 日志
docker logs indexer --tail 20  # 查看最新日志
```

### 服务管理
```bash
npm run stop:node       # 停止所有服务
npm run restart:node    # 重启所有服务
npm run clean           # 完全清理
```

### 检查状态
```bash
docker-compose ps       # 查看容器状态
```

## 常见问题

### 1. Schema 编译错误
**错误**: `@entity directive requires 'immutable' argument`

**解决**: 运行上述 schema 修复命令，或使用自动部署脚本。

### 2. 子图名称未找到
**错误**: `subgraph name not found`

**解决**: 先创建子图，再部署：
```bash
npx graph create --node http://localhost:8020/ entysquare/indexer-bnb-testnet
```

### 3. 编译时找不到 WASM 文件
**错误**: `File 'LBFactory/LBFactory.wasm.ts' not found`

**解决**: 使用原始的 `subgraph.bsc-testnet.yaml` 文件而不是 `build/subgraph.yaml` 进行部署。

## 配置信息

- **网络**: BSC 测试网
- **起始区块**: 55,000,000
- **LBFactory 地址**: `0x7D73A6eFB91C89502331b2137c2803408838218b`
- **RPC URL**: `https://bsc-testnet.infura.io/v3/365ce9d871ff42228dc2a23a6daff8dc`

## 环境要求

- Node.js >= 20
- Docker & Docker Compose
- macOS/Linux (Windows 需要适配命令)
