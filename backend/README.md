
# EntySquare DEX Backend - Serverless API

EntySquare is a modern decentralized exchange backend service built on Cloudflare Workers, providing high-performance, scalable API services for Web3 DeFi applications. This project integrates AI code generation, database management, file storage, and complete DEX trading functionality.

## 🚀 Core Features

### 🔥 DEX Trading Engine
- **Multi-chain Support**: BSC, Ethereum, and other EVM-compatible chains
- **Real-time Price Data**: WebSocket and REST API price feeds
- **Liquidity Management**: Centralized and decentralized liquidity pool management
- **Trading History**: Complete transaction records and analytics
- **Testnet Faucet**: Development test token distribution

### 🤖 AI Intelligence Services
- **Code Generation**: Smart contract and DApp code auto-generation
- **Trading Suggestions**: AI-based trading strategy recommendations
- **Risk Assessment**: Intelligent risk analysis and alerts

### 🗄️ Database Services
- **User Management**: API key-based authentication system
- **Subscription Management**: Tiered permissions and usage limits
- **Analytics Data**: Trading volume, user behavior data analysis
- **Real-time Sync**: Automated data synchronization and backup

### 📁 Storage Services
- **Project Storage**: R2 object storage integration
- **File Management**: Multimedia file upload and management
- **CDN Acceleration**: Global content delivery network

## 📁 Project Structure

```
backend/
├── src/                          # Core source code
│   ├── index.ts                  # Main entry file and routing configuration
│   ├── ai/                       # AI service module
│   │   └── handler.ts            # AI code generation and suggestion interfaces
│   ├── database/                 # Database service module
│   │   ├── handler.ts            # Database operation interfaces
│   │   └── schema.ts             # Drizzle ORM database schema
│   ├── dex/                      # DEX trading core module
│   │   ├── index.ts              # DEX main entry
│   │   ├── handler.ts            # DEX API handler
│   │   ├── auth/                 # Authentication and authorization
│   │   ├── handlers/             # Various business handlers
│   │   ├── routing/              # Route configuration
│   │   ├── sync/                 # Data synchronization services
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Utility functions and helper classes
│   └── storage/                  # File storage module
│       ├── handler.ts            # R2 storage operation interfaces
│       └── startercode.ts        # Storage initialization code
├── test/                         # Test suites
│   ├── *.spec.ts                 # Module unit tests
│   ├── integration.spec.ts       # Integration tests
│   ├── performance.spec.ts       # Performance tests
│   ├── security.spec.ts          # Security tests
│   └── utils/                    # Test utility functions
├── drizzle/                      # Database migration files
│   ├── *.sql                     # SQL migration scripts
│   └── meta/                     # Migration metadata
├── scripts/                      # Database and configuration scripts
│   ├── init-database.js          # Database initialization
│   ├── init-db.sql              # Initialization SQL script
│   ├── test-db.sql              # Test data script
│   └── verify-config.sh          # Configuration verification script
├── *.sh                          # Various automation scripts
├── drizzle.config.ts             # Drizzle ORM configuration
├── vitest.config.ts              # Test framework configuration
├── wrangler.example.toml         # Cloudflare Workers configuration template
├── entysquare-dex-api-documentation.md  # Complete API documentation
├── SETUP_GUIDE.md                # Detailed installation guide
└── CRON_TESTING_GUIDE.md         # Scheduled task testing guide
```

## 🛠️ Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Cloudflare Account** with Workers service
- **Git** version control

### 1. Project Initialization

```bash
# Clone the project
git clone <repository-url>
cd backend

# Install dependencies
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

### 4. Development Environment Startup

```bash
# Start local development server
npm run dev

# Service will start at http://localhost:8787
```

## 🚀 Development & Deployment

### Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Run complete test suite
npm run test

# Run specific types of tests
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:performance  # Performance tests
npm run test:security     # Security tests

# Test coverage reports
npm run test:coverage
npm run coverage:open     # View coverage report in browser

# Database operations
npm run studio           # Open database management interface
npm run studio:local     # Local database management
npm run db:backup        # Backup database
```

### Production Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Production environment database migration
npm run migrate:prod

