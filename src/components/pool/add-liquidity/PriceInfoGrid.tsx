import { Box, Grid, Typography, TextField } from '@mui/material'
import { usePriceToggle } from './contexts/PriceToggleContext'

type LiquidityStrategy = 'spot' | 'curve' | 'bid-ask'

interface PriceInfoGridProps {
	minPrice: string
	maxPrice: string
	activeBinPrice: number
	getNumBins: () => string
	amount0: string
	amount1: string
	strategy: LiquidityStrategy
	selectedPool: {
		token0: string
		token1: string
	} | null
	calculateDynamicRange: () => {
		minPrice: number
		maxPrice: number
		leftMultiplier: number
		rightMultiplier: number
	}
	onMinPriceChange?: (value: string) => void
	onMaxPriceChange?: (value: string) => void
}

const PriceInfoGrid = ({
	minPrice,
	maxPrice,
	activeBinPrice,
	getNumBins,
	amount0,
	amount1,
	strategy,
	selectedPool,
	calculateDynamicRange,
	onMinPriceChange,
	onMaxPriceChange,
}: PriceInfoGridProps) => {
	// 使用全局价格切换状态
	const { isReversed } = usePriceToggle()

	const getMinPriceInfo = () => {
		const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
		
		// 🎯 在反转模式下，我们需要使用 maxPrice 作为显示的 minPrice
		let rawMinPrice, rawMaxPrice
		if (isReversed) {
			// 反转模式：交换min/max并取倒数
			rawMinPrice = 1 / dynMaxPrice  // 原maxPrice变成新minPrice
			rawMaxPrice = 1 / dynMinPrice  // 原minPrice变成新maxPrice
		} else {
			rawMinPrice = dynMinPrice
			rawMaxPrice = dynMaxPrice
		}
		
		// 🎯 优先使用传入的价格，但需要根据反转状态来决定使用哪个
		let displayMinPrice
		if (isReversed) {
			// 反转模式下，显示的MinPrice实际来自原始的maxPrice
			displayMinPrice = maxPrice && maxPrice !== '0' && !isNaN(parseFloat(maxPrice))
				? (1 / parseFloat(maxPrice))  // 原maxPrice取倒数变成新minPrice
				: rawMinPrice
		} else {
			// 正常模式下，显示的MinPrice来自原始的minPrice
			displayMinPrice = minPrice && minPrice !== '0' && !isNaN(parseFloat(minPrice)) 
				? parseFloat(minPrice) 
				: rawMinPrice
		}
		
		let referencePrice = activeBinPrice
		if (isReversed) {
			referencePrice = 1 / referencePrice
		}
		
		console.log('🚨 PriceInfoGrid Min Price Debug:', {
			isReversed: isReversed,
			minPriceString: minPrice,
			maxPriceString: maxPrice,
			dynMinPrice: dynMinPrice,
			dynMaxPrice: dynMaxPrice,
			rawMinPrice: rawMinPrice,
			rawMaxPrice: rawMaxPrice,
			displayMinPrice: displayMinPrice,
			activeBinPrice: activeBinPrice,
			referencePrice: referencePrice
		})
		
		const percentChange = ((displayMinPrice / referencePrice) - 1) * 100
		
		// Min Price 应该总是小于等于 referencePrice，所以百分比应该是负数或0
		const color = percentChange < 0 ? '#f59e0b' : '#10b981' // 负数橙色，正数绿色（不应该出现）
		const formattedPercent = percentChange >= 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`
		
		return {
			value: displayMinPrice.toFixed(6),
			percentage: formattedPercent,
			color,
			isAuto: isReversed 
				? !(maxPrice && maxPrice !== '0' && !isNaN(parseFloat(maxPrice)))
				: !(minPrice && minPrice !== '0' && !isNaN(parseFloat(minPrice)))
		}
	}

	const getMaxPriceInfo = () => {
		const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
		
		// 🎯 在反转模式下，我们需要使用 minPrice 作为显示的 maxPrice
		let rawMinPrice, rawMaxPrice
		if (isReversed) {
			// 反转模式：交换min/max并取倒数
			rawMinPrice = 1 / dynMaxPrice  // 原maxPrice变成新minPrice
			rawMaxPrice = 1 / dynMinPrice  // 原minPrice变成新maxPrice
		} else {
			rawMinPrice = dynMinPrice
			rawMaxPrice = dynMaxPrice
		}
		
		// 🎯 优先使用传入的价格，但需要根据反转状态来决定使用哪个
		let displayMaxPrice
		if (isReversed) {
			// 反转模式下，显示的MaxPrice实际来自原始的minPrice
			displayMaxPrice = minPrice && minPrice !== '0' && !isNaN(parseFloat(minPrice))
				? (1 / parseFloat(minPrice))  // 原minPrice取倒数变成新maxPrice
				: rawMaxPrice
		} else {
			// 正常模式下，显示的MaxPrice来自原始的maxPrice
			displayMaxPrice = maxPrice && maxPrice !== '0' && !isNaN(parseFloat(maxPrice))
				? parseFloat(maxPrice)
				: rawMaxPrice
		}
			
		let referencePrice = activeBinPrice
		if (isReversed) {
			referencePrice = 1 / referencePrice
		}
		
		console.log('🚨 PriceInfoGrid Max Price Debug:', {
			isReversed: isReversed,
			minPriceString: minPrice,
			maxPriceString: maxPrice,
			dynMinPrice: dynMinPrice,
			dynMaxPrice: dynMaxPrice,
			rawMinPrice: rawMinPrice,
			rawMaxPrice: rawMaxPrice,
			displayMaxPrice: displayMaxPrice,
			activeBinPrice: activeBinPrice,
			referencePrice: referencePrice
		})
		
		const percentChange = ((displayMaxPrice / referencePrice) - 1) * 100
		
		// Max Price 应该总是大于等于 referencePrice，所以百分比应该是正数或0
		const color = percentChange > 0 ? '#f97316' : '#10b981' // 正数橙红色，0或负数绿色（不应该出现）
		const formattedPercent = percentChange >= 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`
		
		return {
			value: displayMaxPrice.toFixed(6),
			percentage: formattedPercent,
			color,
			isAuto: isReversed 
				? !(minPrice && minPrice !== '0' && !isNaN(parseFloat(minPrice)))
				: !(maxPrice && maxPrice !== '0' && !isNaN(parseFloat(maxPrice)))
		}
	}

	const getTokenDistributionInfo = () => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		if (amt0 > 0 && amt1 > 0) {
			return `${selectedPool?.token0}: ${((amt0 / (amt0 + amt1)) * 100).toFixed(0)}%`
		} else if (amt0 > 0) {
			return `${selectedPool?.token0} only`
		} else if (amt1 > 0) {
			return `${selectedPool?.token1} only`
		}
		return 'No tokens set'
	}

	const minPriceInfo = getMinPriceInfo()
	const maxPriceInfo = getMaxPriceInfo()

	// Get smart strategy tip based on amounts and strategy
	const getStrategyTip = () => {
		const hasAmount0 = parseFloat(amount0 || '0') > 0
		const hasAmount1 = parseFloat(amount1 || '0') > 0
		
		if (!hasAmount0 && !hasAmount1) return null
		
		switch (strategy) {
			case 'spot':
				if (hasAmount0 && hasAmount1) {
					return {
						text: 'Symmetric range based on both token amounts',
						color: 'rgba(245, 158, 11, 0.8)'
					}
				} else if (hasAmount0) {
					return {
						text: `Range focuses below current price (${selectedPool?.token0} side)`,
						color: 'rgba(245, 158, 11, 0.8)'
					}
				} else {
					return {
						text: `Range focuses above current price (${selectedPool?.token1} side)`,
						color: 'rgba(249, 115, 22, 0.8)'
					}
				}
			case 'curve':
				return {
					text: 'Concentrated liquidity around current price - higher capital efficiency',
					color: 'rgba(249, 115, 22, 0.8)'
				}
			case 'bid-ask':
				if (hasAmount0 && hasAmount1) {
					return {
						text: 'Wide range distribution for volatility capture',
						color: 'rgba(245, 158, 11, 0.8)'
					}
				} else if (hasAmount0) {
					return {
						text: `DCA out strategy - selling ${selectedPool?.token0} as price rises`,
						color: 'rgba(245, 158, 11, 0.8)'
					}
				} else {
					return {
						text: `DCA in strategy - buying ${selectedPool?.token0} as price falls`,
						color: 'rgba(245, 158, 11, 0.8)'
					}
				}
			default:
				return null
		}
	}

	const strategyTip = getStrategyTip()

	return (
		<Box sx={{ mt: 6, mb: 4 }}>
			<Grid container spacing={2} sx={{ mb: 2 }}>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(255, 251, 235, 0.8)', 
					borderRadius: 2,
					border: '1px solid rgba(249, 115, 22, 0.1)'
				}}>
					<Typography variant="body2" color="rgba(120, 113, 108, 0.8)" gutterBottom>
						Min Price
					</Typography>
					<TextField
						value={minPriceInfo.value}
						onChange={(e) => {
							if (onMinPriceChange) {
								onMinPriceChange(e.target.value)
							}
						}}
						size="small"
						sx={{
							'& .MuiInputBase-root': {
								fontSize: '18px',
								fontWeight: 600,
								color: '#7c2d12',
								backgroundColor: 'rgba(255, 255, 255, 0.9)',
								textAlign: 'center',
							},
							'& .MuiInputBase-input': {
								textAlign: 'center',
								padding: '8px 12px',
							},
							'& .MuiOutlinedInput-root': {
								'& fieldset': {
									borderColor: 'rgba(249, 115, 22, 0.3)',
								},
								'&:hover fieldset': {
									borderColor: 'rgba(249, 115, 22, 0.5)',
								},
								'&.Mui-focused fieldset': {
									borderColor: '#f59e0b',
									borderWidth: '2px',
								},
							},
							width: '100%',
							mb: 1,
						}}
						placeholder="Enter min price"
					/>
					<Typography
						variant="body2"
						color={minPriceInfo.color}
						fontWeight={600}
					>
						{minPriceInfo.percentage}
					</Typography>
					{minPriceInfo.isAuto && (
						<Typography variant="caption" color="rgba(245, 158, 11, 0.7)" sx={{ fontSize: '10px' }}>
							Auto-calculated
						</Typography>
					)}
				</Box>
			</Grid>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(254, 243, 199, 0.8)', 
					borderRadius: 2,
					border: '1px solid rgba(249, 115, 22, 0.1)'
				}}>
					<Typography variant="body2" color="rgba(120, 113, 108, 0.8)" gutterBottom>
						Max Price
					</Typography>
					<TextField
						value={maxPriceInfo.value}
						onChange={(e) => {
							if (onMaxPriceChange) {
								onMaxPriceChange(e.target.value)
							}
						}}
						size="small"
						sx={{
							'& .MuiInputBase-root': {
								fontSize: '18px',
								fontWeight: 600,
								color: '#7c2d12',
								backgroundColor: 'rgba(255, 255, 255, 0.9)',
								textAlign: 'center',
							},
							'& .MuiInputBase-input': {
								textAlign: 'center',
								padding: '8px 12px',
							},
							'& .MuiOutlinedInput-root': {
								'& fieldset': {
									borderColor: 'rgba(249, 115, 22, 0.3)',
								},
								'&:hover fieldset': {
									borderColor: 'rgba(249, 115, 22, 0.5)',
								},
								'&.Mui-focused fieldset': {
									borderColor: '#f59e0b',
									borderWidth: '2px',
								},
							},
							width: '100%',
							mb: 1,
						}}
						placeholder="Enter max price"
					/>
					<Typography
						variant="body2"
						color={maxPriceInfo.color}
						fontWeight={600}
					>
						{maxPriceInfo.percentage}
					</Typography>
					{maxPriceInfo.isAuto && (
						<Typography variant="caption" color="rgba(249, 115, 22, 0.7)" sx={{ fontSize: '10px' }}>
							Auto-calculated
						</Typography>
					)}
				</Box>
			</Grid>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(255, 247, 237, 0.9)', 
					borderRadius: 2,
					border: '1px solid rgba(249, 115, 22, 0.1)'
				}}>
					<Typography variant="body2" color="rgba(120, 113, 108, 0.8)" gutterBottom>
						Num Bins
					</Typography>
					<Typography variant="h6" fontWeight={600} color="#7c2d12">
						{getNumBins()}
					</Typography>
					<Typography variant="caption" color="rgba(120, 113, 108, 0.7)" sx={{ mt: 1, display: 'block', fontSize: '11px' }}>
						{getTokenDistributionInfo()}
					</Typography>
				</Box>
			</Grid>
		</Grid>
		
		{/* Strategy Tip */}
		{strategyTip && (
			<Box sx={{ 
				mt: 3, 
				p: 2, 
				backgroundColor: 'rgba(255, 251, 235, 0.6)', 
				borderRadius: 2,
				border: `1px solid ${strategyTip.color}40`
			}}>
				<Typography 
					variant="caption" 
					color={strategyTip.color} 
					sx={{ fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}
				>
					💡 {strategyTip.text}
				</Typography>
			</Box>
		)}
		</Box>
	)
}

export default PriceInfoGrid
