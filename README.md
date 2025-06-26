# EntySquare - Advanced Decentralized Exchange Platform

A sophisticated, multi-chain DEX platform featuring concentrated liquidity management, built with React 19, Material-UI v7, and cutting-edge Web3 technologies. EntySquare integrates the Dynamic Liquidity Market Maker (DLMM) protocol for efficient trading and liquidity provision.

## 🚀 Key Features

### Core Trading Functionality
- **Dynamic Liquidity Market Maker Integration**: Advanced concentrated liquidity using @lb-xyz/sdk v5 with binned liquidity distribution
- **Multi-chain Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet, Trust Wallet, and Rabby Wallet integration
- **Advanced Token Swapping**: Real-time price calculations with slippage protection and sophisticated price impact analysis
- **Concentrated Liquidity Management**: Full-featured liquidity position management with custom price ranges
- **Portfolio Dashboard**: Comprehensive tracking of assets, positions, and performance metrics

### 🎨 Modern Design System
- **Material-UI v7**: Latest Material Design components with enhanced theming capabilities
- **Professional Interface**: Clean, responsive design specifically optimized for DeFi trading
- **Intuitive UX**: Familiar patterns inspired by leading DEX platforms like Uniswap
- **Mobile-First**: Fully responsive design ensuring seamless mobile trading experience

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19**: Latest React with concurrent features and enhanced rendering performance
- **TypeScript**: Full type safety throughout the entire application
- **Material-UI v7**: Modern component library with advanced theming and customization
- **Vite**: Lightning-fast build tool and development server with HMR
- **React Router v7**: Latest routing capabilities with enhanced data loading

### Web3 Integration
- **wagmi v2.12**: React hooks for Ethereum with enhanced TypeScript support
- **viem v2.21**: High-performance TypeScript interface for Ethereum interactions
- **RainbowKit v2.2**: Beautiful wallet connection UI with extensive wallet support
- **ethers.js v6**: Ethereum JavaScript library for smart contract interactions

### DeFi Protocols
- **@lb-xyz/sdk v5**: Complete integration with Dynamic Liquidity Market Maker (DLMM) protocol for concentrated liquidity
- **@lb-xyz/sdk-v2 v3**: Advanced features for DLMM pair management and trading
- **Multi-chain Support**: BSC Testnet (active), BSC Mainnet, Ethereum Mainnet compatibility

## 📱 Application Features

### 🔄 Swap Page (`/swap`)
- **Advanced Trading Interface**: Sophisticated token swapping with real-time price feeds
- **Multi-token Support**: Extensive token list with search and filtering capabilities
- **Slippage Protection**: Configurable slippage tolerance and price impact warnings
- **Transaction Preview**: Detailed breakdown of fees, routes, and expected output

### 🏊‍♂️ Pool Page (`/pool`)
- **Dynamic Liquidity Market Maker Integration**: Advanced concentrated liquidity using binned distribution
- **Multiple Bin Strategies**: Spot, Curve, and Bid-Ask liquidity distribution strategies
- **Pool Analytics**: Real-time TVL, volume, and APR calculations
- **Custom Price Ranges**: Precise control over liquidity position ranges

### ➕ Add Liquidity Page (`/add-liquidity`)
- **Advanced Position Creation**: Multi-strategy liquidity provision interface
- **Real-time Calculations**: Live preview of position value and expected returns
- **Risk Management**: Impermanent loss estimation and mitigation strategies
- **Flexible Distribution**: Choose from uniform, curve, or custom bin distributions

### 📊 Portfolio Page (`/portfolio`)
- **Multi-chain Overview**: Unified view of assets across all supported networks
- **Position Management**: Complete overview of all liquidity positions
- **Performance Analytics**: Real-time P&L tracking and historical performance
- **Yield Tracking**: Detailed fee earnings and yield calculations

### 💳 Wallet Page (`/wallet`)
- **Multi-wallet Support**: Seamless connection with popular wallet providers
- **Network Management**: Easy switching between supported blockchain networks
- **Asset Overview**: Real-time token balances and portfolio valuation
- **Transaction History**: Complete record of all wallet interactions

## 🌐 Supported Networks

