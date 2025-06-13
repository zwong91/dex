# UNC Protocol - Decentralized Exchange

## Overview

The UNC DEX (Decentralized Exchange) is a smart contract-based automated market maker (AMM) that facilitates the exchange between UNC (Universal Network Coin) tokens and other ERC20 tokens. It uses a constant product formula (x * y = k) to determine exchange rates and provides users with the ability to trade, provide liquidity, earn fees, and participate in yield farming.

## Key Components

1. **UNC Token**: The primary governance and utility token of the protocol
2. **Paired Tokens**: Secondary ERC20 tokens for trading pairs (USDC, USDT, ETH, etc.)
3. **UNCLT (UNC Liquidity Token)**: ERC20 tokens representing liquidity provider shares
4. **Pool Rewards**: Yield farming rewards for liquidity providers

## Token Mechanics

### UNC Token Distribution

1. **Liquidity Mining**: UNC tokens are distributed to liquidity providers as rewards
2. **Trading Fees**: A portion of trading fees is used for UNC token buybacks
3. **Governance**: UNC token holders participate in protocol governance
4. **Staking Rewards**: Users can stake UNC tokens to earn additional yields

## Core Functions

### Trading & Swapping

#### 1. swapUNC (UNC Token to Other Token)

```solidity
function swapUNC(uint _amountIn) external returns (uint amountOut)
```

**Arithmetic:**

1. Calculate fee: `amountInWithFee = _amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR`
2. Calculate output: `amountOut = (otherTokenReserve * amountInWithFee) / (uncTokenReserve + amountInWithFee)`

This function uses the constant product formula (x + y = k) to determine the output amount. Trading fees are deducted and distributed to liquidity providers. #### 2. swapToUNC (Other Token to UNC Token)

```solidity
function swapToUNC(uint _amountIn) external returns (uint amountOut)
```

**Arithmetic:**

1. Calculate fee: `amountInWithFee = _amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR`
2. Calculate output: `amountOut = (uncTokenReserve * amountInWithFee) / (otherTokenReserve + amountInWithFee)`

This function allows users to buy UNC tokens with other tokens, supporting the UNC ecosystem growth.

### Liquidity Pool Management

#### 3. addLiquidity (Provide Liquidity)

```solidity
function addLiquidity(uint _uncTokenAmount, uint _otherTokenAmount) external returns (uint shares)
```

**Arithmetic:**

1. If total supply is 0:
   `shares = sqrt(_uncTokenAmount * _otherTokenAmount)`
2. If total supply > 0:
   ```
   uncTokenShare = (_uncTokenAmount * totalSupply) / uncTokenReserve
   otherTokenShare = (_otherTokenAmount * totalSupply) / otherTokenReserve
   shares = min(uncTokenShare, otherTokenShare)
   ```

Liquidity providers receive UNCLT tokens representing their pool share and earn trading fees plus UNC rewards.

#### 4. removeLiquidity (Remove Liquidity)

```solidity
function removeLiquidity(uint _shares) external returns (uint _uncTokenAmount, uint _otherTokenAmount)
```

**Arithmetic:**

1. Calculate UNC token amount: `_uncTokenAmount = (_shares * uncTokenReserve) / totalSupply`
2. Calculate other token amount: `_otherTokenAmount = (_shares * otherTokenReserve) / totalSupply`

This function calculates the proportional amounts to return to liquidity providers based on their pool share.

### Yield Farming & Rewards

#### 5. claimRewards (Claim Liquidity Mining Rewards)

```solidity
function claimRewards() external returns (uint rewardAmount)
```

Liquidity providers can claim accumulated UNC token rewards based on their pool participation and duration.

#### 6. stakeLPTokens (Stake LP Tokens for Additional Rewards)

```solidity
function stakeLPTokens(uint _amount) external
```

Users can stake their UNCLT tokens to earn additional UNC rewards and participate in governance.

## Price Functions & Analytics

### 7. getUNCTokenPrice

```solidity
function getUNCTokenPrice() public view returns (uint)
```

**Arithmetic:** `return (otherTokenReserve * PRECISION) / uncTokenReserve`

Calculates the current market price of UNC token in terms of the paired token.

### 8. getOtherTokenPrice

```solidity
function getOtherTokenPrice() public view returns (uint)
```

**Arithmetic:** `return (uncTokenReserve * PRECISION) / otherTokenReserve`

Calculates the price of the paired token in terms of UNC tokens.

### 9. estimateUNCToOtherToken

```solidity
function estimateUNCToOtherToken(uint uncTokenAmount) public view returns (uint)
```

**Arithmetic:**

1. Apply fee: `amountWithFee = uncTokenAmount * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR`
2. Estimate output: `return (otherTokenReserve * amountWithFee) / (uncTokenReserve + amountWithFee)`

Provides price estimates for trading UNC tokens, helping users calculate slippage.

### 10. estimateOtherTokenToUNC

```solidity
function estimateOtherTokenToUNC(uint otherTokenAmount) public view returns (uint)
```

**Arithmetic:**

1. Apply fee: `amountWithFee = otherTokenAmount * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR`
2. Estimate output: `return (uncTokenReserve * amountWithFee) / (otherTokenReserve + amountWithFee)`

Estimates UNC tokens received for a given amount of paired tokens.

## Fee Structure & Distribution

The protocol implements a multi-tier fee system:

- **Trading Fees**: 0.3% on all swaps
  - 0.25% to liquidity providers
  - 0.05% for UNC token buybacks