# Verify configuration
npm run verify
```

## 📡 API Overview

### 🏥 Health Check
- `GET /health` — Service health status check

### 🤖 AI Service Endpoints
- `GET /api/ai/*` — AI code generation and suggestion services
- `POST /api/ai/generate` — Intelligent code generation
- `POST /api/ai/suggest` — Code optimization suggestions

### 🗄️ Database Service Endpoints
- `ALL /api/sandbox/*` — Sandbox environment management
- `ALL /api/user/*` — User management and authentication
- `ALL /api/project/*` — Project data storage
- `ALL /api/size/*` — Storage usage queries

### 📁 Storage Service Endpoints
- `POST /api/storage/upload` — File upload
- `GET /api/storage/download/:id` — File download
- `DELETE /api/storage/delete/:id` — File deletion

### 🔄 DEX Trading Endpoints

#### Basic Information
- `GET /api/dex/health` — DEX service health check
- `GET /api/dex/tokens` — Supported token list
- `GET /api/dex/pairs` — Trading pair information
- `GET /api/dex/networks` — Supported blockchain networks

#### Price and Market Data
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

> 📋 **Complete API Documentation**: See [entysquare-dex-api-documentation.md](./entysquare-dex-api-documentation.md) for detailed API usage instructions and examples.

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                Cloudflare Worker                    │
├─────────────────────────────────────────────────────┤
│  ├── Itty Router (Main Router)                     │
│  ├── Hono App (DEX API Framework)                  │
│  ├── AI Handler (AI Service Handler)               │
│  ├── Database Handler (Database Handler)           │
│  └── Storage Handler (Storage Handler)             │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare Service Ecosystem           │
├─────────────────────────────────────────────────────┤
│  ├── D1 Database (Relational Database)             │
│  │   ├── User authentication and permission mgmt   │
│  │   ├── Trading records and analytics data        │
│  │   └── Subscription and billing information      │
│  ├── R2 Storage (Object Storage)                   │
│  │   ├── Project file storage                      │
│  │   └── Multimedia resource management            │
│  ├── AI Workers (AI Computing Services)            │
│  │   ├── Code generation engine                    │
│  │   └── Intelligent analysis services             │
│  └── KV Storage (Key-Value Storage)                │
│      ├── Cache and session management              │
│      └── Configuration and metadata storage        │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│               External Blockchain Networks          │
├─────────────────────────────────────────────────────┤
│  ├── BSC (Binance Smart Chain)                     │
│  ├── Ethereum Mainnet                              │
│  ├── Polygon Network                               │
│  └── Other EVM-compatible chains                   │
└─────────────────────────────────────────────────────┘
```

### Core Technology Stack
- **Runtime**: Cloudflare Workers (V8 Engine)
- **Web Framework**: Hono.js + Itty Router
- **Database**: Drizzle ORM + Cloudflare D1
- **Storage**: Cloudflare R2 Object Storage
- **Testing**: Vitest Testing Framework
- **Type Safety**: TypeScript Full-stack Type Safety

## 🔧 Common Script Commands

### Development & Debugging
```bash
npm run dev              # Start local development server
npm run start            # Start service (dev alias)
npm run verify           # Verify configuration files
```

### Testing Related
```bash
npm run test             # Run complete test suite (using run-tests.sh)
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:performance # Run performance tests
npm run test:security    # Run security tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npm run coverage:open    # Open coverage report in browser
```

### Database Management
```bash
npm run generate         # Generate database migration files
npm run push             # Push database schema changes
npm run migrate          # Execute database migrations
npm run migrate:local    # Local database migrations
npm run migrate:prod     # Production database migrations
npm run studio           # Open Drizzle Studio database management interface
npm run studio:local     # Local database Studio
npm run db:create        # Create new D1 database
npm run db:setup         # Setup database (run setup-database.sh)
npm run db:init          # Initialize database data
npm run db:backup        # Backup database
npm run db:reset         # Reset local database
```

### Sync & Deployment
```bash
npm run deploy           # Deploy to Cloudflare Workers
npm run cf-typegen       # Generate Cloudflare Workers type definitions
npm run sync:start       # Start data synchronization service
npm run sync:pool        # Sync liquidity pool data
npm run setup            # Initial project setup
```

### Convenient Test Scripts
```bash
./test-all-endpoints.sh     # Test all API endpoints
./test-cron-jobs.sh         # Test scheduled tasks
./test-sync-complete.sh     # Test complete sync process
./test-sync-manual.sh       # Manual sync testing
./complete-sync-test.sh     # Complete sync testing
./simple-test.sh            # Simple quick test
./quick-test-cron.sh        # Quick Cron test
```

## 🛡️ Security

### Authentication
- **API Key Authentication**: All API requests require a valid API key in the `x-api-key` request header
- **Tiered Permissions**: Different access permissions based on subscription levels
- **Rate Limiting**: Intelligent rate limiting to prevent abuse

### Data Security
- **Input Validation**: Strict input validation using Zod schemas
- **SQL Injection Protection**: Drizzle ORM provides type-safe queries
- **CORS Configuration**: DEX API supports cross-origin request configuration

### Network Security
- **HTTPS Enforcement**: All API communications are encrypted via HTTPS
- **Cloudflare Protection**: Leverages Cloudflare's DDoS protection and WAF
- **Environment Isolation**: Complete isolation between development, testing, and production environments

## 📚 Related Documentation

- **[Installation Guide](./SETUP_GUIDE.md)** - Detailed project installation and configuration instructions
- **[API Documentation](./entysquare-dex-api-documentation.md)** - Complete API interface documentation
- **[Testing Guide](./CRON_TESTING_GUIDE.md)** - Scheduled tasks and testing instructions
- **[Test Documentation](./test/README.md)** - Testing framework and test case descriptions

## 🤝 Contributing Guidelines

1. **Code Standards**: Follow TypeScript and ESLint configurations
2. **Test Coverage**: New features must include corresponding test cases
3. **Documentation Updates**: Important changes require updating relevant documentation
4. **Security Review**: Security-related changes require additional review

## 📄 License

MIT License - See [LICENSE](../LICENSE) file for details.

---

**Development Team**: UNC Protocol Team  
**Project Version**: 1.0.0  
**Last Updated**: June 2025
