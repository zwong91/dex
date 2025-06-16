import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useDexOperations, useTokenBalanceByAddress } from '../../dex'
import { getTokensForChain } from '../../dex/networkTokens'

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

interface AddToPositionDialogProps {
	open: boolean
	onClose: () => void
	selectedPosition: Position | null
	chainId: number
}

const AddToPositionDialog = ({
	open,
	onClose,
	selectedPosition,
	chainId,
}: AddToPositionDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [addAmount0, setAddAmount0] = useState('')
	const [addAmount1, setAddAmount1] = useState('')
	const [isPending, setIsPending] = useState(false)

	// Web3 hooks
	const { addLiquidity } = useDexOperations()
	const tokens = getTokensForChain(chainId)
	const tokenXBalance = useTokenBalanceByAddress(
		userWalletAddress,
		tokens[0]?.address as `0x${string}`,
	)
	const tokenYBalance = useTokenBalanceByAddress(
		userWalletAddress,
		tokens[1]?.address as `0x${string}`,
	)

	const handleAddToPositionSubmit = async () => {
		if (!addAmount0 || !addAmount1 || !selectedPosition) {
			return
		}

		if (!userWalletAddress) {
			return
		}

		try {
			setIsPending(true)
			const amt0 = parseFloat(addAmount0)
			const amt1 = parseFloat(addAmount1)

			if (amt0 <= 0 || amt1 <= 0) {
				return
			}

			await addLiquidity(amt0, amt1)
			onClose()
		} catch (err: any) {
			console.error('Add to position error:', err)
		} finally {
			setIsPending(false)
		}
	}

	const handleClose = () => {
		setAddAmount0('')
		setAddAmount1('')
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
					Add Liquidity to Position
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

						<Grid container spacing={2} sx={{ mb: 3 }}>
							<Grid size={6}>
								<TextField
									fullWidth
									label={`Amount of ${selectedPosition.token0}`}
									placeholder="0.0"
									type="number"
									value={addAmount0}
									onChange={e => setAddAmount0(e.target.value)}
									InputProps={{
										endAdornment: (
											<Button
												size="small"
												onClick={() =>
													setAddAmount0(tokenXBalance?.toString() || '0')
												}
												sx={{ textTransform: 'none' }}
											>
												Max
											</Button>
										),
									}}
								/>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mt: 0.5 }}
								>
									Balance: {tokenXBalance || '0'}
								</Typography>
							</Grid>
							<Grid size={6}>
								<TextField
									fullWidth
									label={`Amount of ${selectedPosition.token1}`}
									placeholder="0.0"
									type="number"
									value={addAmount1}
									onChange={e => setAddAmount1(e.target.value)}
									InputProps={{
										endAdornment: (
											<Button
												size="small"
												onClick={() =>
													setAddAmount1(tokenYBalance?.toString() || '0')
												}
												sx={{ textTransform: 'none' }}
											>
												Max
											</Button>
										),
									}}
								/>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mt: 0.5 }}
								>
									Balance: {tokenYBalance || '0'}
								</Typography>
							</Grid>
						</Grid>

						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={
								!addAmount0 || !addAmount1 || isPending || !userWalletAddress
							}
							onClick={handleAddToPositionSubmit}
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
					</Box>
				) : (
					<Typography>Select a position to add liquidity</Typography>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default AddToPositionDialog
