import {
  Percent,
  Token,
  TokenAmount,
  WNATIVE,
} from "@lb-xyz/sdk-core"
import {
  LB_ROUTER_V22_ADDRESS,
  PairV2,
  RouteV2,
  TradeV2,
  jsonAbis,
} from "@lb-xyz/sdk-v2"
import { useEffect, useState } from "react"
import { erc20Abi, parseUnits } from "viem"
import { useChainId, useWriteContract } from "wagmi"
import { getSDKTokenByAddress, getSDKTokensForChain, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { ReverseSwapQuote, SwapQuote } from "../types"
import { createViemClient } from "../viemClient"
import { useTransactionStore } from "../../stores/transactionStore"

// Enhanced swap using LB SDK with proper slippage and routing
export const useSwapWithSDK = () => {
	const { writeContractAsync } = useWriteContract()
	const chainId = useChainId()
	const { addTransaction, updateTransaction } = useTransactionStore()

	// Check token allowance
	const checkAllowance = async (tokenAddress: string, userAddress: string, spenderAddress: string): Promise<bigint> => {
		try {
			const client = createViemClient(chainId)
			const allowance = await client.readContract({
				address: tokenAddress as `0x${string}`,
				abi: erc20Abi,
				functionName: 'allowance',
				args: [userAddress as `0x${string}`, spenderAddress as `0x${string}`],
			}) as bigint

			console.log(`🔍 Current allowance for ${tokenAddress}:`, allowance.toString())
			return allowance
		} catch (error) {
			console.error('Error checking allowance:', error)
			return 0n
		}
	}

	// Approve token spending
	const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint): Promise<void> => {
		try {
			console.log(`🔑 Approving ${amount.toString()} tokens for ${tokenAddress}`)
			
			// Get token info for better display
			const token = getSDKTokenByAddress(tokenAddress, chainId)
			
			// Create transaction status entry
			const transactionId = addTransaction({
				type: 'approve',
				status: 'pending',
				title: 'Token Approval',
				description: `Approve ${token?.symbol || 'Token'} for trading`,
				chainId: chainId
			})

			try {
				const hash = await writeContractAsync({
					address: tokenAddress as `0x${string}`,
					abi: erc20Abi,
					functionName: 'approve',
					args: [spenderAddress as `0x${string}`, amount],
				})

				// Update transaction with hash
				updateTransaction(transactionId, {
					hash,
					description: `${token?.symbol || 'Token'} approval (Hash: ${hash.slice(0, 10)}...)`
				})

				console.log(`✅ Approval transaction sent: ${hash}`)
				
				const client = createViemClient(chainId)
				await client.waitForTransactionReceipt({ hash })
				console.log(`✅ Approval confirmed for ${tokenAddress}`)
			} catch (txError) {
				// Update transaction status to failed
				updateTransaction(transactionId, {
					status: 'failed',
					errorMessage: (txError as Error).message
				})
				throw txError
			}
		} catch (error) {
			console.error('Error approving token:', error)
			throw new Error(`Failed to approve ${tokenAddress}: ${error}`)
		}
	}	// Ensure token approval for swap
	const ensureTokenApproval = async (
		tokenAddress: string,
		userAddress: string,
		spenderAddress: string,
		amount: bigint
	): Promise<void> => {
		// Skip approval check for native tokens (ETH/BNB)
		if (tokenAddress === '0x0000000000000000000000000000000000000000') {
			return
		}

		console.log('🔍 Checking token approval for swap...')
		const allowance = await checkAllowance(tokenAddress, userAddress, spenderAddress)
		
		if (allowance < amount) {
			console.log(`🔑 Need to approve token: ${tokenAddress}`)
			await approveToken(tokenAddress, spenderAddress, amount)
		} else {
			console.log(`✅ Token already approved: ${tokenAddress}`)
		}
	}

	const swapWithSDK = async (
		fromTokenContractAddress: string,
		toTokenContractAddress: string,
		inputAmount: string,
		recipientWalletAddress: `0x${string}`,
		slippagePercent: string = "0.5"
	) => {
		try {
			// Get tokens by address
			const inputToken = getSDKTokenByAddress(fromTokenContractAddress, chainId)
			const outputToken = getSDKTokenByAddress(toTokenContractAddress, chainId)

			if (!inputToken || !outputToken) {
				throw new Error("Token not found")
			}

			// Create clients
			const publicClient = createViemClient(chainId)
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)

			// Parse input amount
			const typedValueInParsed = parseUnits(inputAmount, inputToken.decimals)
			const amountInToken = new TokenAmount(inputToken, typedValueInParsed)

			// Check if tokens are native
			const nativeToken = WNATIVE[CHAIN_ID]
			const isNativeIn = nativeToken ? inputToken.equals(nativeToken) : false
			const isNativeOut = nativeToken ? outputToken.equals(nativeToken) : false

			// Build routes
			const currentChainTokens = getSDKTokensForChain(chainId)
			const BASES = Object.values(currentChainTokens as Record<string, Token>)
			const allTokenPairs = PairV2.createAllTokenPairs(inputToken, outputToken, BASES)
			const allPairs = PairV2.initPairs(allTokenPairs)
			const allRoutes = RouteV2.createAllRoutes(allPairs, inputToken, outputToken)

			// Get best trade
			const trades = await TradeV2.getTradesExactIn(
				allRoutes,
				amountInToken,
				outputToken,
				isNativeIn,
				isNativeOut,
				publicClient,
				CHAIN_ID
			)

			const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined)
			const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, true) : null

			if (!bestTrade) {
				throw new Error("No valid trade found")
			}

			console.log("Best trade for swap:", bestTrade.toLog())

			// Slippage tolerance and swap call parameters
			const userSlippageTolerance = new Percent(
				Math.floor(parseFloat(slippagePercent) * 100).toString(),
				"10000"
			) // Convert percentage to basis points

			const swapOptions = {
				allowedSlippage: userSlippageTolerance,
				ttl: 3600, // 1 hour
				recipient: recipientWalletAddress,
				feeOnTransfer: false,
			}

			const { methodName, args, value } = bestTrade.swapCallParameters(swapOptions)

			// Get LB Router address
			const lbRouterContractAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]
			if (!lbRouterContractAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			console.log("Swap parameters:", { methodName, args, value, routerAddress: lbRouterContractAddress })

			// Check and approve token if needed (skip for native tokens)
			if (!isNativeIn) {
				console.log("🔍 Ensuring token approval for swap...")
				await ensureTokenApproval(
					fromTokenContractAddress,
					recipientWalletAddress,
					lbRouterContractAddress,
					typedValueInParsed
				)
				console.log("✅ Token approval confirmed, proceeding with swap...")
			}

			// Execute the swap using writeContractAsync
			// Get token info for better display
			const fromToken = getSDKTokenByAddress(fromTokenContractAddress, chainId)
			const toToken = getSDKTokenByAddress(toTokenContractAddress, chainId)
			
			// Create transaction status entry
			const transactionId = addTransaction({
				type: 'swap',
				status: 'pending',
				title: 'Token Swap',
				description: `${fromToken?.symbol} → ${toToken?.symbol} (${inputAmount} ${fromToken?.symbol})`,
				chainId: chainId
			})

			try {
				const txHash = await writeContractAsync({
					address: lbRouterContractAddress as `0x${string}`,
					abi: jsonAbis.LBRouterV22ABI,
					functionName: methodName as any,
					args: args as any,
					value: value ? BigInt(value) : undefined,
				})

				// Update transaction with hash
				updateTransaction(transactionId, {
					hash: txHash,
					description: `${fromToken?.symbol} → ${toToken?.symbol} (Hash: ${txHash.slice(0, 10)}...)`
				})

				console.log("Swap TX sent:", txHash)
				return txHash
			} catch (txError) {
				// Update transaction status to failed
				updateTransaction(transactionId, {
					status: 'failed',
					errorMessage: (txError as Error).message
				})
				throw txError
			}

		} catch (error) {
			console.error("LB SDK swap error:", error)
			throw error
		}
	}

	return { 
		swapWithSDK,
		checkAllowance,
		approveToken,
		ensureTokenApproval 
	}
}

