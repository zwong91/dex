# dex apiAPI

通用的去中心化交易所（DEX）后端API，支持多链代币交换、流动性管理和交易历史追踪。

## 🚀 功能特性

- **多链支持**: 支持以太坊、BSC、Polygon等主流区块链
- **代币管理**: 获取支持的代币列表和交易对信息
- **价格查询**: 实时获取代币交换汇率
- **交易记录**: 记录和查询交换交易历史
- **测试水龙头**: 为测试网提供代币铸造功能
- **统计数据**: DEX的TVL、交易量等统计信息

## 📦 安装

```bash
cd backend
npm install
```

## ⚙️ 配置

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置必要的参数：
```env
PORT=3000
PRIVATE_KEY=your_private_key_for_faucet
```

## 🏃‍♂️ 运行

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm run build
npm run prod
```

### 测试
```bash
# 测试所有API端点
npm test

# 仅测试连接性
npm run test:connectivity

# 仅测试API端点
npm run test:api
```

## 📚 API 端点

### 健康检查
```
GET /api/health
```

### 代币相关
```
GET /api/tokens              # 获取支持的代币列表
GET /api/pairs               # 获取交易对信息
GET /api/price/:tokenA/:tokenB  # 获取代币价格
```

### 交易相关
```
POST /api/swap               # 记录交换交易
GET /api/swaps/:user?        # 获取交换历史
```

### 水龙头
```
GET /api/faucet/:wallet      # 为钱包地址铸造测试代币
```

### 统计信息
```
GET /api/stats               # 获取DEX统计数据
```

## 📝 API 使用示例

### 获取代币列表
```bash
curl http://localhost:3000/api/tokens
```

### 获取价格
```bash
curl http://localhost:3000/api/price/TOKEN%20A/TOKEN%20B
```

### 记录交换交易
```bash
curl -X POST http://localhost:3000/api/swap \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0x742d35Cc6634C0532925a3b8D44b6FA0e3Ae3",
    "tokenIn": "TOKEN A",
    "tokenOut": "TOKEN B",
    "amountIn": "100.0",
    "amountOut": "210.0",
    "txHash": "0x123..."
  }'
```

### 使用水龙头
```bash
curl http://localhost:3000/api/faucet/0x742d35Cc6634C0532925a3b8D44b6FA0e3Ae3
```

## 🔧 技术栈

- **Node.js** + **TypeScript**
- **Express.js** - Web框架
- **ethers.js** - 区块链交互
- **CORS** - 跨域支持
- **Axios** - HTTP客户端（测试用）

## 📁 项目结构

```
backend/
├── api.ts              # 主API服务器
├── types.ts            # TypeScript类型定义
├── sample.ts           # API测试套件
├── test.ts             # 完整功能测试
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript配置
├── .env.example        # 环境变量示例
└── README.md           # 项目文档
```

## 🚀 部署

### Docker部署
```bash
docker build -t unc-dex-backend .
docker run -p 3000:3000 --env-file .env unc-dex-backend
```

### 使用Docker Compose
```bash
docker-compose up -d
```

## 🛡️ 安全注意事项

1. **私钥管理**: 确保私钥安全存储，不要提交到代码仓库
2. **CORS配置**: 在生产环境中限制CORS来源
3. **速率限制**: 实施API速率限制防止滥用
4. **输入验证**: 验证所有用户输入数据

## 📖 开发指南

### 添加新的代币
在 `api.ts` 的 `initializeDemoData()` 函数中添加新代币：

```typescript
supportedTokens.push({
  address: "0x...",
  symbol: "NEW_TOKEN",
  name: "New Token",
  decimals: 18,
  logoURI: "/new-token-logo.png"
});
```

### 添加新的区块链网络
在 `networkConfigs` 对象中添加新网络配置：

```typescript
networkConfigs[newChainId] = {
  chainId: newChainId,
  name: "New Network",
  rpcUrl: "https://rpc.newnetwork.com",
  blockExplorer: "https://explorer.newnetwork.com",
  nativeCurrency: { name: "NEW", symbol: "NEW", decimals: 18 }
};
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License
