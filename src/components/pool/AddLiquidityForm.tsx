import { Box, Button, Card, Grid, Typography } from '@mui/material'
import { useState } from 'react'
import {
	TokenAmountInput,
	StrategySelection,
	PriceRangeVisualizer,
	PriceRangeSlider,
	PriceInfoGrid,
	AddLiquidityButton,
	usePriceRange,
	useAddLiquidity,
	calculateAutoFillAmount,
	calculatePercentageAmount,
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

const AddLiquidityForm = ({
	selectedPool,
	chainId: _chainId,
	onSuccess,
}: AddLiquidityFormProps) => {
	// Token amounts state
	const [amount0, setAmount0] = useState('')
	const [amount1, setAmount1] = useState('')
	const [autoFill, setAutoFill] = useState(false)

	// Strategy state
	const [liquidityStrategy, setLiquidityStrategy] = useState<LiquidityStrategy>('spot')

	// Price range hook
	const {
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
	} = usePriceRange(selectedPool)

	// Add liquidity hook
	const {
		isPending,
		isSuccess,
		error,
		slippageTolerance,
		tokenXBalance,
		tokenYBalance,
		userWalletAddress,
		handleAddLiquidity,
	} = useAddLiquidity(selectedPool, onSuccess)

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
		const amount = calculatePercentageAmount(tokenXBalance?.toString() || '0', percentage)
		handleAmount0Change(amount)
	}

	// Handle percentage buttons for token1
	const handleAmount1Button = (percentage: number) => {
		const amount = calculatePercentageAmount(tokenYBalance?.toString() || '0', percentage)
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
		console.log('🔄 Price range reset to current market price')
	}

	// Handle add liquidity submission
	const handleAddLiquiditySubmit = () => {
		console.log('🖱️ Add Liquidity button clicked!')
		handleAddLiquidity(amount0, amount1, liquidityStrategy)
	}

	// Create dynamic range calculation function for components
	const getDynamicRange = () => {
		return calculateDynamicRange(amount0, amount1, liquidityStrategy)
	}

	// Create getNumBins function for components
	const getNumBinsForComponents = () => {
		return getNumBins(amount0, amount1)
	}

	return (
		<Box>
			{selectedPool ? (
				<Box>
					{/* Token Amounts Section */}
					<Box sx={{ mb: 4 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
							<Typography variant="h6" fontWeight={600}>
								Enter deposit amount:
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
								<Typography variant="body2" fontWeight={600} color="rgba(255, 255, 255, 0.9)">
									Auto-fill:
								</Typography>
								<Box
									sx={{
										cursor: 'pointer',
										border: 1,
										borderColor: 'rgba(255, 255, 255, 0.3)',
										borderRadius: '20px',
										px: 2,
										py: 0.5,
										minWidth: '60px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor: autoFill ? '#4caf50' : 'transparent',
										transition: 'all 0.2s ease',
										'&:hover': {
											borderColor: 'rgba(255, 255, 255, 0.5)',
										}
									}}
									onClick={() => setAutoFill(!autoFill)}
								>
									<Typography 
										variant="caption" 
										fontWeight={600} 
										color={autoFill ? 'white' : '#4caf50'}
										sx={{ fontSize: '0.75rem' }}
									>
										{autoFill ? 'ON' : 'OFF'}
									</Typography>
								</Box>
							</Box>
						</Box>

						<Grid container spacing={3}>
							<Grid size={6}>
								<TokenAmountInput
									token={{
										symbol: selectedPool.token0,
										icon: selectedPool.icon0,
									}}
									amount={amount0}
									onAmountChange={handleAmount0Change}
									balance={tokenXBalance?.toString() || '0'}
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
									balance={tokenYBalance?.toString() || '0'}
									onPercentageClick={handleAmount1Button}
								/>
							</Grid>
						</Grid>
					</Box>

					{/* Strategy Selection */}
					<StrategySelection
						strategy={liquidityStrategy}
						onStrategyChange={handleStrategyChange}
					/>

					{/* Price Range Configuration */}
					<Box sx={{ mb: 4 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
							<Typography variant="h6" fontWeight={600}>
								Set Price Range
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
								{/* Current Price Display - Inline */}
								<Box sx={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: 1,
									px: 2,
									py: 1,
									borderRadius: 2,
									background: 'rgba(255, 255, 255, 0.05)',
									border: 1,
									borderColor: 'rgba(255, 255, 255, 0.1)',
								}}>
									<Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
										📊
									</Typography>
									<Typography variant="body1" fontWeight={600} sx={{
										background: 'linear-gradient(135deg, #4CAF50, #2196F3)',
										backgroundClip: 'text',
										WebkitBackgroundClip: 'text',
										WebkitTextFillColor: 'transparent',
									}}>
										{getCurrentPrice()} {getTokenPairDisplay()}
									</Typography>
								</Box>
								<Button
									onClick={handleResetPrice}
									size="small"
									sx={{
										color: 'rgba(255, 255, 255, 0.8)',
										borderColor: 'rgba(255, 255, 255, 0.3)',
										borderRadius: '20px',
										px: 2,
										py: 0.5,
										fontSize: '0.875rem',
										fontWeight: 500,
										'&:hover': {
											backgroundColor: 'rgba(255, 255, 255, 0.15)',
											borderColor: 'rgba(255, 255, 255, 0.4)',
										},
									}}
									variant="outlined"
								>
									Reset Price
								</Button>
							</Box>
						</Box>

						<Card
							sx={{
								p: 2,
								backgroundColor: '#2A2D3E',
								border: 1,
								borderColor: 'rgba(255, 255, 255, 0.1)',
								borderRadius: 3,
							}}
						>
							{/* Price Range Visualizer */}
							<PriceRangeVisualizer
								activeBinPrice={activeBinPrice}
								minPrice={minPrice}
								maxPrice={maxPrice}
								amount0={amount0}
								amount1={amount1}
								strategy={liquidityStrategy}
								autoFill={autoFill}
								selectedPool={selectedPool}
								getNumBins={getNumBinsForComponents}
								calculateDynamicRange={getDynamicRange}
							/>

							{/* Price Range Slider */}
							<PriceRangeSlider
								minPrice={minPrice}
								maxPrice={maxPrice}
								activeBinPrice={activeBinPrice}
								onMinPriceChange={setMinPrice}
								onMaxPriceChange={setMaxPrice}
							/>

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
							/>
						</Card>
					</Box>

					{/* Add Liquidity Button */}
					<AddLiquidityButton
						amount0={amount0}
						amount1={amount1}
						isPending={isPending}
						userWalletAddress={userWalletAddress}
						isSuccess={isSuccess}
						error={error}
						slippageTolerance={slippageTolerance}
						onAddLiquidity={handleAddLiquiditySubmit}
					/>
				</Box>
			) : (
				<Typography>Select a pool to add liquidity</Typography>
			)}
		</Box>
	)
}

export default AddLiquidityForm