// Hook to get swap quotes with real-time pricing using LB SDK
export const useSwapQuote = (
	amountIn: string,
	tokenInAddress: string,
	tokenOutAddress: string
): SwapQuote => {
	const [quote, setQuote] = useState<SwapQuote>({
		amountOut: '',
		priceImpact: '0.05',
		path: [] as string[],
		tradeFee: {
			feeAmountIn: '0',
			totalFeePct: '0',
		},
		loading: false,
		error: null,
	})

	const chainId = useChainId()

	useEffect(() => {
		const getQuote = async () => {
			if (!amountIn || parseFloat(amountIn) <= 0 || !tokenInAddress || !tokenOutAddress) {
				setQuote(prev => ({
					...prev,
					amountOut: '',
					loading: false,
				}))
				return
			}

			setQuote(prev => ({ ...prev, loading: true, error: null }))

			try {
				// Get tokens by address
				const tokenIn = getSDKTokenByAddress(tokenInAddress, chainId)
				const tokenOut = getSDKTokenByAddress(tokenOutAddress, chainId)

				if (!tokenIn || !tokenOut) {
					throw new Error("Token not found")
				}

				// Create public client
				const publicClient = createViemClient(chainId)
				const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)

				// Parse input amount
				const typedValueInParsed = parseUnits(amountIn, tokenIn.decimals)
				const amountInToken = new TokenAmount(tokenIn, typedValueInParsed)

				// Check if tokens are native
				const nativeToken = WNATIVE[CHAIN_ID]
				const isNativeIn = nativeToken ? tokenIn.equals(nativeToken) : false
				const isNativeOut = nativeToken ? tokenOut.equals(nativeToken) : false

				// Build routes - get tokens for current chain
				const currentChainTokens = getSDKTokensForChain(chainId)
				const BASES = Object.values(currentChainTokens as Record<string, Token>)

				console.log('SDK Debug Info:', {
					chainId: CHAIN_ID,
					tokenIn: tokenIn.symbol,
					tokenOut: tokenOut.symbol,
					basesCount: BASES.length,
					amountIn: amountInToken.toFixed(),
				})

				const allTokenPairs = PairV2.createAllTokenPairs(tokenIn, tokenOut, BASES)
				const allPairs = PairV2.initPairs(allTokenPairs)
				const allRoutes = RouteV2.createAllRoutes(allPairs, tokenIn, tokenOut)

				console.log('Route Info:', {
					tokenPairsCount: allTokenPairs.length,
					pairsCount: allPairs.length,
					routesCount: allRoutes.length,
				})

				// Create trades with better error handling
				let trades: (TradeV2 | undefined)[] = []
				try {
					trades = await TradeV2.getTradesExactIn(
						allRoutes,
						amountInToken,
						tokenOut,
						isNativeIn,
						isNativeOut,
						publicClient,
						CHAIN_ID
					)
					console.log('Raw trades result:', trades.length, 'trades returned')
				} catch (tradeError) {
					console.warn('LB SDK trade creation failed:', tradeError)
					trades = []
				}

				// Filter out undefined trades
				const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined)
				console.log('Valid trades after filtering:', validTrades.length)

				const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, true) : null

				if (!bestTrade) {
					console.warn("No valid trade found via LB SDK")
					throw new Error("No valid trade found via LB SDK")
				}

				console.log("Best trade log:", bestTrade.toLog())

				// Get trade fee information
				const tradeFee = await bestTrade.getTradeFee()

				// Extract quote data
				const outputAmount = bestTrade.outputAmount.toFixed(6)
				const priceImpact = bestTrade.priceImpact.toSignificant(3)
				const routePath = bestTrade.route.path.map(token => token.address)
				const executionPrice = bestTrade.executionPrice.toSignificant(6)
				const feeAmountIn = tradeFee.feeAmountIn.toSignificant(6)
				const totalFeePct = tradeFee.totalFeePct.toSignificant(3)

				setQuote({
					amountOut: outputAmount,
					priceImpact: priceImpact,
					path: routePath,
					tradeFee: {
						feeAmountIn: feeAmountIn,
						totalFeePct: totalFeePct,
					},
					loading: false,
					error: null,
				})

				console.log('Trade executed successfully:', {
					inputAmount: bestTrade.inputAmount.toFixed(6),
					outputAmount,
					priceImpact,
					executionPrice,
					tradeFee: {
						feeAmountIn,
						totalFeePct: `${totalFeePct}%`,
					},
				})

			} catch (error) {
				console.warn('LB SDK quote failed:', error)

				// Simple fallback with default values
				setQuote({
					amountOut: '0.0',
					priceImpact: '0.05',
					path: [tokenInAddress, tokenOutAddress],
					tradeFee: {
						feeAmountIn: '0',
						totalFeePct: '0',
					},
					loading: false,
					error: 'No liquidity data available',
				})
			}
		}

		// Debounce the quote requests
		const timeoutId = setTimeout(getQuote, 300)
		return () => clearTimeout(timeoutId)

	}, [amountIn, tokenInAddress, tokenOutAddress, chainId])

	return quote
}

