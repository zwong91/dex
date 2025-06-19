import { useState, useEffect } from 'react'
import { LiquidityStrategy } from '../StrategySelection'
import { useLBPairPrice } from '../../../../dex/hooks/useLBPairPrice'

interface PoolData {
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
	currentPrice?: number // Current active bin price for the pool
}

export const usePriceRange = (selectedPool: PoolData | null) => {
	// Get current price from LB pair on-chain
	const { currentPrice: chainPrice, loading: priceLoading } = useLBPairPrice(
		selectedPool?.pairAddress,
		selectedPool?.binStep
	)
	
	// Use chain price if available, otherwise fallback to pool data or default
	const activeBinPrice = chainPrice || selectedPool?.currentPrice || 1.0
	
	const [minPrice, setMinPrice] = useState(activeBinPrice.toString())
	const [maxPrice, setMaxPrice] = useState((activeBinPrice * 1.05).toString())
	
	// Update price range when active price changes
	useEffect(() => {
		if (chainPrice) {
			setMinPrice(chainPrice.toString())
			setMaxPrice((chainPrice * 1.05).toString())
		}
	}, [chainPrice])
	
	// Calculate dynamic number of bins and price range based on token amounts and strategy
	const calculateDynamicRange = (
		amount0: string, 
		amount1: string, 
		strategy: LiquidityStrategy
	) => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		// Base range calculation
		let baseRangeMultiplier = 0.05 // 5% default
		
		// Adjust range based on token amounts
		const totalValue = amt0 + amt1
		if (totalValue > 0) {
			baseRangeMultiplier = Math.min(0.2, 0.05 + (totalValue / 1000) * 0.1)
		}
		
		// Strategy-specific adjustments
		let leftMultiplier = 0
		let rightMultiplier = baseRangeMultiplier
		
		if (strategy === 'spot') {
			if (amt0 > 0 && amt1 > 0) {
				const tokenXRatio = amt0 / (amt0 + amt1)
				const tokenYRatio = amt1 / (amt0 + amt1)
				leftMultiplier = baseRangeMultiplier * tokenYRatio * 2
				rightMultiplier = baseRangeMultiplier * tokenXRatio * 2
			} else if (amt0 > 0) {
				leftMultiplier = baseRangeMultiplier * 0.1
				rightMultiplier = baseRangeMultiplier * 2
			} else if (amt1 > 0) {
				leftMultiplier = baseRangeMultiplier * 2
				rightMultiplier = baseRangeMultiplier * 0.1
			}
		} else if (strategy === 'curve') {
			const concentrationFactor = 0.3
			if (amt0 > 0 && amt1 > 0) {
				leftMultiplier = baseRangeMultiplier * concentrationFactor
				rightMultiplier = baseRangeMultiplier * concentrationFactor
			} else if (amt0 > 0) {
				leftMultiplier = baseRangeMultiplier * concentrationFactor * 0.5
				rightMultiplier = baseRangeMultiplier * concentrationFactor * 1.5
			} else if (amt1 > 0) {
				leftMultiplier = baseRangeMultiplier * concentrationFactor * 1.5
				rightMultiplier = baseRangeMultiplier * concentrationFactor * 0.5
			}
		} else if (strategy === 'bid-ask') {
			const spreadFactor = 1.5
			if (amt0 > 0 && amt1 > 0) {
				leftMultiplier = baseRangeMultiplier * spreadFactor
				rightMultiplier = baseRangeMultiplier * spreadFactor
			} else if (amt0 > 0) {
				leftMultiplier = baseRangeMultiplier * 0.2
				rightMultiplier = baseRangeMultiplier * spreadFactor * 2
			} else if (amt1 > 0) {
				leftMultiplier = baseRangeMultiplier * spreadFactor * 2
				rightMultiplier = baseRangeMultiplier * 0.2
			}
		}
		
		return {
			minPrice: activeBinPrice * (1 - leftMultiplier),
			maxPrice: activeBinPrice * (1 + rightMultiplier),
			leftMultiplier,
			rightMultiplier
		}
	}

	// Calculate dynamic number of bins based on price range and bin step
	const getNumBins = (amount0: string, amount1: string) => {
		const binStep = selectedPool?.binStep || 50
		const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange(amount0, amount1, 'spot')
		
		const minPriceNum = parseFloat(minPrice) || dynMinPrice
		const maxPriceNum = parseFloat(maxPrice) || dynMaxPrice

		const binStepFactor = 1 + binStep / 10000
		const baseBinPrice = activeBinPrice

		const minBinId = Math.floor(Math.log(minPriceNum / baseBinPrice) / Math.log(binStepFactor))
		const maxBinId = Math.ceil(Math.log(maxPriceNum / baseBinPrice) / Math.log(binStepFactor))

		const totalBins = Math.abs(maxBinId - minBinId) + 1
		return Math.min(149, Math.max(1, totalBins)).toString()
	}

	const resetPriceRange = () => {
		setMinPrice(activeBinPrice.toString())
		setMaxPrice((activeBinPrice * 1.05).toString())
	}

	const getCurrentPrice = () => {
		// Use chain price if available, otherwise check pool data
		const currentPrice = chainPrice || selectedPool?.currentPrice
		
		if (!currentPrice) {
			return priceLoading ? 'Loading...' : '0.0000'
		}
		
		// Format price with appropriate decimal places based on price magnitude
		if (currentPrice >= 1) {
			return currentPrice.toFixed(4) // 4 decimal places for prices >= 1
		} else if (currentPrice >= 0.01) {
			return currentPrice.toFixed(6) // 6 decimal places for prices >= 0.01
		} else if (currentPrice >= 0.0001) {
			return currentPrice.toFixed(8) // 8 decimal places for small prices
		} else {
			return currentPrice.toExponential(4) // Scientific notation for very small prices
		}
	}

	const getTokenPairDisplay = () => {
		if (!selectedPool) return 'TOKEN/TOKEN'
		return `${selectedPool.token1}/${selectedPool.token0}`
	}

	return {
		activeBinPrice,
		minPrice,
		maxPrice,
		setMinPrice,
		setMaxPrice,
		calculateDynamicRange,
		getNumBins,
		resetPriceRange,
		getCurrentPrice,
		getTokenPairDisplay,
		priceLoading, // Include loading state for price fetching
		chainPrice, // Include raw chain price for debugging
	}
}
