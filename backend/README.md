# DEX Backend - Serverless Cloudflare Workers

整合了 AI、Database、Storage 和 DEX API 的统一 serverless 后端服务。

## 🚀 Features

- **AI Service**: 代码生成和建议服务
- **Database Service**: 用户和沙盒管理 (Drizzle ORM + D1)
- **Storage Service**: 文件存储管理 (R2)
- **DEX API Service**: 完整的去中心化交易所 API (Hono)
- **Unified Deployment**: 单一 Cloudflare Worker 部署

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── ai/
│   │   └── handler.ts        # AI 服务处理器
│   ├── database/
│   │   ├── handler.ts        # 数据库服务处理器
│   │   └── schema.ts         # 数据库模式
│   ├── storage/
│   │   ├── handler.ts        # 存储服务处理器
│   │   └── startercode.ts    # 项目模板代码
│   └── dex/
│       └── handler.ts        # DEX API 处理器 (Hono)
├── test/
│   ├── *.spec.ts            # 各模块测试文件
│   └── README.md            # 测试说明文档
├── drizzle/                  # 数据库迁移文件
├── package.json
├── wrangler.toml            # Cloudflare Workers 配置
├── wrangler.example.toml    # 配置模板
├── vitest.config.ts         # 测试配置
├── run-tests.sh             # 一键测试脚本
├── tsconfig.json
├── drizzle.config.ts
└── DEX_API.md               # DEX API 详细文档
```

## 🛠️ Setup

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境
```bash
# 复制配置模板
cp wrangler.example.toml wrangler.toml

# 编辑 wrangler.toml，填入你的实际配置：
# - account_id (你的 Cloudflare 账户 ID)
# - database_id (D1 数据库 ID)
# - bucket_name (R2 存储桶名称)
# - 环境变量 [vars] 部分：
#   - KEY: 你的认证密钥
#   - PRIVATE_KEY: 区块链私钥 (用于水龙头功能)
#   - TOKEN_A_ADDRESS/TOKEN_B_ADDRESS: 代币合约地址
#   - BSC_RPC_URL/ETH_RPC_URL/POLYGON_RPC_URL: RPC 端点
#   - INFURA_PROJECT_ID/ALCHEMY_API_KEY: API 密钥
#   - CORS_ORIGIN: 允许的跨域来源
#   - 限流配置等
```

### 3. 生成类型
```bash
npm run cf-typegen
```

### 4. 数据库设置
```bash
# 生成迁移文件
npm run generate

# 应用迁移
npm run up
```

## 🚀 Development

### 本地开发
```bash
npm run dev
```

### 运行测试
```bash
npm test
```

### 部署
```bash
npm run deploy
```

## 📡 API Endpoints

### Core Services
- `GET /health` - 服务健康检查
- `GET /api/ai/*` - AI 服务
- `ALL /api/sandbox/*` - 沙盒管理
- `ALL /api/user/*` - 用户管理  
- `ALL /api/project/*` - 项目存储
- `ALL /api/size/*` - 存储大小查询

### DEX API (新增)
- `GET /api/dex/health` - DEX 健康检查
- `GET /api/dex/tokens` - 获取支持的代币
- `GET /api/dex/pairs` - 获取交易对
- `GET /api/dex/networks` - 获取网络配置
- `GET /api/dex/price/:tokenA/:tokenB` - 获取价格
- `GET /api/dex/faucet/:wallet` - 测试代币水龙头
- `POST /api/dex/swap` - 提交交换交易
- `GET /api/dex/swaps/:user?` - 获取交换历史
- `POST /api/dex/liquidity` - 提交流动性交易
- `GET /api/dex/liquidity/:user?` - 获取流动性历史
- `GET /api/dex/stats` - 获取 DEX 统计

详细的 DEX API 文档请参考 [DEX_API.md](./DEX_API.md)

## 🏗️ Architecture

```
Cloudflare Worker
├── Itty Router (主路由)
├── Hono App (DEX API)
├── AI Handler
├── Database Handler
└── Storage Handler
    │
    ▼
Cloudflare Services
├── D1 Database
├── R2 Storage
└── AI Workers
```

## 🔧 Scripts

- `npm run dev` - 本地开发服务器
- `npm run deploy` - 部署到 Cloudflare
- `npm test` - 运行测试
- `npm run cf-typegen` - 生成 Cloudflare 类型
- `npm run generate` - 生成数据库迁移
- `npm run up` - 应用数据库迁移
- `npm run db:studio` - 打开数据库管理界面

## 🛡️ Security

- 所有 API 需要 `Authorization` header 与 `KEY` 匹配
- DEX API 支持 CORS
- 输入验证使用 Zod schema

## 📄 License

MIT
