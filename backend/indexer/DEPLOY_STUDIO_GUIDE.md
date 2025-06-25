# Subgraph Studio 部署指南

## 已完成的步骤

✅ **1. 项目配置和构建**
- 配置文件已准备完成 (BSC Testnet)
- 代码生成完成
- 项目构建成功
- 依赖管理：`@graphprotocol/graph-cli` 已配置为 devDependency

## 接下来的部署步骤

### 2. 创建 Subgraph Studio 项目

1. 访问 [Subgraph Studio](https://thegraph.com/studio/)
2. 连接您的钱包
3. 点击 "Create a Subgraph"
4. 填写项目信息：
   - **Name**: `entysquare-dex-bsc-testnet`
   - **Subtitle**: `EntSquare DEX BSC Testnet Indexer`
   - **Description**: `DLMM subgraph for BSC Testnet`
   - **Network**: `BSC Testnet`

### 3. 获取部署密钥

从 Studio 项目页面复制 Deploy Key

### 4. 认证和部署

```bash
# 1. 认证 (替换 <DEPLOY_KEY> 为您的实际密钥)
npx graph auth --studio <DEPLOY_KEY>

# 2. 部署到 Studio (替换 <SUBGRAPH_SLUG> 为您的项目名称)
npx graph deploy --studio <SUBGRAPH_SLUG> subgraph.bsc-testnet.yaml
```

### 5. 配置信息

**BSC Testnet 配置 (已更新):**
- Network: `chapel` (BSC Testnet 的正确网络名称)
- LB Factory Address: `0x7D73A6eFB91C89502331b2137c2803408838218b`
- Oracle DEX Lens Address: `0x8C7dc8184F5D78Aa40430b2d37f78fDC3e9A9b78`
- Wrapped Native Token: `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`
- Start Block: `44000000` (已降低以避免区块太新的问题)

### 6. 本地部署（可选）

如果您想要本地测试，可以使用：

```bash
# 启动本地节点
npm run start:node

# 创建本地 subgraph
npm run create-local

# 部署到本地
npm run deploy-local
```

### 7. 监控和日志

```bash
# 查看 Graph 节点日志
npm run logs:graph

# 查看 IPFS 日志  
npm run logs:ipfs

# 查看 PostgreSQL 日志
npm run logs:postgres
```

## 项目状态

- ✅ BSC Testnet 配置完成 (网络: chapel)
- ✅ 代码生成完成
- ✅ 项目构建成功 (使用更安全的起始区块: 44000000)
- ✅ IPFS 上传成功 (QmbFPWCDS2C1UJFuAehBNFGSd5zxr4uJsW8jhk55bsccvh)
- ✅ 网络配置已修复 (bsc-testnet → chapel)
- ⏳ 准备重新部署到 Studio

## 故障排除

### 常见的 "Internal error" 解决方案

1. **检查网络配置**
   - 确保 subgraph.yaml 中的网络名称正确
   - BSC Testnet 在 Studio 中应该是 `chapel`

2. **重试部署**
   ```bash
   # 清理并重新构建
   npm run clean
   npm run prepare:bsc-testnet
   npm run build:bsc-testnet
   
   # 重新部署
   npx graph deploy --studio <SUBGRAPH_SLUG> subgraph.bsc-testnet.yaml
   ```

3. **检查起始区块**
   - 当前配置的起始区块: `54500000`

4. **验证合约地址**
   - LB Factory: `0x7D73A6eFB91C89502331b2137c2803408838218b`
   - 确保这个地址在 BSC Testnet 上存在

## 修复和重新部署

**已修复的问题:**
- ✅ 网络名称从 `bsc-testnet` 更改为 `chapel`
- ✅ 重新生成和构建完成

**现在重新部署:**
```bash
# 重新部署到 Studio
npx graph deploy --studio <SUBGRAPH_SLUG> subgraph.bsc-testnet.yaml
```

**更新的配置信息:**
- Network: `chapel` (BSC Testnet 的正确网络名称)
- Start Block: `44000000` (更安全的起始区块)
- 其他地址保持不变
