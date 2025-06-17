import {
	Add as AddIcon,
	Close as CloseIcon,
	Info as InfoIcon,
	KeyboardArrowDown as KeyboardArrowDownIcon,
	Warning as WarningIcon,
} from '@mui/icons-material'
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
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useDexOperations } from '../../dex'
import { getTokensForChain } from '../../dex/networkTokens'
import { generateTokenIcon } from '../../dex/utils/tokenIconGenerator'

interface CreatePoolDialogProps {
	open: boolean
	onClose: () => void
	chainId: number
	onTokenSelectOpen: (type: 'token' | 'quote') => void
	newPoolToken0: string
	newPoolToken1: string
	newPoolToken0Address: string
	newPoolToken1Address: string
	setNewPoolToken0: (token: string) => void
	setNewPoolToken1: (token: string) => void
	setNewPoolToken0Address: (address: string) => void
	setNewPoolToken1Address: (address: string) => void
	onPoolCreated?: () => void // Optional callback when pool is created
}

const binStepOptions = [
	{ value: '0.1%', baseFee: '0.1%', label: '0.1%' },
	{ value: '0.25%', baseFee: '0.25%', label: '0.25%' },
	{ value: '0.5%', baseFee: '0.4%', label: '0.5%' },
	{ value: '1%', baseFee: '0.8%', label: '1%' },
]

const baseFeeOptions = [
	'0.01%', '0.02%', '0.03%', '0.04%', '0.05%', '0.1%', '0.15%', '0.2%', '0.25%',
	'0.3%', '0.4%', '0.6%', '0.8%', '1%', '2%', '5%'
]

