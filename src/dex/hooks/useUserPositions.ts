import { type Token } from '@lb-xyz/sdk-core'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { createViemClient } from '../viemClient'
import { LIQUIDITY_HELPER_ADDRESSES } from '../dexConfig'
import { LiquidityHelperV2ABI } from '../abis/liquidityHelper'
import { formatLargeNumber, formatPercentage, formatPrice, safeBigIntToNumber } from '../utils/formatters'
import { getSDKTokensForChain } from '../lbSdkConfig'
import { calculatePositionValue, calculatePriceRange, calculateRealisticFees, estimateAPR, getTokenIcon } from '../utils/calculations'
import type { UserPosition } from './types'
import { useAllLBPairs } from './useLBPairData'

// Re-export types for external use
export type { UserPosition } from './types'

// Hook to get user's liquidity positions using LiquidityHelperV2
export const useUserLiquidityPositions = (userAddress: `0x${string}` | undefined) => {
	const [positions, setPositions] = useState<UserPosition[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const chainId = useChainId()

	// Get all available LB pairs
	const { pairs: allPairs } = useAllLBPairs()

	const fetchUserPositions = useCallback(async () => {
		console.log('=== FETCHING USER LIQUIDITY POSITIONS ===')
		console.log('fetchUserPositions called:', {
			userAddress,
			chainId,
			allPairsLength: allPairs?.length || 0
		})

		if (!userAddress) {
			console.log('No user address, setting empty positions')
			setPositions([])
			return
		}

		if (!allPairs || allPairs.length === 0) {
			console.log('No LB pairs found')
			setPositions([])
			return
		}

		try {
			setLoading(true)
			setError(null)

			// Check if we're on a supported network
			const supportedChains = [56, 97, 1] // BSC Mainnet, BSC Testnet, Ethereum
			if (!supportedChains.includes(chainId)) {
				throw new Error(`Unsupported network. Please switch to BSC Testnet (chainId: 97)`)
			}

			const liquidityHelperAddress = LIQUIDITY_HELPER_ADDRESSES[chainId]
			console.log('LiquidityHelper address for chain:', chainId, 'address:', liquidityHelperAddress)

			if (!liquidityHelperAddress || liquidityHelperAddress === '0x0000000000000000000000000000000000000000') {
				console.warn('LiquidityHelper not configured for chain:', chainId)
				throw new Error(`LiquidityHelper not available for chain ${chainId}`)
			}

			const client = createViemClient(chainId)

			// Test RPC connection first
			try {
				const blockNumber = await client.getBlockNumber()
				console.log('✅ RPC connection successful, current block:', blockNumber)
			} catch (rpcError) {
				console.error('❌ RPC connection failed:', rpcError)
				throw new Error(`Failed to connect to network (chainId: ${chainId}). Please check your internet connection and try again.`)
			}

			console.log(`🔍 Checking user positions across ${allPairs.length} LB pairs`)

			const userPositions: UserPosition[] = []

			// Process each LB pair to find user positions
			for (const pair of allPairs) {
				console.log(`🔍 Checking pair: ${pair.tokenX}/${pair.tokenY} at ${pair.pairAddress}`)
				
				try {
					// Get the active bin for this pair
					const activeBin = await client.readContract({
						address: pair.pairAddress as `0x${string}`,
						abi: [{
							inputs: [],
							name: 'getActiveId',
							outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
							stateMutability: 'view',
							type: 'function'
						}],
						functionName: 'getActiveId'
					}) as number

					console.log(`📍 Active bin for ${pair.tokenX}/${pair.tokenY}:`, activeBin)

					// Use LiquidityHelper to get user's bins for this pair
					// Check a reasonable range around the active bin
					const lengthLeft = 200  // Check 200 bins to the left
					const lengthRight = 200 // Check 200 bins to the right

					const [, userBins] = await client.readContract({
						address: liquidityHelperAddress as `0x${string}`,
						abi: LiquidityHelperV2ABI,
						functionName: 'getBinsReserveOf',
						args: [
							pair.pairAddress as `0x${string}`,
							userAddress,
							activeBin,
							lengthLeft,
							lengthRight
						]
					}) as [number, Array<{
						id: number
						reserveX: bigint
						reserveY: bigint
						shares: bigint
						totalShares: bigint
					}>]

					console.log(`📊 Found ${userBins.length} bins with user liquidity in ${pair.tokenX}/${pair.tokenY}`)

					if (userBins.length === 0) {
						console.log(`❌ No liquidity found for user in ${pair.tokenX}/${pair.tokenY}`)
						continue
					}

					// Get token info
					const allTokens = getSDKTokensForChain(chainId) as Record<string, Token>
					const token0 = Object.values(allTokens).find(token => token.symbol === pair.tokenX)
					const token1 = Object.values(allTokens).find(token => token.symbol === pair.tokenY)

					if (!token0 || !token1) {
						console.warn('Token not found in SDK mapping, skipping pair:', pair.pairAddress)
						continue
					}

					// Calculate total user amounts across all bins
					let totalUserAmountX = 0
					let totalUserAmountY = 0
					let totalLiquidity = BigInt(0)

					for (const bin of userBins) {
						// Calculate user's share in this bin
						const sharePercentage = bin.totalShares > 0 ? 
							Number(bin.shares * BigInt(10000) / bin.totalShares) / 100 : 0

						// Convert reserves to readable numbers
						const reserveXNumber = safeBigIntToNumber(bin.reserveX, token0.decimals)
						const reserveYNumber = safeBigIntToNumber(bin.reserveY, token1.decimals)

						// Calculate user's portion
						const userAmountXInBin = reserveXNumber * sharePercentage / 100
						const userAmountYInBin = reserveYNumber * sharePercentage / 100

						totalUserAmountX += userAmountXInBin
						totalUserAmountY += userAmountYInBin
						totalLiquidity += bin.shares

						console.log(`📊 Bin ${bin.id}: shares=${bin.shares.toString()}, totalShares=${bin.totalShares.toString()}, share=${sharePercentage.toFixed(4)}%`)
					}

					console.log(`💰 Total amounts for ${pair.tokenX}/${pair.tokenY}:`, {
						totalUserAmountX,
						totalUserAmountY,
						totalLiquidity: totalLiquidity.toString()
					})

					// Calculate position value in USD
					const positionValue = await calculatePositionValue(
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN',
						totalUserAmountX,
						totalUserAmountY
					)

					// Calculate price range (using first and last bin)
					const priceRange = await calculatePriceRange(
						activeBin,
						pair.binStep,
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN'
					)

					// Extract numeric value for calculations
					const numericPositionValue = parseFloat(positionValue.replace(/[$,BMK]/g, '')) *
						(positionValue.includes('B') ? 1000000000 :
						 positionValue.includes('M') ? 1000000 :
						 positionValue.includes('K') ? 1000 : 1)

					// Calculate total share percentage across all bins
					const totalSharePercentage = userBins.reduce((sum, bin) => {
						const sharePercentage = bin.totalShares > 0 ? 
							Number(bin.shares * BigInt(10000) / bin.totalShares) / 100 : 0
						return sum + sharePercentage
					}, 0)

					// Calculate realistic fees
					const feeData = await calculateRealisticFees(
						totalSharePercentage,
						pair.binStep,
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN',
						numericPositionValue
					)

					// Estimate APR
					const estimatedAPR = estimateAPR(token0.symbol || 'UNKNOWN', token1.symbol || 'UNKNOWN', pair.binStep)

					// Format data
					const formattedLiquidity = formatLargeNumber(Number(totalLiquidity) / Math.pow(10, 18))
					const formattedAmountX = formatLargeNumber(totalUserAmountX)
					const formattedAmountY = formatLargeNumber(totalUserAmountY)
					const formattedShares = formatPercentage(totalSharePercentage)

					// Parse fee amount for splitting between tokens
					const feeAmount = feeData.fees24h.replace('$', '')
					let numericFeeAmount = parseFloat(feeAmount.replace(/[BMK]/g, ''))

					if (feeAmount.includes('B')) {
						numericFeeAmount *= 1000000000
					} else if (feeAmount.includes('M')) {
						numericFeeAmount *= 1000000
					} else if (feeAmount.includes('K')) {
						numericFeeAmount *= 1000
					}

					// Check if position is in range (user has liquidity in active bin or close to it)
					const inRange = userBins.some(bin => Math.abs(bin.id - activeBin) <= 5)

					const position: UserPosition = {
						id: `${pair.pairAddress}`,
						binId: activeBin,
						binStep: pair.binStep,
						token0: token0.symbol || 'UNKNOWN',
						token1: token1.symbol || 'UNKNOWN',
						token0Address: pair.tokenXAddress,
						token1Address: pair.tokenYAddress,
						icon0: getTokenIcon(token0.symbol || 'UNK'),
						icon1: getTokenIcon(token1.symbol || 'UNK'),
						pairAddress: pair.pairAddress,
						liquidity: formattedLiquidity,
						value: positionValue,
						apr: estimatedAPR,
						fees24h: feeData.fees24h,
						feesTotal: feeData.feesTotal,
						range: {
							min: formatPrice(priceRange.min),
							max: formatPrice(priceRange.max),
							current: formatPrice(priceRange.current),
						},
						inRange: inRange,
						performance: inRange ? '+2.45%' : '-0.15%', // Simple logic for demo
						amountX: formattedAmountX,
						amountY: formattedAmountY,
						feeX: (numericFeeAmount * 0.5).toFixed(2),
						feeY: (numericFeeAmount * 0.5).toFixed(2),
						shares: formattedShares,
					}

					console.log(`✅ Created position for ${pair.tokenX}/${pair.tokenY}:`, {
						value: position.value,
						liquidity: position.liquidity,
						inRange: position.inRange,
						binCount: userBins.length
					})

					userPositions.push(position)

				} catch (pairError) {
					console.warn(`Error processing pair ${pair.pairAddress}:`, pairError)
					// Continue processing other pairs
				}
			}

			console.log(`🎯 Final result: Found ${userPositions.length} positions for user`)
			setPositions(userPositions)

		} catch (error) {
			console.error('Error fetching user positions:', error)
			setError(error instanceof Error ? error.message : 'Failed to fetch positions')
			setPositions([])
		} finally {
			setLoading(false)
		}
	}, [userAddress, allPairs, chainId])

	useEffect(() => {
		fetchUserPositions()
	}, [fetchUserPositions])

	return { positions, loading, error, refetch: fetchUserPositions }
}
