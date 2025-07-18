import { Box, Button, Card, Grid, Typography, IconButton } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'
import { getTokenBySymbol } from '../../dex/networkTokens'
import {
	TokenAmountInput,
	StrategySelection,
	PriceRangeVisualizer,
	PriceInfoGrid,
	AddLiquidityButton,
	LiquidityBinsChart,
	usePriceRange,
	useAddLiquidity,
	calculateAutoFillAmount,
	calculatePercentageAmount,
	usePriceToggle,
	type LiquidityStrategy,
} from './add-liquidity'

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

interface AddLiquidityFormProps {
	selectedPool: PoolData | null
	chainId: number
	onSuccess?: () => void
}

// 内部组件，包含所有逻辑
const AddLiquidityForm = ({
	selectedPool,
	chainId: _chainId,
	onSuccess,
}: AddLiquidityFormProps) => {
	// Token amounts state
	const [amount0, setAmount0] = useState('')
	const [amount1, setAmount1] = useState('')
	const [autoFill, setAutoFill] = useState(false)
	const [resetTrigger, setResetTrigger] = useState(0) // 重置触发器

	// Strategy state
	const [liquidityStrategy, setLiquidityStrategy] = useState<LiquidityStrategy>('spot')

	// 🎯 新增：动态bin同步状态，用于LiquidityBinsChart与PriceRangeVisualizer的同步
	const [dynamicBinInfo, setDynamicBinInfo] = useState<{
		binCount: number
		binCalculation: {
			binStep: number
			priceMultiplier: number
			halfRange: number
			totalPriceRangePercent: number
			centerBinOffset: number
		}
	} | null>(null)

	// 🎯 调试：监控dynamicBinInfo状态变化
	useEffect(() => {
		console.log('🚨 AddLiquidityForm - dynamicBinInfo状态变化:', {
			dynamicBinInfo: dynamicBinInfo,
			binCount: dynamicBinInfo?.binCount,
			hasBindCalculation: !!dynamicBinInfo?.binCalculation,
			binCalculation: dynamicBinInfo?.binCalculation,
			时间戳: new Date().toLocaleTimeString()
		})
	}, [dynamicBinInfo])

	// 使用全局价格切换状态
	const { isReversed: isPriceReversed, togglePriceDirection } = usePriceToggle()

	// Price range hook
	const {
		activeBinPrice,
		minPrice,
		maxPrice,
		setMinPrice,
		setMaxPrice,
		setPricesFromDrag, // 🎯 新增：专用于拖动的价格设置
		calculateDynamicRange,
		getNumBins,
		resetPriceRange,
		userHasManuallyEdited,
	} = usePriceRange(selectedPool)

	// Enhanced price display with toggle functionality
	const getToggleablePrice = () => {
		// 直接使用 activeBinPrice 数值，而不是 getCurrentPrice() 字符串
		const price = isPriceReversed ? (1 / activeBinPrice) : activeBinPrice
		
		// Format price with appropriate decimal places
		if (price >= 1) {
			return price.toFixed(4)
		} else if (price >= 0.01) {
			return price.toFixed(6)
		} else if (price >= 0.0001) {
			return price.toFixed(8)
		} else {
			return price.toExponential(4)
		}
	}

	const getToggleableTokenPair = () => {
		if (!selectedPool) return 'TOKEN/TOKEN'
		// 🎯 保持与价格逻辑一致：reversed时显示 token0/token1
		return isPriceReversed ? 
			`${selectedPool.token0}/${selectedPool.token1}` : 
			`${selectedPool.token1}/${selectedPool.token0}`
	}

	// Handle price range changes from visualizer drag
	const handlePriceRangeChange = (newMinPrice: number, newMaxPrice: number, numBins: number) => {
		// 🎯 如果用户正在手动编辑，则忽略visualizer的更新
		if (userHasManuallyEdited) {
			console.log('🚫 Ignoring visualizer update - user is manually editing prices')
			return
		}
		
		setMinPrice(newMinPrice.toString())
		setMaxPrice(newMaxPrice.toString())
		
		// Log the changes for debugging
		if (process.env.NODE_ENV === 'development') {
			console.log('🎯 Price range updated from visualizer:', {
				newMinPrice: newMinPrice.toFixed(6),
				newMaxPrice: newMaxPrice.toFixed(6),
				numBins,
				strategy: liquidityStrategy,
				userHasManuallyEdited: userHasManuallyEdited
			})
		}
	}

	// Handle manual price changes from PriceInfoGrid
	const handleMinPriceChange = (newMinPrice: string) => {
		setMinPrice(newMinPrice)
	}

	const handleMaxPriceChange = (newMaxPrice: string) => {
		setMaxPrice(newMaxPrice)
	}

	// Handle bin range selection from LiquidityBinsChart
	const handleBinRangeChange = (minBinId: number, maxBinId: number, priceRange?: {
		minPrice: number
		maxPrice: number
		binCount: number
		centerOffset: number
		percentageRange: { min: number, max: number }
		// 🎯 新增：接收详细的bin计算信息
		binCalculation?: {
			binStep: number
			priceMultiplier: number
			halfRange: number
			totalPriceRangePercent: number
			centerBinOffset: number
		}
	}) => {
		if (selectedPool && process.env.NODE_ENV === 'development') {
			console.log('🎯 Bin range selected:', {
				minBinId,
				maxBinId,
				poolBinStep: selectedPool.binStep,
				priceRange: priceRange
			})
		}
		
		// 🎯 如果有价格范围信息，更新价格输入
		if (priceRange) {
			console.log('🎯 更新价格范围基于拖动选择:', {
				binCount: priceRange.binCount,
				centerOffset: priceRange.centerOffset.toFixed(2),
				minPrice: priceRange.minPrice.toFixed(6),
				maxPrice: priceRange.maxPrice.toFixed(6),
				percentageRange: `${priceRange.percentageRange.min.toFixed(1)}% to ${priceRange.percentageRange.max.toFixed(1)}%`,
				// 🎯 显示bin计算详情
				binCalculation: priceRange.binCalculation
			})
			
			// 🎯 更新动态bin同步信息，用于PriceRangeVisualizer
			if (priceRange.binCalculation) {
				setDynamicBinInfo({
					binCount: priceRange.binCount,
					binCalculation: priceRange.binCalculation
				})
			}
			
			// 🎯 更新价格输入框 - 使用专门的拖动函数，不会触发手动编辑标志
			setPricesFromDrag(priceRange.minPrice.toString(), priceRange.maxPrice.toString())
		}
	}

	// Add liquidity hook
	const {
		isPending,
		error,
		slippageTolerance,
		tokenXBalance,
		tokenYBalance,
		userWalletAddress,
		handleAddLiquidity,
	} = useAddLiquidity(selectedPool, onSuccess)

	// 🎯 Helper function to get correct decimal places for token
	const getTokenDecimals = (symbol: string): number => {
		if (!selectedPool) return 18
		
		// Use imported function instead of require
		const tokenConfig = getTokenBySymbol(symbol, _chainId)
		
		if (tokenConfig?.decimals) {
			console.log(`🔍 Found decimals for ${symbol}:`, tokenConfig.decimals)
			return tokenConfig.decimals
		}
		
		// Fallback to hardcoded values if not found in config
		if (['USDT', 'USDC'].includes(symbol.toUpperCase())) {
			console.log(`🔍 Using fallback 6 decimals for ${symbol}`)
			return 18
		}
		
		console.log(`🔍 Using default 18 decimals for ${symbol}`)
		return 18
	}

	// 🎯 Helper function to format balance with correct decimals
	const formatTokenBalance = (balance: bigint | undefined, symbol: string): string => {
		if (!balance) return '0'
		const decimals = getTokenDecimals(symbol)
		return ethers.formatUnits(balance, decimals)
	}

	// Auto-fill calculation for amount0 (Token X)
	const handleAmount0Change = (value: string) => {
		console.log('🔢 Amount0 changed:', value)
		setAmount0(value)

		if (autoFill) {
			const calculatedAmount1 = calculateAutoFillAmount(
				value,
				activeBinPrice,
				liquidityStrategy,
				true // token0 to token1
			)
			setAmount1(calculatedAmount1)
		}
	}

	// Auto-fill calculation for amount1 (Token Y)
	const handleAmount1Change = (value: string) => {
		console.log('🔢 Amount1 changed:', value)
		setAmount1(value)

		if (autoFill) {
			const calculatedAmount0 = calculateAutoFillAmount(
				value,
				activeBinPrice,
				liquidityStrategy,
				false // token1 to token0
			)
			setAmount0(calculatedAmount0)
		}
	}

	// Handle percentage buttons for token0
	const handleAmount0Button = (percentage: number) => {
		const balanceStr = formatTokenBalance(tokenXBalance, selectedPool?.token0 || '')
		const amount = calculatePercentageAmount(balanceStr, percentage)
		handleAmount0Change(amount)
	}

	// Handle percentage buttons for token1
	const handleAmount1Button = (percentage: number) => {
		const balanceStr = formatTokenBalance(tokenYBalance, selectedPool?.token1 || '')
		const amount = calculatePercentageAmount(balanceStr, percentage)
		handleAmount1Change(amount)
	}

	// Strategy change handler
	const handleStrategyChange = (newStrategy: LiquidityStrategy) => {
		setLiquidityStrategy(newStrategy)
		console.log('🔄 Strategy changed to:', newStrategy, 'with amounts:', { amount0, amount1 })
	}

	// Handle reset price
	const handleResetPrice = () => {
		resetPriceRange()
		setResetTrigger(prev => prev + 1) // 触发重置
		console.log('🔄 Price range reset to current market price')
	}

	// Handle add liquidity submission
	const handleAddLiquiditySubmit = () => {
		console.log('🖱️ Add Liquidity button clicked!')
		
		// 🎯 传递当前的价格范围参数
		const minPriceNum = parseFloat(minPrice) || undefined
		const maxPriceNum = parseFloat(maxPrice) || undefined
		const binCountNum = dynamicBinInfo?.binCount || parseInt(getNumBinsForComponents()) || undefined
		
		console.log('🎯 传递给handleAddLiquidity的价格参数:', {
			minPrice: minPriceNum,
			maxPrice: maxPriceNum,
			binCount: binCountNum,
			originalStrings: { minPrice, maxPrice },
			dynamicBinInfo: dynamicBinInfo
		})
		
		handleAddLiquidity(amount0, amount1, liquidityStrategy, minPriceNum, maxPriceNum, binCountNum)
	}

	// Create dynamic range calculation function for components
	const getDynamicRange = () => {
		return calculateDynamicRange(amount0, amount1, liquidityStrategy)
	}

	// Create getNumBins function for components
	const getNumBinsForComponents = () => {
		// 🎯 优先使用来自LiquidityBinsChart拖动的动态bin数量
		if (dynamicBinInfo?.binCount) {
			console.log('🎯 getNumBinsForComponents: 使用LiquidityBinsChart动态bin数量:', dynamicBinInfo.binCount)
			return dynamicBinInfo.binCount.toString()
		}
		
		// 如果没有动态bin信息，使用本地计算
		const localBinCount = getNumBins(amount0, amount1)
		console.log('🎯 getNumBinsForComponents: 使用本地计算bin数量:', localBinCount)
		return localBinCount
	}

	return (
		<Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
			{selectedPool ? (
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
					{/* Token Amounts Section */}
					<Card sx={{
						p: 4,
						backgroundColor: 'rgba(255, 251, 235, 0.9)',
						border: 1,
						borderColor: 'rgba(249, 115, 22, 0.1)',
						borderRadius: 3,
					}}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
							<Typography variant="h5" fontWeight={600} sx={{ color: '#7c2d12' }}>
								💰 Token Amounts
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
								<Typography variant="body2" fontWeight={600} color="rgba(120, 113, 108, 0.8)">
									Auto-fill:
								</Typography>
								<Box
									sx={{
										cursor: 'pointer',
										border: 1,
										borderColor: 'rgba(249, 115, 22, 0.3)',
										borderRadius: '24px',
										px: 3,
										py: 1,
										minWidth: '70px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor: autoFill ? '#f97316' : 'transparent',
										transition: 'all 0.3s ease',
										'&:hover': {
											borderColor: 'rgba(249, 115, 22, 0.5)',
											transform: 'translateY(-1px)',
										}
									}}
									onClick={() => setAutoFill(!autoFill)}
								>
									<Typography 
										variant="body2" 
										fontWeight={600} 
										color={autoFill ? 'white' : '#f97316'}
									>
										{autoFill ? 'ON' : 'OFF'}
									</Typography>
								</Box>
							</Box>
						</Box>

						<Grid container spacing={4}>
							<Grid size={6}>
								<TokenAmountInput
									token={{
										symbol: selectedPool.token0,
										icon: selectedPool.icon0,
									}}
									amount={amount0}
									onAmountChange={handleAmount0Change}
									balance={formatTokenBalance(tokenXBalance, selectedPool.token0)}
									onPercentageClick={handleAmount0Button}
								/>
							</Grid>
							<Grid size={6}>
								<TokenAmountInput
									token={{
										symbol: selectedPool.token1,
										icon: selectedPool.icon1,
									}}
									amount={amount1}
									onAmountChange={handleAmount1Change}
									balance={formatTokenBalance(tokenYBalance, selectedPool.token1)}
									onPercentageClick={handleAmount1Button}
								/>
							</Grid>
						</Grid>
					</Card>

					{/* Strategy Selection */}
					<Card sx={{
						p: 4,
						backgroundColor: 'rgba(254, 243, 199, 0.9)',
						border: 1,
						borderColor: 'rgba(249, 115, 22, 0.1)',
						borderRadius: 3,
					}}>
						<Typography variant="h5" fontWeight={600} sx={{ color: '#7c2d12', mb: 3 }}>
							🎯 Strategy Selection
						</Typography>
						<StrategySelection
							strategy={liquidityStrategy}
							onStrategyChange={handleStrategyChange}
						/>
					</Card>

					{/* Price Range Configuration */}
					<Card sx={{
						p: 4,
						backgroundColor: 'rgba(255, 247, 237, 0.9)',
						border: 1,
						borderColor: 'rgba(249, 115, 22, 0.1)',
						borderRadius: 3,
					}}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
							<Typography variant="h5" fontWeight={600} sx={{ color: '#7c2d12' }}>
								📈 Price Configuration
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
								{/* Current Price Display */}
								<Box sx={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: 1.5,
									px: 2.5,
									py: 1.5,
									borderRadius: 2,
									background: 'rgba(245, 158, 11, 0.1)',
									border: 1,
									borderColor: 'rgba(245, 158, 11, 0.3)',
								}}>
									<Box>
										<Typography variant="body2" color="rgba(120, 113, 108, 0.8)" sx={{ fontSize: '0.8rem' }}>
											Current Price:
										</Typography>
										<Typography variant="body1" fontWeight={600} sx={{
											background: 'linear-gradient(135deg, #f59e0b, #f97316)',
											backgroundClip: 'text',
											WebkitBackgroundClip: 'text',
											WebkitTextFillColor: 'transparent',
										}}>
											{getToggleablePrice()} {getToggleableTokenPair()}
										</Typography>
									</Box>
									<IconButton 
										size="small"
										onClick={togglePriceDirection}
										sx={{ 
											color: 'rgba(245, 158, 11, 0.8)',
											'&:hover': {
												color: 'rgba(245, 158, 11, 1)',
												backgroundColor: 'rgba(245, 158, 11, 0.1)',
											}
										}}
									>
										<SwapHorizIcon sx={{ fontSize: 16 }} />
									</IconButton>
								</Box>
								<Button
									onClick={handleResetPrice}
									size="medium"
									sx={{
										color: 'rgba(120, 113, 108, 0.8)',
										borderColor: 'rgba(249, 115, 22, 0.3)',
										borderRadius: '24px',
										px: 3,
										py: 1.5,
										fontSize: '0.875rem',
										fontWeight: 500,
										transition: 'all 0.3s ease',
										'&:hover': {
											backgroundColor: 'rgba(249, 115, 22, 0.08)',
											borderColor: 'rgba(249, 115, 22, 0.4)',
											transform: 'translateY(-1px)',
										},
									}}
									variant="outlined"
								>
									🔄 Reset
								</Button>
							</Box>
						</Box>

						<Box sx={{
							p: 3,
							backgroundColor: 'rgba(255, 255, 255, 0.02)',
							border: 1,
							borderColor: 'rgba(255, 255, 255, 0.05)',
							borderRadius: 2,
						}}>
							{/* Price Range Visualizer */}
							<Box sx={{ mb: 4 }}>
								<PriceRangeVisualizer
									activeBinPrice={activeBinPrice}
									amount0={amount0}
									amount1={amount1}
									strategy={liquidityStrategy}
									binStep={selectedPool?.binStep}
									onPriceRangeChange={handlePriceRangeChange}
									resetTrigger={resetTrigger}
									minPrice={parseFloat(minPrice) || undefined}
									maxPrice={parseFloat(maxPrice) || undefined}
									// 🎯 传递动态bin同步信息
									dynamicBinCount={dynamicBinInfo?.binCount}
									binCalculation={dynamicBinInfo?.binCalculation}
								/>
							</Box>

							{/* Liquidity Bins Chart */}
							{selectedPool?.pairAddress && (
								<>
									{console.log('🚨 Passing to LiquidityBinsChart:', {
										minPriceString: minPrice,
										maxPriceString: maxPrice,
										minPriceParsed: parseFloat(minPrice),
										maxPriceParsed: parseFloat(maxPrice),
										activeBinPrice: activeBinPrice,
										binStep: selectedPool.binStep
									})}
									<LiquidityBinsChart
										poolAddress={selectedPool.pairAddress}
										chainId="bsc"
										onBinRangeChange={handleBinRangeChange}
										minPrice={parseFloat(minPrice) || undefined}
										maxPrice={parseFloat(maxPrice) || undefined}
										currentPrice={activeBinPrice}
										binStep={selectedPool.binStep}
									/>
								</>
							)}

							{/* Price Information Grid */}
							<PriceInfoGrid
								minPrice={minPrice}
								maxPrice={maxPrice}
								activeBinPrice={activeBinPrice}
								getNumBins={getNumBinsForComponents}
								amount0={amount0}
								amount1={amount1}
								strategy={liquidityStrategy}
								selectedPool={selectedPool}
								calculateDynamicRange={getDynamicRange}
								onMinPriceChange={handleMinPriceChange}
								onMaxPriceChange={handleMaxPriceChange}
							/>
						</Box>
					</Card>

					{/* Add Liquidity Button */}
					<Box sx={{ mt: 2 }}>
						<AddLiquidityButton
							amount0={amount0}
							amount1={amount1}
							isPending={isPending}
							userWalletAddress={userWalletAddress}
							error={error}
							slippageTolerance={slippageTolerance}
							onAddLiquidity={handleAddLiquiditySubmit}
							// 验证相关参数
							tokenXBalance={tokenXBalance}
							tokenYBalance={tokenYBalance}
							activeBinPrice={activeBinPrice}
							minPrice={minPrice}
							maxPrice={maxPrice}
							strategy={liquidityStrategy}
							binStep={selectedPool?.binStep}
							selectedPool={selectedPool}
						/>
					</Box>
				</Box>
			) : (
				<Box sx={{ 
					display: 'flex', 
					alignItems: 'center', 
					justifyContent: 'center', 
					minHeight: 400,
					backgroundColor: 'rgba(255, 251, 235, 0.6)',
					borderRadius: 3,
					border: 1,
					borderColor: 'rgba(249, 115, 22, 0.2)',
				}}>
					<Typography variant="h6" color="rgba(120, 113, 108, 0.8)">
						💡 Select a pool to provide liquidity
					</Typography>
				</Box>
			)}
		</Box>
	)
}

export default AddLiquidityForm
