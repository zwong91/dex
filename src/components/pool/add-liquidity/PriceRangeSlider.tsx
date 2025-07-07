import { Box, Slider, Typography } from '@mui/material'

interface PriceRangeSliderProps {
	minPrice: string
	maxPrice: string
	activeBinPrice: number
	onMinPriceChange: (value: string) => void
	onMaxPriceChange: (value: string) => void
}

const PriceRangeSlider = ({
	minPrice,
	maxPrice,
	activeBinPrice,
	onMinPriceChange,
	onMaxPriceChange,
}: PriceRangeSliderProps) => {
	return (
		<Box sx={{ px: 3, mb: 4 }}>
			<Typography variant="body2" color="rgba(120, 113, 108, 0.8)" sx={{ mb: 2, textAlign: 'center' }}>
				Drag the handles to adjust your price range
			</Typography>
			<Box sx={{ position: 'relative', py: 2 }}>
				<Slider
					value={[
						parseFloat(minPrice || activeBinPrice.toString()),
						parseFloat(maxPrice || (activeBinPrice * 1.05).toString()),
					]}
					onChange={(_e, newValue) => {
						if (Array.isArray(newValue)) {
							onMinPriceChange(newValue[0].toString())
							onMaxPriceChange(newValue[1].toString())
						}
					}}
					valueLabelDisplay="auto"
					min={activeBinPrice * 0.8}
					max={activeBinPrice * 1.2}
					step={activeBinPrice * 0.001}
					sx={{
						height: 12,
						'& .MuiSlider-thumb': {
							backgroundColor: 'white',
							border: '3px solid #f97316',
							width: 28,
							height: 28,
							boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px rgba(249, 115, 22, 0.3)',
							transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
							'&::before': {
								content: '""',
								position: 'absolute',
								width: 16,
								height: 16,
								borderRadius: '50%',
								background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
							},
							'&:hover': {
								boxShadow: '0 0 0 16px rgba(249, 115, 22, 0.16), 0 4px 20px rgba(0, 0, 0, 0.3)',
								transform: 'scale(1.1)',
							},
							'&:active': {
								transform: 'scale(1.2)',
							},
							'&.Mui-focusVisible': {
								boxShadow: '0 0 0 20px rgba(249, 115, 22, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3)',
							},
						},
						'& .MuiSlider-thumb:first-of-type': {
							borderColor: '#f59e0b',
							'&::before': {
								background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
							},
							'&:hover': {
								boxShadow: '0 0 0 16px rgba(245, 158, 11, 0.16), 0 4px 20px rgba(0, 0, 0, 0.3)',
							},
							'&.Mui-focusVisible': {
								boxShadow: '0 0 0 20px rgba(245, 158, 11, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3)',
							},
						},
						'& .MuiSlider-track': {
							background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
							height: 8,
							border: 'none',
							borderRadius: 4,
							boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
							position: 'relative',
							'&::before': {
								content: '""',
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
								borderRadius: 4,
							},
						},
						'& .MuiSlider-rail': {
							background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.2) 50%, rgba(249, 115, 22, 0.1) 100%)',
							height: 8,
							borderRadius: 4,
							opacity: 1,
							boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
						},
						'& .MuiSlider-valueLabel': {
							backgroundColor: 'rgba(0, 0, 0, 0.8)',
							color: 'white',
							fontWeight: 600,
							fontSize: '12px',
							padding: '6px 12px',
							borderRadius: 2,
							boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
							border: '1px solid rgba(255, 255, 255, 0.2)',
							'&::before': {
								borderTopColor: 'rgba(0, 0, 0, 0.8)',
							},
							'& .MuiSlider-valueLabelLabel': {
								transform: 'none',
							},
						},
						'& .MuiSlider-markLabel': {
							color: 'rgba(156, 163, 175, 0.6)',
							fontSize: '10px',
							fontWeight: 500,
							'&.MuiSlider-markLabelActive': {
								color: '#fbbf24',
							},
						},
					}}
				/>
			</Box>
		</Box>
	)
}

export default PriceRangeSlider
