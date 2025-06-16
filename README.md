# EntySquare - Modern Decentralized Exchange Platform

A sophisticated, multi-chain DEX platform built with React 19, Material-UI v7, and cutting-edge Web3 technologies. EntySquare combines the best practices from leading DeFi protocols with an intuitive, Uniswap V3-inspired user experience.

## 🚀 Key Features

### Core Trading Functionality
- **Multi-chain Wallet Integration**: Support for MetaMask, WalletConnect, Coinbase Wallet, Trust Wallet, and Rabby Wallet
- **Advanced Token Swapping**: Real-time price calculations with slippage protection and price impact analysis
- **Concentrated Liquidity**: Uniswap V3-style liquidity positions with customizable price ranges
- **Portfolio Management**: Comprehensive dashboard for tracking assets, positions, and performance

### 🎨 Modern Design System
- **Material-UI v7**: Latest Material Design components with enhanced theming
- **Professional Interface**: Clean, responsive design optimized for DeFi trading
- **Intuitive UX**: Familiar patterns inspired by leading DEX platforms
- **Mobile-First**: Fully responsive design for seamless mobile trading

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19**: Latest React with concurrent features and enhanced performance
- **TypeScript**: Full type safety throughout the application
- **Material-UI v7**: Modern component library with advanced theming
- **Vite**: Lightning-fast build tool and development server
- **React Router v7**: Latest routing capabilities

### Web3 Integration
- **wagmi v2**: React hooks for Ethereum with enhanced TypeScript support
- **viem v2**: High-performance TypeScript interface for Ethereum
- **RainbowKit**: Beautiful wallet connection UI with extensive wallet support
- **ethers.js v6**: Ethereum JavaScript library for smart contract interactions

### DeFi Protocols
- **@lb-xyz/sdk**: Integration with Liquidity Book (Joe V2) for concentrated liquidity
- **Multi-chain Support**: BSC, Ethereum, Polygon, Arbitrum compatibility

## 📱 Application Pages

### 🔄 Swap (Trading Interface)
- **Advanced Order Management**: Market orders with slippage protection
- **Real-time Price Feeds**: Live market data and price impact calculations
- **Multi-token Support**: Extensive token list with search and filtering
- **Transaction History**: Complete trading history with performance analytics

### 🏊‍♂️ Pool (Liquidity Management)
- **Concentrated Liquidity**: Uniswap V3-style position management
- **Multiple Strategies**: Spot, Curve, and Bid-Ask liquidity strategies
- **Position Analytics**: Real-time P&L tracking and yield calculations
- **Advanced Controls**: Custom price ranges and fee tier selection

### 📊 Portfolio (Asset Dashboard)
- **Multi-chain Overview**: Unified view of assets across all supported networks
- **Performance Metrics**: Real-time portfolio valuation and historical performance
- **Position Management**: Detailed view of all liquidity positions and trading pairs
- **Analytics**: Advanced charts and performance indicators

### 💼 Position (Individual Position Management)
- **Detailed Analytics**: In-depth position performance and metrics
- **Management Tools**: Add/remove liquidity with precision controls
- **Yield Tracking**: Real-time yield calculations and projections
- **Risk Metrics**: Impermanent loss tracking and risk assessment

### 💳 Wallet (Connection & Overview)
- **Multi-wallet Support**: Connect various wallet types seamlessly
- **Asset Overview**: Quick glance at token balances and values
- **Network Management**: Easy network switching and configuration
- **Transaction History**: Complete history of all wallet interactions

## 🌐 Supported Networks

| Network | Chain ID | Status | Features |
|---------|----------|--------|----------|
| BSC Testnet | 97 | ✅ Active | Full DEX functionality |
| BSC Mainnet | 56 | 🔄 Planned | Production deployment |
| Ethereum | 1 | 🔄 Planned | Full Uniswap V3 compatibility |
| Polygon | 137 | 🔄 Planned | Low-fee trading |
| Arbitrum | 42161 | 🔄 Planned | L2 scalability |

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Git
- MetaMask or compatible Web3 wallet

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/entysquare.git
cd entysquare

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Configuration
Create a `.env` file:
```env
# Optional: Custom RPC endpoints
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_PROJECT_ID=your_infura_project_id

# Development settings
VITE_NETWORK_ENV=testnet
```

## 🔧 Build & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Linting & Code Quality
```bash
npm run lint
```