// Custom hook to fetch live price from Binance API
const useBinancePrice = (symbol: string | null) => {
	const [price, setPrice] = useState<string>('')
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!symbol) return

		const fetchPrice = async () => {
			try {
				setLoading(true)
				const response = await fetch(
					`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
				)
				const data = await response.json()
				if (data.price) {
					setPrice(parseFloat(data.price).toFixed(6))
				}
			} catch (error) {
				console.error('Failed to fetch price from Binance:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchPrice()
		// Refresh price every 30 seconds
		const interval = setInterval(fetchPrice, 30000)

		return () => clearInterval(interval)
	}, [symbol])

	return { price, loading }
}

const CreatePoolDialog = ({
	open,
	onClose,
	chainId,
	onTokenSelectOpen,
	newPoolToken0,
	newPoolToken1,
	newPoolToken0Address,
	newPoolToken1Address,
	setNewPoolToken0,
	setNewPoolToken1,
	setNewPoolToken0Address,
	setNewPoolToken1Address,
	onPoolCreated,
}: CreatePoolDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [selectedBinStep, setSelectedBinStep] = useState('0.25%')
	const [selectedBaseFee, setSelectedBaseFee] = useState('0.25%')
	const [activePrice, setActivePrice] = useState('600.00')
	const [isCreatingPool, setIsCreatingPool] = useState(false)
	const [poolExists, setPoolExists] = useState<{
		exists: boolean
		pairAddress?: string
		checked: boolean
	}>({ exists: false, checked: false })

	// Web3 hooks
	const { createPool, checkPoolExists } = useDexOperations()

	// Get tokens for current chain
	const tokens = getTokensForChain(chainId)

	// Set default token addresses on load
	useEffect(() => {
		const token0 = tokens.find(t => t.symbol === 'BNB' || t.symbol === 'WBNB')
		const token1 = tokens.find(t => t.symbol === 'USDT')

		if (token0 && !newPoolToken0Address) {
			setNewPoolToken0Address(token0.address)
			setNewPoolToken0('BNB') // Set default Base Token symbol
		}

		if (token1 && !newPoolToken1Address) {
			setNewPoolToken1Address(token1.address)
			setNewPoolToken1('USDT') // Set default Quote Token symbol
		}
	}, [tokens, newPoolToken0Address, newPoolToken1Address, setNewPoolToken0, setNewPoolToken1])

	// Get current market price from Binance API
	const token0Symbol = newPoolToken0 || 'BNB'
	const token1Symbol = newPoolToken1 || 'USDT'

	// Constants for reuse
	const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI']
	const isBaseTokenStable = stablecoins.includes(token0Symbol)

	// Build Binance symbol with proper mapping
	const buildBinanceSymbol = useMemo(() => {
		return (baseToken: string, quoteToken: string) => {
			// If tokens are the same, return null (fixed rate 1:1)
			if (baseToken === quoteToken) {
				return { symbol: null, inverted: false }
			}

			// Handle stablecoin pairs specially
			// If both tokens are stablecoins, return null (we'll use fixed rate ~1.0)
			if (stablecoins.includes(baseToken) && stablecoins.includes(quoteToken)) {
				return { symbol: null, inverted: false }
			}

			// Map common tokens to Binance equivalents
			const tokenMap: { [key: string]: string } = {
				WBNB: 'BNB',
				WETH: 'ETH',
				WBTC: 'BTC',
			}

			const mappedBase = tokenMap[baseToken] || baseToken
			const mappedQuote = tokenMap[quoteToken] || quoteToken

			// For USDC/ETH pair, we want to show how many USDC per 1 ETH
			// Binance ETHUSDC gives ETH price in USDC (e.g. 2618 USDC per ETH)
			if (mappedBase === 'USDC' && mappedQuote === 'ETH') {
				return { symbol: 'ETHUSDC', inverted: false }
			}

			// For USDT/ETH pair, we want to show how many USDT per 1 ETH
			// Binance ETHUSDT gives ETH price in USDT (e.g. 2618 USDT per ETH)
			if (mappedBase === 'USDT' && mappedQuote === 'ETH') {
				return { symbol: 'ETHUSDT', inverted: false }
			}

			// For USDT/BNB pair, we want to show how many USDT per 1 BNB
			// Binance BNBUSDT gives BNB price in USDT (e.g. 600 USDT per BNB)
			if (mappedBase === 'USDT' && mappedQuote === 'BNB') {
				return { symbol: 'BNBUSDT', inverted: false }
			}

			// For BNB/USDT pair, we want to show how many BNB per 1 USDT
			// Need to invert BNBUSDT (1/600 = 0.00167)
			if (mappedBase === 'BNB' && mappedQuote === 'USDT') {
				return { symbol: 'BNBUSDT', inverted: true }
			}

			// For ETH/USDC pair, we want to show how many ETH per 1 USDC
			// Need to invert ETHUSDC (1/2618 = 0.000382)
			if (mappedBase === 'ETH' && mappedQuote === 'USDC') {
				return { symbol: 'ETHUSDC', inverted: true }
			}

			// For ETH/USDT pair, we want to show how many ETH per 1 USDT
			// Need to invert ETHUSDT (1/2618 = 0.000382)
			if (mappedBase === 'ETH' && mappedQuote === 'USDT') {
				return { symbol: 'ETHUSDT', inverted: true }
			}

			// Define major trading pairs in correct order
			const majorPairs = [
				'BTCUSDT',
				'ETHUSDT',
				'BNBUSDT',
				'ADAUSDT',
				'XRPUSDT',
				'BTCUSDC',
				'ETHUSDC',
				'BNBUSDC',
				'ETHBTC',
				'BNBBTC',
				'ADABTC',
			]

			// Try to find the correct pair order
			const pair1 = `${mappedBase}${mappedQuote}`
			const pair2 = `${mappedQuote}${mappedBase}`

			if (majorPairs.includes(pair1)) {
				return { symbol: pair1, inverted: false }
			} else if (majorPairs.includes(pair2)) {
				return { symbol: pair2, inverted: true }
			}

			// Default fallback
			return { symbol: pair1, inverted: false }
		}
	}, [])

	const binanceSymbolData = buildBinanceSymbol(token0Symbol, token1Symbol)
	const { price: binancePrice, loading: priceLoading } = useBinancePrice(
		binanceSymbolData?.symbol,
	)

	// Calculate display price
	const displayPrice = useMemo(() => {
		if (!binancePrice) {
			// Default fallback prices for common pairs
			if (token0Symbol === 'BNB' && token1Symbol === 'USDT') {
				return '600.00' // Default BNB per USDT
			}
			if (token0Symbol === 'USDT' && (token1Symbol === 'WBNB' || token1Symbol === 'BNB')) {
				return '0.00167' // Default USDT per BNB (1/600)
			}
			if (token0Symbol === 'USDC' && token1Symbol === 'ETH') {
				return '2618.45' // Default USDC per ETH
			}
			if (token0Symbol === 'USDT' && token1Symbol === 'ETH') {
				return '2618.45' // Default USDT per ETH
			}
			if ((token0Symbol === 'WBNB' || token0Symbol === 'BNB') && token1Symbol === 'USDT') {
				return '600.00' // Default BNB per USDT
			}
			if (token0Symbol === 'ETH' && token1Symbol === 'USDC') {
				return '0.000382' // Default ETH per USDC (1/2618)
			}
			if (token0Symbol === 'ETH' && token1Symbol === 'USDT') {
				return '0.000382' // Default ETH per USDT (1/2618)
			}
			// For stablecoin pairs or same tokens
			return '1.0'
		}

		const price = parseFloat(binancePrice)
		if (binanceSymbolData?.inverted) {
			return (1 / price).toFixed(8)
		}
		return price.toFixed(6)
	}, [binancePrice, binanceSymbolData, token0Symbol, token1Symbol])

	// Update active price when display price changes
	useEffect(() => {
		if (displayPrice && displayPrice !== '1.0') {
			setActivePrice(displayPrice)
		}
	}, [displayPrice])

	// Check if pool exists when tokens or bin step changes
	useEffect(() => {
		const checkPool = async () => {
			if (newPoolToken0Address && newPoolToken1Address && selectedBinStep) {
				const binStepBasisPoints = Math.floor(
					parseFloat(selectedBinStep.replace('%', '')) * 100,
				)

				try {
					const result = await checkPoolExists(
						newPoolToken0Address,
						newPoolToken1Address,
						binStepBasisPoints,
					)
					setPoolExists({
						exists: result.exists,
						pairAddress: result.pairAddress,
						checked: true,
					})
				} catch (error) {
					console.error('Error checking pool exists:', error)
					setPoolExists({ exists: false, checked: true })
				}
			} else {
				setPoolExists({ exists: false, checked: false })
			}
		}

		checkPool()
	}, [
		newPoolToken0Address,
		newPoolToken1Address,
		selectedBinStep,
		checkPoolExists,
	])

	const handleCreateNewPool = async () => {
		if (!newPoolToken0Address || !newPoolToken1Address) {
			toast.error('Please select both tokens')
			return
		}

		if (!userWalletAddress) {
			toast.error('Please connect your wallet')
			return
		}

		setIsCreatingPool(true)

		try {
			// Convert bin step percentage to basis points (e.g., "0.25%" -> 25)
			const binStepBasisPoints = Math.floor(
				parseFloat(selectedBinStep.replace('%', '')) * 100,
			)

			// Validate active price
			const activePriceFloat = parseFloat(activePrice)
			if (activePriceFloat <= 0) {
				throw new Error('Invalid active price')
			}

			console.log('Creating pool with:', {
				token0: newPoolToken0,
				token1: newPoolToken1,
				token0Address: newPoolToken0Address,
				token1Address: newPoolToken1Address,
				binStep: selectedBinStep,
				binStepBasisPoints,
				baseFee: selectedBaseFee,
				activePrice: activePrice,
			})

			// Call the createPool contract function
			// Pass activePrice as string - createPool will calculate proper price ID using LB SDK
			await createPool(
				newPoolToken0Address,
				newPoolToken1Address,
				binStepBasisPoints,
				activePrice,
				selectedBaseFee,
			)

			toast.success('Pool created successfully!')

			// Call the callback to refresh pool data
			if (onPoolCreated) {
				onPoolCreated()
			}

			handleClose()
		} catch (err: any) {
			console.error('Create new pool error:', err)

			// Handle specific error cases
			let errorMessage = 'Unknown error'

			if (err.message && err.message.includes('LBFactory__LBPairAlreadyExists')) {
				errorMessage = `Pool already exists for ${token0Symbol}/${token1Symbol} with ${selectedBinStep} bin step. Try using a different bin step or tokens.`
			} else if (err.message && err.message.includes('User rejected')) {
				errorMessage = 'Transaction was cancelled by user'
			} else if (err.message && err.message.includes('insufficient funds')) {
				errorMessage = 'Insufficient funds for gas fees'
			} else {
				errorMessage = err.message || err.toString()
			}

			toast.error(`Failed to create pool: ${errorMessage}`)
		} finally {
			setIsCreatingPool(false)
		}
	}

	const handleClose = () => {
		// Reset form
		setNewPoolToken0('BNB')
		setNewPoolToken1('USDT')
		setNewPoolToken0Address('')
		setNewPoolToken1Address('')
		setSelectedBinStep('0.25%')
		setSelectedBaseFee('0.25%')
		setActivePrice('600.00')
		onClose()
	}

	const handleTokenSelect = (type: 'token' | 'quote') => {
		onTokenSelectOpen(type)
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
					Create Pool
					<IconButton onClick={handleClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				<Box sx={{ pt: 2 }}>
					{/* Base Token  */}
					<Typography
						variant="h6"
						gutterBottom
						sx={{ fontWeight: 600, mb: 2 }}
					>
						Base Token
					</Typography>

					<Button
						fullWidth
						variant="outlined"
						onClick={() => handleTokenSelect('token')}
						sx={{
							p: 2,
							mb: 3,
							justifyContent: 'space-between',
							border: isBaseTokenStable ? '2px solid #dc2626' : '1px solid #e0e0e0',
							backgroundColor: isBaseTokenStable ? '#fef2f2' : '#f8f9ff',
							'&:hover': {
								backgroundColor: isBaseTokenStable ? '#fee2e2' : '#f0f2ff'
							},
						}}
						endIcon={<KeyboardArrowDownIcon />}
					>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<Avatar
								sx={{
									width: 24,
									height: 24,
									fontSize: '14px',
								}}
							>
								<img src={generateTokenIcon(token0Symbol, 24)} alt={token0Symbol} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
							</Avatar>
							<Box sx={{ textAlign: 'left' }}>
								<Typography
									variant="body1"
									sx={{ fontWeight: 600, color: 'black' }}
								>
									{token0Symbol}
								</Typography>
								<Typography
									variant="body2"
									sx={{ color: 'text.secondary' }}
								>
									{tokens.find(t => t.symbol === token0Symbol)?.name || 'Binance Coin'}
								</Typography>
							</Box>
						</Box>
					</Button>

					{/* Base Token Warning */}
					{isBaseTokenStable && (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								p: 1.5,
								mb: 2,
								backgroundColor: '#fef2f2',
								border: '1px solid #fecaca',
								borderRadius: 1,
							}}
						>
							<WarningIcon sx={{ fontSize: 18, color: '#dc2626' }} />
							<Typography
								variant="body2"
								sx={{ color: '#dc2626', fontSize: '0.875rem' }}
							>
								Your Base token is set to {token0Symbol}. {token0Symbol} is usually used as the Quote token.
							</Typography>
						</Box>
					)}

					{/* Quote Token  */}
					<Typography
						variant="h6"
						gutterBottom
						sx={{ fontWeight: 600, mb: 2 }}
					>
						Quote Token
					</Typography>
					<Typography
						variant="body2"
						sx={{ color: 'text.secondary', mb: 2 }}
					>
						BNB or stables (e.g. USDC, USDT) are usually used as the Quote token,
						which represents the price used to trade the Base token.
					</Typography>

					<Button
						fullWidth
						variant="outlined"
						onClick={() => handleTokenSelect('quote')}
						sx={{
							p: 2,
							mb: 3,
							justifyContent: 'space-between',
							border: '1px solid #e0e0e0',
							backgroundColor: '#f8f9ff',
							'&:hover': { backgroundColor: '#f0f2ff' },
						}}
						endIcon={<KeyboardArrowDownIcon />}
					>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<Avatar
								sx={{
									width: 24,
									height: 24,
									fontSize: '14px',
								}}
							>
								<img src={generateTokenIcon(token1Symbol, 24)} alt={token1Symbol} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
							</Avatar>
							<Box sx={{ textAlign: 'left' }}>
								<Typography
									variant="body1"
									sx={{ fontWeight: 600, color: 'black' }}
								>
									{token1Symbol}
								</Typography>
								<Typography
									variant="body2"
									sx={{ color: 'text.secondary' }}
								>
									{tokens.find(t => t.symbol === token1Symbol)?.name || 'Tether USD'}
								</Typography>
							</Box>
						</Box>
					</Button>

					{/* Base Fee */}
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
						<Typography
							variant="h6"
							sx={{ fontWeight: 600 }}
						>
							Base Fee
						</Typography>
						<Tooltip
							title="The base trading fee percentage charged for each swap. Lower fees attract more trading volume but reduce fee earnings."
							placement="top"
						>
							<InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
						</Tooltip>
					</Box>

					<ToggleButtonGroup
						value={selectedBaseFee}
						exclusive
						onChange={(_, value) => value && setSelectedBaseFee(value)}
						sx={{ mb: 3, width: '100%', flexWrap: 'wrap' }}
					>
						{baseFeeOptions.map(option => (
							<ToggleButton
								key={option}
								value={option}
								sx={{
									minWidth: '70px',
									border: '1px solid #e0e0e0 !important',
									'&.Mui-selected': {
										backgroundColor: 'primary.main',
										color: 'white',
										'&:hover': { backgroundColor: 'primary.dark' },
									},
								}}
							>
								<Typography variant="body2" fontWeight={600}>
									{option}
								</Typography>
							</ToggleButton>
						))}
					</ToggleButtonGroup>

					{/* Bin Step Selection */}
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
						<Typography
							variant="h6"
							sx={{ fontWeight: 600 }}
						>
							Bin Step
						</Typography>
						<Tooltip
							title="The price interval between bins. Smaller bin steps provide tighter liquidity concentration but may have lower trading volume."
							placement="top"
						>
							<InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
						</Tooltip>
					</Box>

					<ToggleButtonGroup
						value={selectedBinStep}
						exclusive
						onChange={(_, value) => value && setSelectedBinStep(value)}
						sx={{ mb: 3, width: '100%' }}
					>
						{binStepOptions.map(option => (
							<ToggleButton
								key={option.value}
								value={option.value}
								sx={{
									flex: 1,
									border: '1px solid #e0e0e0 !important',
									'&.Mui-selected': {
										backgroundColor: 'primary.main',
										color: 'white',
										'&:hover': { backgroundColor: 'primary.dark' },
									},
								}}
							>
								<Box sx={{ textAlign: 'center' }}>
									<Typography variant="body2" fontWeight={600}>
										{option.label}
									</Typography>
									<Typography
										variant="caption"
										sx={{
											color: 'inherit',
											opacity: 0.7,
										}}
									>
										{option.baseFee} base fee
									</Typography>
								</Box>
							</ToggleButton>
						))}
					</ToggleButtonGroup>

					{/* Initial Price */}
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
						<Typography
							variant="h6"
							sx={{ fontWeight: 600 }}
						>
							Initial Price
						</Typography>
						<Tooltip
							title="The starting price for the pool. This determines the active bin where trading begins. Use market price for optimal liquidity."
							placement="top"
						>
							<InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
						</Tooltip>
					</Box>

					<Grid container spacing={2} sx={{ mb: 3 }}>
						<Grid size={8}>
							<TextField
								fullWidth
								label={`Price (${token0Symbol} per ${token1Symbol})`}
								value={activePrice}
								onChange={e => setActivePrice(e.target.value)}
								type="number"
								helperText={
									priceLoading
										? 'Loading market price...'
										: (
											<span>
												<img
													src="https://bin.bnbstatic.com/static/images/common/favicon.ico"
													alt="Binance"
													style={{
														width: '16px',
														height: '16px',
														verticalAlign: 'middle',
														marginRight: '6px'
													}}
												/>
												Market price: {parseFloat(displayPrice).toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 6
												})} {token0Symbol}/{token1Symbol}. {
													binanceSymbolData?.symbol ? (
														<a
															href={`https://www.binance.com/en/trade/${binanceSymbolData.symbol}`}
															target="_blank"
															rel="noopener noreferrer"
															style={{
																color: '#1976d2',
																textDecoration: 'underline',
																cursor: 'pointer'
															}}
														>
															Verify
														</a>
													) : 'Verify'
												} before using.
											</span>
										)
								}
							/>
						</Grid>
						<Grid size={4}>
							<Button
								fullWidth
								variant="outlined"
								onClick={() => setActivePrice(displayPrice)}
								disabled={priceLoading || !displayPrice}
								sx={{ height: '56px' }}
							>
								Use Market Price
							</Button>
						</Grid>
					</Grid>

					{/* Pool Exists Warning */}
					{poolExists.checked && poolExists.exists && (
						<Box
							sx={{
								p: 2,
								mb: 2,
								backgroundColor: '#fff3cd',
								border: '1px solid #ffeaa7',
								borderRadius: 1,
							}}
						>
							<Typography
								variant="body2"
								sx={{ color: '#856404', fontWeight: 500 }}
							>
								⚠️ Pool already exists for {token0Symbol}/{token1Symbol} with {selectedBinStep} bin step.
								{poolExists.pairAddress && (
									<>
										<br />
										<Typography
											component="span"
											variant="caption"
											sx={{ color: '#6c757d' }}
										>
											Pair Address: {poolExists.pairAddress}
										</Typography>
									</>
								)}
								<br />
								Try using a different bin step or token pair.
							</Typography>
						</Box>
					)}

					{/* Create Pool Button */}
					<Button
						fullWidth
						variant="contained"
						size="large"
						disabled={
							!newPoolToken0Address ||
							!newPoolToken1Address ||
							!activePrice ||
							isCreatingPool ||
							!userWalletAddress ||
							(poolExists.checked && poolExists.exists)
						}
						onClick={handleCreateNewPool}
						startIcon={
							isCreatingPool ? <CircularProgress size={20} /> : <AddIcon />
						}
						sx={{
							py: 2,
							fontSize: '1.1rem',
							fontWeight: 600,
						}}
					>
						{!userWalletAddress
							? 'Connect Wallet'
							: poolExists.checked && poolExists.exists
								? 'Pool Already Exists'
								: isCreatingPool
									? 'Creating Pool...'
									: 'Create Pool'}
					</Button>
				</Box>
			</DialogContent>
		</Dialog>
	)
}

export default CreatePoolDialog
export type { CreatePoolDialogProps }
