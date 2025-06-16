// ========================================
// DEX Utils - Module Entry Point
// ========================================
// This is the main entry point for all DEX utilities
// All functionality has been split into focused modules for better maintainability
// Import from '/dex' for convenience or from specific modules for tree-shaking

// Type definitions
export type { PoolData, ReverseSwapQuote, SwapQuote } from './types'

// LB SDK configuration and utilities
export {
	getSDKTokenByAddress, getSDKTokensForChain, TOKEN_CONFIGS, wagmiChainIdToSDKChainId
} from './lbSdkConfig'

// DEX configuration and utilities
export {
	formatTokenAmount
} from './dexConfig'

// Viem client configuration
export { createViemClient } from './viemClient'

// Token balance hooks
export {
	useCheckAllowance,
	useLiquidityTokenBalance, useTokenApproval, useTokenBalance,
	useTokenBalanceByAddress
} from './hooks/useTokenBalances'

// DEX operation hooks
export {
	useDexOperations
} from './hooks/useDexOperations'

// Swap quotes hooks
export {
	useReverseSwapQuote, useSwapQuote, useSwapWithSDK
} from './hooks/useSwapQuotes'

// Pool data hooks
export {
	useRealPoolData
} from './hooks/usePoolData'

// User liquidity position hooks
export {
	useUserLiquidityPositions
} from './hooks/useUserPositions'

// LB Pair data hooks
export {
	useAllLBPairs, useUserActiveBins, useUserLPBalances
} from './hooks/useLBPairData'

// Export UserPosition type
export type { UserPosition } from './hooks/useUserPositions'
