import { Close as CloseIcon, Remove as RemoveIcon } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useDexOperations, useLiquidityTokenBalance } from '../../dex'

interface Position {
	id: string
	token0: string
	token1: string
	icon0: string
	icon1: string
	liquidity: string
	value: string
	apr: string
	fees24h: string
	feesTotal: string
	range: {
		min: string
		max: string
		current: string
	}
	inRange: boolean
	performance: string
}

interface RemoveLiquidityDialogProps {
	open: boolean
	onClose: () => void
	selectedPosition: Position | null
}

const RemoveLiquidityDialog = ({
	open,
	onClose,
	selectedPosition,
}: RemoveLiquidityDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [removePercentage, setRemovePercentage] = useState('25')
	const [isPending, setIsPending] = useState(false)

	// Web3 hooks
	const { removeLiquidity } = useDexOperations()
	const liquidityBalance = useLiquidityTokenBalance(userWalletAddress)

	const handleRemovePositionSubmit = async () => {
		if (!removePercentage || !selectedPosition) {
			return
		}

		if (!userWalletAddress) {
			return
		}

		try {
			setIsPending(true)
			const percentage = parseFloat(removePercentage)

			if (percentage <= 0 || percentage > 100) {
				return
			}

			// Calculate the amount of LP tokens to remove based on percentage
			const currentLiquidityBalance = liquidityBalance || 0
			const liquidityToRemove =
				(Number(currentLiquidityBalance) * percentage) / 100

			// Call the removeLiquidity contract function
			await removeLiquidity(liquidityToRemove)
			onClose()
		} catch (err: any) {
			console.error('Remove position error:', err)
		} finally {
			setIsPending(false)
		}
	}

	const handleClose = () => {
		setRemovePercentage('25')
		onClose()
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					Remove Liquidity from Position
					<IconButton onClick={handleClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{selectedPosition ? (
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
							<Avatar sx={{ width: 32, height: 32 }}>
								{selectedPosition.icon0}
							</Avatar>
							<Avatar sx={{ width: 32, height: 32, ml: -1 }}>
								{selectedPosition.icon1}
							</Avatar>
							<Typography variant="h6">
								{selectedPosition.token0}/{selectedPosition.token1}
							</Typography>
						</Box>

						<Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
							<CardContent>
								<Typography variant="body2" color="text.secondary">
									Current Position Value
								</Typography>
								<Typography variant="h5" fontWeight={600}>
									{selectedPosition.value}
								</Typography>
							</CardContent>
						</Card>

						<Box sx={{ mb: 3 }}>
							<Typography
								variant="body2"
								color="text.secondary"
								gutterBottom
							>
								Amount to remove: {removePercentage}%
							</Typography>
							<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
								{['25', '50', '75', '100'].map(value => (
									<Chip
										key={value}
										label={`${value}%`}
										variant={
											removePercentage === value ? 'filled' : 'outlined'
										}
										onClick={() => setRemovePercentage(value)}
										sx={{ cursor: 'pointer' }}
									/>
								))}
							</Box>
							<TextField
								fullWidth
								label="Custom percentage"
								value={removePercentage}
								onChange={e => setRemovePercentage(e.target.value)}
								type="number"
								InputProps={{
									endAdornment: '%',
									inputProps: { min: 1, max: 100 },
								}}
							/>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mt: 1 }}
							>
								Your LP Token Balance: {liquidityBalance || '0'} tokens
							</Typography>
						</Box>

						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={
								!removePercentage || isPending || !userWalletAddress
							}
							onClick={handleRemovePositionSubmit}
							startIcon={
								isPending ? <CircularProgress size={20} /> : <RemoveIcon />
							}
							color="warning"
						>
							{!userWalletAddress
								? 'Connect Wallet'
								: isPending
									? 'Removing Liquidity...'
									: 'Remove Liquidity'}
						</Button>
					</Box>
				) : (
					<Typography>Select a position to remove liquidity</Typography>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default RemoveLiquidityDialog