// Hook to get estimated swap input amount based on desired output amount using LB SDK
export const useReverseSwapQuote = (amountOut: number, tokenIn: `0x${string}`, tokenOut: `0x${string}`): ReverseSwapQuote => {
	const [quote, setQuote] = useState<ReverseSwapQuote>({
		amountIn: null,
		priceImpact: null,
		path: [],
		tradeFee: {
			feeAmountIn: '0',
			totalFeePct: '0',
		},
		loading: false,
		error: null,
	})

	const chainId = useChainId()

	useEffect(() => {
		if (!amountOut || amountOut <= 0 || !tokenIn || !tokenOut) {
			setQuote({
				amountIn: null,
				priceImpact: null,
				path: [],
				tradeFee: {
					feeAmountIn: '0',
					totalFeePct: '0',
				},
				loading: false,
				error: null
			})
			return
		}

		const getQuote = async () => {
			try {
				setQuote(prev => ({ ...prev, loading: true }))

				// Get tokens by address
				const tokenInObj = getSDKTokenByAddress(tokenIn, chainId)
				const tokenOutObj = getSDKTokenByAddress(tokenOut, chainId)

				if (!tokenInObj || !tokenOutObj) {
					throw new Error("Token not found")
				}

				// Create public client
				const publicClient = createViemClient(chainId)
				const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)

				// Parse output amount
				const typedValueOutParsed = parseUnits(amountOut.toString(), tokenOutObj.decimals)
				const amountOutToken = new TokenAmount(tokenOutObj, typedValueOutParsed)

				// Check if tokens are native
				const nativeToken = WNATIVE[CHAIN_ID]
				const isNativeIn = nativeToken ? tokenInObj.equals(nativeToken) : false
				const isNativeOut = nativeToken ? tokenOutObj.equals(nativeToken) : false

				// Build routes - get tokens for current chain
				const currentChainTokens = getSDKTokensForChain(chainId)
				const BASES = Object.values(currentChainTokens as Record<string, Token>)
				const allTokenPairs = PairV2.createAllTokenPairs(tokenInObj, tokenOutObj, BASES)
				const allPairs = PairV2.initPairs(allTokenPairs)
				const allRoutes = RouteV2.createAllRoutes(allPairs, tokenInObj, tokenOutObj)

				// Create trades for exact output with better error handling
				let trades: (TradeV2 | undefined)[] = []
				try {
					trades = await TradeV2.getTradesExactOut(
						allRoutes,
						amountOutToken,
						tokenInObj,
						isNativeIn,
						isNativeOut,
						publicClient,
						CHAIN_ID
					)
				} catch (tradeError) {
					console.warn('LB SDK reverse trade creation failed:', tradeError)
					trades = []
				}

				// Filter out undefined trades
				const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined)
				const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, false) : null // false for exact out

				if (!bestTrade) {
					console.warn("No valid reverse trade found via LB SDK")
					throw new Error("No valid reverse trade found via LB SDK")
				}

				console.log("Best reverse trade log:", bestTrade.toLog())

				// Get trade fee information
				const tradeFee = await bestTrade.getTradeFee()

				// Extract quote data
				const inputAmount = bestTrade.inputAmount.toFixed(6)
				const priceImpact = bestTrade.priceImpact.toSignificant(3)
				const routePath = bestTrade.route.path.map(token => token.address)
				const feeAmountIn = tradeFee.feeAmountIn.toSignificant(6)
				const totalFeePct = tradeFee.totalFeePct.toSignificant(3)

				setQuote({
					amountIn: inputAmount,
					priceImpact: priceImpact,
					path: routePath,
					tradeFee: {
						feeAmountIn: feeAmountIn,
						totalFeePct: totalFeePct,
					},
					loading: false,
					error: null,
				})

			} catch (error) {
				console.warn('LB SDK reverse quote failed:', error)

				// Simple fallback with default values
				setQuote({
					amountIn: '0.0',
					priceImpact: "0.08",
					path: [tokenIn, tokenOut],
					tradeFee: {
						feeAmountIn: '0',
						totalFeePct: '0',
					},
					loading: false,
					error: 'No liquidity data available',
				})
			}
		}

		getQuote()
	}, [amountOut, tokenIn, tokenOut, chainId])

	return quote
}
