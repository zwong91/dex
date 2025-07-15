import { Box, Grid, Typography, TextField, IconButton } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'

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
	// 编辑状态
	const [isEditingMin, setIsEditingMin] = useState(false)
	const [isEditingMax, setIsEditingMax] = useState(false)
	const [tempMinPrice, setTempMinPrice] = useState('')
	const [tempMaxPrice, setTempMaxPrice] = useState('')

	// 编辑处理函数
	const handleEditMinPrice = () => {
		setIsEditingMin(true)
		const { minPrice: dynMinPrice } = calculateDynamicRange()
		const displayMinPrice = parseFloat(minPrice) || dynMinPrice
		setTempMinPrice(displayMinPrice.toFixed(6))
	}

	const handleEditMaxPrice = () => {
		setIsEditingMax(true)
		const { maxPrice: dynMaxPrice } = calculateDynamicRange()
		const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
		setTempMaxPrice(displayMaxPrice.toFixed(6))
	}

	const handleConfirmMinPrice = () => {
		const newMinPrice = parseFloat(tempMinPrice)
		if (newMinPrice > 0 && onMinPriceChange) {
			onMinPriceChange(tempMinPrice)
		}
		setIsEditingMin(false)
	}

	const handleConfirmMaxPrice = () => {
		const newMaxPrice = parseFloat(tempMaxPrice)
		if (newMaxPrice > 0 && onMaxPriceChange) {
			onMaxPriceChange(tempMaxPrice)
		}
		setIsEditingMax(false)
	}

	const handleKeyPress = (e: React.KeyboardEvent, isMin: boolean) => {
		if (e.key === 'Enter') {
			if (isMin) {
				handleConfirmMinPrice()
			} else {
				handleConfirmMaxPrice()
			}
		} else if (e.key === 'Escape') {
			setIsEditingMin(false)
			setIsEditingMax(false)
		}
	}

	const getMinPriceInfo = () => {
		const { minPrice: dynMinPrice } = calculateDynamicRange()
		const displayMinPrice = parseFloat(minPrice) || dynMinPrice
		const percentChange = ((displayMinPrice / activeBinPrice) - 1) * 100
		
		// Min Price 应该总是小于等于 activeBinPrice，所以百分比应该是负数或0
		const color = percentChange < 0 ? '#f59e0b' : '#10b981' // 负数橙色，正数绿色（不应该出现）
		const formattedPercent = percentChange >= 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`
		
		return {
			value: displayMinPrice.toFixed(6),
			percentage: formattedPercent,
			color,
			isAuto: !minPrice
		}
	}

	const getMaxPriceInfo = () => {
		const { maxPrice: dynMaxPrice } = calculateDynamicRange()
		const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
		const percentChange = ((displayMaxPrice / activeBinPrice) - 1) * 100
		
		// Max Price 应该总是大于等于 activeBinPrice，所以百分比应该是正数或0
		const color = percentChange > 0 ? '#f97316' : '#10b981' // 正数橙红色，0或负数绿色（不应该出现）
		const formattedPercent = percentChange >= 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`
		
		return {
			value: displayMaxPrice.toFixed(6),
			percentage: formattedPercent,
			color,
			isAuto: !maxPrice
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
		<>
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
					{isEditingMin ? (
						<TextField
							value={tempMinPrice}
							onChange={(e) => setTempMinPrice(e.target.value)}
							onKeyPress={(e) => handleKeyPress(e, true)}
							onBlur={handleConfirmMinPrice}
							autoFocus
							size="small"
							sx={{
								'& .MuiInputBase-root': {
									fontSize: '18px',
									fontWeight: 600,
									color: '#7c2d12',
									backgroundColor: 'rgba(255, 255, 255, 0.8)',
									textAlign: 'center',
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
									},
								},
								width: '100%',
								mb: 1,
							}}
						/>
					) : (
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
							<Typography variant="h6" fontWeight={600} color="#7c2d12">
								{minPriceInfo.value}
							</Typography>
							<IconButton
								size="small"
								onClick={handleEditMinPrice}
								sx={{
									color: 'rgba(124, 45, 18, 0.5)',
									'&:hover': { color: '#f59e0b' },
									p: 0.25,
									ml: 0.5
								}}
							>
								<EditIcon sx={{ fontSize: '14px' }} />
							</IconButton>
						</Box>
					)}
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
					{isEditingMax ? (
						<TextField
							value={tempMaxPrice}
							onChange={(e) => setTempMaxPrice(e.target.value)}
							onKeyPress={(e) => handleKeyPress(e, false)}
							onBlur={handleConfirmMaxPrice}
							autoFocus
							size="small"
							sx={{
								'& .MuiInputBase-root': {
									fontSize: '18px',
									fontWeight: 600,
									color: '#7c2d12',
									backgroundColor: 'rgba(255, 255, 255, 0.8)',
									textAlign: 'center',
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
									},
								},
								width: '100%',
								mb: 1,
							}}
						/>
					) : (
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
							<Typography variant="h6" fontWeight={600} color="#7c2d12">
								{maxPriceInfo.value}
							</Typography>
							<IconButton
								size="small"
								onClick={handleEditMaxPrice}
								sx={{
									color: 'rgba(124, 45, 18, 0.5)',
									'&:hover': { color: '#f59e0b' },
									p: 0.25,
									ml: 0.5
								}}
							>
								<EditIcon sx={{ fontSize: '14px' }} />
							</IconButton>
						</Box>
					)}
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
		</>
	)
}

export default PriceInfoGrid
