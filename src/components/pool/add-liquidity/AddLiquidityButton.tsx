import { Add as AddIcon } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'

interface AddLiquidityButtonProps {
	amount0: string
	amount1: string
	isPending: boolean
	userWalletAddress?: string
	isSuccess: boolean
	error: Error | null
	slippageTolerance: number
	onAddLiquidity: () => void
}

const AddLiquidityButton = ({
	amount0,
	amount1,
	isPending,
	userWalletAddress,
	isSuccess,
	error,
	slippageTolerance,
	onAddLiquidity,
}: AddLiquidityButtonProps) => {
	const isDisabled = (!amount0 && !amount1) || isPending || !userWalletAddress

	return (
		<Box>
			{/* Add Liquidity Button */}
			<Button
				fullWidth
				variant="contained"
				size="large"
				disabled={isDisabled}
				onClick={onAddLiquidity}
				startIcon={
					isPending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AddIcon />
				}
				sx={{
					py: 2,
					fontSize: '1.1rem',
					fontWeight: 700,
					textTransform: 'none',
					borderRadius: 3,
					background: isDisabled 
						? 'rgba(255, 255, 255, 0.1)'
						: 'linear-gradient(135deg, #4CAF50, #2196F3)',
					border: '2px solid transparent',
					backgroundClip: 'padding-box',
					boxShadow: isDisabled 
						? 'none'
						: '0 8px 32px rgba(76, 175, 80, 0.4)',
					'&:hover': {
						background: isDisabled 
							? 'rgba(255, 255, 255, 0.1)'
							: 'linear-gradient(135deg, #66BB6A, #42A5F5)',
						transform: isDisabled ? 'none' : 'translateY(-2px)',
						boxShadow: isDisabled 
							? 'none'
							: '0 12px 40px rgba(76, 175, 80, 0.5)',
					},
					'&:disabled': {
						color: 'rgba(255, 255, 255, 0.4)',
						background: 'rgba(255, 255, 255, 0.1)',
					},
					transition: 'all 0.3s ease',
				}}
			>
				{!userWalletAddress
					? '🔗 Connect Wallet'
					: isPending
						? 'Adding Liquidity...'
						: '💎 Add Liquidity'}
			</Button>

			{/* Slippage Helper */}
			{error && error.message.includes('LBRouter__AmountSlippageCaught') && (
				<Alert severity="info" sx={{ mt: 2 }}>
					<Typography variant="body2" sx={{ mb: 1 }}>
						<strong>Slippage Protection Triggered:</strong> The transaction was prevented because the price moved too much during execution.
					</Typography>
					<Typography variant="body2">
						💡 Try: Increase slippage tolerance to {Math.min(20, slippageTolerance + 5)}% or wait for price to stabilize.
					</Typography>
				</Alert>
			)}

			{/* Error Message Only */}
			{error && (
				<Alert severity="warning" sx={{ mt: 2 }}>
					Failed to add liquidity: {error.message}
				</Alert>
			)}
		</Box>
	)
}

export default AddLiquidityButton
