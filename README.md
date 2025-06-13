# Universal DEX - Multi-Chain Decentralized Exchange Platform

## Overview

Universal DEX is a modern, multi-chain decentralized exchange (DEX) platform built with React, TypeScript, and wagmi. It provides a seamless trading experience across multiple blockchain networks including BSC, Ethereum, Polygon, and Arbitrum. The platform features an intuitive interface for token swapping, liquidity management, and portfolio tracking.

## Key Features

1. **Multi-Chain Support**: Trade on BSC, Ethereum, Polygon, and Arbitrum
2. **Modern UI/UX**: Clean, responsive interface with dark theme
3. **Real-time Trading**: Instant token swaps with live price feeds
4. **Liquidity Management**: Add/remove liquidity and earn trading fees
5. **Wallet Integration**: Support for MetaMask, WalletConnect, Coinbase, Trust Wallet, and more
6. **Portfolio Dashboard**: Track your assets and trading positions
7. **Advanced Features**: Slippage protection, price impact analysis, and transaction history

## Tech Stack

### Frontend
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **React Router**: Client-side routing

### Web3 Integration
- **wagmi**: React hooks for Ethereum
- **viem**: TypeScript interface for Ethereum
- **RainbowKit**: Beautiful wallet connection UI
- **ethers.js**: Ethereum JavaScript library

### Supported Wallets
- MetaMask
- WalletConnect
- Coinbase Wallet
- Trust Wallet
- Rabby Wallet
- Injected wallets

## Supported Networks

| Network | Chain ID | Status | Testnet |
|---------|----------|--------|---------|
| BSC Testnet | 97 | ✅ Active | Yes |
| BSC Mainnet | 56 | 🔄 Planned | No |
| Ethereum | 1 | 🔄 Planned | No |
| Polygon | 137 | 🔄 Planned | No |
| Arbitrum | 42161 | 🔄 Planned | No |

## Core Features

### 🔄 Token Swapping (ModernSwap)
- **Instant Swaps**: Trade tokens with real-time price calculations
- **Slippage Protection**: Configurable slippage tolerance (0.1% - 5%)
- **Price Impact Analysis**: Real-time impact calculation for large trades
- **Auto-calculation**: Automatic output amount calculation
- **Swap Direction Toggle**: Easy reversal of trading pairs
- **Gas Optimization**: Efficient smart contract interactions

### 💧 Liquidity Management (Wallet)
- **Add Liquidity**: Provide liquidity to trading pairs and earn fees
- **Remove Liquidity**: Withdraw your liquidity position anytime
- **LP Token Management**: Track and manage liquidity provider tokens
- **Balance Tracking**: Real-time balance updates for all tokens
- **Approval Management**: Streamlined token approval process

### 📊 Portfolio Dashboard
- **Asset Overview**: Complete portfolio tracking
- **Trading History**: Complete transaction history tracking
- **Performance Metrics**: Track profits, losses, and yields
- **Multi-chain Assets**: Unified view across all supported networks

### 🔧 Advanced Trading Features
- **Real-time Pricing**: Live price feeds and market data
- **Fee Estimation**: Transparent fee calculation (0.3% trading fee)
- **Transaction Status**: Real-time transaction monitoring
- **Error Handling**: User-friendly error messages and recovery options

## Contract Addresses (BSC Testnet)

Current deployment on BSC Testnet for development and testing:

| Contract | Address | Purpose |
|----------|---------|---------|
| **Token A** | `0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882` | Test token for trading pairs |
| **Token B** | `0xafC9D020d0b67522337058f0fDea057769dd386A` | Test token for trading pairs |
| **DEX Router** | `0xC8fb994B992B01C72c969eC9C077CD030eaD2A7F` | Main DEX contract for swaps |
| **Liquidity Token** | `0x4a62fa31Cd52BE39a57621783f16DEC3c54e30ac` | LP tokens for liquidity providers |

> **Note**: These are testnet addresses for development. Mainnet addresses will be updated upon deployment.

## Project Structure

```
universal-dex/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Dropdown.tsx     # Token selection dropdown
│   │   ├── MainNavigation.tsx # Main navigation component
│   │   └── WalletConnector.tsx # Wallet connection UI
│   ├── pages/               # Main application pages
│   │   ├── DashBoard.tsx    # Portfolio dashboard
│   │   ├── ModernSwap.tsx   # Token swapping interface
│   │   ├── ModernLiquidity.tsx # Liquidity management
│   │   ├── Wallet.tsx       # Wallet and liquidity management
│   │   ├── MarketPlace.tsx  # Market overview
│   │   └── Complex.tsx      # Advanced trading features
│   ├── utils/               # Utility functions and configurations
│   │   ├── dexConfig.ts     # Network and DEX configurations
│   │   ├── dexUtils.ts      # DEX utility functions and hooks
│   │   ├── wagmiConfig.ts   # Web3 wallet configuration
│   │   └── abis/            # Smart contract ABIs
│   └── assets/              # Static assets and images
├── backend/                 # Backend API (optional)
│   ├── api.ts              # Express.js API server
│   ├── types.ts            # TypeScript type definitions
│   └── README.md           # Backend documentation
└── public/                 # Public static files
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- MetaMask or other Web3 wallet

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/universal-dex.git
cd universal-dex
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies (optional)
cd backend
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Optional: Custom RPC endpoints
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_PROJECT_ID=your_infura_project_id

# Backend configuration (if using backend)
PRIVATE_KEY=your_test_private_key_for_faucet
PORT=3000
```

