/**
 * Type definitions for user positions and related data structures
 */

export interface UserPosition {
  id: string
  binId: number
  binStep: number // 新增 binStep 字段
  token0: string
  token1: string
  token0Address: string // 新增 token0 地址
  token1Address: string // 新增 token1 地址
  icon0: string
  icon1: string
  pairAddress: string
  liquidity: string
  value: string
  apr: string
  fees24h: string
  feesTotal: string
  range: {
    min: string
    max: string
    current: string
  }
  inRange: boolean
  performance: string
  amountX: string
  amountY: string
  feeX: string
  feeY: string
  shares: string
  // Raw data for contract interactions
  binData: Array<{
    binId: number
    shares: bigint
    totalShares: bigint
    reserveX: bigint
    reserveY: bigint
  }>
}

export interface LPBalance {
  pairAddress: string
  balance: bigint
  tokenX: string
  tokenY: string
}

export interface PairData {
  activeBin: number
  binStep: number
  reserves: [bigint, bigint]
  totalSupply: bigint
}

export interface TokenBalance {
  symbol: string
  address: string
  balance: string
  balanceFormatted: string
  decimals: number
  price: string
  value: string
  change24h: string
}

export interface WalletStats {
  totalTokensValue: number
  totalLPValue: number
  totalUnclaimedFees: number
  totalPortfolioValue: number
  tokenCount: number
  lpPositionCount: number
}
