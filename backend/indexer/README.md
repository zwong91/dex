# Indexer Subgraph v21

Subgraph for Indexer v21 on multiple networks including Ethereum and BSC.

## ⚠️ Important: The Graph Deployment Updates

**The Graph's hosted service has been deprecated. Please use the new deployment methods:**

### 🚀 For Production (Mainnet/Testnet) Deployments

Use **Subgraph Studio** for all production deployments:

1. **Visit Subgraph Studio**: https://thegraph.com/studio/
2. **Create an account** and connect your wallet
3. **Create a new subgraph** and get your deployment key
4. **Authenticate locally**:
   ```bash
   npm run auth-studio
   # Then run: graph auth --studio <YOUR_DEPLOY_KEY>
   ```
5. **Deploy to Studio**:
   ```bash
   npm run deploy-studio
   # Then run: graph deploy --studio <YOUR_SUBGRAPH_SLUG>
   ```

### 🏠 For Local Development

Use the local Graph node setup:

```bash
# Start local Graph node
npm run start:node

# Prepare, build and deploy locally
npm run deploy:testnet  # or deploy:mainnet
```

### Subgraph Status

| Network    | Status | Notes |
| ---------- | :----: | ----- |
| Ethereum   | 🟡 Studio Required | Use Subgraph Studio for deployment |
| BSC        | 🟡 Studio Required | Use Subgraph Studio for deployment |
| Local Dev  | 🟢 Active | Local node setup available |  



## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Choose Your Deployment Method

#### 🎯 For Production (Subgraph Studio)
```bash
# Get instructions for Studio setup
npm run create-studio
npm run auth-studio
npm run deploy-studio
```

#### 🏠 For Local Development
```bash
# Automated deployment
npm run deploy:testnet
# or
npm run deploy:mainnet
```

## 📋 Detailed Setup & Deploy

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Legacy Commands (Updated)

The following commands now show migration instructions instead of attempting deprecated deployments:

```bash
# These now show Studio migration instructions:
npm run deploy:ethereum
npm run deploy:bsc
```

### Working Commands

```bash
# Prepare constants and subgraph.yaml for different networks
npm run prepare:ethereum
npm run prepare:bsc

# Generate Assembly Script typings
npm run codegen:ethereum
npm run codegen:bsc

# Compile and build files  
npm run build:ethereum
npm run build:bsc
```

## 🏠 Local Development Setup

### Method 1: Automated (Recommended)
```bash
npm run deploy:testnet    # For BSC testnet development
npm run deploy:mainnet    # For BSC mainnet development  
```

### Method 2: Manual Setup
1. **Install Docker**: [Get Docker](https://docs.docker.com/get-docker/)
2. **Start local node**: `npm run start:node`
3. **Prepare network**: `npm run prepare:bsc` (or your target network)
4. **Generate types**: `npm run codegen:bsc` 
5. **Build subgraph**: `npm run build:bsc`
6. **Create local subgraph**: `npm run create-local`
7. **Deploy locally**: `npm run deploy-local`

### 🌐 Access Points
- **Subgraph endpoint**: http://localhost:8000/subgraphs/name/entysquare/indexer-v21
- **GraphQL playground**: http://localhost:8000/subgraphs/name/entysquare/indexer-v21/graphql

### 📊 Management Commands
```bash
# View logs
npm run logs:graph        # Graph Node logs
npm run logs:ipfs         # IPFS logs  
npm run logs:postgres     # PostgreSQL logs

# Service management
npm run stop:node         # Stop all services
npm run restart:node      # Restart all services  
npm run clean             # Complete cleanup

# Check status
docker-compose ps         # Container status
```

## 🔗 Useful Links

- **[The Graph Studio](https://thegraph.com/studio/)** - Modern deployment platform
- **[Documentation](https://thegraph.com/docs/)** - Official docs
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[Discord](https://discord.gg/graphprotocol)** - Community support