## 🏗️ Project Structure

```
entysquare/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Navigation.tsx    # Main navigation with wallet integration
│   │   └── ...
│   ├── pages/               # Main application pages
│   │   ├── Swap.tsx         # Token swapping interface
│   │   ├── Pool.tsx         # Liquidity pool management
│   │   ├── Portfolio.tsx    # Portfolio dashboard
│   │   ├── Position.tsx     # Individual position management
│   │   └── Wallet.tsx       # Wallet connection and overview
│   ├── utils/               # Utility functions and configurations
│   │   ├── dexConfig.ts     # DEX and network configurations
│   │   ├── dexUtils.ts      # DEX utility functions and hooks
│   │   └── wagmiConfig.ts   # Web3 wallet configuration
│   └── assets/              # Static assets and images
├── backend/                 # Optional backend services
└── public/                  # Public static files
```

## 🔐 Security Features

- ✅ **Wallet Security**: Secure connection protocols with industry standards
- ✅ **Slippage Protection**: Configurable tolerance levels
- ✅ **Price Impact Analysis**: Real-time impact calculations
- ✅ **Transaction Monitoring**: Complete transaction lifecycle tracking
- ✅ **Input Validation**: Comprehensive sanitization and validation
- ✅ **Error Handling**: Graceful error recovery and user feedback

## 🚀 Performance Optimizations

- **React 19**: Concurrent rendering and automatic batching
- **Code Splitting**: Dynamic imports for optimal bundle sizes
- **Caching**: Aggressive caching for Web3 calls and static assets
- **Optimistic Updates**: Immediate UI feedback for better UX
- **Bundle Optimization**: Tree shaking and dead code elimination

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Important Notice**: 
- This is experimental DeFi software under active development
- Use at your own risk, especially on mainnet
- Always test thoroughly on testnets first
- DeFi involves financial risk - only invest what you can afford to lose
- No warranty or guarantee is provided

---

**Built with ❤️ for the DeFi community**

*EntySquare - Advanced decentralized trading for everyone*

### 1. Swap (`/swap`)
- Token selection with search functionality
- Real-time price calculation and slippage settings
- Transaction preview with detailed breakdown
- Gas fee estimation

### 2. Pool (`/pool`)
- Browse all available liquidity pools
- View pool statistics (TVL, APR, 24h volume)
- Add/remove liquidity positions
- Filter and search pools

### 3. Position (`/position`)
- Manage your liquidity positions
- View position performance and fee earnings
- Add/remove liquidity from existing positions
- Collect accumulated fees

### 4. Portfolio (`/dashboard`)
- Overview of total portfolio value
- Token holdings with current prices and 24h changes
- Liquidity position summary
- Transaction history and statistics

### 5. Wallet (`/wallet`)
- Wallet connection and management
- Account overview with address and network info
- Quick actions for common operations
- Recent activity feed

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Library**: Material-UI (MUI) v5
- **Blockchain**: Wagmi, Viem, Ethers.js
- **Wallet Connection**: RainbowKit
- **State Management**: TanStack Query
- **Routing**: React Router v7
- **Notifications**: Sonner

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Supported Networks
- Ethereum Mainnet
- Polygon
- BSC (Binance Smart Chain)
- Avalanche
- Local development networks

### Environment Variables
Create a `.env.local` file with:
```
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
VITE_ALCHEMY_API_KEY=your_alchemy_key
```

## 🎯 Design Philosophy

### Simplicity First
- Removed unnecessary complexity and features
- Focus on core DEX functionality
- Clean, intuitive user interface

### Uniswap V3 Inspired
- Familiar color scheme (pink primary, clean whites/grays)
- Consistent spacing and typography
- Card-based layout with subtle shadows
- Rounded corners and smooth transitions

### Material Design
- Google's proven design system
- Accessibility built-in
- Consistent interaction patterns
- Professional appearance

## 📈 Performance

- **Bundle Size**: Significantly reduced by removing unused dependencies
- **Load Time**: Faster initial page load with optimized imports
- **UX**: Smooth interactions with Material-UI's optimized components
- **Mobile**: Responsive design that works on all devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Uniswap](https://uniswap.org/) for design inspiration
- [Material-UI](https://mui.com/) for the component library
- [RainbowKit](https://rainbowkit.com/) for wallet connection
- [Wagmi](https://wagmi.sh/) for Web3 React hooks
