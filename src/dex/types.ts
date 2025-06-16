// ====== INTERFACES & TYPES ======

export interface PoolData {
	id: string
	token0: string
	token1: string
	icon0: string
	icon1: string
	tvl: string
	apr: string
	volume24h: string
	fees24h: string
	userLiquidity?: string
	pairAddress?: string
	binStep?: number
	tokenXAddress?: string
	tokenYAddress?: string
}

export interface SwapQuote {
	amountOut: string
	priceImpact: string
	path: string[]
	tradeFee: {
		feeAmountIn: string
		totalFeePct: string
	}
	loading: boolean
	error: string | null
}

export interface ReverseSwapQuote {
	amountIn: string | null
	priceImpact: string | null
	path: string[]
	tradeFee: {
		feeAmountIn: string
		totalFeePct: string
	}
	loading: boolean
	error: string | null
}
