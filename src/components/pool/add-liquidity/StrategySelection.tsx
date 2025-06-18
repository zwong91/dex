import { Box, Card, CardContent, Typography, Grid } from '@mui/material'

export type LiquidityStrategy = 'spot' | 'curve' | 'bid-ask'

interface StrategySelectionProps {
	strategy: LiquidityStrategy
	onStrategyChange: (strategy: LiquidityStrategy) => void
}

const StrategySelection = ({
	strategy,
	onStrategyChange,
}: StrategySelectionProps) => {
	const renderStrategyBars = (strategyType: LiquidityStrategy) => {
		let heights: number[]
		
		switch (strategyType) {
			case 'spot':
				heights = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
				break
			case 'curve':
				heights = [5, 8, 12, 18, 25, 32, 35, 32, 25, 18, 12, 8]
				break
			case 'bid-ask':
				heights = [30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30]
				break
		}

		return heights.map((height, index) => {
			const isSelected = strategy === strategyType
			const isCenter = index === 6

			if (isSelected && isCenter) {
				return (
					<Box
						key={index}
						sx={{
							width: 4,
							height: height,
							borderRadius: '2px 2px 0 0',
							background: 'linear-gradient(to bottom, #7B68EE 50%, #00D9FF 50%)',
						}}
					/>
				)
			}

			return (
				<Box
					key={index}
					sx={{
						width: 4,
						height: height,
						borderRadius: '2px 2px 0 0',
						background: isSelected
							? index < 6
								? '#00D9FF'
								: index > 6
									? '#7B68EE'
									: '#4A5568'
							: '#4A5568',
					}}
				/>
			)
		})
	}

	const getStrategyDescription = (strategyType: LiquidityStrategy) => {
		switch (strategyType) {
			case 'spot':
				return {
					description: 'Spot provides a uniform distribution that is versatile and risk adjusted, suitable for any type of market and conditions. This is similar to setting a CLMM price range.',
					tip: 'Symmetric distribution around current price',
					color: 'rgba(0, 217, 255, 0.8)'
				}
			case 'curve':
				return {
					description: 'Curve is ideal for a concentrated approach that aims to maximise capital efficiency. This is great for stables or pairs where the price does not change very often.',
					tip: 'Concentrated liquidity around current price - higher capital efficiency',
					color: 'rgba(123, 104, 238, 0.8)'
				}
			case 'bid-ask':
				return {
					description: 'Bid-Ask is an inverse Curve distribution, typically deployed single sided for a DCA in or out strategy. It can be used to capture volatility especially when prices vastly move out of the typical range.',
					tip: 'Wide range distribution for volatility capture and DCA strategies',
					color: 'rgba(255, 107, 53, 0.8)'
				}
		}
	}

	return (
		<Box sx={{ mb: 4 }}>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 3,
				}}
			>
				<Typography variant="h6" fontWeight={600}>
					Select Volatility Strategy
				</Typography>
			</Box>

			<Grid container spacing={2} sx={{ mb: 2 }}>
				{(['spot', 'curve', 'bid-ask'] as const).map((strategyType) => (
					<Grid size={4} key={strategyType}>
						<Card
							elevation={0}
							sx={{
								cursor: 'pointer',
								border: 2,
								borderColor: strategy === strategyType
									? '#FF6B35'
									: 'rgba(255, 255, 255, 0.1)',
								borderRadius: 3,
								backgroundColor: '#1A1B2E',
								transition: 'all 0.2s ease',
								'&:hover': {
									borderColor: strategy === strategyType
										? '#FF6B35'
										: 'rgba(255, 255, 255, 0.2)',
								},
							}}
							onClick={() => onStrategyChange(strategyType)}
						>
							<CardContent sx={{ textAlign: 'center', py: 4 }}>
								<Box
									sx={{
										mb: 2,
										display: 'flex',
										justifyContent: 'center',
										alignItems: 'end',
										gap: 0.5,
									}}
								>
									{renderStrategyBars(strategyType)}
								</Box>
								<Typography variant="h6" fontWeight={600} color="white">
									{strategyType.charAt(0).toUpperCase() + strategyType.slice(1)}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Strategy Description */}
			<Box sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
				<Typography variant="body1" color="rgba(255, 255, 255, 0.9)" sx={{ mb: 2, fontSize: '0.95rem', lineHeight: 1.6 }}>
					{getStrategyDescription(strategy).description}
				</Typography>
				<Typography 
					variant="caption" 
					color={getStrategyDescription(strategy).color} 
					sx={{ fontSize: '12px', fontWeight: 500 }}
				>
					💡 {getStrategyDescription(strategy).tip}
				</Typography>
			</Box>
		</Box>
	)
}

export default StrategySelection
