import { useState } from 'react'
import { LiquidityStrategy } from '../StrategySelection'

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
}

export const usePriceRange = (selectedPool: PoolData | null) => {
	const activeBinPrice = 19.05560 // This should come from pool data
	const [minPrice, setMinPrice] = useState(activeBinPrice.toString())
	const [maxPrice, setMaxPrice] = useState((activeBinPrice * 1.05).toString())
	
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
		return activeBinPrice.toFixed(8)
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
	}
}
