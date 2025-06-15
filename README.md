# EntySquare DEX - Decentralized Exchange

A modern, multi-chain DEX platform built with React, Material-UI, and Web3 technologies. Inspired by Uniswap V3's clean and intuitive design.

## 🚀 Features

### Core Functionality
- **Multi-chain Wallet Integration**: Connect with popular wallets (MetaMask, WalletConnect, Coinbase, etc.)
- **Token Swapping**: Seamless token swaps with real-time price calculations
- **Liquidity Management**: Add/remove liquidity and manage positions
- **Portfolio Dashboard**: Comprehensive view of your DeFi holdings and performance

### 🎨 Design
- **Material-UI Components**: Clean, modern interface using Google's Material Design
- **Uniswap V3 Inspired**: Familiar UX patterns for DeFi users
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Light Theme**: Clean, professional appearance

## 📱 Pages

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
