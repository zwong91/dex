import { ethers } from 'ethers'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'
import { useDexOperations, useTokenBalanceByAddress, createViemClient } from '../../../../dex'
import { getTokensForChain } from '../../../../dex/networkTokens'
import { LiquidityStrategy } from '../StrategySelection'

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

export const useAddLiquidity = (
	selectedPool: PoolData | null,
	onSuccess?: () => void
) => {
	const { address: userWalletAddress } = useAccount()
	const currentChainId = useChainId()
	const [isPending, setIsPending] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [slippageTolerance] = useState(1)

	const { addLiquidity } = useDexOperations()
	const tokenXBalance = useTokenBalanceByAddress(
		userWalletAddress,
		selectedPool?.tokenXAddress as `0x${string}`,
	)
	const tokenYBalance = useTokenBalanceByAddress(
		userWalletAddress,
		selectedPool?.tokenYAddress as `0x${string}`,
	)

	// Map strategy to single-sided strategy
	const getSingleSidedStrategy = (strategy: LiquidityStrategy): 'conservative' | 'balanced' | 'aggressive' => {
		switch (strategy) {
			case 'curve': return 'conservative'
			case 'spot': return 'balanced'
			case 'bid-ask': return 'aggressive'
			default: return 'balanced'
		}
	}

	const handleAddLiquidity = async (
		amount0: string,
		amount1: string,
		strategy: LiquidityStrategy
	) => {
		console.log('🚀 handleAddLiquidity called')

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

			const amt0 = amount0 ? parseFloat(amount0) : 0
			const amt1 = amount1 ? parseFloat(amount1) : 0

			if (amt0 <= 0 && amt1 <= 0) {
				console.error('❌ Amount validation failed: Please enter at least one valid amount')
				toast.error('Please enter at least one valid amount')
				return
			}

			// Get token addresses
			let tokenXAddress = selectedPool.tokenXAddress
			let tokenYAddress = selectedPool.tokenYAddress

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
			}

			if (!tokenXAddress || !tokenYAddress) {
				console.error('❌ Token addresses not found in pool data')
				toast.error('Token addresses not found in pool data')
				return
			}

			if (!tokenXAddress.startsWith('0x') || !tokenYAddress.startsWith('0x')) {
				console.error('❌ Invalid address format:', { tokenXAddress, tokenYAddress })
				toast.error('Invalid token address format')
				return
			}

			const pairAddress = selectedPool.pairAddress || selectedPool.id

			if (!pairAddress) {
				console.error('❌ Pair address is undefined')
				toast.error('Pool pair address not found')
				return
			}

			// Get current active bin ID
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

			if (!selectedPool.binStep) {
				console.error('❌ Bin step not found in selected pool')
				toast.error('Pool bin step not available')
				return
			}

			// Enhanced pre-transaction validation
			const tokenXBal = tokenXBalance ? parseFloat(ethers.formatUnits(tokenXBalance, 18)) : 0
			const tokenYBal = tokenYBalance ? parseFloat(ethers.formatUnits(tokenYBalance, 18)) : 0
			
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

			// Validate active bin ID
			if (currentActiveBinId < 0 || currentActiveBinId > 16777215) {
				console.error('❌ Invalid active bin ID:', currentActiveBinId)
				toast.error('Invalid pool state. Please try a different pool.')
				return
			}

			// Validate bin step
			const supportedBinSteps = [1, 5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 500, 1000]
			if (!supportedBinSteps.includes(selectedPool.binStep)) {
				console.error('❌ Unsupported bin step:', selectedPool.binStep)
				toast.error('Unsupported pool bin step.')
				return
			}

			// Validate amounts are not too small
			const minAmount = 0.000001
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

			// Verify contract exists
			try {
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

			// Smart detection for single-sided liquidity
			const isSingleSided = amt0 === 0 || amt1 === 0
			const mappedSingleSidedStrategy = getSingleSidedStrategy(strategy)

			await addLiquidity(
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				currentActiveBinId,
				selectedPool.binStep,
				undefined, // deltaIds
				undefined, // distributionX
				undefined, // distributionY
				isSingleSided,
				isSingleSided ? mappedSingleSidedStrategy : undefined,
				slippageTolerance
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
			
			// Enhanced error detection
			let errorMessage = 'Failed to add liquidity'
			
			if (error.message.includes('User rejected') || error.message.includes('user denied')) {
				errorMessage = 'Transaction was cancelled by user'
			} else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
				errorMessage = 'Insufficient funds for transaction'
			} else if (error.message.includes('allowance') || error.message.includes('ERC20: transfer amount exceeds allowance')) {
				errorMessage = 'Token allowance insufficient. Please approve tokens first.'
			} else if (error.message.includes('LBRouter__AmountSlippageCaught')) {
				const match = error.message.match(/LBRouter__AmountSlippageCaught \(amountXMin=(\d+), amountX=(\d+), amountYMin=(\d+), amountY=(\d+)/)
				if (match) {
					const [, amountXMin, amountX, amountYMin, amountY] = match
					errorMessage = `Price slippage protection triggered. Expected minimum: X=${amountXMin}, Y=${amountYMin}, but got: X=${amountX}, Y=${amountY}. Please try again when market conditions are more stable, or try with smaller amounts.`
				} else {
					errorMessage = 'Price slippage too high. The price moved significantly during transaction. Please try again with higher slippage tolerance or when markets are less volatile.'
				}
			} else if (error.message.includes('execution reverted')) {
				if (error.message.includes('INSUFFICIENT_AMOUNT') || error.message.includes('InsufficientAmount')) {
					errorMessage = 'Insufficient token amount. Try increasing the amount.'
				} else if (error.message.includes('INSUFFICIENT_LIQUIDITY') || error.message.includes('InsufficientLiquidity')) {
					errorMessage = 'Insufficient liquidity in the pool. Try a different amount.'
				} else {
					errorMessage = 'Transaction failed (execution reverted). Please check your inputs and try again.'
				}
			} else if (error.message.includes('gas')) {
				errorMessage = 'Transaction failed due to gas issues. Try increasing gas limit.'
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

	return {
		isPending,
		isSuccess,
		error,
		slippageTolerance,
		tokenXBalance,
		tokenYBalance,
		userWalletAddress,
		handleAddLiquidity,
	}
}