### 4. Start Development Server
```bash
# Start frontend only
npm run dev

# Start with backend (in separate terminals)
npm run dev           # Frontend (port 5173)
cd backend && npm start  # Backend API (port 3000)
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000 (if running)

## Usage Guide

### For Traders
1. **Connect Wallet**: Click "Connect Wallet" and select your preferred wallet
2. **Switch Networks**: Choose BSC Testnet for testing
3. **Get Test Tokens**: Use the faucet in the Network Information section
4. **Start Trading**: Navigate to Swap page and trade tokens
5. **Track Portfolio**: View your assets and history in the Dashboard

### For Liquidity Providers
1. **Connect Wallet**: Ensure you have tokens in your wallet
2. **Navigate to Liquidity**: Go to the Wallet page
3. **Approve Tokens**: Click "Approve" for both tokens
4. **Add Liquidity**: Enter amounts and click "Add Liquidity"
5. **Earn Fees**: Receive LP tokens and earn from trading fees
6. **Remove Liquidity**: Use the "Remove Liquidity" section when needed

### For Developers
1. **Smart Contract Integration**: Use the provided ABIs and contract addresses
2. **Custom Network**: Add new networks in `src/utils/dexConfig.ts`
3. **Custom Components**: Extend UI components in `src/components/`
4. **API Integration**: Use the backend API for additional features

## API Reference

### Backend Endpoints (Optional)

#### Get Supported Tokens
```bash
GET /api/tokens
```
Returns list of supported tokens with metadata.

#### Get Token Price
```bash
GET /api/price/:tokenA/:tokenB
```
Returns exchange rate between two tokens.

#### Token Faucet (Testnet)
```bash
POST /faucet/:address
```
Mints test tokens to the specified address.

#### Record Swap Transaction
```bash
POST /api/swap
Content-Type: application/json

{
  "user": "0x...",
  "tokenIn": "TOKEN A",
  "tokenOut": "TOKEN B", 
  "amountIn": "100.0",
  "amountOut": "210.0",
  "txHash": "0x..."
}
```

### Smart Contract Functions

#### Core DEX Functions
```typescript
// Add liquidity to pool
addLiquidity(tokenAAmount: uint256, tokenBAmount: uint256) 
  returns (uint256 shares)

// Remove liquidity from pool  
removeLiquidity(shares: uint256) 
  returns (uint256 tokenAAmount, uint256 tokenBAmount)

// Swap Token A for Token B
swapTokenAForB(amountIn: uint256) 
  returns (uint256 amountOut)

// Swap Token B for Token A
swapTokenBForA(amountIn: uint256) 
  returns (uint256 amountOut)

// Get current Token A price
getTokenAPrice() view returns (uint256)

// Get pool reserves ratio
getPoolRatio() view returns (uint256)
```

## Fee Structure

| Action | Fee | Recipient |
|--------|-----|-----------|
| **Token Swaps** | 0.3% | Liquidity Providers |
| **Add Liquidity** | Free | N/A |
| **Remove Liquidity** | Free | N/A |
| **Network Gas** | Variable | Blockchain Network |

## Security Features

- ✅ **Slippage Protection**: Configurable slippage tolerance
- ✅ **Input Validation**: Comprehensive input sanitization  
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Transaction Monitoring**: Real-time transaction status
- ✅ **Wallet Security**: Secure wallet connection protocols
- ✅ **Smart Contract Audits**: Regular security audits (planned)

## Troubleshooting

### Common Issues

#### 1. Wallet Connection Failed
- Ensure MetaMask is installed and unlocked
- Check if you're on the correct network
- Try refreshing the page and reconnecting

#### 2. Transaction Failed
- Check you have sufficient balance
- Verify token approvals are set
- Increase slippage tolerance if needed
- Ensure sufficient gas fees

#### 3. Price Impact Too High
- Reduce trade amount
- Check liquidity availability
- Consider splitting large trades

#### 4. Network Issues
- Switch to BSC Testnet for testing
- Check RPC endpoint connectivity
- Verify network configuration

### Getting Help
- Check the browser console for detailed error messages
- Ensure your wallet is connected to BSC Testnet
- Try clearing browser cache and reconnecting wallet

## Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes on testnet before submitting

### Reporting Issues
- Use GitHub Issues for bug reports
- Provide detailed reproduction steps
- Include browser and wallet information
- Attach screenshots if applicable

## Roadmap

### ✅ Phase 1: Core Platform (Completed)
- Multi-chain wallet integration
- Token swapping functionality
- Liquidity management
- Portfolio dashboard
- BSC Testnet deployment

### 🔄 Phase 2: Enhanced Features (In Progress)
- Advanced order types (limit, stop-loss)
- Price charts and market data
- Transaction history improvements
- Mobile responsiveness
- Performance optimizations

### 📋 Phase 3: Advanced Trading (Planned)
- Concentrated liquidity (V3 style)
- Cross-chain bridge integration
- Yield farming and staking
- Governance token and DAO
- Enhanced portfolio tracking

### 📋 Phase 4: Ecosystem Expansion (Future)
- Lending and borrowing protocols
- Options and derivatives trading
- NFT marketplace integration
- Mobile app development
- Enterprise partnerships

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

⚠️ **Important Notice**: 
- This is experimental software under active development
- Use at your own risk, especially on mainnet
- Always test on testnet first
- No warranty or guarantee is provided
- DeFi involves financial risk - only invest what you can afford to lose

---

**Built with ❤️ for the DeFi community**

*Universal DEX - Making decentralized trading accessible to everyone*
