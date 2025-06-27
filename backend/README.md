# EntySquare DEX Backend - Serverless API

EntySquare is a modern decentralized exchange backend built on Cloudflare Workers, providing high-performance, scalable API services for Web3 DeFi applications. The project integrates AI code generation, database management, file storage, and full DEX trading functionality.

## 🚀 Core Features

### 🔥 DEX Trading Engine
- **Multi-chain Support**: BSC, Ethereum, Polygon, Avalanche, Arbitrum, Optimism, and other major EVM chains
- **Real-time Price Data**: WebSocket and REST API price feeds
- **Liquidity Management**: Centralized and decentralized liquidity pool management
- **Trading History & Analytics**: Complete user trading records and analytics
- **Testnet Faucet**: Test token distribution for development

### 🤖 AI Intelligence Services
- **Code Generation**: Smart contract and DApp code auto-generation
- **Trading Suggestions**: AI-driven strategy recommendations
- **Risk Assessment**: Intelligent risk analysis and alerts

### 🗄️ Database Services
- **User Management**: API Key authentication system
- **Subscription Management**: Tiered permissions and usage limits
- **Analytics Data**: Trading volume and user behavior analytics
- **Real-time Sync**: Automated data synchronization and backup

### 📁 Storage Services
- **Project Storage**: R2 object storage integration
- **File Management**: Multimedia file upload and management
- **CDN Acceleration**: Global content delivery

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts                  # Main entry and routing
│   ├── ai/                       # AI service module
│   ├── database/                 # Database service module
│   ├── dex/                      # DEX trading core
│   └── storage/                  # File storage module
├── test/                         # Test cases
├── drizzle/                      # Database migration files
├── scripts/                      # Database and config scripts
├── drizzle.config.ts             # Drizzle ORM config
├── vitest.config.ts              # Test framework config
├── wrangler.example.toml         # Cloudflare Workers config template
├── entysquare-dex-api-documentation.md  # Full API documentation
├── SETUP_GUIDE.md                # Installation guide
└── CRON_TESTING_GUIDE.md         # Cron job testing guide
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Cloudflare Workers account
- Git

### 1. Project Initialization

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Configuration

```bash
# Copy configuration template
cp wrangler.example.toml wrangler.toml

# Edit wrangler.toml with the following information:
# - Cloudflare Account ID
# - D1 database connections
# - R2 storage bucket settings
# - API keys and environment variables
```

### 3. Database Setup

```bash
# Create D1 database
wrangler d1 create d1-dex-database

# Generate type definitions
npm run cf-typegen

# Generate migration files
npm run generate

# Apply database migrations
npm run migrate:local        # Local development
npm run migrate:prod         # Production environment

# Initialize database data
npm run db:init
```

### 4. Start Development Server

```bash
# Start local development server
npm run dev
# Service runs at http://localhost:8787 by default
```

## 🚀 Development & Deployment

### Common Commands

```bash
# Start development server (with hot reload)
npm run dev
npm run test             # Run all tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:performance # Performance tests
npm run test:security    # Security tests
npm run test:coverage    # Generate coverage report
npm run studio           # Open database management UI
npm run db:backup        # Backup database
npm run deploy           # Deploy to Cloudflare Workers
npm run migrate:prod     # Production DB migration
npm run verify           # Verify configuration
```

## 📡 API Overview

### Health Check
- `GET /health` — Service health status

### AI Services
- `GET /api/ai/*` — AI code generation and suggestions
- `POST /api/ai/generate` — Intelligent code generation
- `POST /api/ai/suggest` — Code optimization suggestions

### Database Services
- `ALL /api/sandbox/*` — Sandbox management
- `ALL /api/user/*` — User management and authentication
- `ALL /api/project/*` — Project data storage
- `ALL /api/size/*` — Storage usage queries

### Storage Services
- `POST /api/storage/upload` — File upload
- `GET /api/storage/download/:id` — File download
- `DELETE /api/storage/delete/:id` — File deletion

### DEX Trading Endpoints

#### Basic Info
- `GET /api/dex/health` — DEX service health check
- `GET /api/dex/tokens` — Supported token list
- `GET /api/dex/pairs` — Trading pair info
- `GET /api/dex/networks` — Supported blockchain networks

#### Price & Market Data
- `GET /api/dex/price/:tokenA/:tokenB` — Get token price
- `GET /api/dex/stats` — DEX statistics
- `GET /api/dex/volume` — Trading volume data

#### Trading Functions
- `POST /api/dex/swap` — Execute token swap
- `GET /api/dex/swaps/:user?` — Query swap history
- `POST /api/dex/liquidity` — Add liquidity
- `GET /api/dex/liquidity/:user?` — Query liquidity records

#### Testnet Features
- `GET /api/dex/faucet/:wallet` — Testnet token faucet

> 📋 **Full API Documentation**: See [entysquare-dex-api-documentation.md](./entysquare-dex-api-documentation.md)

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────┐
│              Cloudflare Worker               │
├──────────────────────────────────────────────┤
│  ├── Itty Router (main router)              │
│  ├── Hono App (DEX API framework)           │
│  ├── AI Handler (AI services)               │
│  ├── Database Handler (database services)   │
│  └── Storage Handler (storage services)     │
└──────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│        Cloudflare Service Ecosystem          │
├──────────────────────────────────────────────┤
│  ├── D1 Database (relational DB)            │
│  ├── R2 Storage (object storage)            │
│  ├── AI Workers (AI compute)                │
│  └── KV Storage (key-value storage)         │
└──────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│         External Blockchain Networks         │
│         (EVM compatible chains)              │
└──────────────────────────────────────────────┘
```

### Tech Stack
- **Runtime**: Cloudflare Workers (V8)
- **Web Framework**: Hono.js + Itty Router
- **Database**: Drizzle ORM + Cloudflare D1
- **Storage**: Cloudflare R2
- **Testing**: Vitest
- **Type Safety**: TypeScript

## 🛡️ Security

- **API Key Authentication**: All API requests require `x-api-key`
- **Tiered Permissions**: Support for different subscription levels
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Strict Zod schema validation
- **SQL Injection Protection**: Drizzle ORM type safety
- **CORS Configuration**: Cross-origin support
- **HTTPS Enforcement**, **Cloudflare Protection**, **Environment Isolation**

## 📚 Related Docs

- [Setup Guide](./SETUP_GUIDE.md)
- [API Documentation](./entysquare-dex-api-documentation.md)
- [Cron Testing Guide](./CRON_TESTING_GUIDE.md)
- [Test Docs](./test/README.md)

## 🤝 Contributing

1. Follow TypeScript and ESLint standards
2. New features must include tests
3. Important changes require documentation updates
4. Security-related changes require extra review

## 📄 License

MIT License - See [LICENSE](../LICENSE)

---

**Development Team**: EntySquare Protocol Team  
**Project Version**: 1.0.0  
**Last Updated**: June 2025
