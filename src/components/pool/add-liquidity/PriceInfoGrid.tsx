import { Box, Grid, Typography } from '@mui/material'

interface PriceInfoGridProps {
	minPrice: string
	maxPrice: string
	activeBinPrice: number
	getNumBins: () => string
	amount0: string
	amount1: string
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
}

const PriceInfoGrid = ({
	minPrice,
	maxPrice,
	activeBinPrice,
	getNumBins,
	amount0,
	amount1,
	selectedPool,
	calculateDynamicRange,
}: PriceInfoGridProps) => {
	const getMinPriceInfo = () => {
		const { minPrice: dynMinPrice } = calculateDynamicRange()
		const displayMinPrice = parseFloat(minPrice) || dynMinPrice
		const percentChange = Math.abs(((displayMinPrice / activeBinPrice) - 1) * 100)
		const color = displayMinPrice < activeBinPrice ? '#00D9FF' : '#7B68EE'
		const prefix = displayMinPrice < activeBinPrice ? '-' : '+'
		
		return {
			value: displayMinPrice.toFixed(6),
			percentage: `${prefix}${percentChange.toFixed(2)}%`,
			color,
			isAuto: !minPrice
		}
	}

	const getMaxPriceInfo = () => {
		const { maxPrice: dynMaxPrice } = calculateDynamicRange()
		const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
		const percentChange = Math.abs(((displayMaxPrice / activeBinPrice) - 1) * 100)
		const color = displayMaxPrice < activeBinPrice ? '#00D9FF' : '#7B68EE'
		const prefix = displayMaxPrice < activeBinPrice ? '-' : '+'
		
		return {
			value: displayMaxPrice.toFixed(6),
			percentage: `${prefix}${percentChange.toFixed(2)}%`,
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

	return (
		<Grid container spacing={2} sx={{ mb: 2 }}>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(0, 217, 255, 0.1)', 
					borderRadius: 2 
				}}>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Min Price
					</Typography>
					<Typography variant="h6" fontWeight={600} color="white">
						{minPriceInfo.value}
					</Typography>
					<Typography
						variant="body2"
						color={minPriceInfo.color}
						fontWeight={600}
					>
						{minPriceInfo.percentage}
					</Typography>
					{minPriceInfo.isAuto && (
						<Typography variant="caption" color="rgba(0, 217, 255, 0.7)" sx={{ fontSize: '10px' }}>
							Auto-calculated
						</Typography>
					)}
				</Box>
			</Grid>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(123, 104, 238, 0.1)', 
					borderRadius: 2 
				}}>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Max Price
					</Typography>
					<Typography variant="h6" fontWeight={600} color="white">
						{maxPriceInfo.value}
					</Typography>
					<Typography
						variant="body2"
						color={maxPriceInfo.color}
						fontWeight={600}
					>
						{maxPriceInfo.percentage}
					</Typography>
					{maxPriceInfo.isAuto && (
						<Typography variant="caption" color="rgba(123, 104, 238, 0.7)" sx={{ fontSize: '10px' }}>
							Auto-calculated
						</Typography>
					)}
				</Box>
			</Grid>
			<Grid size={4}>
				<Box sx={{ 
					textAlign: 'center', 
					p: 1.5, 
					backgroundColor: 'rgba(255, 255, 255, 0.05)', 
					borderRadius: 2 
				}}>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Num Bins
					</Typography>
					<Typography variant="h6" fontWeight={600} color="white">
						{getNumBins()}
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '10px' }}>
						{getTokenDistributionInfo()}
					</Typography>
				</Box>
			</Grid>
		</Grid>
	)
}

export default PriceInfoGrid