| Network | Chain ID | Status | Features | DLMM Protocol |
|---------|----------|--------|----------|---------------|
| BSC Testnet | 97 | ✅ **Active** | Full DEX functionality, Faucet available | ✅ DLMM V2.2 |
| BSC Mainnet | 56 | 🔄 Ready | Production deployment ready | ✅ DLMM V2.2 |
| Ethereum Mainnet | 1 | 🔄 Configured | Multi-chain wallet support | 🔄 Planned |

### Network Features
- **BSC Testnet**: Fully operational with test tokens and faucet integration
- **Multi-chain Wallet**: Seamless switching between networks
- **Real-time RPC**: Multiple RPC endpoints for reliability and performance

## 🛠️ Development Setup

### Prerequisites
- **Node.js 18+** and npm
- **Git** version control
- **MetaMask** or compatible Web3 wallet for testing


### Quick Start

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/EntySquare/dex)


```bash
# Clone the repository
git clone https://github.com/your-username/entysquare.git
cd entysquare

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Environment Configuration
Create a `.env.local` file for custom configurations:
```env
# Optional: Custom RPC endpoints
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_PROJECT_ID=your_infura_project_id

# Development settings
VITE_NETWORK_ENV=testnet
VITE_DEBUG_MODE=true
```

### Backend Services (Optional)
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Configure environment
cp wrangler.example.toml wrangler.toml

# Deploy to Cloudflare Workers
npm run deploy
```

## 🔧 Build & Deployment

### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linting and code quality checks
npm run lint
```

### Production Deployment
```bash
# Build optimized production bundle
npm run build

# The dist/ folder contains the production build
# Deploy to your preferred hosting service:
# - Vercel: vercel deploy
# - Netlify: netlify deploy --prod --dir=dist
# - AWS S3: aws s3 sync dist/ s3://your-bucket
```

### Build Optimization Features
- **Tree Shaking**: Automatic dead code elimination
- **Code Splitting**: Dynamic imports for optimal bundle sizes
- **Asset Optimization**: Automatic image and asset compression
- **Modern JS**: ES2020+ target for modern browsers

## 🏗️ Project Structure

```
entysquare/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── MainNavigation.tsx    # Main navigation with wallet integration
│   │   ├── WalletConnector.tsx   # Wallet connection component
│   │   ├── pool/                 # Pool-specific components
│   │   └── examples/             # Example implementations
│   ├── pages/               # Main application pages
│   │   ├── Swap.tsx         # Token swapping interface
│   │   ├── Pool.tsx         # Liquidity pool management
│   │   ├── AddLiquidity.tsx # Add liquidity interface
│   │   ├── Portfolio.tsx    # Portfolio dashboard
│   │   └── Wallet.tsx       # Wallet connection and overview
│   ├── dex/                 # DEX core functionality
│   │   ├── hooks/           # Custom React hooks for DEX operations
│   │   ├── services/        # API services and price feeds
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript type definitions
│   │   ├── abis/            # Smart contract ABIs
│   │   └── config files     # Network and token configurations
│   └── assets/              # Static assets and images
├── backend/                 # Cloudflare Workers backend
│   ├── src/                 # Backend source code
│   ├── test/                # Backend tests
│   └── config files         # Worker configurations
└── public/                  # Public static files
```

### Key Directories
- **`src/dex/hooks/`**: Custom hooks for DEX operations (swapping, liquidity, etc.)
- **`src/dex/services/`**: Price feeds, API integrations, and external services
- **`src/components/pool/`**: Specialized components for liquidity management
- **`backend/`**: Optional serverless backend for enhanced features

## 🔐 Security & Performance Features

### Security Implementation
- ✅ **Wallet Security**: Industry-standard secure connection protocols
- ✅ **Slippage Protection**: Configurable tolerance levels with smart defaults
- ✅ **Price Impact Analysis**: Real-time impact calculations and warnings
- ✅ **Transaction Monitoring**: Complete transaction lifecycle tracking
- ✅ **Input Validation**: Comprehensive sanitization and validation
- ✅ **Error Handling**: Graceful error recovery and user feedback
- ✅ **Smart Contract Safety**: Extensive testing and validation of contract interactions

### Performance Optimizations
- **React 19**: Concurrent rendering and automatic batching for smooth UX
- **Dynamic Liquidity Market Maker Protocol**: Efficient concentrated liquidity with gas optimizations
- **Advanced Caching**: Intelligent caching for Web3 calls and price data
- **Bundle Optimization**: Tree shaking, code splitting, and modern JS features
- **Real-time Updates**: WebSocket connections for live price feeds
- **Responsive Design**: Optimized for all device sizes and screen resolutions

### Technology Stack Summary
```json
{
  "frontend": {
    "framework": "React 19.1.0",
    "ui": "Material-UI 7.1.1", 
    "web3": "wagmi 2.12.29 + viem 2.21.54",
    "routing": "React Router 7.6.2",
    "build": "Vite 6.3.5"
  },
  "defi": {
    "protocol": "@lb-xyz/sdk 5.0.13",
    "wallet": "RainbowKit 2.2.7",
    "contracts": "ethers.js 6.14.4"
  }
}
```

## 🤝 Contributing

We welcome contributions from the DeFi community! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Development Workflow
1. **Fork** the repository on GitHub
2. **Clone** your fork: `git clone https://github.com/your-username/entysquare.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Develop** your feature with proper testing
5. **Test** thoroughly on BSC Testnet
6. **Commit** with clear messages: `git commit -m 'feat: add amazing feature'`
7. **Push** to your branch: `git push origin feature/amazing-feature`
8. **Open** a Pull Request with detailed description

