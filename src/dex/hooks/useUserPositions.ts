import { type Token } from '@lb-xyz/sdk-core'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { createViemClient } from '../viemClient'
import { LIQUIDITY_HELPER_ADDRESSES } from '../dexConfig'
import { formatLargeNumber, formatPercentage, formatPrice, safeBigIntToNumber } from '../utils/formatters'
import { getSDKTokensForChain } from '../lbSdkConfig'
import { calculatePositionValue, calculatePriceRange, calculateRealisticFees, estimateAPR, getTokenIcon } from '../utils/calculations'
import { batchFetchPairData } from './contractUtils'
import { calculateActualLPShare } from './liquidityCalculations'
import type { UserPosition } from './types'
import { useUserLPBalances } from './useLBPairData'

// Re-export types for external use
export type { UserPosition } from './types'

// Hook to get user's liquidity positions using LiquidityHelperV2
export const useUserLiquidityPositions = (userAddress: `0x${string}` | undefined) => {
	const [positions, setPositions] = useState<UserPosition[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const chainId = useChainId()

	// Get user LP balances from LB pairs
	const { balances: lpBalances } = useUserLPBalances(userAddress)

	const fetchUserPositions = useCallback(async () => {
		console.log('=== DEBUGGING POSITION FETCH ===')
		console.log('fetchUserPositions called:', {
			userAddress,
			chainId,
			lpBalancesLength: lpBalances?.length || 0,
			lpBalances: lpBalances?.map(b => ({
				pairAddress: b.pairAddress,
				tokenX: b.tokenX,
				tokenY: b.tokenY,
				balance: b.balance.toString()
			}))
		})

		if (!userAddress) {
			console.log('No user address, setting empty positions')
			setPositions([])
			return
		}

		if (!lpBalances || lpBalances.length === 0) {
			console.log('No LP balances found for user')
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
			console.log('Checking LiquidityHelper for chain:', chainId, 'address:', liquidityHelperAddress)

			if (!liquidityHelperAddress || liquidityHelperAddress === '0x0000000000000000000000000000000000000000') {
				console.warn('LiquidityHelper not configured for chain:', chainId)
				// Don't return empty - try to process anyway for demo purposes
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

			// Batch fetch all pair data for better performance
			const pairAddresses = lpBalances.map(b => b.pairAddress)
			console.log('🔍 Fetching data for pairs:', pairAddresses)

			const pairDataMap = await batchFetchPairData(client, pairAddresses)
			const successfulFetches = Object.values(pairDataMap).filter(data => data !== null).length
			console.log(`📊 Successfully fetched data for ${successfulFetches}/${pairAddresses.length} pairs`)

			const userPositions: UserPosition[] = []
			console.log('Processing', lpBalances.length, 'LP balances')

			// Process each LP pair balance
			for (const lpBalance of lpBalances) {
				console.log('Processing LP balance:', lpBalance)
				try {
					// Get token info first - lpBalance contains symbols, not addresses
					const allTokens = getSDKTokensForChain(chainId) as Record<string, Token>
					const token0 = Object.values(allTokens).find(
						token => token.symbol === lpBalance.tokenX
					)
					const token1 = Object.values(allTokens).find(
						token => token.symbol === lpBalance.tokenY
					)

					if (!token0 || !token1) {
						console.warn('Token not found in SDK mapping, skipping pair:', lpBalance.pairAddress)
						continue
					}

					// Get pair data from batch fetch
					const pairData = pairDataMap[lpBalance.pairAddress]
					if (!pairData) {
						console.warn('Failed to fetch pair data, skipping:', lpBalance.pairAddress)
						continue
					}

					const { activeBin, binStep, reserves, totalSupply } = pairData
					const [reserveX, reserveY] = reserves

					// Skip if reserves are zero (empty pool)
					if (reserveX === BigInt(0) && reserveY === BigInt(0)) {
						console.warn('Pool has no liquidity, skipping:', lpBalance.pairAddress)
						continue
					}

					// Calculate actual LP share using total supply instead of arbitrary 1M
					const userLPBalance = BigInt(lpBalance.balance)
					const actualSharePercentage = calculateActualLPShare(userLPBalance, totalSupply, activeBin)

					console.log('🔍 Raw balance calculations:', {
						lpBalanceRaw: lpBalance.balance,
						lpBalanceType: typeof lpBalance.balance,
						userLPBalance: userLPBalance.toString(),
						totalSupply: totalSupply.toString(),
						actualSharePercentage
					})

					// Calculate user's actual token amounts based on their LP share
					// Use safer conversion to avoid scientific notation
					const reserveXNumber = safeBigIntToNumber(reserveX, token0.decimals)
					const reserveYNumber = safeBigIntToNumber(reserveY, token1.decimals)

					const userAmountX = (reserveXNumber * actualSharePercentage / 100)
					const userAmountY = (reserveYNumber * actualSharePercentage / 100)

					console.log('💰 Amount calculations:', {
						reserveX: reserveX.toString(),
						reserveY: reserveY.toString(),
						reserveXNumber,
						reserveYNumber,
						userAmountX,
						userAmountY,
						userAmountXType: typeof userAmountX,
						userAmountYType: typeof userAmountY,
						token0Decimals: token0.decimals,
						token1Decimals: token1.decimals
					})

					console.log('Enhanced position calculations:', {
						pairAddress: lpBalance.pairAddress,
						userLPBalance: userLPBalance.toString(),
						totalSupply: totalSupply.toString(),
						actualSharePercentage: `${actualSharePercentage.toFixed(6)}%`,
						userAmountX,
						userAmountY
					})

					// Calculate price range using actual token prices
					const priceRange = await calculatePriceRange(
						activeBin,
						binStep,
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN'
					)

					// Calculate position value in USD
					const positionValue = await calculatePositionValue(
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN',
						userAmountX,
						userAmountY
					)

					console.log('🧮 Position value calculated:', positionValue, 'Type:', typeof positionValue)

					// Extract numeric value for fee calculation
					const numericPositionValue = parseFloat(positionValue.replace(/[$,BMK]/g, '')) *
						(positionValue.includes('B') ? 1000000000 :
						 positionValue.includes('M') ? 1000000 :
						 positionValue.includes('K') ? 1000 : 1)

					console.log('🔢 Numeric value extracted:', numericPositionValue)

					// Calculate realistic fees
					const feeData = await calculateRealisticFees(
						actualSharePercentage,
						binStep,
						token0.symbol || 'UNKNOWN',
						token1.symbol || 'UNKNOWN',
						numericPositionValue
					)

					console.log('💰 Fee data calculated:', feeData)

					// Estimate APR based on pair type and bin step
					const estimatedAPR = estimateAPR(token0.symbol || 'UNKNOWN', token1.symbol || 'UNKNOWN', binStep)
					console.log('📈 APR estimated:', estimatedAPR, 'Type:', typeof estimatedAPR)

					// Debug each individual field before creating position
					const formattedLiquidity = formatLargeNumber(Number(userLPBalance) / Math.pow(10, 18))
					const formattedAmountX = formatLargeNumber(userAmountX)
					const formattedAmountY = formatLargeNumber(userAmountY)
					const formattedShares = formatPercentage(actualSharePercentage)

					console.log('🔍 Individual field debugging:', {
						positionValue: positionValue,
						estimatedAPR: estimatedAPR,
						feeData: feeData,
						formattedLiquidity: formattedLiquidity,
						formattedAmountX: formattedAmountX,
						formattedAmountY: formattedAmountY,
						formattedShares: formattedShares,
						priceRange: priceRange
					})

					// Parse fee amount with proper unit handling for splitting between tokens
					const feeAmount = feeData.fees24h.replace('$', '')
					let numericFeeAmount = parseFloat(feeAmount.replace(/[BMK]/g, ''))

					// Apply unit multipliers
					if (feeAmount.includes('B')) {
						numericFeeAmount *= 1000000000
					} else if (feeAmount.includes('M')) {
						numericFeeAmount *= 1000000
					} else if (feeAmount.includes('K')) {
						numericFeeAmount *= 1000
					}

					const position: UserPosition = {
						id: `${lpBalance.pairAddress}`,
						binId: activeBin,
						binStep: binStep, // 添加 binStep 字段
						token0: token0.symbol || 'UNKNOWN',
						token1: token1.symbol || 'UNKNOWN',
						icon0: getTokenIcon(token0.symbol || 'UNK'),
						icon1: getTokenIcon(token1.symbol || 'UNK'),
						pairAddress: lpBalance.pairAddress,
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
						inRange: true, // TODO: Calculate if position is actually in range
						performance: '+2.45%', // TODO: Calculate actual performance
						amountX: formattedAmountX,
						amountY: formattedAmountY,
						feeX: (numericFeeAmount * 0.5).toFixed(2),
						feeY: (numericFeeAmount * 0.5).toFixed(2),
						shares: formattedShares,
					}

					console.log('🎯 Final position object just created:', {
						id: position.id,
						value: position.value,
						valueType: typeof position.value,
						fees24h: position.fees24h,
						feesType: typeof position.fees24h,
						performance: position.performance,
						liquidity: position.liquidity,
						apr: position.apr,
						aprType: typeof position.apr
					})

					userPositions.push(position)
					console.log('Added enhanced position for pair:', lpBalance.pairAddress, 'value:', positionValue)

				} catch (pairError) {
					console.error('Error processing pair:', lpBalance.pairAddress, pairError)
					// Continue processing other pairs even if one fails
				}
			}

			console.log('Final positions count:', userPositions.length)
			setPositions(userPositions)
		} catch (error) {
			console.error('Error fetching user positions:', error)
			setError(error instanceof Error ? error.message : 'Failed to fetch positions')
			setPositions([])
		} finally {
			setLoading(false)
		}
	}, [userAddress, lpBalances, chainId])

	useEffect(() => {
		fetchUserPositions()
	}, [fetchUserPositions])

	return { positions, loading, error, refetch: fetchUserPositions }
}
