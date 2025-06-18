import { Box, Typography } from '@mui/material'
import { LiquidityStrategy } from './StrategySelection'

interface PriceRangeVisualizerProps {
	activeBinPrice: number
	minPrice: string
	maxPrice: string
	amount0: string
	amount1: string
	strategy: LiquidityStrategy
	selectedPool: {
		token0: string
		token1: string
		binStep?: number
	} | null
	getNumBins: () => string
	calculateDynamicRange: () => {
		minPrice: number
		maxPrice: number
		leftMultiplier: number
		rightMultiplier: number
	}
}

const PriceRangeVisualizer = ({
	activeBinPrice,
	minPrice,
	maxPrice,
	amount0,
	amount1,
	strategy,
	selectedPool,
	getNumBins,
	calculateDynamicRange,
}: PriceRangeVisualizerProps) => {
	const getCurrentPrice = () => {
		return activeBinPrice.toFixed(8)
	}

	const renderLiquidityBars = () => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		if (amt0 === 0 && amt1 === 0) {
			return (
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100%',
						color: 'rgba(255, 255, 255, 0.5)',
						fontSize: '14px',
						fontStyle: 'italic'
					}}
				>
					Enter token amounts to see liquidity distribution
				</Box>
			)
		}

		return Array.from({ length: Math.min(149, parseInt(getNumBins())) }, (_, i) => {
			const binStep = selectedPool?.binStep || 50
			const binStepFactor = 1 + binStep / 10000
			const baseBinPrice = activeBinPrice

			const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
			const minPriceRange = parseFloat(minPrice) || dynMinPrice
			const maxPriceRange = parseFloat(maxPrice) || dynMaxPrice

			const minBinId = Math.floor(Math.log(minPriceRange / baseBinPrice) / Math.log(binStepFactor))
			const currentBinId = minBinId + i
			const binPrice = baseBinPrice * Math.pow(binStepFactor, currentBinId)

			const position = (binPrice - minPriceRange) / (maxPriceRange - minPriceRange)
			const centerPosition = (activeBinPrice - minPriceRange) / (maxPriceRange - minPriceRange)
			const distance = Math.abs(position - centerPosition)

			const isInRange = binPrice >= minPriceRange && binPrice <= maxPriceRange
			const isCurrentPrice = Math.abs(binPrice - activeBinPrice) < (activeBinPrice * 0.001)

			let shouldShowBar = false
			if (isCurrentPrice && (amt0 > 0 || amt1 > 0)) {
				shouldShowBar = true
			} else if (binPrice < activeBinPrice && amt1 > 0) {
				shouldShowBar = true
			} else if (binPrice > activeBinPrice && amt0 > 0) {
				shouldShowBar = true
			}

			if (!shouldShowBar) {
				return (
					<Box
						key={i}
						sx={{
							width: 8,
							height: 30,
							background: 'rgba(255, 255, 255, 0.05)',
							borderRadius: '3px 3px 0 0',
							opacity: 0.3
						}}
					/>
				)
			}

			// Calculate height based on strategy
			let height = 30

			if (strategy === 'spot') {
				const baseHeight = 80
				let tokenInfluence = 1
				
				if (isCurrentPrice) {
					tokenInfluence = 1 + Math.log(1 + (amt0 + amt1)) * 0.8
				} else if (binPrice < activeBinPrice && amt1 > 0) {
					const distanceFromActive = Math.abs(position - centerPosition)
					const sawtoothDecay = Math.max(0.1, 1 - (distanceFromActive * 3))
					tokenInfluence = (1 + Math.log(1 + amt1) * 0.8) * sawtoothDecay
				} else if (binPrice > activeBinPrice && amt0 > 0) {
					const distanceFromActive = Math.abs(position - centerPosition)
					const sawtoothDecay = Math.max(0.1, 1 - (distanceFromActive * 3))
					tokenInfluence = (1 + Math.log(1 + amt0) * 0.8) * sawtoothDecay
				}
				
				height = baseHeight * tokenInfluence
			} else if (strategy === 'curve') {
				const bellCurve = Math.exp(-Math.pow(distance * 4, 2))
				let tokenMultiplier = 1
				
				if (isCurrentPrice) {
					tokenMultiplier = 1 + Math.log(1 + (amt0 + amt1)) * 0.8
				} else if (binPrice < activeBinPrice && amt1 > 0) {
					const curveDecay = Math.exp(-distance * 2.5)
					tokenMultiplier = (1 + Math.log(1 + amt1) * 0.6) * curveDecay
				} else if (binPrice > activeBinPrice && amt0 > 0) {
					const curveDecay = Math.exp(-distance * 2.5)
					tokenMultiplier = (1 + Math.log(1 + amt0) * 0.6) * curveDecay
				}
				
				height = (40 + bellCurve * 200) * tokenMultiplier
			} else if (strategy === 'bid-ask') {
				let peakHeight = 0
				
				if (isCurrentPrice) {
					peakHeight = 0.3 + Math.log(1 + (amt0 + amt1)) * 0.1
				} else if (binPrice < activeBinPrice && amt1 > 0) {
					const distanceFromPeak = Math.abs(position - 0.15)
					const sawtoothPattern = Math.max(0.05, 1 - (distanceFromPeak * 4))
					peakHeight = sawtoothPattern * (1 + Math.log(1 + amt1) * 0.6)
				} else if (binPrice > activeBinPrice && amt0 > 0) {
					const distanceFromPeak = Math.abs(position - 0.85)
					const sawtoothPattern = Math.max(0.05, 1 - (distanceFromPeak * 4))
					peakHeight = sawtoothPattern * (1 + Math.log(1 + amt0) * 0.6)
				}
				
				height = 30 + peakHeight * 250
			}

			// Color determination
			let barColor = 'rgba(255, 255, 255, 0.1)'
			let shadowColor = 'rgba(0, 0, 0, 0.3)'
			let glowEffect = 'none'

			if (isCurrentPrice) {
				if (amt0 > 0 && amt1 > 0) {
					barColor = 'linear-gradient(to bottom, #7B68EE 50%, #00D9FF 50%)'
				} else if (amt0 > 0) {
					barColor = '#7B68EE'
				} else {
					barColor = '#00D9FF'
				}
				glowEffect = '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
			} else if (isInRange && shouldShowBar) {
				const intensity = Math.min(1, height / 200)
				const depthFactor = 0.7 + (intensity * 0.3)

				if (binPrice < activeBinPrice) {
					const tokenYInfluence = Math.min(1, Math.log(1 + amt1) / 3)
					barColor = `linear-gradient(135deg,
						rgba(0, 217, 255, ${(0.8 * depthFactor * tokenYInfluence)}) 0%,
						rgba(0, 150, 200, ${(0.9 * depthFactor * tokenYInfluence)}) 50%,
						rgba(0, 100, 150, ${(0.7 * depthFactor * tokenYInfluence)}) 100%)`
					shadowColor = 'rgba(0, 217, 255, 0.3)'
					glowEffect = `0 0 10px rgba(0, 217, 255, ${0.4 * intensity * tokenYInfluence})`
				} else {
					const tokenXInfluence = Math.min(1, Math.log(1 + amt0) / 3)
					barColor = `linear-gradient(135deg,
						rgba(123, 104, 238, ${(0.8 * depthFactor * tokenXInfluence)}) 0%,
						rgba(100, 80, 200, ${(0.9 * depthFactor * tokenXInfluence)}) 50%,
						rgba(80, 60, 160, ${(0.7 * depthFactor * tokenXInfluence)}) 100%)`
					shadowColor = 'rgba(123, 104, 238, 0.3)'
					glowEffect = `0 0 10px rgba(123, 104, 238, ${0.4 * intensity * tokenXInfluence})`
				}
			}

			return (
				<Box
					key={i}
					sx={{
						width: 6,
						height: Math.max(30, Math.min(180, height)),
						background: barColor,
						borderRadius: '3px 3px 0 0',
						position: 'relative',
						transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
						opacity: 1,
						transform: `
							perspective(1000px)
							rotateX(${isInRange ? '0deg' : '5deg'})
						`,
						boxShadow: `
							${glowEffect},
							0 2px 8px ${shadowColor},
							inset 0 1px 0 rgba(255, 255, 255, 0.2)
						`,
						'&::after': isInRange ? {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, transparent 30%)',
							borderRadius: '2px 2px 0 0',
						} : {},
					}}
				/>
			)
		})
	}

	return (
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>
			<Box
				sx={{
					position: 'relative',
					height: 200,
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'stretch',
					gap: '1px',
					background: 'linear-gradient(135deg, #1A1B2E 0%, #252749 50%, #1A1B2E 100%)',
					borderRadius: 3,
					p: 1,
					mb: 2,
					mt: 2,
					mx: 1,
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'radial-gradient(ellipse at center bottom, rgba(123, 104, 238, 0.1) 0%, transparent 70%)',
						pointerEvents: 'none',
					},
				}}
			>
				{renderLiquidityBars()}

				{/* Current price indicator line */}
				<Box sx={{
					position: 'absolute',
					left: '50%',
					top: 30,
					bottom: 0,
					width: 2,
					background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
					transform: 'translateX(-50%)',
					zIndex: 3,
					borderRadius: '1px',
					boxShadow: `
						0 0 8px rgba(255, 255, 255, 0.6),
						0 0 16px rgba(255, 255, 255, 0.3),
						0 2px 4px rgba(0, 0, 0, 0.2)
					`,
				}} />

				{/* Current price label */}
				<Box sx={{
					position: 'absolute',
					left: '50%',
					top: 8,
					transform: 'translateX(-50%)',
					background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.9) 100%)',
					color: '#1A1B2E',
					px: 2,
					py: 0.5,
					borderRadius: 1.5,
					fontSize: '11px',
					fontWeight: 600,
					zIndex: 4,
					boxShadow: `
						0 2px 8px rgba(0, 0, 0, 0.2),
						0 1px 4px rgba(0, 0, 0, 0.1),
						inset 0 1px 0 rgba(255, 255, 255, 0.8)
					`,
					border: '1px solid rgba(255, 255, 255, 0.4)',
					backdropFilter: 'blur(4px)',
				}}>
					{getCurrentPrice()}
				</Box>
			</Box>

			{/* Price scale */}
			<Box sx={{
				display: 'flex',
				justifyContent: 'space-between',
				fontSize: '11px',
				color: 'rgba(255, 255, 255, 0.7)',
				mb: 4,
				px: 2,
				py: 1,
				backgroundColor: 'rgba(255, 255, 255, 0.02)',
				borderRadius: 2,
				border: '1px solid rgba(255, 255, 255, 0.05)',
			}}>
				{Array.from({ length: 11 }, (_, i) => {
					const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
					const minRange = parseFloat(minPrice) || dynMinPrice
					const maxRange = parseFloat(maxPrice) || dynMaxPrice
					const totalRange = maxRange - minRange
					const price = minRange + (i * totalRange / 10)
					const isActivePrice = Math.abs(price - activeBinPrice) < (activeBinPrice * 0.01)

					return (
						<Box
							key={i}
							sx={{
								textAlign: 'center',
								transition: 'all 0.3s ease',
								'&:hover': {
									transform: 'translateY(-2px)',
									color: 'white',
								},
							}}
						>
							<Typography
								variant="caption"
								sx={{
									fontSize: '10px',
									fontWeight: isActivePrice ? 700 : 400,
									color: isActivePrice ? '#ffffff' : 
										  price < activeBinPrice ? '#00D9FF' : 
										  price > activeBinPrice ? '#7B68EE' : 'rgba(255, 255, 255, 0.6)',
									transition: 'color 0.3s ease',
								}}
							>
								{price.toFixed(5)}
							</Typography>
						</Box>
					)
				})}
			</Box>
		</Box>
	)
}

export default PriceRangeVisualizer
