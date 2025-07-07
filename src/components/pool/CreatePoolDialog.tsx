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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'
import { useDexOperations } from '../../dex'
import { getSDKTokensForChain, wagmiChainIdToSDKChainId } from '../../dex/lbSdkConfig'
import { generateTokenIcon } from '../../dex/utils/tokenIconGenerator'
import { LB_FACTORY_V22_ADDRESS, jsonAbis } from '@lb-xyz/sdk-v2'
import { createViemClient } from '../../dex/viemClient'



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
	{ value: '0.01%', baseFee: '2%', label: '0.01%' },
	{ value: '0.02%', baseFee: '3%', label: '0.02%' },
	{ value: '0.05%', baseFee: '4%', label: '0.05%' },
	{ value: '0.1%', baseFee: '10%', label: '0.1%' },
	{ value: '0.15%', baseFee: '15%', label: '0.15%' },
	{ value: '0.20%', baseFee: '20%', label: '0.20%' },
	{ value: '0.25%', baseFee: '25%', label: '0.25%' },
]

const baseFeeOptions = [
	'2%', '3%', '4%', '5%', '6%', '8%', '10%', '15%', '20%', '25%',
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

// Hook to fetch available bin steps from LB Factory
const useAvailableBinSteps = () => {
	const [availableBinSteps, setAvailableBinSteps] = useState<number[]>([])
	const [loading, setLoading] = useState(false)
	const chainId = useChainId()

	const fetchAvailableBinSteps = useCallback(async () => {
		if (!chainId) return

		try {
			setLoading(true)
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				console.warn('LB Factory not supported on chain:', chainId)
				setAvailableBinSteps([])
				return
			}

			const publicClient = createViemClient(chainId)

			// Call getOpenBinSteps on the LB Factory
			const openBinSteps = await publicClient.readContract({
				address: factoryAddress as `0x${string}`,
				abi: jsonAbis.LBFactoryV21ABI,
				functionName: 'getOpenBinSteps'
			}) as bigint[]

			// Convert BigInt array to number array
			const binStepsNumbers = openBinSteps.map(step => Number(step))
			console.log('✅ Available bin steps from factory:', binStepsNumbers)
			setAvailableBinSteps(binStepsNumbers)
		} catch (error) {
			console.error('❌ Failed to fetch available bin steps:', error)
			// Fallback to common bin steps if factory query fails
			setAvailableBinSteps([1, 5, 10, 15, 20, 25, 50, 100])
		} finally {
			setLoading(false)
		}
	}, [chainId])

	useEffect(() => {
		fetchAvailableBinSteps()
	}, [fetchAvailableBinSteps])

	return { availableBinSteps, loading }
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
	const { availableBinSteps, loading: binStepsLoading } = useAvailableBinSteps()

	// Get tokens for current chain (use SDK config for 100% match)
	const tokens = getSDKTokensForChain(chainId)

	// Create dynamic bin step options based on available factory presets
	const dynamicBinStepOptions = useMemo(() => {
		if (binStepsLoading || availableBinSteps.length === 0) {
			// Fallback to default options while loading or if no data
			return binStepOptions
		}

		// Convert available bin steps (basis points) to percentage options
		return availableBinSteps.map(binStep => {
			const percentage = (binStep / 100).toFixed(2) + '%'
			const baseFeePercentage = Math.min(binStep / 4, 25) // Simple fee calculation
			return {
				value: percentage,
				baseFee: `${baseFeePercentage.toFixed(0)}%`,
				label: percentage
			}
		}).sort((a, b) => parseFloat(a.value) - parseFloat(b.value)) // Sort by percentage
	}, [availableBinSteps, binStepsLoading])

	// Update selected bin step to a valid option when available bin steps change
	useEffect(() => {
		if (!binStepsLoading && dynamicBinStepOptions.length > 0) {
			const currentBinStepBasisPoints = Math.floor(parseFloat(selectedBinStep.replace('%', '')) * 100)
			
			// Check if current selection is valid
			const isCurrentValid = availableBinSteps.includes(currentBinStepBasisPoints)
			
			if (!isCurrentValid) {
				// Try to find 25 basis points (0.25%) first, then fallback to the first available
				const preferredBinStep = availableBinSteps.find(step => step === 25)
				const fallbackBinStep = preferredBinStep || availableBinSteps[0]
				const newSelectedBinStep = (fallbackBinStep / 100).toFixed(2) + '%'
				
				console.log('🔄 Updating bin step selection to valid option:', {
					oldSelection: selectedBinStep,
					newSelection: newSelectedBinStep,
					availableBinSteps
				})
				
				setSelectedBinStep(newSelectedBinStep)
			}
		}
	}, [availableBinSteps, binStepsLoading, dynamicBinStepOptions, selectedBinStep])

	// Initialize defaults when dialog opens (only if no tokens are set)
	useEffect(() => {
		if (open && tokens) {
			const bnbToken = tokens['BNB']
			const usdtToken = tokens['USDT']
			
			if (bnbToken && usdtToken) {
				// Only set defaults if both tokens are empty/unset
				if (!newPoolToken0 && !newPoolToken1) {
					setNewPoolToken0('BNB')
					setNewPoolToken0Address(bnbToken.address)
					setNewPoolToken1('USDT')
					setNewPoolToken1Address(usdtToken.address)
					
					console.log('🚀 Dialog opened, setting initial defaults:', {
						BNB: bnbToken.address,
						USDT: usdtToken.address
					})
				}
			}
		}
	}, [open, tokens, newPoolToken0, newPoolToken1, setNewPoolToken0, setNewPoolToken0Address, setNewPoolToken1, setNewPoolToken1Address])

	// Set default token addresses only when empty
	useEffect(() => {
		const token0 = tokens['BNB']
		const token1 = tokens['USDT']

		console.log('🔍 Token configuration debug:', {
			chainId,
			token0: token0 ? { symbol: token0.symbol, address: token0.address } : 'not found',
			token1: token1 ? { symbol: token1.symbol, address: token1.address } : 'not found',
			currentToken0: newPoolToken0,
			currentToken1: newPoolToken1,
			currentToken0Address: newPoolToken0Address,
			currentToken1Address: newPoolToken1Address
		})

		// Only set defaults if no tokens are selected yet
		if (token0 && !newPoolToken0Address && !newPoolToken0) {
			console.log('✅ Setting BNB as default token0:', token0.address)
			setNewPoolToken0Address(token0.address)
			setNewPoolToken0('BNB')
		}

		if (token1 && !newPoolToken1Address && !newPoolToken1) {
			console.log('✅ Setting USDT as default token1:', token1.address)
			setNewPoolToken1Address(token1.address)
			setNewPoolToken1('USDT')
		}
	}, [tokens, chainId, newPoolToken0Address, newPoolToken1Address, newPoolToken0, newPoolToken1, setNewPoolToken0, setNewPoolToken0Address, setNewPoolToken1, setNewPoolToken1Address])

	// Get current market price from Binance API
	const token0Symbol = newPoolToken0 || 'BNB'
	const token1Symbol = newPoolToken1 || 'USDT'

	// Constants for reuse
	const stablecoins = useMemo(() => ['USDC', 'USDT'], [])
	const isBaseTokenStable = useMemo(() => stablecoins.includes(token0Symbol), [stablecoins, token0Symbol])

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

			// For BNB/USDT pair, we need BNBUSDT price (BNB price in USDT)
			// We'll invert it later in displayPrice calculation to get "BNB per USDT"
			if (mappedBase === 'BNB' && mappedQuote === 'USDT') {
				return { symbol: 'BNBUSDT', inverted: false }
			}

			// For USDT/BNB pair, we want BNBUSDT price directly (USDT per BNB)
			if (mappedBase === 'USDT' && mappedQuote === 'BNB') {
				return { symbol: 'BNBUSDT', inverted: false }
			}

			// For BNB/USDC pair, we need BNBUSDC price (BNB price in USDC)
			// We'll invert it later in displayPrice calculation to get "BNB per USDC"
			if (mappedBase === 'BNB' && mappedQuote === 'USDC') {
				return { symbol: 'BNBUSDC', inverted: false }
			}

			// For USDC/BNB pair, we want BNBUSDC price directly (USDC per BNB)
			if (mappedBase === 'USDC' && mappedQuote === 'BNB') {
				return { symbol: 'BNBUSDC', inverted: false }
			}



			// Define major trading pairs in correct order
			const majorPairs = [
				'BTCUSDT',
				'BNBUSDT',
				'BTCUSDC',
				'BNBUSDC',
				'BNBBTC',
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
	}, [stablecoins])

	const binanceSymbolData = buildBinanceSymbol(token0Symbol, token1Symbol)
	const { price: binancePrice, loading: priceLoading } = useBinancePrice(
		binanceSymbolData?.symbol,
	)

	// Calculate display price
	const displayPrice = useMemo(() => {
		if (!binancePrice) {
			// Default fallback prices for common pairs
			if (token0Symbol === 'BNB' && token1Symbol === 'USDT') {
				return '0.00167' // How many BNB per 1 USDT (1/600)
			}
			if (token0Symbol === 'USDT' && token1Symbol === 'BNB') {
				return '600.00' // How many USDT per 1 BNB
			}
			if (token0Symbol === 'BNB' && token1Symbol === 'USDC') {
				return '0.00167' // How many BNB per 1 USDC (1/600, assuming USDC ≈ USDT)
			}
			if (token0Symbol === 'USDC' && token1Symbol === 'BNB') {
				return '600.00' // How many USDC per 1 BNB
			}

			// For stablecoin pairs or same tokens
			return '1.0'
		}

		const price = parseFloat(binancePrice)
		
		// The display price should show: "How many token0 per 1 token1"
		// This is the natural way users think about trading pairs
		
		// Handle price inversion based on token pair
		if (binanceSymbolData?.inverted) {
			// If we got inverted data from Binance, we need to invert it back
			const invertedPrice = 1 / price
			return invertedPrice < 0.01 ? invertedPrice.toFixed(8) : invertedPrice.toFixed(6)
		}
		
		// For direct pairs from Binance, use the price as-is if it makes sense
		// BNBUSDT gives BNB price in USDT (e.g., 600 USDT per BNB)
		// But if our base is BNB and quote is USDT, we want "BNB per USDT" which is 1/600
		if (token0Symbol === 'BNB' && token1Symbol === 'USDT') {
			// We want "BNB per USDT", so invert the BNBUSDT price
			const bnbPerUsdt = 1 / price
			return bnbPerUsdt < 0.01 ? bnbPerUsdt.toFixed(8) : bnbPerUsdt.toFixed(6)
		}
		
		if (token0Symbol === 'USDT' && token1Symbol === 'BNB') {
			// We want "USDT per BNB", which is the direct BNBUSDT price
			return price.toFixed(2)
		}

		// BNBUSDC gives BNB price in USDC (e.g., 600 USDC per BNB)
		// Similar logic for BNB/USDC pairs
		if (token0Symbol === 'BNB' && token1Symbol === 'USDC') {
			// We want "BNB per USDC", so invert the BNBUSDC price
			const bnbPerUsdc = 1 / price
			return bnbPerUsdc < 0.01 ? bnbPerUsdc.toFixed(8) : bnbPerUsdc.toFixed(6)
		}
		
		if (token0Symbol === 'USDC' && token1Symbol === 'BNB') {
			// We want "USDC per BNB", which is the direct BNBUSDC price
			return price.toFixed(2)
		}
		
		return price < 0.01 ? price.toFixed(8) : price.toFixed(6)
	}, [binancePrice, binanceSymbolData, token0Symbol, token1Symbol])

	// Update active price when display price changes or tokens change
	useEffect(() => {
		if (displayPrice && displayPrice !== '1.0') {
			setActivePrice(displayPrice)
		} else {
			// Set reasonable default based on token pair
			if (token0Symbol === 'BNB' && token1Symbol === 'USDT') {
				setActivePrice('0.00167') // BNB per USDT
			} else if (token0Symbol === 'USDT' && token1Symbol === 'BNB') {
				setActivePrice('600.00') // USDT per BNB
			} else if (token0Symbol === 'BNB' && token1Symbol === 'USDC') {
				setActivePrice('0.00167') // BNB per USDC
			} else if (token0Symbol === 'USDC' && token1Symbol === 'BNB') {
				setActivePrice('600.00') // USDC per BNB

			} else {
				setActivePrice('1.0') // Default for unknown pairs
			}
		}
	}, [displayPrice, token0Symbol, token1Symbol])

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

		// Validate token addresses match SDK configuration
		const token0Config = tokens[token0Symbol as keyof typeof tokens]
		const token1Config = tokens[token1Symbol as keyof typeof tokens]
		
		console.log('🔍 Pre-creation validation:', {
			token0Symbol,
			token1Symbol,
			token0Address: newPoolToken0Address,
			token1Address: newPoolToken1Address,
			token0Config: token0Config ? { symbol: token0Config.symbol, address: token0Config.address } : 'not found',
			token1Config: token1Config ? { symbol: token1Config.symbol, address: token1Config.address } : 'not found'
		})

		// Force correct addresses if they don't match
		let finalToken0Address = newPoolToken0Address
		let finalToken1Address = newPoolToken1Address

		if (token0Config && newPoolToken0Address !== token0Config.address) {
			console.warn('⚠️ Token0 address mismatch, correcting...', {
				expected: token0Config.address,
				current: newPoolToken0Address
			})
			finalToken0Address = token0Config.address
			setNewPoolToken0Address(token0Config.address)
		}

		if (token1Config && newPoolToken1Address !== token1Config.address) {
			console.warn('⚠️ Token1 address mismatch, correcting...', {
				expected: token1Config.address,
				current: newPoolToken1Address
			})
			finalToken1Address = token1Config.address
			setNewPoolToken1Address(token1Config.address)
		}

		setIsCreatingPool(true)

		try {
			// Convert bin step percentage to basis points (e.g., "0.25%" -> 25)
			const binStepBasisPoints = Math.floor(
				parseFloat(selectedBinStep.replace('%', '')) * 100,
			)

			// Validate that the selected bin step is available in the factory
			if (availableBinSteps.length > 0 && !availableBinSteps.includes(binStepBasisPoints)) {
				throw new Error(`Bin step ${selectedBinStep} (${binStepBasisPoints} basis points) is not supported by the factory. Available bin steps: ${availableBinSteps.join(', ')} basis points.`)
			}

			// Validate bin step is reasonable
			if (binStepBasisPoints < 1 || binStepBasisPoints > 10000) {
				throw new Error(`Invalid bin step: ${binStepBasisPoints} basis points. Must be between 1 and 10000.`)
			}

			// Validate active price
			const validatedPrice = parseFloat(activePrice)
			
			// For different token pairs, validate reasonable price ranges
			if (token0Symbol === 'BNB' && token1Symbol === 'USDT') {
				// BNB per USDT should be a small decimal (around 0.0016)
				if (validatedPrice > 1) {
					console.warn('⚠️ BNB/USDT price seems too high for "BNB per USDT", user might have entered USDT per BNB')
					// Don't auto-correct, let user decide
				}
			} else if (token0Symbol === 'USDT' && token1Symbol === 'BNB') {
				// USDT per BNB should be in hundreds (around 600)
				if (validatedPrice < 1) {
					console.warn('⚠️ USDT/BNB price seems too low for "USDT per BNB", user might have entered BNB per USDT')
					// Don't auto-correct, let user decide
				}
			} else if (token0Symbol === 'BNB' && token1Symbol === 'USDC') {
				// BNB per USDC should be a small decimal (around 0.0016)
				if (validatedPrice > 1) {
					console.warn('⚠️ BNB/USDC price seems too high for "BNB per USDC", user might have entered USDC per BNB')
					// Don't auto-correct, let user decide
				}
			} else if (token0Symbol === 'USDC' && token1Symbol === 'BNB') {
				// USDC per BNB should be in hundreds (around 600)
				if (validatedPrice < 1) {
					console.warn('⚠️ USDC/BNB price seems too low for "USDC per BNB", user might have entered BNB per USDC')
					// Don't auto-correct, let user decide
				}
			}
			
			// For very small prices, suggest using larger bin steps
			if (validatedPrice < 0.000001 && binStepBasisPoints < 10) {
				throw new Error(`Price ${validatedPrice} is extremely small for bin step ${selectedBinStep}. Try using a larger bin step like 0.1% or higher.`)
			}

			// For very large prices, suggest using smaller bin steps
			if (validatedPrice > 1000000 && binStepBasisPoints > 100) {
				throw new Error(`Price ${validatedPrice} is very large for bin step ${selectedBinStep}. Try using a smaller bin step like 0.01% or 0.05%.`)
			}

			if (validatedPrice <= 0) {
				throw new Error('Invalid active price: must be greater than 0')
			}

			console.log('Creating pool with validated params:', {
				token0: token0Symbol,
				token1: token1Symbol,
				token0Address: finalToken0Address,
				token1Address: finalToken1Address,
				binStep: selectedBinStep,
				binStepBasisPoints,
				baseFee: selectedBaseFee,
				originalPrice: activePrice,
				validatedPrice: validatedPrice,
			})

			// Call the createPool contract function
			// Pass activePrice as string - createPool will calculate proper price ID using LB SDK
			await createPool(
				finalToken0Address,
				finalToken1Address,
				binStepBasisPoints,
				validatedPrice.toString(),
				selectedBaseFee,
			)

			toast.success('Pool created successfully!')

			// Call the callback to refresh pool data
			if (onPoolCreated) {
				onPoolCreated()
			}

			handleClose()
		} catch (err: unknown) {
			const error = err as Error
			console.error('Create new pool error:', error)

			// Handle specific error cases
			let errorMessage = 'Unknown error'

			if (error.message && error.message.includes('LBFactory__BinStepHasNoPreset')) {
				errorMessage = `The selected bin step ${selectedBinStep} is not supported by the factory. Please refresh the page and select from the available options.`
			} else if (error.message && error.message.includes('LBFactory__LBPairAlreadyExists')) {
				errorMessage = `Pool already exists for ${token0Symbol}/${token1Symbol} with ${selectedBinStep} bin step. Try using a different bin step or tokens.`
			} else if (error.message && error.message.includes('User rejected')) {
				errorMessage = 'Transaction was cancelled by user'
			} else if (error.message && error.message.includes('insufficient funds')) {
				errorMessage = 'Insufficient funds for gas fees'
			} else if (error.message && error.message.includes('basis points) is not supported')) {
				// Our client-side validation error
				errorMessage = error.message
			} else {
				errorMessage = error.message || error.toString()
			}

			toast.error(`Failed to create pool: ${errorMessage}`)
		} finally {
			setIsCreatingPool(false)
		}
	}

	const handleClose = () => {
		// Reset form state but don't force specific token selections
		// Let the parent component manage token state
		setSelectedBinStep('0.25%')
		setSelectedBaseFee('0.25%')
		setActivePrice('1.0')
		setIsCreatingPool(false)
		setPoolExists({ exists: false, checked: false })
		
		console.log('🔄 Dialog closed, form reset')
		
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
									{tokens[token0Symbol as keyof typeof tokens]?.name || 'Binance Coin'}
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
									{tokens[token1Symbol as keyof typeof tokens]?.name || 'Tether USD'}
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
						{binStepsLoading && (
							<CircularProgress size={16} sx={{ ml: 1 }} />
						)}
					</Box>

					{binStepsLoading ? (
						<Box sx={{ mb: 3, p: 2, textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: 1 }}>
							<Typography variant="body2" color="text.secondary">
								Loading available bin steps from factory...
							</Typography>
						</Box>
					) : (
						<>
							{availableBinSteps.length > 0 && (
								<Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 1 }}>
									<Typography variant="caption" color="primary.dark">
										💡 Only factory-approved bin steps are shown ({availableBinSteps.length} available). 
										This prevents pool creation failures.
									</Typography>
								</Box>
							)}
							<ToggleButtonGroup
								value={selectedBinStep}
								exclusive
								onChange={(_, value) => value && setSelectedBinStep(value)}
								sx={{ mb: 3, width: '100%' }}
							>
								{dynamicBinStepOptions.map(option => (
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
						</>
					)}

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
												Market rate: {parseFloat(displayPrice).toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 8
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
															Verify on Binance
														</a>
													) : 'Verify rate'
												} before creating pool.
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

					{/* Parameter Warning */}
					{(parseFloat(activePrice) <= 0 || parseFloat(activePrice) > 1000000) && (
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
								⚠️ Warning: Price {activePrice} may cause transaction issues.
								{parseFloat(activePrice) <= 0 && (
									<>
										<br />
										Price must be greater than 0.
									</>
								)}
								{parseFloat(activePrice) > 1000000 && (
									<>
										<br />
										Very large prices (&gt;1M) may require smaller bin steps (0.01% or 0.05%).
									</>
								)}
								<br />
								Please verify the price is correct for your token pair.
							</Typography>
						</Box>
					)}

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
