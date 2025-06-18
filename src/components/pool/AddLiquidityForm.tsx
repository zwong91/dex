import {
	Add as AddIcon,
	Refresh as RefreshIcon,
} from '@mui/icons-material'
import {
	Alert,
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Grid,
	Slider,
	TextField,
	Typography,
} from '@mui/material'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'
import { useDexOperations, useTokenBalanceByAddress, createViemClient } from '../../dex'
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
	pairAddress?: string
	binStep?: number
	tokenXAddress?: string
	tokenYAddress?: string
}

interface AddLiquidityFormProps {
	selectedPool: PoolData | null
	chainId: number
	onSuccess?: () => void
}

const AddLiquidityForm = ({
	selectedPool,
	chainId: _chainId,
	onSuccess,
}: AddLiquidityFormProps) => {
	const { address: userWalletAddress } = useAccount()
	const currentChainId = useChainId() // Get current chain ID
	const [amount0, setAmount0] = useState('')
	const [amount1, setAmount1] = useState('')
	const [autoFill, setAutoFill] = useState(false)
	const [slippageTolerance] = useState(1) // Default 1% slippage tolerance

	// Liquidity strategy states
	const [liquidityStrategy, setLiquidityStrategy] = useState<
		'spot' | 'curve' | 'bid-ask'
	>('spot')
	
	// 将现有策略映射到单边流动性策略
	const getSingleSidedStrategy = (strategy: 'spot' | 'curve' | 'bid-ask'): 'conservative' | 'balanced' | 'aggressive' => {
		switch (strategy) {
			case 'curve': return 'conservative'  // 集中分布，高集中度
			case 'spot': return 'balanced'       // 平衡分布，中等集中度
			case 'bid-ask': return 'aggressive'  // 分散分布，低集中度
			default: return 'balanced'
		}
	}

	// Strategy change handler - update dynamic range when strategy changes
	const handleStrategyChange = (newStrategy: 'spot' | 'curve' | 'bid-ask') => {
		setLiquidityStrategy(newStrategy)
		
		// Reset manual price overrides to allow dynamic calculation
		if (!minPrice && !maxPrice) {
			// Trigger re-calculation by updating amounts
			updateDynamicPriceRange(amount0, amount1)
		}
		
		console.log('🔄 Strategy changed to:', newStrategy, 'with amounts:', { amount0, amount1 })
	}

	// Active Bin price - this is the actual current price from the pool
	const activeBinPrice = 19.05560 // USDC per AVAX - this should come from pool data
	const [minPrice, setMinPrice] = useState(activeBinPrice.toString()) // Start at active bin (no left side)
	const [maxPrice, setMaxPrice] = useState((activeBinPrice * 1.05).toString()) // 5% above active bin

	// Current price is the Active Bin price
	const getCurrentPrice = () => {
		return activeBinPrice.toFixed(8) // Active Bin price
	}

	// Get the correct token pair display
	const getTokenPairDisplay = () => {
		if (!selectedPool) return 'TOKEN/TOKEN'
		return `${selectedPool.token1}/${selectedPool.token0}` // USDC per AVAX format
	}

	// Calculate dynamic number of bins and price range based on token amounts and strategy
	const calculateDynamicRange = () => {
		const amt0 = parseFloat(amount0 || '0') // Token X (left input, affects right side bars)
		const amt1 = parseFloat(amount1 || '0') // Token Y (right input, affects left side bars)
		
		// Base range calculation
		let baseRangeMultiplier = 0.05 // 5% default
		
		// Adjust range based on token amounts - more tokens = wider range
		const totalValue = amt0 + amt1 // Simplified - in real case should use USD values
		if (totalValue > 0) {
			// Larger amounts can support wider ranges
			baseRangeMultiplier = Math.min(0.2, 0.05 + (totalValue / 1000) * 0.1)
		}
		
		// Strategy-specific adjustments with correct token mapping
		let leftMultiplier = 0  // Left side (lower prices) - Token Y liquidity
		let rightMultiplier = baseRangeMultiplier // Right side (higher prices) - Token X liquidity
		
		if (liquidityStrategy === 'spot') {
			// Symmetric range for spot strategy
			if (amt0 > 0 && amt1 > 0) {
				// Both tokens provided - symmetric range based on token amounts
				const tokenXRatio = amt0 / (amt0 + amt1) // Token X affects right side
				const tokenYRatio = amt1 / (amt0 + amt1) // Token Y affects left side
				leftMultiplier = baseRangeMultiplier * tokenYRatio * 2
				rightMultiplier = baseRangeMultiplier * tokenXRatio * 2
			} else if (amt0 > 0) {
				// Only Token X - range above current price (right side)
				leftMultiplier = baseRangeMultiplier * 0.1
				rightMultiplier = baseRangeMultiplier * 2
			} else if (amt1 > 0) {
				// Only Token Y - range below current price (left side)
				leftMultiplier = baseRangeMultiplier * 2
				rightMultiplier = baseRangeMultiplier * 0.1
			}
		} else if (liquidityStrategy === 'curve') {
			// Concentrated around current price
			const concentrationFactor = 0.3
			if (amt0 > 0 && amt1 > 0) {
				// Both tokens - symmetric concentration
				leftMultiplier = baseRangeMultiplier * concentrationFactor
				rightMultiplier = baseRangeMultiplier * concentrationFactor
			} else if (amt0 > 0) {
				// Only Token X - slight concentration above current price
				leftMultiplier = baseRangeMultiplier * concentrationFactor * 0.5
				rightMultiplier = baseRangeMultiplier * concentrationFactor * 1.5
			} else if (amt1 > 0) {
				// Only Token Y - slight concentration below current price
				leftMultiplier = baseRangeMultiplier * concentrationFactor * 1.5
				rightMultiplier = baseRangeMultiplier * concentrationFactor * 0.5
			}
		} else if (liquidityStrategy === 'bid-ask') {
			// Wide range for bid-ask strategy
			const spreadFactor = 1.5
			if (amt0 > 0 && amt1 > 0) {
				// Both tokens - wide spread
				leftMultiplier = baseRangeMultiplier * spreadFactor
				rightMultiplier = baseRangeMultiplier * spreadFactor
			} else if (amt0 > 0) {
				// Token X only - DCA strategy selling as price rises
				leftMultiplier = baseRangeMultiplier * 0.2
				rightMultiplier = baseRangeMultiplier * spreadFactor * 2
			} else if (amt1 > 0) {
				// Token Y only - DCA strategy buying as price falls
				leftMultiplier = baseRangeMultiplier * spreadFactor * 2
				rightMultiplier = baseRangeMultiplier * 0.2
			}
		}
		
		return {
			minPrice: activeBinPrice * (1 - leftMultiplier),
			maxPrice: activeBinPrice * (1 + rightMultiplier),
			leftMultiplier,
			rightMultiplier
		}
	}

	// Calculate dynamic number of bins based on price range and bin step
	const getNumBins = () => {
		const binStep = selectedPool?.binStep || 50 // Use 50 as default bin step
		const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
		
		// Use dynamic range if no manual price is set, otherwise use manual prices
		const minPriceNum = parseFloat(minPrice) || dynMinPrice
		const maxPriceNum = parseFloat(maxPrice) || dynMaxPrice

		const binStepFactor = 1 + binStep / 10000
		const baseBinPrice = activeBinPrice

		const minBinId = Math.floor(Math.log(minPriceNum / baseBinPrice) / Math.log(binStepFactor))
		const maxBinId = Math.ceil(Math.log(maxPriceNum / baseBinPrice) / Math.log(binStepFactor))

		const totalBins = Math.abs(maxBinId - minBinId) + 1
		return Math.min(149, Math.max(1, totalBins)).toString()
	}



	// Web3 hooks
	const { addLiquidity } = useDexOperations()
	const tokenXBalance = useTokenBalanceByAddress(
		userWalletAddress,
		selectedPool?.tokenXAddress as `0x${string}`,
	)
	const tokenYBalance = useTokenBalanceByAddress(
		userWalletAddress,
		selectedPool?.tokenYAddress as `0x${string}`,
	)

	const [isPending, setIsPending] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	// Helper functions for 50% and MAX buttons with Auto-Fill support
	const handleAmount0Button = (percentage: number) => {
		const balance = parseFloat(tokenXBalance?.toString() || '0')
		const amount = (balance * percentage).toFixed(6)
		handleAmount0Change(amount)
	}

	const handleAmount1Button = (percentage: number) => {
		const balance = parseFloat(tokenYBalance?.toString() || '0')
		const amount = (balance * percentage).toFixed(6)
		handleAmount1Change(amount)
	}

	// Auto-fill logic - calculate token1 amount based on token0 input and update dynamic range
	const handleAmount0Change = (value: string) => {
		console.log('🔢 Amount0 changed:', value)
		setAmount0(value)

		// Auto-fill calculation when enabled
		if (autoFill) {
			if (value === '' || value === '0' || value === '0.') {
				setAmount1('')
				return
			}

			const numValue = parseFloat(value)
			if (!isNaN(numValue) && numValue > 0) {
				// Calculate based on current price and strategy
				let calculatedAmount1 = 0
				
				if (liquidityStrategy === 'spot') {
					// For spot, maintain price ratio
					calculatedAmount1 = numValue * activeBinPrice * 0.5 // 50% allocation
				} else if (liquidityStrategy === 'curve') {
					// For curve, concentrated around current price
					calculatedAmount1 = numValue * activeBinPrice * 0.8 // 80% allocation to match current price
				} else if (liquidityStrategy === 'bid-ask') {
					// For bid-ask, single-sided is preferred
					calculatedAmount1 = numValue * activeBinPrice * 0.2 // 20% allocation
				}
				
				setAmount1(calculatedAmount1.toFixed(6))
			} else {
				setAmount1('')
			}
		}
		
		// Update dynamic price range based on new amounts
		updateDynamicPriceRange(value, amount1)
	}

	const handleAmount1Change = (value: string) => {
		console.log('🔢 Amount1 changed:', value)
		setAmount1(value)

		// Auto-fill calculation when enabled
		if (autoFill) {
			if (value === '' || value === '0' || value === '0.') {
				setAmount0('')
				return
			}

			const numValue = parseFloat(value)
			if (!isNaN(numValue) && numValue > 0) {
				// Calculate based on current price and strategy
				let calculatedAmount0 = 0
				
				if (liquidityStrategy === 'spot') {
					// For spot, maintain price ratio
					calculatedAmount0 = numValue / activeBinPrice * 0.5 // 50% allocation
				} else if (liquidityStrategy === 'curve') {
					// For curve, concentrated around current price
					calculatedAmount0 = numValue / activeBinPrice * 0.8 // 80% allocation
				} else if (liquidityStrategy === 'bid-ask') {
					// For bid-ask, single-sided is preferred
					calculatedAmount0 = numValue / activeBinPrice * 0.2 // 20% allocation
				}
				
				setAmount0(calculatedAmount0.toFixed(6))
			} else {
				setAmount0('')
			}
		}
		
		// Update dynamic price range based on new amounts
		updateDynamicPriceRange(amount0, value)
	}

	// Update dynamic price range when amounts or strategy changes
	const updateDynamicPriceRange = (amt0: string, amt1: string) => {
		// Only update if user hasn't manually set prices
		if (!minPrice && !maxPrice) {
			const dynamicRange = calculateDynamicRange()
			console.log('📊 Dynamic range calculated for amounts:', { amt0, amt1 }, 'range:', dynamicRange)
			// Don't actually set the state to preserve manual control, just trigger re-render
		}
	}

	const handleAddLiquiditySubmit = async () => {
		console.log('🚀 handleAddLiquiditySubmit called')
		console.log('📊 Current state:', {
			amount0,
			amount1,
			selectedPool,
			userWalletAddress,
			isPending
		})

		// Allow single-sided liquidity provision - at least one amount must be provided
		if ((!amount0 && !amount1) || !selectedPool) {
			console.error('❌ Validation failed: Please enter at least one token amount')
			toast.error('Please enter at least one token amount')
			return
		}

		if (!userWalletAddress) {
			console.error('❌ Validation failed: Please connect your wallet')
			toast.error('Please connect your wallet')
			return
		}

		try {
			console.log('⏳ Starting liquidity addition process...')
			setIsPending(true)
			setError(null)

			// Convert amounts, allowing for single-sided liquidity
			const amt0 = amount0 ? parseFloat(amount0) : 0
			const amt1 = amount1 ? parseFloat(amount1) : 0

			console.log('💰 Parsed amounts:', { amt0, amt1 })

			// Validate that at least one amount is positive
			if (amt0 <= 0 && amt1 <= 0) {
				console.error('❌ Amount validation failed: Please enter at least one valid amount')
				toast.error('Please enter at least one valid amount')
				return
			}

			// Use token addresses directly from selectedPool instead of looking up by symbol
			let tokenXAddress = selectedPool.tokenXAddress
			let tokenYAddress = selectedPool.tokenYAddress

			// Fallback: if addresses are not available in pool data, try to get them from tokens config
			if (!tokenXAddress || !tokenYAddress) {
				console.warn('⚠️ Token addresses not found in pool data, trying to get from tokens config...')
				const tokens = getTokensForChain(currentChainId)
				
				if (!tokenXAddress) {
					const tokenX = tokens.find(t => t.symbol === selectedPool.token0)
					tokenXAddress = tokenX?.address
				}
				
				if (!tokenYAddress) {
					const tokenY = tokens.find(t => t.symbol === selectedPool.token1)
					tokenYAddress = tokenY?.address
				}
				
				console.log('🔄 Fallback addresses:', { tokenXAddress, tokenYAddress })
			}

			console.log('🏦 Pool token addresses:', {
				tokenXAddress,
				tokenYAddress,
				token0Symbol: selectedPool.token0,
				token1Symbol: selectedPool.token1,
				pairAddress: selectedPool.pairAddress,
				binStep: selectedPool.binStep,
				selectedPoolKeys: Object.keys(selectedPool)
			})

			// Validate addresses exist
			if (!tokenXAddress || !tokenYAddress) {
				console.error('❌ Token addresses not found in pool data:', { 
					tokenXAddress, 
					tokenYAddress,
					availablePoolData: selectedPool
				})
				toast.error('Token addresses not found in pool data')
				return
			}

			// Validate address format (should be hex strings)
			if (!tokenXAddress.startsWith('0x') || !tokenYAddress.startsWith('0x')) {
				console.error('❌ Invalid address format:', { tokenXAddress, tokenYAddress })
				toast.error('Invalid token address format')
				return
			}

			// Use the pool's pair address if available, otherwise we need to find it
			const pairAddress = selectedPool.pairAddress || selectedPool.id

			console.log('🔗 Final parameters for addLiquidity:', {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				binStep: selectedPool.binStep,
				userWalletAddress
			})

			if (!pairAddress) {
				console.error('❌ Pair address is undefined')
				toast.error('Pool pair address not found')
				return
			}

			if (!userWalletAddress) {
				console.error('❌ User wallet address is undefined')
				toast.error('Wallet address not found')
				return
			}

			console.log('🚀 Calling addLiquidity function...')
			
			// Final validation before calling addLiquidity
			if (!pairAddress || pairAddress === 'undefined') {
				console.error('❌ Invalid pair address:', pairAddress)
				toast.error('Invalid pool pair address')
				return
			}
			
			if (!tokenXAddress || tokenXAddress === 'undefined' || !tokenXAddress.startsWith('0x')) {
				console.error('❌ Invalid tokenX address:', tokenXAddress)
				toast.error('Invalid token X address')
				return
			}
			
			if (!tokenYAddress || tokenYAddress === 'undefined' || !tokenYAddress.startsWith('0x')) {
				console.error('❌ Invalid tokenY address:', tokenYAddress)
				toast.error('Invalid token Y address')
				return
			}
			
			console.log('🔍 Final validation passed, calling addLiquidity with:', {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				binStep: selectedPool.binStep
			})

			// Get current active bin ID from the pair
			const publicClient = createViemClient(currentChainId)
			const currentActiveBinId = await publicClient.readContract({
				address: pairAddress as `0x${string}`,
				abi: [{
					inputs: [],
					name: 'getActiveId',
					outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
					stateMutability: 'view',
					type: 'function'
				}],
				functionName: 'getActiveId'
			}) as number
			console.log('🎯 Current active bin ID:', currentActiveBinId)
			
			if (!selectedPool.binStep) {
				console.error('❌ Bin step not found in selected pool')
				toast.error('Pool bin step not available')
				return
			}

			// Enhanced pre-transaction validation
			console.log('🔍 Pre-transaction validation...')
			
			// Check token balances
			const tokenXBal = parseFloat(tokenXBalance?.toString() || '0')
			const tokenYBal = parseFloat(tokenYBalance?.toString() || '0')
			
			if (amt0 > 0 && tokenXBal < amt0) {
				console.error('❌ Insufficient Token X balance:', { required: amt0, available: tokenXBal })
				toast.error(`Insufficient ${selectedPool.token0} balance. Required: ${amt0}, Available: ${tokenXBal.toFixed(6)}`)
				return
			}
			
			if (amt1 > 0 && tokenYBal < amt1) {
				console.error('❌ Insufficient Token Y balance:', { required: amt1, available: tokenYBal })
				toast.error(`Insufficient ${selectedPool.token1} balance. Required: ${amt1}, Available: ${tokenYBal.toFixed(6)}`)
				return
			}
			
			// Validate active bin ID is reasonable
			if (currentActiveBinId < 0 || currentActiveBinId > 16777215) { // 2^24 - 1
				console.error('❌ Invalid active bin ID:', currentActiveBinId)
				toast.error('Invalid pool state. Please try a different pool.')
				return
			}
			
			// Validate bin step is supported
			const supportedBinSteps = [1, 5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 500, 1000]
			if (!supportedBinSteps.includes(selectedPool.binStep)) {
				console.error('❌ Unsupported bin step:', selectedPool.binStep)
				toast.error('Unsupported pool bin step.')
				return
			}
			
			// Validate amounts are not too small (avoid precision issues)
			const minAmount = 0.000001 // Minimum meaningful amount
			if (amt0 > 0 && amt0 < minAmount) {
				console.error('❌ Amount0 too small:', amt0)
				toast.error(`${selectedPool.token0} amount too small. Minimum: ${minAmount}`)
				return
			}
			
			if (amt1 > 0 && amt1 < minAmount) {
				console.error('❌ Amount1 too small:', amt1)
				toast.error(`${selectedPool.token1} amount too small. Minimum: ${minAmount}`)
				return
			}
			
			// Validate we have at least one meaningful amount
			if (amt0 === 0 && amt1 === 0) {
				console.error('❌ Both amounts are zero')
				toast.error('Please enter at least one token amount')
				return
			}
			
			console.log('✅ Pre-transaction validation passed')

			console.log('🎯 Final addLiquidity parameters:', {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amount0: amt0,
				amount1: amt1,
				activeBinId: currentActiveBinId,
				binStep: selectedPool.binStep,
				tokenXBalance: tokenXBal,
				tokenYBalance: tokenYBal,
				chainId: currentChainId,
				userAddress: userWalletAddress,
				timestamp: new Date().toISOString()
			})

			// Double-check the addresses are valid
			try {
				// Verify the pair contract exists and is valid
				await publicClient.readContract({
					address: pairAddress as `0x${string}`,
					abi: [{
						inputs: [],
						name: 'getActiveId',
						outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
						stateMutability: 'view',
						type: 'function'
					}],
					functionName: 'getActiveId'
				})
				console.log('✅ Pair contract is valid and responsive')
			} catch (contractError) {
				console.error('❌ Pair contract validation failed:', contractError)
				toast.error('Invalid pool contract. Please try a different pool.')
				return
			}

			// 智能检测是否为单边流动性
			const isSingleSided = amt0 === 0 || amt1 === 0
			const mappedSingleSidedStrategy = getSingleSidedStrategy(liquidityStrategy)
			
			console.log('🎯 Liquidity mode detection:', {
				amt0,
				amt1,
				isSingleSided,
				mode: isSingleSided ? 'single-sided' : 'dual-sided',
				strategy: isSingleSided ? mappedSingleSidedStrategy : 'standard',
				currentStrategy: liquidityStrategy
			})

			await addLiquidity(
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				currentActiveBinId,
				selectedPool.binStep,
				undefined, // deltaIds - 让系统自动计算
				undefined, // distributionX - 让系统自动生成
				undefined, // distributionY - 让系统自动生成
				isSingleSided, // 明确设置单边模式
				isSingleSided ? mappedSingleSidedStrategy : undefined, // 只在单边模式时使用策略
				slippageTolerance // 传递用户设置的滑点容忍度
			)
			console.log('✅ Liquidity added successfully!')
			toast.success('Liquidity added successfully!')
			setIsSuccess(true)
			if (onSuccess) {
				onSuccess()
			}
		} catch (err: unknown) {
			console.error('💥 Add liquidity error:', err)
			const error = err instanceof Error ? err : new Error('Unknown error occurred')
			
			// Enhanced error detection for common issues
			let errorMessage = 'Failed to add liquidity'
			
			if (error.message.includes('User rejected') || error.message.includes('user denied')) {
				errorMessage = 'Transaction was cancelled by user'
			} else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
				errorMessage = 'Insufficient funds for transaction'
			} else if (error.message.includes('allowance') || error.message.includes('ERC20: transfer amount exceeds allowance')) {
				errorMessage = 'Token allowance insufficient. Please approve tokens first.'
			} else if (error.message.includes('execution reverted')) {
				// More specific error detection for execution reverted
				if (error.message.includes('INSUFFICIENT_AMOUNT') || error.message.includes('InsufficientAmount')) {
					errorMessage = 'Insufficient token amount. Try increasing the amount.'
				} else if (error.message.includes('INSUFFICIENT_LIQUIDITY') || error.message.includes('InsufficientLiquidity')) {
					errorMessage = 'Insufficient liquidity in the pool. Try a different amount.'
				} else if (error.message.includes('EXPIRED') || error.message.includes('Expired')) {
					errorMessage = 'Transaction expired. Please try again.'
				} else if (error.message.includes('SLIPPAGE') || error.message.includes('Slippage')) {
					errorMessage = 'Price slippage too high. Try again with higher slippage tolerance.'
				} else if (error.message.includes('INVALID_BIN') || error.message.includes('InvalidBin')) {
					errorMessage = 'Invalid price range. Please adjust your price range.'
				} else if (error.message.includes('ZERO_AMOUNT') || error.message.includes('ZeroAmount')) {
					errorMessage = 'Amount cannot be zero. Please enter a valid amount.'
				} else if (error.message.includes('PAIR_NOT_EXISTS') || error.message.includes('PairNotExists')) {
					errorMessage = 'Pool does not exist. Please select a valid pool.'
				} else if (error.message.includes('DEADLINE_EXCEEDED') || error.message.includes('DeadlineExceeded')) {
					errorMessage = 'Transaction deadline exceeded. Please try again.'
				} else if (error.message.includes('LBRouter__AmountSlippageBPTooBig')) {
					errorMessage = 'Slippage tolerance too high. Please reduce slippage and try again.'
				} else if (error.message.includes('LBRouter__LengthsMismatch')) {
					errorMessage = 'Invalid liquidity distribution parameters. Please try again.'
				} else if (error.message.includes('LBRouter__WrongAmounts')) {
					errorMessage = 'Invalid token amounts. Please check your inputs.'
				} else if (error.message.includes('LBRouter__AmountSlippageCaught')) {
					// 专门处理滑点捕获错误
					const match = error.message.match(/LBRouter__AmountSlippageCaught \(amountXMin=(\d+), amountX=(\d+), amountYMin=(\d+), amountY=(\d+)/)
					if (match) {
						const [, amountXMin, amountX, amountYMin, amountY] = match
						console.error('🎯 Slippage error details:', { amountXMin, amountX, amountYMin, amountY })
						
						errorMessage = `Price slippage protection triggered. Expected minimum: X=${amountXMin}, Y=${amountYMin}, but got: X=${amountX}, Y=${amountY}. Please try again when market conditions are more stable, or try with smaller amounts.`
					} else {
						errorMessage = 'Price slippage too high. The price moved significantly during transaction. Please try again with higher slippage tolerance or when markets are less volatile.'
					}
				} else if (error.message.includes('LBRouter__MaxAmountSlippageExceeded')) {
					errorMessage = 'Amount slippage exceeded. Try with higher slippage tolerance.'
				} else if (error.message.includes('LBRouter__IdSlippageExceeded')) {
					errorMessage = 'Price slippage exceeded. Try again when price is more stable.'
				} else if (error.message.includes('LBRouter__BrokenSwapSafetyCheck')) {
					errorMessage = 'Safety check failed. Please try with smaller amounts.'
				} else if (error.message.includes('LBPair__InsufficientAmounts')) {
					errorMessage = 'Insufficient amounts for this pool. Try increasing your amounts.'
				} else if (error.message.includes('LBPair__OnlyStrictlyIncreasingId')) {
					errorMessage = 'Invalid price range order. Please check your price settings.'
				} else if (error.message.includes('LBPair__ZeroAmountsOut')) {
					errorMessage = 'Zero output amounts. Please try different amounts.'
				} else if (error.message.includes('LBPair__CompositionFactorFlawed')) {
					errorMessage = 'Invalid liquidity composition. Please try different amounts.'
				} else {
					errorMessage = 'Transaction failed (execution reverted). Please check your inputs and try again.'
					
					// Additional debugging for unknown execution reverted errors
					console.error('🔍 Execution reverted - Debug info:', {
						errorMessage: error.message,
						selectedPool: selectedPool?.id,
						amount0,
						amount1,
						userWalletAddress,
						timestamp: new Date().toISOString()
					})
					
					// Provide helpful suggestions
					toast.error('Transaction failed. Try: 1) Reducing amounts, 2) Refreshing price range, 3) Checking token balances', {
						duration: 10000
					})
				}
			} else if (error.message.includes('gas')) {
				errorMessage = 'Transaction failed due to gas issues. Try increasing gas limit.'
			} else if (error.message.includes('nonce')) {
				errorMessage = 'Transaction nonce error. Please reset your wallet and try again.'
			} else if (error.message.includes('network') || error.message.includes('connection')) {
				errorMessage = 'Network connection error. Please check your connection and try again.'
			} else if (error.message) {
				errorMessage = error.message
			}
			
			toast.error(errorMessage)
			setError(error)
		} finally {
			setIsPending(false)
		}
	}

	return (
		<Box>
			{selectedPool ? (
				<Box>
						{/* Token Amounts */}
						<Box sx={{ mb: 4 }}>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
								<Typography variant="h6" fontWeight={600}>
									Enter deposit amount:
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
									<Typography variant="body2" fontWeight={600} color="text.primary">
										Auto-fill amounts based on strategy:
									</Typography>
									<Box
										sx={{
											cursor: 'pointer',
											border: 1,
											borderColor: 'rgba(255, 255, 255, 0.3)',
											borderRadius: '20px',
											px: 2,
											py: 0.5,
											minWidth: '60px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: autoFill ? '#4caf50' : 'transparent',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor: 'rgba(255, 255, 255, 0.5)',
											}
										}}
										onClick={() => setAutoFill(!autoFill)}
									>
										<Typography 
											variant="caption" 
											fontWeight={600} 
											color={autoFill ? 'white' : '#4caf50'}
											sx={{ fontSize: '0.75rem' }}
										>
											{autoFill ? 'ON' : 'OFF'}
										</Typography>
									</Box>
								</Box>
							</Box>

							<Grid container spacing={3}> {/* Increased spacing for better layout */}
								<Grid size={6}>
									<Card
										sx={{
											p: 5, // Increased padding for more space
											backgroundColor: '#2A2D3E',
											border: 1,
											borderColor: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											minHeight: '140px', // Ensure consistent height
										}}
									>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
												<Avatar
													sx={{ width: 32, height: 32 }}
													src={selectedPool.icon0}
													alt={selectedPool.token0}
												>
													{selectedPool.token0.charAt(0)}
												</Avatar>
												<Typography variant="h6" fontWeight={600} color="white">
													{selectedPool.token0}
												</Typography>
											</Box>
											<Box sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-end' }}>
											<TextField
												placeholder="0"
												value={amount0}
												onChange={e => handleAmount0Change(e.target.value)}
												type="number"
												variant="standard"
												inputProps={{
													min: "0",
													step: "any"
												}}
												InputProps={{
													disableUnderline: true,
													sx: {
														fontSize: '2rem',
														fontWeight: 600,
														color: 'white',
														textAlign: 'right',
														minWidth: '80px', // Minimum width
														maxWidth: '200px', // Maximum width
														width: `${Math.max(80, (amount0?.length || 1) * 20 + 40)}px`, // Dynamic width based on content
														'& input': {
															textAlign: 'right',
															color: 'white',
															fontSize: '2rem',
															fontWeight: 600,
															padding: 0,
															width: '100%',
														},
													},
												}}
												sx={{
													'& .MuiInput-root': {
														'&:before': { borderBottom: 'none' },
														'&:after': { borderBottom: 'none' },
														'&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
													},
												}}
											/>
											</Box>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
											<Typography variant="body2" color="text.secondary">
												Balance: {parseFloat(tokenXBalance?.toString() || '0').toFixed(6)}
											</Typography>
											<Box sx={{ display: 'flex', gap: 1 }}>
												<Button
													size="small"
													variant="outlined"
													onClick={() => handleAmount0Button(0.5)}
													sx={{
														minWidth: '55px', // Increased width
														height: '32px', // Increased height
														fontSize: '0.75rem',
														borderColor: 'rgba(255, 255, 255, 0.2)',
														color: 'rgba(255, 255, 255, 0.7)',
														borderRadius: '6px',
														'&:hover': {
															borderColor: 'rgba(255, 255, 255, 0.3)',
															backgroundColor: 'rgba(255, 255, 255, 0.05)',
														},
													}}
												>
													50%
												</Button>
												<Button
													size="small"
													variant="outlined"
													onClick={() => handleAmount0Button(1.0)}
													sx={{
														minWidth: '55px', // Increased width
														height: '32px', // Increased height
														fontSize: '0.75rem',
														borderColor: 'rgba(255, 255, 255, 0.2)',
														color: 'rgba(255, 255, 255, 0.7)',
														borderRadius: '6px',
														'&:hover': {
															borderColor: 'rgba(255, 255, 255, 0.3)',
															backgroundColor: 'rgba(255, 255, 255, 0.05)',
														},
													}}
												>
													MAX
												</Button>
											</Box>
										</Box>
									</Card>
								</Grid>

								<Grid size={6}>
									<Card
										sx={{
											p: 5, // Increased padding for consistency
											backgroundColor: '#2A2D3E',
											border: 1,
											borderColor: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											minHeight: '140px', // Ensure consistent height
										}}
									>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
												<Avatar
													sx={{ width: 32, height: 32 }}
													src={selectedPool.icon1}
													alt={selectedPool.token1}
												>
													{selectedPool.token1.charAt(0)}
												</Avatar>
												<Typography variant="h6" fontWeight={600} color="white">
													{selectedPool.token1}
												</Typography>
											</Box>
											<Box sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-end' }}>
											<TextField
												placeholder="0"
												value={amount1}
												onChange={e => handleAmount1Change(e.target.value)}
												type="number"
												variant="standard"
												inputProps={{
													min: "0",
													step: "any"
												}}
												InputProps={{
													disableUnderline: true,
													sx: {
														fontSize: '2rem',
														fontWeight: 600,
														color: 'white',
														textAlign: 'right',
														minWidth: '80px', // Minimum width
														maxWidth: '200px', // Maximum width
														width: `${Math.max(80, (amount1?.length || 1) * 20 + 40)}px`, // Dynamic width based on content
														'& input': {
															textAlign: 'right',
															color: 'white',
															fontSize: '2rem',
															fontWeight: 600,
															padding: 0,
															width: '100%',
														},
													},
												}}
												sx={{
													'& .MuiInput-root': {
														'&:before': { borderBottom: 'none' },
														'&:after': { borderBottom: 'none' },
														'&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
													},
												}}
											/>
											</Box>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
											<Typography variant="body2" color="text.secondary">
												Balance: {parseFloat(tokenYBalance?.toString() || '0').toFixed(6)}
											</Typography>
											<Box sx={{ display: 'flex', gap: 1 }}>
												<Button
													size="small"
													variant="outlined"
													onClick={() => handleAmount1Button(0.5)}
													sx={{
														minWidth: '55px', // Increased width
														height: '32px', // Increased height
														fontSize: '0.75rem',
														borderColor: 'rgba(255, 255, 255, 0.2)',
														color: 'rgba(255, 255, 255, 0.7)',
														borderRadius: '6px',
														'&:hover': {
															borderColor: 'rgba(255, 255, 255, 0.3)',
															backgroundColor: 'rgba(255, 255, 255, 0.05)',
														},
													}}
												>
													50%
												</Button>
												<Button
													size="small"
													variant="outlined"
													onClick={() => handleAmount1Button(1.0)}
													sx={{
														minWidth: '55px', // Increased width
														height: '32px', // Increased height
														fontSize: '0.75rem',
														borderColor: 'rgba(255, 255, 255, 0.2)',
														color: 'rgba(255, 255, 255, 0.7)',
														borderRadius: '6px',
														'&:hover': {
															borderColor: 'rgba(255, 255, 255, 0.3)',
															backgroundColor: 'rgba(255, 255, 255, 0.05)',
														},
													}}
												>
													MAX
												</Button>
											</Box>
										</Box>
									</Card>
								</Grid>
							</Grid>
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
									Select Volatility Strategy
								</Typography>
							</Box>

							<Grid container spacing={2} sx={{ mb: 2 }}>
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
										onClick={() => handleStrategyChange('spot')}
									>
									<CardContent sx={{ textAlign: 'center', py: 4 }}>
										{/* Spot - Uniform distribution with center split */}
										<Box
											sx={{
												mb: 2,
												display: 'flex',
												justifyContent: 'center',
												alignItems: 'end',
												gap: 0.5,
											}}
										>
											{[30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30].map(
												(height, index) => {
													const isSelected = liquidityStrategy === 'spot'
													const isCenter = index === 6 // Only the right center bar for active price

													if (isSelected && isCenter) {
														// Center bar with split colors (top purple, bottom teal)
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
																background:
																	isSelected
																		? index < 6
																			? '#00D9FF' // Left side - teal
																			: index > 6
																				? '#7B68EE' // Right side - purple
																				: '#4A5568'
																		: '#4A5568',
															}}
														/>
													)
												},
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
													? '#FF6B35'
													: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											backgroundColor: '#1A1B2E',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor:
													liquidityStrategy === 'curve'
														? '#FF6B35'
														: 'rgba(255, 255, 255, 0.2)',
											},
										}}
										onClick={() => handleStrategyChange('curve')}
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
											{[5, 8, 12, 18, 25, 32, 35, 32, 25, 18, 12, 8].map(
												(height, index) => {
													const isSelected = liquidityStrategy === 'curve'
													const isCenter = index === 6 // Only the right center bar for active price

													if (isSelected && isCenter) {
														// Center bar with split colors (top purple, bottom teal)
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
																background:
																	isSelected
																		? index < 6
																			? '#00D9FF' // Left side - teal
																			: index > 6
																				? '#7B68EE' // Right side - purple
																				: '#4A5568'
																		: '#4A5568',
															}}
														/>
													)
												},
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
													? '#FF6B35'
													: 'rgba(255, 255, 255, 0.1)',
											borderRadius: 3,
											backgroundColor: '#1A1B2E',
											transition: 'all 0.2s ease',
											'&:hover': {
												borderColor:
													liquidityStrategy === 'bid-ask'
														? '#FF6B35'
														: 'rgba(255, 255, 255, 0.2)',
											},
										}}
										onClick={() => handleStrategyChange('bid-ask')}
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
											{[30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30].map(
												(height, index) => {
													const isSelected = liquidityStrategy === 'bid-ask'
													const isCenter = index === 6 // Only the right center bar for active price

													if (isSelected && isCenter) {
														// Center bar with split colors (top purple, bottom teal)
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
																background:
																	isSelected
																		? index < 6
																			? '#00D9FF' // Left side - teal
																			: index > 6
																				? '#7B68EE' // Right side - purple
																				: '#4A5568'
																		: '#4A5568',
															}}
														/>
													)
												},
											)}
										</Box>
										<Typography variant="h6" fontWeight={600} color="white">
											Bid-Ask
										</Typography>
									</CardContent>
								</Card>
								</Grid>
							</Grid>

							{/* Strategy Description - Enhanced with dynamic info */}
							<Box sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
								{liquidityStrategy === 'spot' && (
									<Box>
										<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
											Spot provides a uniform distribution that is versatile and risk adjusted, suitable for any type of market and conditions. This is similar to setting a CLMM price range.
										</Typography>
										{(parseFloat(amount0 || '0') > 0 || parseFloat(amount1 || '0') > 0) && (
											<Typography variant="caption" color="rgba(0, 217, 255, 0.8)" sx={{ fontSize: '11px' }}>
												💡 {parseFloat(amount0 || '0') > 0 && parseFloat(amount1 || '0') > 0 
													? 'Symmetric range based on both token amounts' 
													: parseFloat(amount0 || '0') > 0 
													? `Range focuses below current price (${selectedPool?.token0} side)`
													: `Range focuses above current price (${selectedPool?.token1} side)`}
											</Typography>
										)}
									</Box>
								)}
								{liquidityStrategy === 'curve' && (
									<Box>
										<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
											Curve is ideal for a concentrated approach that aims to maximise capital efficiency. This is great for stables or pairs where the price does not change very often.
										</Typography>
										{(parseFloat(amount0 || '0') > 0 || parseFloat(amount1 || '0') > 0) && (
											<Typography variant="caption" color="rgba(123, 104, 238, 0.8)" sx={{ fontSize: '11px' }}>
												💡 Concentrated liquidity around current price - higher capital efficiency with {getNumBins()} bins
											</Typography>
										)}
									</Box>
								)}
								{liquidityStrategy === 'bid-ask' && (
									<Box>
										<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
											Bid-Ask is an inverse Curve distribution, typically deployed single sided for a DCA in or out strategy. It can be used to capture volatility especially when prices vastly move out of the typical range.
										</Typography>
										{(parseFloat(amount0 || '0') > 0 || parseFloat(amount1 || '0') > 0) && (
											<Typography variant="caption" color="rgba(255, 107, 53, 0.8)" sx={{ fontSize: '11px' }}>
												💡 {parseFloat(amount0 || '0') > 0 && parseFloat(amount1 || '0') > 0 
													? 'Wide range distribution for volatility capture' 
													: parseFloat(amount0 || '0') > 0 
													? `DCA out strategy - selling ${selectedPool?.token0} as price rises`
													: `DCA in strategy - buying ${selectedPool?.token0} as price falls`}
											</Typography>
										)}
									</Box>
								)}
							</Box>
						</Box>

						{/* Price Range Configuration */}
						<Box sx={{ mb: 4 }}>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
								Set Price Range
							</Typography>

							<Card
								sx={{
									p: 2, // Reduced from 3 to 2
									backgroundColor: '#2A2D3E',
									border: 1,
									borderColor: 'rgba(255, 255, 255, 0.1)',
									borderRadius: 3,
								}}
							>
								{/* Current Price Display with Reset Button */}
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}> {/* Reduced from mb: 3 to mb: 2 */}
									<Box sx={{ textAlign: 'center', flex: 1 }}>
										<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
											Active Bin Price
										</Typography>
										<Typography variant="h6" fontWeight={600} color="white">
											{getCurrentPrice()} {getTokenPairDisplay()}
										</Typography>
									</Box>
									<Button
										size="small"
										startIcon={<RefreshIcon />}
										onClick={() => {
											setMinPrice(activeBinPrice.toString()) // Start at active bin (no left side)
											setMaxPrice((activeBinPrice * 1.05).toString()) // 5% above active bin
											toast.success('Price range updated to current market price')
										}}
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

								{/* Enhanced Interactive 3D Liquidity Visualization */}
								<Box sx={{ mb: 3, position: 'relative' }}>
									{/* Main 3D price visualization */}
									<Box
										sx={{
											position: 'relative',
											height: 200, // Reduced from 400 to 200
											display: 'flex',
											alignItems: 'flex-end',
											justifyContent: 'stretch',
											gap: '1px',
											background: 'linear-gradient(135deg, #1A1B2E 0%, #252749 50%, #1A1B2E 100%)',
											borderRadius: 3,
											p: 0,
											mb: 2, // Reduced from 3 to 2
											overflow: 'visible',
											'&::before': {
												content: '""',
												position: 'absolute',
												top: 0,
												left: 0,
												right: 0,
												bottom: 0,
												background: 'radial-gradient(ellipse at center bottom, rgba(123, 104, 238, 0.1) 0%, transparent 70%)',
												pointerEvents: 'none',
											},
										}}
									>
										{/* Meteora-style dynamic liquidity visualization */}
										{(() => {
											const amt0 = parseFloat(amount0 || '0') // Token X (left input, right side bars)
											const amt1 = parseFloat(amount1 || '0') // Token Y (right input, left side bars)
											
											// If no tokens provided, show empty state
											if (amt0 === 0 && amt1 === 0) {
												return (
													<Box
														sx={{
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															height: '100%',
															color: 'rgba(255, 255, 255, 0.5)',
															fontSize: '14px',
															fontStyle: 'italic'
														}}
													>
														Enter token amounts to see liquidity distribution
													</Box>
												)
											}

											// Generate bars with proper Meteora logic
											return Array.from({ length: Math.min(149, parseInt(getNumBins())) }, (_, i) => {
												const binStep = selectedPool?.binStep || 50 // Use 50 as default bin step
												const binStepFactor = 1 + binStep / 10000
												const baseBinPrice = activeBinPrice

												// Use dynamic range calculation
												const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
												const minPriceRange = parseFloat(minPrice) || dynMinPrice
												const maxPriceRange = parseFloat(maxPrice) || dynMaxPrice

												const minBinId = Math.floor(Math.log(minPriceRange / baseBinPrice) / Math.log(binStepFactor))
												// Calculate current bin price based on position in range
												const currentBinId = minBinId + i
												const binPrice = baseBinPrice * Math.pow(binStepFactor, currentBinId)

												// Debug: Log some bin prices for verification
												if (i < 5) {
													console.log(`🔍 Bin ${i}: ID=${currentBinId}, Price=${binPrice.toFixed(5)}, BinStep=${binStep}`)
												}

												// Calculate position relative to the range (0-1)
												const position = (binPrice - minPriceRange) / (maxPriceRange - minPriceRange)
												const centerPosition = (activeBinPrice - minPriceRange) / (maxPriceRange - minPriceRange)
												const distance = Math.abs(position - centerPosition)

												// Check if this bar is within the selected range and is the active bin
												const isInRange = binPrice >= minPriceRange && binPrice <= maxPriceRange
												const isCurrentPrice = Math.abs(binPrice - activeBinPrice) < (activeBinPrice * 0.001)

												// Meteora logic: Only show bars where tokens are provided
												let shouldShowBar = false
												if (isCurrentPrice && (amt0 > 0 || amt1 > 0)) {
													// Active bin shows when either token is provided
													shouldShowBar = true
												} else if (binPrice < activeBinPrice && amt1 > 0) {
													// Left side bars only show when Token Y is provided
													shouldShowBar = true
												} else if (binPrice > activeBinPrice && amt0 > 0) {
													// Right side bars only show when Token X is provided
													shouldShowBar = true
												}

												// If bar shouldn't show, return null or minimal height
												if (!shouldShowBar) {
													return (
														<Box
															key={i}
															sx={{
																width: 8,
																height: 30,
																background: 'rgba(255, 255, 255, 0.05)',
																borderRadius: '3px 3px 0 0',
																opacity: 0.3
															}}
														/>
													)
												}

												// Calculate height based on strategy and token amounts
												let height = 30

												// Strategy-specific height calculations with correct token mapping
												if (liquidityStrategy === 'spot') {
													// Uniform distribution adjusted by token amounts
													const baseHeight = 80
													let tokenInfluence = 1
													
													if (isCurrentPrice) {
														// Active bin gets boost from both tokens
														tokenInfluence = 1 + Math.log(1 + (amt0 + amt1)) * 0.8
													} else if (binPrice < activeBinPrice && amt1 > 0) {
														// Left side influenced by Token Y amount - create sawtooth decay pattern
														const distanceFromActive = Math.abs(position - centerPosition)
														const sawtoothDecay = Math.max(0.1, 1 - (distanceFromActive * 3)) // Sharp linear decay
														tokenInfluence = (1 + Math.log(1 + amt1) * 0.8) * sawtoothDecay
													} else if (binPrice > activeBinPrice && amt0 > 0) {
														// Right side influenced by Token X amount - create sawtooth decay pattern
														const distanceFromActive = Math.abs(position - centerPosition)
														const sawtoothDecay = Math.max(0.1, 1 - (distanceFromActive * 3)) // Sharp linear decay
														tokenInfluence = (1 + Math.log(1 + amt0) * 0.8) * sawtoothDecay
													}
													
													height = baseHeight * tokenInfluence
												} else if (liquidityStrategy === 'curve') {
													// Enhanced bell curve with token amount scaling
													const bellCurve = Math.exp(-Math.pow(distance * 4, 2))
													let tokenMultiplier = 1
													
													if (isCurrentPrice) {
														tokenMultiplier = 1 + Math.log(1 + (amt0 + amt1)) * 0.8
													} else if (binPrice < activeBinPrice && amt1 > 0) {
														// Left side - more gradual decay for curve strategy
														const curveDecay = Math.exp(-distance * 2.5)
														tokenMultiplier = (1 + Math.log(1 + amt1) * 0.6) * curveDecay
													} else if (binPrice > activeBinPrice && amt0 > 0) {
														// Right side - more gradual decay for curve strategy
														const curveDecay = Math.exp(-distance * 2.5)
														tokenMultiplier = (1 + Math.log(1 + amt0) * 0.6) * curveDecay
													}
													
													height = (40 + bellCurve * 200) * tokenMultiplier
												} else if (liquidityStrategy === 'bid-ask') {
													// Enhanced bid-ask with token-specific peaks
													let peakHeight = 0
													
													if (isCurrentPrice) {
														// Active bin gets minimal liquidity in bid-ask
														peakHeight = 0.3 + Math.log(1 + (amt0 + amt1)) * 0.1
													} else if (binPrice < activeBinPrice && amt1 > 0) {
														// Left peak (lower prices) enhanced by Token Y - wider sawtooth pattern
														const distanceFromPeak = Math.abs(position - 0.15) // Peak at 15% from left
														const sawtoothPattern = Math.max(0.05, 1 - (distanceFromPeak * 4))
														peakHeight = sawtoothPattern * (1 + Math.log(1 + amt1) * 0.6)
													} else if (binPrice > activeBinPrice && amt0 > 0) {
														// Right peak (higher prices) enhanced by Token X - wider sawtooth pattern
														const distanceFromPeak = Math.abs(position - 0.85) // Peak at 85% from left
														const sawtoothPattern = Math.max(0.05, 1 - (distanceFromPeak * 4))
														peakHeight = sawtoothPattern * (1 + Math.log(1 + amt0) * 0.6)
													}
													
													height = 30 + peakHeight * 250
												}

												// Enhanced color determination with correct token mapping
												let barColor = 'rgba(255, 255, 255, 0.1)'
												let shadowColor = 'rgba(0, 0, 0, 0.3)'
												let glowEffect = 'none'

												if (isCurrentPrice) {
													// Active bin with split colors when both tokens are provided
													if (amt0 > 0 && amt1 > 0) {
														barColor = 'linear-gradient(to bottom, #7B68EE 50%, #00D9FF 50%)'
													} else if (amt0 > 0) {
														barColor = '#7B68EE' // Only Token X - purple
													} else {
														barColor = '#00D9FF' // Only Token Y - teal
													}
													glowEffect = '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
												} else if (isInRange && shouldShowBar) {
													const intensity = Math.min(1, height / 200)
													const depthFactor = 0.7 + (intensity * 0.3)

													if (binPrice < activeBinPrice) {
														// Left side bars - Token Y (USDC) - Teal color
														const tokenYInfluence = Math.min(1, Math.log(1 + amt1) / 3)
														barColor = `linear-gradient(135deg,
															rgba(0, 217, 255, ${(0.8 * depthFactor * tokenYInfluence)}) 0%,
															rgba(0, 150, 200, ${(0.9 * depthFactor * tokenYInfluence)}) 50%,
															rgba(0, 100, 150, ${(0.7 * depthFactor * tokenYInfluence)}) 100%)`
														shadowColor = 'rgba(0, 217, 255, 0.3)'
														glowEffect = `0 0 10px rgba(0, 217, 255, ${0.4 * intensity * tokenYInfluence})`
													} else {
														// Right side bars - Token X (AVAX) - Purple color
														const tokenXInfluence = Math.min(1, Math.log(1 + amt0) / 3)
														barColor = `linear-gradient(135deg,
															rgba(123, 104, 238, ${(0.8 * depthFactor * tokenXInfluence)}) 0%,
															rgba(100, 80, 200, ${(0.9 * depthFactor * tokenXInfluence)}) 50%,
															rgba(80, 60, 160, ${(0.7 * depthFactor * tokenXInfluence)}) 100%)`
														shadowColor = 'rgba(123, 104, 238, 0.3)'
														glowEffect = `0 0 10px rgba(123, 104, 238, ${0.4 * intensity * tokenXInfluence})`
													}
												}

												return (
													<Box
														key={i}
														sx={{
															width: 8,
															height: Math.max(30, height),
															background: barColor,
															borderRadius: '3px 3px 0 0',
															position: 'relative',
															transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
															opacity: 1,
															transform: `
																perspective(1000px)
																rotateX(${isInRange ? '0deg' : '5deg'})
															`,
															boxShadow: `
																${glowEffect},
																0 2px 8px ${shadowColor},
																inset 0 1px 0 rgba(255, 255, 255, 0.2)
															`,
															'&::after': isInRange ? {
																content: '""',

																position: 'absolute',
																top: 0,
																left: 0,
																right: 0,
																bottom: 0,
																background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, transparent 30%)',
																borderRadius: '2px 2px 0 0',
															} : {},
														}}
													/>
												)
											})
										})()}

										{/* Enhanced current price indicator line */}
										<Box sx={{
											position: 'absolute',
											left: '50%',
											top: 0, // Start from the top of container
											bottom: 0, // Go to the bottom of container
											width: 3,
											background: 'linear-gradient(to bottom, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
											transform: 'translateX(-50%)',
											zIndex: 3,
											borderRadius: '2px',
											boxShadow: `
												0 0 20px rgba(255, 255, 255, 0.8),
												0 0 40px rgba(255, 255, 255, 0.4),
												0 4px 8px rgba(0, 0, 0, 0.3)
											`,
										}} />

										{/* Enhanced current price label with 3D effect */}
										<Box sx={{
											position: 'absolute',
											left: '50%',
											top: -45,
											transform: 'translateX(-50%)',
											background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
											color: '#1A1B2E',
											px: 2,
											py: 1,
											borderRadius: 2,
											fontSize: '12px',
											fontWeight: 700,
											zIndex: 4,
											boxShadow: `
												0 4px 20px rgba(0, 0, 0, 0.3),
												0 2px 10px rgba(0, 0, 0, 0.2),
												inset 0 1px 0 rgba(255, 255, 255, 0.8)
											`,
											border: '1px solid rgba(255, 255, 255, 0.3)',
											'&::after': {
												content: '""',
												position: 'absolute',
												top: '100%',
												left: '50%',
												transform: 'translateX(-50%)',
												width: 0,
												height: 0,
												borderLeft: '6px solid transparent',
												borderRight: '6px solid transparent',
												borderTop: '6px solid #ffffff',
												filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
											},
										}}>
											{getCurrentPrice()}
										</Box>

										{/* Range indicators with interactive draggable handles */}
										{/* Min Price Handle - Draggable */}
										<Box
											sx={{
												position: 'absolute',
												left: `${((parseFloat(minPrice || activeBinPrice.toString()) - (activeBinPrice * 0.8)) / ((activeBinPrice * 1.2) - (activeBinPrice * 0.8))) * 100}%`,
												top: 0, // Start from the top of container
												bottom: 0, // Go to the bottom of container
												width: 3,
												background: 'linear-gradient(to bottom, #00D9FF 0%, #0099CC 100%)',
												transform: 'translateX(-50%)',
												zIndex: 3,
												borderRadius: '2px',
												boxShadow: '0 0 15px rgba(0, 217, 255, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)',
												cursor: 'col-resize',
												transition: 'all 0.2s ease',
												'&:hover': {
													width: 5,
													boxShadow: '0 0 20px rgba(0, 217, 255, 0.8), 0 6px 12px rgba(0, 0, 0, 0.4)',
													background: 'linear-gradient(to bottom, #00E5FF 0%, #00B9CC 100%)',
												},
												'&:active': {
													width: 6,
													boxShadow: '0 0 25px rgba(0, 217, 255, 1.0), 0 8px 16px rgba(0, 0, 0, 0.5)',
												}
											}}
											onMouseDown={(e) => {
												e.preventDefault()
												const chartRect = e.currentTarget.parentElement!.getBoundingClientRect()
												const startX = e.clientX
												const startMinPrice = parseFloat(minPrice || activeBinPrice.toString())

												const handleMouseMove = (moveEvent: MouseEvent) => {
													const deltaX = moveEvent.clientX - startX
													const deltaPercent = deltaX / chartRect.width
													const priceRange = (activeBinPrice * 1.2) - (activeBinPrice * 0.8)
													const newMinPrice = Math.max(
														activeBinPrice * 0.8,
														Math.min(
															parseFloat(maxPrice || (activeBinPrice * 1.05).toString()) - 0.01,
															startMinPrice + (deltaPercent * priceRange)
														)
													)
													setMinPrice(newMinPrice.toString())
												}

												const handleMouseUp = () => {
													document.removeEventListener('mousemove', handleMouseMove)
													document.removeEventListener('mouseup', handleMouseUp)
												}

												document.addEventListener('mousemove', handleMouseMove)
												document.addEventListener('mouseup', handleMouseUp)
											}}
										>
											{/* Handle indicator */}
											<Box sx={{
												position: 'absolute',
												top: -8,
												left: '50%',
												transform: 'translateX(-50%)',
												width: 16,
												height: 16,
												borderRadius: '50%',
												background: 'linear-gradient(135deg, #00D9FF 0%, #0099CC 100%)',
												border: '2px solid white',
												boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
												transition: 'all 0.2s ease',
											}} />
										</Box>

										{/* Max Price Handle - Draggable */}
										<Box
											sx={{
												position: 'absolute',
												left: `${((parseFloat(maxPrice || (activeBinPrice * 1.05).toString()) - (activeBinPrice * 0.8)) / ((activeBinPrice * 1.2) - (activeBinPrice * 0.8))) * 100}%`,
												top: 0, // Start from the top of container
												bottom: 0, // Go to the bottom of container
												width: 3,
												background: 'linear-gradient(to bottom, #7B68EE 0%, #5A4FCF 100%)',
												transform: 'translateX(-50%)',
												zIndex: 3,
												borderRadius: '2px',
												boxShadow: '0 0 15px rgba(123, 104, 238, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)',
												cursor: 'col-resize',
												transition: 'all 0.2s ease',
												'&:hover': {
													width: 5,
													boxShadow: '0 0 20px rgba(123, 104, 238, 0.8), 0 6px 12px rgba(0, 0, 0, 0.4)',
													background: 'linear-gradient(to bottom, #8A7AEE 0%, #6A5FCF 100%)',
												},
												'&:active': {
													width: 6,
													boxShadow: '0 0 25px rgba(123, 104, 238, 1.0), 0 8px 16px rgba(0, 0, 0, 0.5)',
												}
											}}
											onMouseDown={(e) => {
												e.preventDefault()
												const chartRect = e.currentTarget.parentElement!.getBoundingClientRect()
												const startX = e.clientX
												const startMaxPrice = parseFloat(maxPrice || (activeBinPrice * 1.05).toString())

												const handleMouseMove = (moveEvent: MouseEvent) => {
													const deltaX = moveEvent.clientX - startX
													const deltaPercent = deltaX / chartRect.width
													const priceRange = (activeBinPrice * 1.2) - (activeBinPrice * 0.8)
													const newMaxPrice = Math.min(
														activeBinPrice * 1.2,
														Math.max(
															parseFloat(minPrice || activeBinPrice.toString()) + 0.01,
															startMaxPrice + (deltaPercent * priceRange)
														)
													)
													setMaxPrice(newMaxPrice.toString())
												}

												const handleMouseUp = () => {
													document.removeEventListener('mousemove', handleMouseMove)
													document.removeEventListener('mouseup', handleMouseUp)
												}

												document.addEventListener('mousemove', handleMouseMove)
												document.addEventListener('mouseup', handleMouseUp)
											}}
										>
											{/* Handle indicator */}
											<Box sx={{
												position: 'absolute',
												top: -8,
												left: '50%',
												transform: 'translateX(-50%)',
												width: 16,
												height: 16,
												borderRadius: '50%',
												background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
												border: '2px solid white',
												boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
												transition: 'all 0.2s ease',
											}} />
										</Box>
									</Box>

									{/* Enhanced 3D price scale with hover effects */}
									<Box sx={{
										display: 'flex',
										justifyContent: 'space-between',
										fontSize: '10px',
										color: 'text.secondary',
										mb: 4,
										px: 2,
										py: 1,
										backgroundColor: 'rgba(255, 255, 255, 0.02)',
										borderRadius: 2,
										border: '1px solid rgba(255, 255, 255, 0.05)',
									}}>
										{Array.from({ length: 11 }, (_, i) => {
											const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
											const minRange = parseFloat(minPrice) || dynMinPrice
											const maxRange = parseFloat(maxPrice) || dynMaxPrice
											const totalRange = maxRange - minRange
											const price = minRange + (i * totalRange / 10)
											const isInRange = price >= minRange && price <= maxRange
											const isActivePrice = Math.abs(price - activeBinPrice) < (activeBinPrice * 0.01)

											return (
												<Box
													key={i}
													sx={{
														textAlign: 'center',
														transition: 'all 0.3s ease',
														'&:hover': {
															transform: 'translateY(-2px)',
															color: 'white',
														},
													}}
												>
													<Typography
														variant="caption"
														sx={{
															fontSize: '9px',
															fontWeight: isActivePrice ? 700 : isInRange ? 600 : 400,
															color: isActivePrice ? '#ffffff' : 
																  price < activeBinPrice ? '#00D9FF' : 
																  price > activeBinPrice ? '#7B68EE' : 'text.secondary',
															transition: 'color 0.3s ease',
														}}
													>
														{price.toFixed(5)}
													</Typography>
												</Box>
											)
										})}
									</Box>
								</Box>

								{/* Enhanced 3D Interactive Price Range Slider */}
								<Box sx={{ px: 3, mb: 4 }}>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
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
													setMinPrice(newValue[0].toString())
													setMaxPrice(newValue[1].toString())
												}
											}}
											valueLabelDisplay="auto"
											min={activeBinPrice * 0.8} // 20% below active bin
											max={activeBinPrice * 1.2} // 20% above active bin
											step={activeBinPrice * 0.001} // 0.1% steps
											sx={{
												height: 12,
												'& .MuiSlider-thumb': {
													backgroundColor: 'white',
													border: '3px solid #7B68EE',
													width: 28,
													height: 28,
													boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)',
													transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
													'&::before': {
														content: '""',
														position: 'absolute',
														width: 16,
														height: 16,
														borderRadius: '50%',
														background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
													},
													'&:hover': {
														boxShadow: '0 0 0 16px rgba(123, 104, 238, 0.16), 0 4px 20px rgba(0, 0, 0, 0.3)',
														transform: 'scale(1.1)',
													},
													'&:active': {
														transform: 'scale(1.2)',
													},
													'&.Mui-focusVisible': {
														boxShadow: '0 0 0 20px rgba(123, 104, 238, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3)',
													},
												},
												'& .MuiSlider-thumb:first-of-type': {
													borderColor: '#00D9FF',
													'&::before': {
														background: 'linear-gradient(135deg, #00D9FF 0%, #0099CC 100%)',
													},
													'&:hover': {
														boxShadow: '0 0 0 16px rgba(0, 217, 255, 0.16), 0 4px 20px rgba(0, 0, 0, 0.3)',
													},
													'&.Mui-focusVisible': {
														boxShadow: '0 0 0 20px rgba(0, 217, 255, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3)',
													},
												},
												'& .MuiSlider-track': {
													background: 'linear-gradient(90deg, #00D9FF 0%, #7B68EE 100%)',
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
													background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 100%)',
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
													color: 'rgba(255, 255, 255, 0.6)',
													fontSize: '10px',
													fontWeight: 500,
												},
											}}
										/>
									</Box>
								</Box>

								{/* Enhanced Price Information Grid with Dynamic Info */}
								<Grid container spacing={2} sx={{ mb: 2 }}> {/* Reduced spacing from 3 to 2 and mb from 3 to 2 */}
									<Grid size={4}>
										<Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(0, 217, 255, 0.1)', borderRadius: 2 }}> {/* Reduced p from 2 to 1.5 */}
											<Typography variant="body2" color="text.secondary" gutterBottom>
												Min Price
											</Typography>
											<Typography variant="h6" fontWeight={600} color="white">
												{(() => {
													const { minPrice: dynMinPrice } = calculateDynamicRange()
													const displayMinPrice = parseFloat(minPrice) || dynMinPrice
													return displayMinPrice.toFixed(6)
												})()}
											</Typography>
											<Typography
												variant="body2"
												color={(() => {
													const { minPrice: dynMinPrice } = calculateDynamicRange()
													const displayMinPrice = parseFloat(minPrice) || dynMinPrice
													return displayMinPrice < activeBinPrice ? '#00D9FF' : '#7B68EE'
												})()}
												fontWeight={600}
											>
												{(() => {
													const { minPrice: dynMinPrice } = calculateDynamicRange()
													const displayMinPrice = parseFloat(minPrice) || dynMinPrice
													const percentChange = Math.abs(((displayMinPrice / activeBinPrice) - 1) * 100)
													return (displayMinPrice < activeBinPrice ? '-' : '+') + percentChange.toFixed(2) + '%'
												})()}
											</Typography>
											{!minPrice && (
												<Typography variant="caption" color="rgba(0, 217, 255, 0.7)" sx={{ fontSize: '10px' }}>
													Auto-calculated
												</Typography>
											)}
										</Box>
									</Grid>
									<Grid size={4}>
										<Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(123, 104, 238, 0.1)', borderRadius: 2 }}> {/* Reduced p from 2 to 1.5 */}
											<Typography variant="body2" color="text.secondary" gutterBottom>
												Max Price
											</Typography>
											<Typography variant="h6" fontWeight={600} color="white">
												{(() => {
													const { maxPrice: dynMaxPrice } = calculateDynamicRange()
													const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
													return displayMaxPrice.toFixed(6)
												})()}
											</Typography>
											<Typography
												variant="body2"
												color={(() => {
													const { maxPrice: dynMaxPrice } = calculateDynamicRange()
													const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
													return displayMaxPrice < activeBinPrice ? '#00D9FF' : '#7B68EE'
												})()}
												fontWeight={600}
											>
												{(() => {
													const { maxPrice: dynMaxPrice } = calculateDynamicRange()
													const displayMaxPrice = parseFloat(maxPrice) || dynMaxPrice
													const percentChange = Math.abs(((displayMaxPrice / activeBinPrice) - 1) * 100)
													return (displayMaxPrice < activeBinPrice ? '-' : '+') + percentChange.toFixed(2) + '%'
												})()}
											</Typography>
											{!maxPrice && (
												<Typography variant="caption" color="rgba(123, 104, 238, 0.7)" sx={{ fontSize: '10px' }}>
													Auto-calculated
												</Typography>
											)}
										</Box>
									</Grid>
									<Grid size={4}>
										<Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}> {/* Reduced p from 2 to 1.5 */}
											<Typography variant="body2" color="text.secondary" gutterBottom>
												Num Bins
											</Typography>
											<Typography variant="h6" fontWeight={600} color="white">
												{getNumBins()}
											</Typography>
											{/* Show token distribution info */}
											<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '10px' }}>
												{(() => {
													const amt0 = parseFloat(amount0 || '0')
													const amt1 = parseFloat(amount1 || '0')
													if (amt0 > 0 && amt1 > 0) {
														return `${selectedPool?.token0}: ${((amt0 / (amt0 + amt1)) * 100).toFixed(0)}%`
													} else if (amt0 > 0) {
														return `${selectedPool?.token0} only`
													} else if (amt1 > 0) {
														return `${selectedPool?.token1} only`
													}
													return 'No tokens set'
												})()}
											</Typography>
										</Box>
									</Grid>
								</Grid>
							</Card>
						</Box>

						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={
								(!amount0 && !amount1) || isPending || !userWalletAddress
							}
							onClick={() => {
								console.log('🖱️ Add Liquidity button clicked!')
								console.log('🔍 Button state check:', {
									amount0,
									amount1,
									isPending,
									userWalletAddress,
									isDisabled: (!amount0 && !amount1) || isPending || !userWalletAddress
								})
								handleAddLiquiditySubmit()
							}}
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
				) : (
					<Typography>Select a pool to add liquidity</Typography>
				)}
		</Box>
	)
}

export default AddLiquidityForm
