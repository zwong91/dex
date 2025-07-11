# 📋 Deployment Guide

## 🌟 Deployment Options

### 1. 🎯 Subgraph Studio (Recommended for Production)

**For mainnet and testnet deployments**, use The Graph's Subgraph Studio:

#### Step 1: Setup

1. Visit [Subgraph Studio](https://thegraph.com/studio/)
2. Connect your wallet (MetaMask, WalletConnect, etc.)
3. Create a new subgraph

#### Step 2: Get Your Deploy Key

1. In your subgraph dashboard, copy the deploy key
2. Authenticate locally:

   ```bash
   graph auth <YOUR_DEPLOY_KEY>
   ```

#### Step 3: Prepare Your Subgraph

```bash
# For different networks
npm run prepare:bsc         # BSC mainnet  

# Generate TypeScript types
npm run codegen:bsc    # or your target network

# Build the subgraph
npm run build:bsc      # or your target network
```

#### Step 4: Deploy

```bash
# Deploy to Subgraph Studio
graph deploy <YOUR_SUBGRAPH_SLUG>
```

### 2. 🏠 Local Development

**For development and testing**, use a local Graph node:

#### Quick Start

```bash
# Automated deployment (recommended)
npm run deploy:testnet      # For testnet setup
npm run deploy:mainnet      # For mainnet setup
```

#### Manual Setup

```bash
# Start local Graph node
npm run start:node

# Wait for services to start (30 seconds)
# Then prepare your network
npm run prepare:bsc         # or your target network

# Generate types and build
npm run codegen:bsc
npm run build:bsc

# Create and deploy locally
npm run create-local
npm run deploy-local
```

#### Access Your Local Subgraph

- **GraphQL Endpoint**: <http://localhost:8000/subgraphs/name/entysquare/indexer-v21>
- **Graph Explorer**: <http://localhost:8000/subgraphs/name/entysquare/indexer-v21/graphql>

### 3. 🔧 Custom Graph Node (Advanced)

This section was removed as the custom Arbitrum deployment is no longer needed.

## 🛠️ Available Scripts Quick Reference

| Script | Purpose |
|--------|---------|
| `npm run create-studio` | Instructions for Subgraph Studio setup |
| `npm run auth-studio` | Instructions for authentication |
| `npm run deploy-studio` | Instructions for Studio deployment |
| `npm run deploy:testnet` | Automated local testnet deployment |
| `npm run deploy:mainnet` | Automated local mainnet deployment |
| `npm run start:node` | Start local Graph node |
| `npm run stop:node` | Stop local Graph node |
| `npm run clean` | Clean all local data |

## 🔍 Monitoring & Debugging

### View Logs

```bash
npm run logs:graph      # Graph Node logs
npm run logs:ipfs       # IPFS logs  
npm run logs:postgres   # PostgreSQL logs
```

### Check Status

```bash
docker-compose ps       # Container status
```

### Restart Services

```bash
npm run restart:node    # Restart all services
```

## 🚀 Migration from Hosted Service

If you're migrating from the old hosted service:

1. **Backup your subgraph data** if needed
2. **Create a new subgraph in Studio** with the same name
3. **Update your deployment scripts** (already done in this repo)
4. **Deploy using the new method** described above
5. **Update your frontend** to use the new endpoint URLs

## 📞 Need Help?

- [The Graph Documentation](https://thegraph.com/docs/)
- [Subgraph Studio](https://thegraph.com/studio/)
- [Discord Community](https://discord.gg/graphprotocol)

---

> **Note**: The old deployment URLs (`https://api.thegraph.com/deploy/`) will no longer work. Please update your deployment processes accordingly.
