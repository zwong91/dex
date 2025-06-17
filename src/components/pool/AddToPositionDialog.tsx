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
	const [statusMessage, setStatusMessage] = useState('')

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
			setStatusMessage('Preparing transaction...')
			const amt0 = parseFloat(addAmount0)
			const amt1 = parseFloat(addAmount1)

			if (amt0 <= 0 || amt1 <= 0) {
				return
			}

			// Use the position's pair data for adding to existing position
			if (!selectedPosition) {
				throw new Error('No position selected')
			}

			// Extract pair address from position (assuming it has pairAddress or id as pair address)
			const pairAddress = (selectedPosition as any).pairAddress || selectedPosition.id
			
			// Get token addresses from the tokens config using symbols
			const tokens = getTokensForChain(chainId)
			const token0 = tokens.find(t => t.symbol === selectedPosition.token0)
			const token1 = tokens.find(t => t.symbol === selectedPosition.token1)

			if (!token0 || !token1) {
				throw new Error(`Token addresses not found for symbols: ${selectedPosition.token0}, ${selectedPosition.token1}`)
			}

			const tokenXAddress = token0.address
			const tokenYAddress = token1.address

			console.log('🔄 AddToPositionDialog - calling addLiquidity with:', {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				token0Symbol: selectedPosition.token0,
				token1Symbol: selectedPosition.token1,
				amt0,
				amt1
			})

			setStatusMessage('Adding liquidity to position...')
			await addLiquidity(
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1
			)
			setStatusMessage('Transaction completed successfully!')
			onClose()
		} catch (err: any) {
			console.error('Add to position error:', err)
			setStatusMessage(`Error: ${err.message}`)
		} finally {
			setIsPending(false)
			setTimeout(() => setStatusMessage(''), 3000) // Clear message after 3 seconds
		}
	}

	const handleClose = () => {
			setAddAmount0('')
			setAddAmount1('')
			setStatusMessage('')
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
								<img src={selectedPosition.icon0} alt={selectedPosition.token0} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
							</Avatar>
							<Avatar sx={{ width: 32, height: 32, ml: -1 }}>
								<img src={selectedPosition.icon1} alt={selectedPosition.token1} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
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

						{statusMessage && (
							<Typography 
								variant="body2" 
								color={statusMessage.includes('Error') ? 'error' : 'primary'}
								sx={{ mb: 2, textAlign: 'center' }}
							>
								{statusMessage}
							</Typography>
						)}

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
