import {
  Add as AddIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useDexOperations, useTokenBalanceByAddress } from '../../dex'
import { getTokensForChain } from '../../dex/networkTokens'

interface PoolData {
	id: string
	token0: string
	token1: string
	icon0: string
	icon1: string
	tvl: string
	apr: string
	volume24h: string
	fees24h: string
	userLiquidity?: string
}

interface AddLiquidityDialogProps {
	open: boolean
	onClose: () => void
	selectedPool: PoolData | null
	chainId: number
}

const AddLiquidityDialog = ({
	open,
	onClose,
	selectedPool,
	chainId,
}: AddLiquidityDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [amount0, setAmount0] = useState('')
	const [amount1, setAmount1] = useState('')

	// Liquidity strategy states
	const [liquidityStrategy, setLiquidityStrategy] = useState<
		'spot' | 'curve' | 'bid-ask'
	>('spot')
	const [priceMode, setPriceMode] = useState<'range' | 'radius'>('range')
	const [minPrice, setMinPrice] = useState('')
	const [maxPrice, setMaxPrice] = useState('')
	const [numBins, setNumBins] = useState('149')
	const [activeBinPrice] = useState('19.09372774')

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

	const [isPending, setIsPending] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const handleAddLiquiditySubmit = async () => {
		if (!amount0 || !amount1 || !selectedPool) {
			toast.error('Please enter both token amounts')
			return
		}

		if (!userWalletAddress) {
			toast.error('Please connect your wallet')
			return
		}

		try {
			setIsPending(true)
			setError(null)
			const amt0 = parseFloat(amount0)
			const amt1 = parseFloat(amount1)

			if (amt0 <= 0 || amt1 <= 0) {
				toast.error('Please enter valid amounts')
				return
			}

			await addLiquidity(amt0, amt1)
			toast.success('Adding liquidity...')
			setIsSuccess(true)
			onClose()
		} catch (err: any) {
			console.error('Add liquidity error:', err)
			setError(err)
			toast.error('Failed to add liquidity: ' + (err.message || 'Unknown error'))
		} finally {
			setIsPending(false)
		}
	}

	const handleClose = () => {
		setAmount0('')
		setAmount1('')
		setLiquidityStrategy('spot')
		setPriceMode('range')
		setMinPrice('17.7324')
		setMaxPrice('20.5594')
		setNumBins('149')
		setIsSuccess(false)
		setError(null)
		onClose()
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					Add Liquidity
					<IconButton onClick={handleClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{selectedPool ? (
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
							<Avatar sx={{ width: 32, height: 32 }}>
								{selectedPool.icon0}
							</Avatar>
							<Avatar sx={{ width: 32, height: 32, ml: -1 }}>
								{selectedPool.icon1}
							</Avatar>
							<Typography variant="h6">
								{selectedPool.token0}/{selectedPool.token1}
							</Typography>
						</Box>

						{/* Liquidity Strategy Selection */}
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
									Choose Liquidity Shape
								</Typography>
							</Box>

							<Grid container spacing={2} sx={{ mb: 4 }}>
								<Grid size={4}>
									<Card
										elevation={0}
										sx={{
											cursor: 'pointer',
											border: 2,
											borderColor:
												liquidityStrategy === 'spot'
													? '#FF6B35'
													: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											backgroundColor: '#1A1B2E',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor:
													liquidityStrategy === 'spot'
														? '#FF6B35'
														: 'rgba(255, 255, 255, 0.2)',
											},
										}}
										onClick={() => setLiquidityStrategy('spot')}
									>
										<CardContent sx={{ textAlign: 'center', py: 4 }}>
											{/* Spot - Asymmetric bars with center peak */}
											<Box
												sx={{
													mb: 2,
													display: 'flex',
													justifyContent: 'center',
													alignItems: 'end',
													gap: 0.5,
												}}
											>
												{[10, 15, 20, 25, 30, 35, 25, 20, 15, 10, 8, 6].map(
													(height, index) => (
														<Box
															key={index}
															sx={{
																width: 4,
																height: height,
																borderRadius: '2px 2px 0 0',
																background:
																	liquidityStrategy === 'spot' && index < 6
																		? 'linear-gradient(to top, #00D9FF, #7B68EE)'
																		: '#4A5568',
															}}
														/>
													),
												)}
											</Box>
											<Typography variant="h6" fontWeight={600} color="white">
												Spot
											</Typography>
										</CardContent>
									</Card>
								</Grid>
								<Grid size={4}>
									<Card
										elevation={0}
										sx={{
											cursor: 'pointer',
											border: 2,
											borderColor:
												liquidityStrategy === 'curve'
													? '#FFFFFF'
													: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											backgroundColor: '#1A1B2E',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor:
													liquidityStrategy === 'curve'
														? '#FFFFFF'
														: 'rgba(255, 255, 255, 0.2)',
											},
										}}
										onClick={() => setLiquidityStrategy('curve')}
									>
										<CardContent sx={{ textAlign: 'center', py: 4 }}>
											{/* Curve - Bell curve distribution */}
											<Box
												sx={{
													mb: 2,
													display: 'flex',
													justifyContent: 'center',
													alignItems: 'end',
													gap: 0.5,
												}}
											>
												{[8, 12, 16, 20, 25, 30, 35, 30, 25, 20, 16, 12].map(
													(height, index) => (
														<Box
															key={index}
															sx={{
																width: 4,
																height: height,
																borderRadius: '2px 2px 0 0',
																background:
																	liquidityStrategy === 'curve' && index < 6
																		? 'linear-gradient(to top, #00D9FF, #7B68EE)'
																		: '#4A5568',
															}}
														/>
													),
												)}
											</Box>
											<Typography variant="h6" fontWeight={600} color="white">
												Curve
											</Typography>
										</CardContent>
									</Card>
								</Grid>
								<Grid size={4}>
									<Card
										elevation={0}
										sx={{
											cursor: 'pointer',
											border: 2,
											borderColor:
												liquidityStrategy === 'bid-ask'
													? '#FFFFFF'
													: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											backgroundColor: '#1A1B2E',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor:
													liquidityStrategy === 'bid-ask'
														? '#FFFFFF'
														: 'rgba(255, 255, 255, 0.2)',
											},
										}}
										onClick={() => setLiquidityStrategy('bid-ask')}
									>
										<CardContent sx={{ textAlign: 'center', py: 4 }}>
											{/* Bid-Ask - Two separate peaks */}
											<Box
												sx={{
													mb: 2,
													display: 'flex',
													justifyContent: 'center',
													alignItems: 'end',
													gap: 0.5,
												}}
											>
												{[25, 30, 25, 20, 15, 10, 8, 10, 15, 20, 25, 30].map(
													(height, index) => (
														<Box
															key={index}
															sx={{
																width: 4,
																height: height,
																borderRadius: '2px 2px 0 0',
																background:
																	liquidityStrategy === 'bid-ask' && index < 6
																		? 'linear-gradient(to top, #00D9FF, #7B68EE)'
																		: '#4A5568',
															}}
														/>
													),
												)}
											</Box>
											<Typography variant="h6" fontWeight={600} color="white">
												Bid-Ask
											</Typography>
										</CardContent>
									</Card>
								</Grid>
							</Grid>
						</Box>

						{/* Price Range Configuration */}
						<Box sx={{ mb: 4 }}>
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									mb: 2,
								}}
							>
								<Typography variant="h6" fontWeight={600}>
									Price
								</Typography>
								<ToggleButtonGroup
									value={priceMode}
									exclusive
									onChange={(_e, newValue) => newValue && setPriceMode(newValue)}
									size="small"
								>
									<ToggleButton value="range">By Range</ToggleButton>
									<ToggleButton value="radius">By Radius</ToggleButton>
								</ToggleButtonGroup>
							</Box>

							<Box
								sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
							>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}
								>
									Active Bin: {activeBinPrice} USDC per AVAX
								</Typography>

								{/* Price Range Slider */}
								<Box sx={{ px: 2, mb: 3 }}>
									<Slider
										value={[
											parseFloat(minPrice || '17.7324'),
											parseFloat(maxPrice || '20.5594'),
										]}
										onChange={(_e, newValue) => {
											if (Array.isArray(newValue)) {
												setMinPrice(newValue[0].toString())
												setMaxPrice(newValue[1].toString())
											}
										}}
										valueLabelDisplay="auto"
										min={15}
										max={25}
										step={0.001}
										marks={[
											{ value: parseFloat(activeBinPrice), label: 'Current' },
										]}
										sx={{
											'& .MuiSlider-thumb': {
												backgroundColor: 'primary.main',
											},
											'& .MuiSlider-track': {
												backgroundColor: 'primary.main',
											},
										}}
									/>
								</Box>

								<Grid container spacing={3}>
									<Grid size={4}>
										<Typography
											variant="body2"
											color="text.secondary"
											gutterBottom
										>
											Min Price:
										</Typography>
										<Typography variant="h6" fontWeight={600}>
											{parseFloat(minPrice || '17.7324').toFixed(4)}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											USDC per AVAX
										</Typography>
									</Grid>
									<Grid size={4}>
										<Typography
											variant="body2"
											color="text.secondary"
											gutterBottom
										>
											Max Price:
										</Typography>
										<Typography variant="h6" fontWeight={600}>
											{parseFloat(maxPrice || '20.5594').toFixed(4)}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											USDC per AVAX
										</Typography>
									</Grid>
									<Grid size={4}>
										<Typography
											variant="body2"
											color="text.secondary"
											gutterBottom
										>
											Num Bins:
										</Typography>
										<Typography variant="h6" fontWeight={600}>
											{numBins}
										</Typography>
									</Grid>
								</Grid>

								<Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
									<Button
										size="small"
										startIcon={<TrendingUpIcon />}
										onClick={() => {
											// Select rewarded range functionality
										}}
										sx={{ textTransform: 'none' }}
									>
										Select rewarded range
									</Button>
									<Button
										size="small"
										startIcon={<RefreshIcon />}
										onClick={() => {
											setMinPrice('17.7324')
											setMaxPrice('20.5594')
											setNumBins('149')
										}}
										sx={{ textTransform: 'none' }}
									>
										Reset price
									</Button>
								</Box>
							</Box>
						</Box>

						{/* Token Amounts */}
						<Box sx={{ mb: 3 }}>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Amount of {selectedPool.token0}
							</Typography>
							<TextField
								fullWidth
								placeholder="0.0"
								value={amount0}
								onChange={e => setAmount0(e.target.value)}
								type="number"
								InputProps={{
									endAdornment: (
										<Button
											size="small"
											onClick={() =>
												setAmount0(tokenXBalance?.toString() || '0')
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
								Balance: {tokenXBalance || '0'} {selectedPool.token0}
							</Typography>
						</Box>

						<Box sx={{ mb: 3 }}>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Amount of {selectedPool.token1}
							</Typography>
							<TextField
								fullWidth
								placeholder="0.0"
								value={amount1}
								onChange={e => setAmount1(e.target.value)}
								type="number"
								InputProps={{
									endAdornment: (
										<Button
											size="small"
											onClick={() =>
												setAmount1(tokenYBalance?.toString() || '0')
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
								Balance: {tokenYBalance || '0'} {selectedPool.token1}
							</Typography>
						</Box>

						<Card elevation={0} sx={{ backgroundColor: 'grey.50', mb: 3 }}>
							<CardContent>
								<Typography variant="subtitle2" gutterBottom>
									Pool Details
								</Typography>
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
										mb: 1,
									}}
								>
									<Typography variant="body2" color="text.secondary">
										APR
									</Typography>
									<Typography variant="body2">{selectedPool.apr}</Typography>
								</Box>
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
										mb: 1,
									}}
								>
									<Typography variant="body2" color="text.secondary">
										TVL
									</Typography>
									<Typography variant="body2">{selectedPool.tvl}</Typography>
								</Box>
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
									}}
								>
									<Typography variant="body2" color="text.secondary">
										24h Volume
									</Typography>
									<Typography variant="body2">
										{selectedPool.volume24h}
									</Typography>
								</Box>
							</CardContent>
						</Card>

						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={
								!amount0 || !amount1 || isPending || !userWalletAddress
							}
							onClick={handleAddLiquiditySubmit}
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
				) : (
					<Typography>Select a pool to add liquidity</Typography>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default AddLiquidityDialog
