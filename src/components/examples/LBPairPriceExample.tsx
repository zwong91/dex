import React from 'react'
import { Box, Button, Typography, Card, CircularProgress } from '@mui/material'
import { useLBPairPrice, useMultipleLBPairPrices } from '../../dex/hooks/useLBPairPrice'

/**
 * LB Pair Price Example Component
 * 展示如何从 Liquidity Book 获取实时价格
 */
export const LBPairPriceExample: React.FC = () => {
	// Example pair addresses (you'll need to replace with real addresses)
	const examplePairAddress = '0x123...' // Replace with real LB pair address
	const exampleBinStep = 25 // 0.25%

	// Single pair price hook
	const { 
		currentPrice, 
		loading: singleLoading, 
		error: singleError, 
		refetch 
	} = useLBPairPrice(examplePairAddress, exampleBinStep)

	// Multiple pairs price hook
	const multiplePairs = [
		{ pairAddress: '0x123...', binStep: 25 },
		{ pairAddress: '0x456...', binStep: 50 },
		{ pairAddress: '0x789...', binStep: 100 },
	]

	const { 
		prices, 
		loading: multipleLoading, 
		error: multipleError, 
		refetch: refetchMultiple 
	} = useMultipleLBPairPrices(multiplePairs)

	const formatPrice = (price: number | null) => {
		if (!price) return 'N/A'
		
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

	return (
		<Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
			<Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
				🔗 LB Pair Price Example
			</Typography>

			{/* Single Pair Price */}
			<Card sx={{ p: 3, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
				<Typography variant="h6" sx={{ mb: 2 }}>
					Single Pair Price Fetching
				</Typography>
				
				<Box sx={{ mb: 2 }}>
					<Typography variant="body2" color="text.secondary">
						Pair Address: {examplePairAddress}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Bin Step: {exampleBinStep} basis points (0.25%)
					</Typography>
				</Box>

				{singleLoading ? (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
						<CircularProgress size={20} />
						<Typography>Fetching price from chain...</Typography>
					</Box>
				) : singleError ? (
					<Typography color="error">
						❌ Error: {singleError}
					</Typography>
				) : (
					<Box sx={{ mb: 2 }}>
						<Typography variant="h5" color="primary">
							💰 Current Price: {formatPrice(currentPrice)}
						</Typography>
						{currentPrice && (
							<Typography variant="caption" color="text.secondary">
								🔗 Fetched from on-chain active bin
							</Typography>
						)}
					</Box>
				)}

				<Button 
					onClick={refetch} 
					variant="outlined" 
					size="small"
					disabled={singleLoading}
				>
					🔄 Refresh Price
				</Button>
			</Card>

			{/* Multiple Pairs Prices */}
			<Card sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
				<Typography variant="h6" sx={{ mb: 2 }}>
					Multiple Pairs Price Fetching
				</Typography>

				{multipleLoading ? (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<CircularProgress size={20} />
						<Typography>Fetching prices from chain...</Typography>
					</Box>
				) : multipleError ? (
					<Typography color="error" sx={{ mb: 2 }}>
						❌ Error: {multipleError}
					</Typography>
				) : (
					<Box sx={{ mb: 2 }}>
						{multiplePairs.map((pair) => (
							<Box key={pair.pairAddress} sx={{ 
								mb: 1, 
								p: 2, 
								backgroundColor: 'rgba(255, 255, 255, 0.02)',
								borderRadius: 1 
							}}>
								<Typography variant="body2" color="text.secondary">
									{pair.pairAddress} (Bin Step: {pair.binStep}bp)
								</Typography>
								<Typography variant="body1">
									💰 Price: {formatPrice(prices[pair.pairAddress] || null)}
								</Typography>
							</Box>
						))}
					</Box>
				)}

				<Button 
					onClick={refetchMultiple} 
					variant="outlined" 
					size="small"
					disabled={multipleLoading}
				>
					🔄 Refresh All Prices
				</Button>
			</Card>

			{/* Usage Documentation */}
			<Card sx={{ p: 3, mt: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
				<Typography variant="h6" sx={{ mb: 2 }}>
					📚 Usage Documentation
				</Typography>
				
				<Typography variant="body2" sx={{ mb: 1 }}>
					<strong>Single Pair Hook:</strong>
				</Typography>
				<Box component="pre" sx={{ 
					fontSize: '0.8rem', 
					backgroundColor: 'rgba(0, 0, 0, 0.3)', 
					p: 1, 
					borderRadius: 1,
					mb: 2,
					overflow: 'auto'
				}}>
{`const { currentPrice, loading, error, refetch } = useLBPairPrice(
  pairAddress, // LB pair contract address
  binStep      // Bin step in basis points
)`}
				</Box>

				<Typography variant="body2" sx={{ mb: 1 }}>
					<strong>Multiple Pairs Hook:</strong>
				</Typography>
				<Box component="pre" sx={{ 
					fontSize: '0.8rem', 
					backgroundColor: 'rgba(0, 0, 0, 0.3)', 
					p: 1, 
					borderRadius: 1,
					overflow: 'auto'
				}}>
{`const pairs = [
  { pairAddress: '0x...', binStep: 25 },
  { pairAddress: '0x...', binStep: 50 }
]

const { prices, loading, error, refetch } = useMultipleLBPairPrices(pairs)`}
				</Box>
			</Card>
		</Box>
	)
}

export default LBPairPriceExample
