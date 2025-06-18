import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'
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
	onResetPrice: () => void
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
	onResetPrice,
}: AddLiquidityButtonProps) => {
	const isDisabled = (!amount0 && !amount1) || isPending || !userWalletAddress

	return (
		<Box>
			{/* Reset Price Button */}
			<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
				<Button
					size="small"
					startIcon={<RefreshIcon />}
					onClick={onResetPrice}
					sx={{
						textTransform: 'none',
						color: 'white',
						backgroundColor: 'rgba(255, 255, 255, 0.08)',
						borderColor: 'rgba(255, 255, 255, 0.3)',
						border: '1px solid',
						px: 2,
						py: 1,
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

			{/* Add Liquidity Button */}
			<Button
				fullWidth
				variant="contained"
				size="large"
				disabled={isDisabled}
				onClick={onAddLiquidity}
				startIcon={
					isPending ? <CircularProgress size={20} /> : <AddIcon />
				}
			>
				{!userWalletAddress
					? 'Connect Wallet'
					: isPending
						? 'Adding Liquidity...'
						: 'Add Liquidity'}
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

			{/* Success/Error Messages */}
			{isSuccess && (
				<Alert severity="success" sx={{ mt: 2 }}>
					Liquidity added successfully!
				</Alert>
			)}
			{error && (
				<Alert severity="warning" sx={{ mt: 2 }}>
					Failed to add liquidity: {error.message}
				</Alert>
			)}
		</Box>
	)
}

export default AddLiquidityButton