- **Withdrawal Fees**: 0.1% on liquidity removal (first 30 days)
- **Performance Fees**: 10% on yield farming rewards

## Yield Farming & Incentives

### Liquidity Mining Program

- **Base APR**: 15-25% in UNC tokens for LP providers
- **Boosted APR**: Up to 50% for UNC token stakers
- **Time Multiplier**: Longer positions earn higher multipliers
- **Volume Bonus**: High-volume traders earn additional rewards

### Governance & Staking

- **Governance Rights**: UNC token holders vote on protocol parameters
- **Staking Rewards**: Additional yield for staking UNC tokens
- **Fee Sharing**: Stakers receive a portion of protocol revenue
- **Buyback Program**: Regular UNC token buybacks from trading fees

## Automated Market Maker (AMM) Model

The UNC DEX uses the constant product formula: `x * y = k`

Where:
- x: Reserve of UNC token
- y: Reserve of paired token  
- k: Constant product

This formula ensures that the product of reserves remains constant after each trade, creating a price curve that automatically adjusts based on supply and demand dynamics.

## Liquidity Provider Tokens (UNCLT)

UNCLT tokens represent a liquidity provider's proportional share of the pool. They are:
- **Minted** when liquidity is added to pools
- **Burned** when liquidity is removed from pools
- **Stakeable** for additional UNC rewards
- **Transferable** ERC20 tokens with their own market value

## Pool Analytics & Metrics

The protocol tracks comprehensive pool analytics:
- **Total Value Locked (TVL)**
- **24h Trading Volume**
- **APR/APY for liquidity providers**
- **Price impact for trades**
- **Impermanent loss tracking**
- **Fee collection statistics**

## Security Features

1. **Slippage Protection**: Automatic revert on excessive price impact
2. **Reentrancy Guards**: Protection against reentrancy attacks
3. **Access Controls**: Role-based permissions for administrative functions
4. **Emergency Pause**: Circuit breaker for emergency situations
5. **Time Locks**: Delays for critical parameter changes
6. **Multi-signature**: Requirements for sensitive operations

## Supported Trading Pairs

### Primary Pairs
- UNC/USDC
- UNC/USDT  
- UNC/ETH
- UNC/BNB

### Secondary Pairs
- UNC/DAI
- UNC/BUSD
- UNC/WBTC

## Integration & API

### Smart Contract Integration
```solidity
interface IUNCDEX {
    function swapUNC(uint amountIn) external returns (uint amountOut);
    function swapToUNC(uint amountIn) external returns (uint amountOut);
    function addLiquidity(uint uncAmount, uint otherAmount) external returns (uint shares);
    function removeLiquidity(uint shares) external returns (uint, uint);
}
```

### Web3 Integration
- **Frontend SDK**: JavaScript/TypeScript SDK for easy integration
- **Subgraph**: GraphQL endpoint for historical data
- **Price Oracle**: Real-time price feeds for external applications

## Roadmap & Future Development

### Phase 1: Core DEX (Current)
- ✅ Basic AMM functionality
- ✅ Liquidity pools and swaps
- ✅ Yield farming rewards
- ✅ BSC integration

### Phase 2: Advanced Features
- 🔄 Multi-chain deployment (Ethereum, Polygon, Arbitrum)
- 🔄 Advanced order types (limit orders, stop-loss)
- 🔄 Concentrated liquidity (Uniswap V3 style)
- 🔄 Cross-chain bridge integration

### Phase 3: DeFi Ecosystem
- 📋 Lending and borrowing protocols
- 📋 Synthetic assets and derivatives
- 📋 Options and futures trading
- 📋 Insurance and risk management

### Phase 4: Governance & DAO
- 📋 Full DAO governance implementation
- 📋 Treasury management
- 📋 Community-driven development
- 📋 Grant programs for developers

## Contract Addresses (BSC Network)

Contract addresses for the UNC Protocol on BSC:

### BSC Testnet
- **UNC Token**: `0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882`
- **Test Paired Token (USDT)**: `0xafC9D020d0b67522337058f0fDea057769dd386A`
- **DEX Pool Contract**: `0xC8fb994B992B01C72c969eC9C077CD030eaD2A7F`
- **Liquidity Token (UNCLT)**: `0x4a62fa31Cd52BE39a57621783f16DEC3c54e30ac`

### BSC Mainnet
- **UNC Token**: TBD
- **DEX Pool Contract**: TBD
- **Liquidity Token (UNCLT)**: TBD

## Getting Started

### For Traders
1. Connect your wallet (MetaMask, Trust Wallet, etc.)
2. Switch to BSC network
3. Buy UNC tokens or provide liquidity
4. Start trading with low fees and fast transactions

### For Liquidity Providers
1. Add liquidity to UNC/USDC or other pairs
2. Receive UNCLT tokens representing your share
3. Earn trading fees and UNC rewards
4. Stake UNCLT tokens for additional yields

### For Developers
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Deploy to BSC testnet for testing

## Community & Support

- **Website**: [unc-protocol.com](https://unc-protocol.com)
- **Documentation**: [docs.unc-protocol.com](https://docs.unc-protocol.com)
- **Discord**: [discord.gg/unc-protocol](https://discord.gg/unc-protocol)
- **Twitter**: [@UNCProtocol](https://twitter.com/UNCProtocol)
- **Telegram**: [t.me/UNCProtocol](https://t.me/UNCProtocol)

---

*The UNC Protocol is a decentralized, community-driven project. Trade responsibly and do your own research before investing.*
