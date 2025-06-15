# DEX API Documentation

## Overview

整合后的 DEX 后端现在支持 Cloudflare Workers 和 Hono 框架，提供了一个完整的去中心化交易所 API。

## Available Services

### 1. AI Service (`/api/ai/*`)
- AI 代码生成和建议

### 2. Database Service (`/api/sandbox/*`, `/api/user/*`)
- 沙盒管理
- 用户管理
- 使用 Drizzle ORM + D1 Database

### 3. Storage Service (`/api/project/*`, `/api/size/*`, etc.)
- 文件存储和管理
- 使用 Cloudflare R2

### 4. **NEW** DEX API Service (`/api/dex/*`)
- 去中心化交易所功能
- 使用 Hono 框架构建

## DEX API Endpoints

### Tokens
- `GET /api/dex/tokens` - 获取支持的代币列表
- `GET /api/dex/pairs` - 获取交易对列表

### Trading
- `GET /api/dex/price/:tokenA/:tokenB` - 获取代币价格
- `POST /api/dex/swap` - 提交交换交易
- `GET /api/dex/swaps/:user?` - 获取交换历史

### Liquidity
- `POST /api/dex/liquidity` - 提交流动性交易
- `GET /api/dex/liquidity/:user?` - 获取流动性历史

### Utility
- `GET /api/dex/faucet/:wallet` - 测试代币水龙头
- `GET /api/dex/stats` - 获取 DEX 统计信息
- `GET /api/dex/networks` - 获取支持的网络配置
- `GET /api/dex/health` - 健康检查

## Example Usage

### Get Supported Tokens
```bash
curl https://your-worker.your-subdomain.workers.dev/api/dex/tokens
```

### Submit a Swap
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/dex/swap \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0x1234567890123456789012345678901234567890",
    "tokenIn": "TOKEN_A",
    "tokenOut": "TOKEN_B", 
    "amountIn": "1000000000000000000",
    "amountOut": "2100000000000000000",
    "txHash": "0xabcdef1234567890"
  }'
```

### Get Token Price
```bash
curl https://your-worker.your-subdomain.workers.dev/api/dex/price/TOKEN_A/TOKEN_B
```

### Use Faucet
```bash
curl https://your-worker.your-subdomain.workers.dev/api/dex/faucet/0x1234567890123456789012345678901234567890
```

## Architecture

```
┌─────────────────────┐
│   Cloudflare Worker │
│                     │
│  ┌───────────────┐  │
│  │ Itty Router   │  │  ← Main routing
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ Hono App      │  │  ← DEX API (新增)
│  │ (DEX Routes)  │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ AI Handler    │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ DB Handler    │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ Storage       │  │
│  │ Handler       │  │
│  └───────────────┘  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Cloudflare Services │
│                     │
│ • D1 Database       │
│ • R2 Storage        │  
│ • AI Workers        │
└─────────────────────┘
```

## Development

### Build and Test
```bash
npm install
npm run cf-typegen
npm test
```

### Local Development
```bash
npm run dev
```

### Deploy
```bash
npm run deploy
```

## Configuration

在 `wrangler.toml` 中配置：
- D1 Database binding
- R2 Storage binding  
- AI binding
- Environment variables

### Serverless：
1. **框架**: Cloudflare Workers + Hono
2. **运行环境**: Cloudflare Workers
3. **数据库**: 持久化存储（可选）
4. **部署**: Serverless
5. **性能**: 全球边缘网络加速

### 兼容性：
- API 端点路径保持一致（添加 `/api/dex` 前缀）
- 请求/响应格式保持兼容
- 所有功能完全迁移
