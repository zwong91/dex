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
	
	// 🎯 添加用户手动编辑标志，防止自动覆盖用户输入
	const [userHasManuallyEdited, setUserHasManuallyEdited] = useState(false)
	
	// 🎯 当池子改变时重置手动编辑标志
	useEffect(() => {
		setUserHasManuallyEdited(false)
	}, [selectedPool?.id])
	
	// 🎯 只有当我们有真实价格时才初始化范围，避免使用1.0的fallback值
	const shouldInitialize = chainPrice || selectedPool?.currentPrice
	const getInitialPriceRange = (currentPrice: number, binStep?: number) => {
		const bs = binStep || 25 // 默认25基点(0.25%)
		const binStepDecimal = bs / 10000
		
		// 使用你的数学公式：约70个bin的合理范围 (两边各35个)
		// 这将产生约8.5-17%的价格范围，取决于binStep
		const binsOnEachSide = 35 // 使用35个bin，与你的要求一致（总共70个bin）
		
		// 使用Liquidity Book公式：P = P0 * (1 + binStep/10000)^n
		const minP = currentPrice * Math.pow(1 + binStepDecimal, -binsOnEachSide)
		const maxP = currentPrice * Math.pow(1 + binStepDecimal, binsOnEachSide)
		
		// 计算实际的价格范围百分比用于验证
		const minPercent = ((minP / currentPrice - 1) * 100).toFixed(1)
		const maxPercent = ((maxP / currentPrice - 1) * 100).toFixed(1)
		const totalRangePercent = ((maxP / minP - 1) * 100).toFixed(1)
		
		console.log(`🎯 Liquidity Book Price Range Calculation:`, {
			binStep: bs + ' basis points (' + (bs / 100).toFixed(2) + '%)',
			binStepDecimal: (binStepDecimal * 100).toFixed(4) + '%',
			binsOnEachSide,
			totalBins: binsOnEachSide * 2,
			currentPrice: currentPrice.toFixed(6),
			minPrice: minP.toFixed(6),
			maxPrice: maxP.toFixed(6),
			minPercent: minPercent + '%',
			maxPercent: maxPercent + '%',
			totalRangePercent: totalRangePercent + '%',
			// 验证计算
			expectedRange100bp: '~22% for 100bp pool',
			expectedRange25bp: '~17% for 25bp pool (70 bins)',
			actualFormula: 'P = P0 * (1 + binStep/10000)^±35'
		})
		
		return { minP, maxP }
	}
	
	// 🎯 使用真实价格初始化，如果没有真实价格则使用合理的默认值
	const initialRange = shouldInitialize 
		? getInitialPriceRange(activeBinPrice, selectedPool?.binStep)
		: { minP: 0, maxP: 0 } // 暂时使用0，等待真实价格
	
	const [minPrice, setMinPrice] = useState(shouldInitialize ? initialRange.minP.toString() : '')
	const [maxPrice, setMaxPrice] = useState(shouldInitialize ? initialRange.maxP.toString() : '')
	
	// Update price range when active price changes or when we get the first real price
	useEffect(() => {
		const realPrice = chainPrice || selectedPool?.currentPrice
		if (realPrice && !userHasManuallyEdited) {
			const newRange = getInitialPriceRange(realPrice, selectedPool?.binStep)
			// 只在初始化时更新，不依赖当前的minPrice/maxPrice值
			setMinPrice(newRange.minP.toString())
			setMaxPrice(newRange.maxP.toString())
			console.log('🎯 Price range initialized with real price:', {
				realPrice: realPrice.toFixed(6),
				newMinPrice: newRange.minP.toFixed(6),
				newMaxPrice: newRange.maxP.toFixed(6),
				userHasManuallyEdited: userHasManuallyEdited
			})
		}
	}, [chainPrice, selectedPool?.binStep, selectedPool?.currentPrice, userHasManuallyEdited])
	// 🎯 移除minPrice, maxPrice的依赖，防止手动编辑后触发重新计算
	
	// Calculate dynamic number of bins and price range based on token amounts and strategy
	const calculateDynamicRange = (
		amount0: string, 
		amount1: string, 
		strategy: LiquidityStrategy
	) => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		// 🎯 使用与getInitialPriceRange相同的Liquidity Book逻辑，而不是百分比逻辑
		const bs = selectedPool?.binStep || 25 // 默认25基点(0.25%)
		const binStepDecimal = bs / 10000
		
		// 基础70 bins (左右各35个)，根据策略和代币数量调整
		let binsOnEachSide = 35 // 默认35个bin每边
		
		// 根据策略调整bin数量
		if (strategy === 'curve') {
			// 曲线策略：更集中的流动性，减少bins
			binsOnEachSide = 25 // 总共50个bins
		} else if (strategy === 'bid-ask') {
			// 买卖价差策略：更广的范围，增加bins
			binsOnEachSide = 50 // 总共100个bins
		}
		// spot策略保持默认35个bins
		
		// 根据代币分布调整范围
		let leftBins = binsOnEachSide
		let rightBins = binsOnEachSide
		
		if (amt0 > 0 && amt1 > 0) {
			// 双代币：保持对称
		} else if (amt0 > 0) {
			// 只有token0：更多bins在左边 (价格下降方向)
			leftBins = Math.floor(binsOnEachSide * 0.3)
			rightBins = Math.floor(binsOnEachSide * 1.7)
		} else if (amt1 > 0) {
			// 只有token1：更多bins在右边 (价格上升方向)
			leftBins = Math.floor(binsOnEachSide * 1.7)
			rightBins = Math.floor(binsOnEachSide * 0.3)
		}
		
		// 使用Liquidity Book公式计算价格范围
		const minPrice = activeBinPrice * Math.pow(1 + binStepDecimal, -leftBins)
		const maxPrice = activeBinPrice * Math.pow(1 + binStepDecimal, rightBins)
		
		// 计算multiplier用于兼容性 (虽然不再使用)
		const leftMultiplier = 1 - (minPrice / activeBinPrice)
		const rightMultiplier = (maxPrice / activeBinPrice) - 1
		
		console.log('🎯 calculateDynamicRange using Liquidity Book logic:', {
			strategy,
			binStep: bs + 'bp',
			amt0, amt1,
			leftBins, rightBins,
			totalBins: leftBins + rightBins,
			activeBinPrice: activeBinPrice.toFixed(6),
			minPrice: minPrice.toFixed(6),
			maxPrice: maxPrice.toFixed(6),
			minPercent: ((minPrice / activeBinPrice - 1) * 100).toFixed(2) + '%',
			maxPercent: ((maxPrice / activeBinPrice - 1) * 100).toFixed(2) + '%'
		})
		
		return {
			minPrice,
			maxPrice,
			leftMultiplier,
			rightMultiplier
		}
	}

	// Calculate dynamic number of bins based on price range and bin step
	const getNumBins = (_amount0: string, _amount1: string) => {
		// 🎯 强制返回70 bins，与你的要求一致（左右各35个bin）
		return '70'
	}

	const resetPriceRange = () => {
		const resetRange = getInitialPriceRange(activeBinPrice, selectedPool?.binStep)
		setMinPrice(resetRange.minP.toString())
		setMaxPrice(resetRange.maxP.toString())
		// 重置时清除手动编辑标志
		setUserHasManuallyEdited(false)
	}

	// 🎯 手动设置价格的函数，标记用户已编辑
	const setMinPriceManually = (price: string) => {
		const newMinPrice = parseFloat(price)
		if (!isNaN(newMinPrice) && newMinPrice > 0) {
			setMinPrice(price)
			
			// 🚨 判断流动性类型：如果MinPrice > CurrentPrice，这是左侧流动性  
			if (newMinPrice > activeBinPrice) {
				// 左侧流动性：用户设置的MinPrice保持不变，MaxPrice自动设为用户输入的值
				// 实际上，在这种情况下，用户想要的是 [currentPrice, userInput] 的范围
				// 所以 MinPrice = currentPrice, MaxPrice = userInput
				const userInputPrice = newMinPrice
				setMinPrice(activeBinPrice.toString()) // MinPrice = 当前价格
				setMaxPrice(userInputPrice.toString()) // MaxPrice = 用户输入值
				console.log('🎯 Left-sided liquidity detected (User input > CurrentPrice):', {
					minPrice: activeBinPrice.toFixed(6) + ' (CurrentPrice)',
					maxPrice: userInputPrice.toFixed(6) + ' (User input)',
					currentPrice: activeBinPrice.toFixed(6),
					type: 'USDT only (left-sided)',
					liquidityRange: `${activeBinPrice.toFixed(6)} → ${userInputPrice.toFixed(6)}`
				})
			} else {
				// 对称流动性：保持70 bins范围
				const bs = selectedPool?.binStep || 25
				const binStepDecimal = bs / 10000
				const binsOnEachSide = 35
				
				const impliedCurrentPrice = newMinPrice / Math.pow(1 + binStepDecimal, -binsOnEachSide)
				const newMaxPrice = impliedCurrentPrice * Math.pow(1 + binStepDecimal, binsOnEachSide)
				
				setMaxPrice(newMaxPrice.toString())
				console.log('🎯 Symmetric liquidity (MinPrice < CurrentPrice):', {
					newMinPrice: newMinPrice.toFixed(6),
					impliedCurrentPrice: impliedCurrentPrice.toFixed(6),
					newMaxPrice: newMaxPrice.toFixed(6),
					totalRange: ((newMaxPrice / newMinPrice - 1) * 100).toFixed(2) + '%',
					type: 'Both tokens (symmetric)'
				})
			}
			
			setUserHasManuallyEdited(true)
		}
	}

	const setMaxPriceManually = (price: string) => {
		const newMaxPrice = parseFloat(price)
		if (!isNaN(newMaxPrice) && newMaxPrice > 0) {
			setMaxPrice(price)
			
			// 🚨 判断流动性类型：如果MaxPrice < CurrentPrice，这是右侧流动性
			if (newMaxPrice < activeBinPrice) {
				// 右侧流动性：用户设置的MaxPrice保持不变，MinPrice自动设为用户输入的值
				// 实际上，在这种情况下，用户想要的是 [userInput, currentPrice] 的范围
				// 所以 MinPrice = userInput, MaxPrice = currentPrice
				const userInputPrice = newMaxPrice
				setMinPrice(userInputPrice.toString()) // MinPrice = 用户输入值
				setMaxPrice(activeBinPrice.toString()) // MaxPrice = 当前价格
				console.log('🎯 Right-sided liquidity detected (User input < CurrentPrice):', {
					minPrice: userInputPrice.toFixed(6) + ' (User input)',
					maxPrice: activeBinPrice.toFixed(6) + ' (CurrentPrice)', 
					currentPrice: activeBinPrice.toFixed(6),
					type: 'Token X only (right-sided)',
					liquidityRange: `${userInputPrice.toFixed(6)} → ${activeBinPrice.toFixed(6)}`
				})
			} else {
				// 对称流动性：保持70 bins范围
				const bs = selectedPool?.binStep || 25
				const binStepDecimal = bs / 10000
				const binsOnEachSide = 35
				
				const impliedCurrentPrice = newMaxPrice / Math.pow(1 + binStepDecimal, binsOnEachSide)
				const newMinPrice = impliedCurrentPrice * Math.pow(1 + binStepDecimal, -binsOnEachSide)
				
				setMinPrice(newMinPrice.toString())
				console.log('🎯 Symmetric liquidity (MaxPrice > CurrentPrice):', {
					newMinPrice: newMinPrice.toFixed(6),
					impliedCurrentPrice: impliedCurrentPrice.toFixed(6),
					newMaxPrice: newMaxPrice.toFixed(6),
					totalRange: ((newMaxPrice / newMinPrice - 1) * 100).toFixed(2) + '%',
					type: 'Both tokens (symmetric)'
				})
			}
			
			setUserHasManuallyEdited(true)
		}
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

	// 🎯 专门用于拖动操作的价格设置函数，不会触发手动编辑标志
	const setPricesFromDrag = (newMinPrice: string, newMaxPrice: string) => {
		setMinPrice(newMinPrice)
		setMaxPrice(newMaxPrice)
		// 注意：这里不设置 userHasManuallyEdited = true
		console.log('🎯 Prices updated from drag operation:', {
			newMinPrice,
			newMaxPrice,
			userHasManuallyEdited: false // 拖动不算手动编辑
		})
	}

	return {
		activeBinPrice,
		minPrice,
		maxPrice,
		setMinPrice: setMinPriceManually,
		setMaxPrice: setMaxPriceManually,
		setPricesFromDrag, // 🎯 新增：专用于拖动的价格设置
		calculateDynamicRange,
		getNumBins,
		resetPriceRange,
		getCurrentPrice,
		getTokenPairDisplay,
		priceLoading, // Include loading state for price fetching
		chainPrice, // Include raw chain price for debugging
		userHasManuallyEdited, // Export the manual edit flag for debugging
	}
}