### Contribution Guidelines
- Follow TypeScript best practices and maintain type safety
- Write comprehensive tests for new features
- Ensure all existing tests pass
- Update documentation for any API changes
- Test on multiple wallet providers and networks

### Areas for Contribution
- 🔧 **Protocol Integration**: Additional DEX protocol support
- 🎨 **UI/UX Improvements**: Enhanced user interface components
- 📊 **Analytics**: Advanced portfolio and trading analytics
- 🌐 **Multi-chain**: Additional blockchain network support
- 🧪 **Testing**: Improved test coverage and testing utilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Disclaimers

**Financial Risk Warning**:
- This is experimental DeFi software under active development
- **Use at your own risk**, especially on mainnet networks
- **Always test thoroughly** on testnets before mainnet usage
- DeFi trading involves significant financial risk - **only invest what you can afford to lose**
- **No warranty or guarantee** is provided for any financial outcomes

**Development Status**:
- Currently optimized for BSC Testnet with active development
- BSC Mainnet and Ethereum support are configured but require additional testing
- Smart contract interactions should be thoroughly tested before production use

---

## 🙏 Acknowledgments

- **[Dynamic Liquidity Market Maker](https://docs.meteora.ag/product-overview/dlmm-overview/what-is-dlmm)** - Advanced concentrated liquidity protocol
- **[Material-UI](https://mui.com/)** - Comprehensive React component library
- **[RainbowKit](https://rainbowkit.com/)** - Beautiful wallet connection interface
- **[Wagmi](https://wagmi.sh/)** - React hooks for Ethereum development
- **[Viem](https://viem.sh/)** - TypeScript interface for Ethereum

---

**Built with ❤️ for the DeFi community**

*EntySquare - Advanced decentralized trading with concentrated liquidity*

## 🚀 Getting Started Quickly

1. **Connect Wallet**: Use the wallet connector to connect your Web3 wallet
2. **Switch to BSC Testnet**: Ensure you're on the correct network (Chain ID: 97)
3. **Get Test Tokens**: Use the integrated faucet for testing
4. **Start Trading**: Try swapping tokens or providing liquidity
5. **Monitor Portfolio**: Track your positions and performance

For detailed documentation and API references, visit our [Documentation](docs/) directory.

## 📊 Current Development Status

### ✅ Completed Features
- Multi-wallet integration (MetaMask, WalletConnect, Trust Wallet, etc.)
- Dynamic Liquidity Market Maker protocol integration
- Token swapping with real-time pricing
- Concentrated liquidity provision
- Portfolio dashboard and analytics
- Multi-network support (BSC Testnet, BSC Mainnet, Ethereum)

### 🔄 In Progress
- Advanced analytics and charting
- Additional DEX protocol integrations  
- Enhanced mobile experience
- Comprehensive testing suite

### 🎯 Roadmap
- Layer 2 network support (Arbitrum, Polygon)
- Cross-chain bridge integrations
- Advanced trading features (limit orders, etc.)
- Governance token and DAO implementation
