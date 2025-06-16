import { formatUnits } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { LiquidityHelperV2ABI } from '../abis/liquidityHelper'
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from '../lbSdkConfig'
import { createViemClient } from '../viemClient'
import { useUserLPBalances } from './useLBPairData'

// Type definitions for user liquidity positions
export interface UserPosition {
	id: string
	binId: number
	token0: string
	token1: string
	icon0: string
	icon1: string
	pairAddress: string
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
	amountX: string
	amountY: string
	feeX: string
	feeY: string
	shares: string
}

export interface LiquidityHelperConfig {
	// LiquidityHelper contract addresses for different chains
	[chainId: number]: string
}

// LiquidityHelper contract addresses (these need to be configured for each chain)
const LIQUIDITY_HELPER_ADDRESSES: LiquidityHelperConfig = {
	56: '0x0000000000000000000000000000000000000000', // BSC Mainnet - placeholder
	97: '0x1e51C5C4523dDC900AFb5c48Ed4D07680fEEe7A4', // BSC Testnet
	1: '0x0000000000000000000000000000000000000000', // Ethereum - placeholder
	// Add more chain addresses as needed
}

// Simple icon mapping helper
const getTokenIcon = (symbol: string): string => {
	const iconMap: { [key: string]: string } = {
		ETH: '🔷',
		WETH: '🔷',
		USDC: '💵',
		USDT: '💰',
		DAI: '🟡',
		WBNB: '🟨',
		BNB: '🟨',
	}
	return iconMap[symbol] || '❓'
}

// Calculate price range for a bin using LB SDK
const calculatePriceRange = (binId: number, binStep: number) => {
	// Use proper LB formula for price calculation
	// Price = 1.0001^(binId - 2^23) where 2^23 = 8388608 is the center bin
	const centerBin = 8388608
	const binDelta = binId - centerBin
	const priceRatio = Math.pow(1.0001, binDelta)

	// Base price would come from a price oracle, using 1 for now as reference
	const basePrice = 1
	const currentPrice = basePrice * priceRatio

	// Calculate bin step price range
	const stepRatio = Math.pow(1.0001, binStep)
	const minPrice = currentPrice / stepRatio
	const maxPrice = currentPrice * stepRatio

	return {
		min: minPrice.toFixed(6),
		max: maxPrice.toFixed(6),
		current: currentPrice.toFixed(6),
	}
}

// Hook to get user's liquidity positions using LiquidityHelperV2
export const useUserLiquidityPositions = (userAddress: `0x${string}` | undefined) => {
	const [positions, setPositions] = useState<UserPosition[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const chainId = useChainId()

	// Get user LP balances from LB pairs
	const { balances: lpBalances } = useUserLPBalances(userAddress)

	const fetchUserPositions = useCallback(async () => {
		if (!userAddress || !lpBalances || lpBalances.length === 0) {
			setPositions([])
			return
		}

		try {
			setLoading(true)
			setError(null)

			const liquidityHelperAddress = LIQUIDITY_HELPER_ADDRESSES[chainId]
			if (!liquidityHelperAddress || liquidityHelperAddress === '0x0000000000000000000000000000000000000000') {
				console.warn('LiquidityHelper not configured for chain:', chainId)

				// For development/testing, return some mock positions so UI can be tested
				if (lpBalances.length > 0) {
					const mockPositions: UserPosition[] = lpBalances.slice(0, 2).map((lpBalance, index) => {
						const token0 = getSDKTokenByAddress(lpBalance.tokenX, wagmiChainIdToSDKChainId(chainId))
						const token1 = getSDKTokenByAddress(lpBalance.tokenY, wagmiChainIdToSDKChainId(chainId))

						if (!token0 || !token1) return null

						return {
							id: `mock-${index}`,
							binId: 8388608 + index, // Mock active bin
							token0: token0.symbol,
							token1: token1.symbol,
							icon0: getTokenIcon(token0.symbol || 'UNK'),
							icon1: getTokenIcon(token1.symbol || 'UNK'),
							pairAddress: lpBalance.pairAddress,
							liquidity: `${(Math.random() * 10000).toFixed(2)}`,
							value: `${(Math.random() * 5000).toFixed(2)}`,
							apr: `${(Math.random() * 50 + 10).toFixed(1)}%`,
							fees24h: `${(Math.random() * 100).toFixed(2)}`,
							feesTotal: `${(Math.random() * 500).toFixed(2)}`,
							range: {
								min: `${(Math.random() * 0.5 + 0.95).toFixed(6)}`,
								max: `${(Math.random() * 0.1 + 1.05).toFixed(6)}`,
								current: '1.000000'
							},
							inRange: Math.random() > 0.3,
							performance: `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 10).toFixed(2)}%`,
							amountX: `${(Math.random() * 1000).toFixed(6)}`,
							amountY: `${(Math.random() * 1000).toFixed(6)}`,
							feeX: `${(Math.random() * 10).toFixed(6)}`,
							feeY: `${(Math.random() * 10).toFixed(6)}`,
							shares: `${(Math.random() * 1000).toFixed(6)}`
						}
					}).filter((position): position is UserPosition => position !== null)

					console.log('Using mock position data for testing:', mockPositions)
					setPositions(mockPositions)
				} else {
					// Create some default mock positions for testing even without LP balances
					const defaultMockPositions: UserPosition[] = [
						{
							id: 'demo-1',
							binId: 8388608,
							token0: 'USDC',
							token1: 'ETH',
							icon0: getTokenIcon('USDC'),
							icon1: getTokenIcon('ETH'),
							pairAddress: '0x1234567890123456789012345678901234567890',
							liquidity: '5,432.10',
							value: '3,245.67',
							apr: '24.5%',
							fees24h: '12.34',
							feesTotal: '156.78',
							range: {
								min: '0.998500',
								max: '1.001500',
								current: '1.000000'
							},
							inRange: true,
							performance: '+8.42%',
							amountX: '2500.000000',
							amountY: '1.234567',
							feeX: '5.123456',
							feeY: '0.003456',
							shares: '1234.567890'
						},
						{
							id: 'demo-2',
							binId: 8388620,
							token0: 'WBNB',
							token1: 'USDT',
							icon0: getTokenIcon('WBNB'),
							icon1: getTokenIcon('USDT'),
							pairAddress: '0x9876543210987654321098765432109876543210',
							liquidity: '8,765.43',
							value: '4,567.89',
							apr: '18.3%',
							fees24h: '23.45',
							feesTotal: '298.76',
							range: {
								min: '295.500000',
								max: '305.500000',
								current: '300.250000'
							},
							inRange: false,
							performance: '-2.15%',
							amountX: '15.234567',
							amountY: '4500.000000',
							feeX: '0.012345',
							feeY: '15.678901',
							shares: '2345.678901'
						}
					]

					console.log('Using default mock position data for testing')
					setPositions(defaultMockPositions)
				}
				return
			}

			const client = createViemClient(chainId)
			const userPositions: UserPosition[] = []

			// Process each LP pair balance
			for (const lpBalance of lpBalances) {
				try {
					// Get token info first
					const token0 = getSDKTokenByAddress(lpBalance.tokenX, wagmiChainIdToSDKChainId(chainId))
					const token1 = getSDKTokenByAddress(lpBalance.tokenY, wagmiChainIdToSDKChainId(chainId))

					if (!token0 || !token1) continue

					// Get ALL user bin IDs with balances for this pair
					// First get the active bin to know the range to check
					const activeBin = await client.readContract({
						address: lpBalance.pairAddress as `0x${string}`,
						abi: [{
							inputs: [],
							name: 'getActiveId',
							outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
							stateMutability: 'view',
							type: 'function'
						}],
						functionName: 'getActiveId',
						args: []
					}) as number

					// Check a reasonable range around the active bin
					const rangeToCheck = 100 // Check 100 bins on each side
					const startBin = Math.max(0, activeBin - rangeToCheck)
					const endBin = Math.min(16777215, activeBin + rangeToCheck) // Max bin ID is 2^24 - 1

					const userBinIds: number[] = []

					// Batch check balances in groups of 50 to avoid RPC limits
					const batchSize = 50
					for (let i = startBin; i <= endBin; i += batchSize) {
						const batchEnd = Math.min(i + batchSize - 1, endBin)
						const binIds = []
						for (let j = i; j <= batchEnd; j++) {
							binIds.push(j)
						}

						try {
							const balanceChecks = await Promise.all(
								binIds.map(async (binId) => {
									try {
										const balance = await client.readContract({
											address: lpBalance.pairAddress as `0x${string}`,
											abi: [{
												inputs: [
													{ internalType: 'address', name: 'account', type: 'address' },
													{ internalType: 'uint256', name: 'id', type: 'uint256' }
												],
												name: 'balanceOf',
												outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
												stateMutability: 'view',
												type: 'function'
											}],
											functionName: 'balanceOf',
											args: [userAddress, BigInt(binId)]
										}) as bigint

										return balance > 0n ? binId : null
									} catch {
										return null
									}
								})
							)

							const validBins = balanceChecks.filter(id => id !== null) as number[]
							userBinIds.push(...validBins)
						} catch (batchError) {
							console.warn('Error checking batch of bins:', batchError)
						}
					}

					// Process each bin with actual balance
					for (const binId of userBinIds) {
						try {
							// Get the actual balance for this bin
							const binBalance = await client.readContract({
								address: lpBalance.pairAddress as `0x${string}`,
								abi: [{
									inputs: [
										{ internalType: 'address', name: 'account', type: 'address' },
										{ internalType: 'uint256', name: 'id', type: 'uint256' }
									],
									name: 'balanceOf',
									outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
									stateMutability: 'view',
									type: 'function'
								}],
								functionName: 'balanceOf',
								args: [userAddress, BigInt(binId)]
							}) as bigint

							// Get bin step for this pair
							const binStep = await client.readContract({
								address: lpBalance.pairAddress as `0x${string}`,
								abi: [{
									inputs: [],
									name: 'getBinStep',
									outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
									stateMutability: 'view',
									type: 'function'
								}],
								functionName: 'getBinStep',
								args: []
							}) as number

							// Get amounts for this bin using LiquidityHelper
							const amountsResult = await client.readContract({
								address: liquidityHelperAddress as `0x${string}`,
								abi: LiquidityHelperV2ABI,
								functionName: 'getAmountsOf',
								args: [lpBalance.pairAddress as `0x${string}`, userAddress, [BigInt(binId)]]
							}) as [bigint[], bigint[]]

							// Get fees earned
							const feesResult = await client.readContract({
								address: liquidityHelperAddress as `0x${string}`,
								abi: LiquidityHelperV2ABI,
								functionName: 'getAmountsAndFeesEarnedOf',
								args: [
									lpBalance.pairAddress as `0x${string}`,
									userAddress,
									[BigInt(binId)],
									[0n], // previousX
									[0n]  // previousY
								]
							}) as [bigint[], bigint[], bigint[], bigint[]]

							const amountX = formatUnits(amountsResult[0]?.[0] || 0n, token0.decimals)
							const amountY = formatUnits(amountsResult[1]?.[0] || 0n, token1.decimals)
							const feeX = formatUnits(feesResult[2]?.[0] || 0n, token0.decimals)
							const feeY = formatUnits(feesResult[3]?.[0] || 0n, token1.decimals)

							// Calculate real price range using bin step
							const priceRange = calculatePriceRange(binId, binStep)

							// For value calculation, we need to determine which token is the quote token
							// For now, assume token1 is quote token (like USDC) and token0 is base (like ETH)
							// This should be configurable based on the pair
							const baseTokenAmount = parseFloat(amountX)
							const quoteTokenAmount = parseFloat(amountY)

							// Calculate position value in quote token terms
							// If we have both tokens, use the current bin price to value the base token
							const binPrice = parseFloat(priceRange.current)
							const totalValue = baseTokenAmount * binPrice + quoteTokenAmount

							// Calculate total fees in quote token terms
							const totalFees = parseFloat(feeX) * binPrice + parseFloat(feeY)

							// Determine if position is in range by comparing with active bin
							const isInRange = Math.abs(binId - activeBin) <= 10 // Within 10 bins of active

							const position: UserPosition = {
								id: `${lpBalance.pairAddress}-${binId}`,
								binId,
								token0: token0.symbol || 'UNKNOWN',
								token1: token1.symbol || 'UNKNOWN',
								icon0: getTokenIcon(token0.symbol || ''),
								icon1: getTokenIcon(token1.symbol || ''),
								pairAddress: lpBalance.pairAddress,
								liquidity: binBalance.toString(),
								value: totalValue.toFixed(2),
								apr: '0.0', // TODO: Calculate from historical fee data
								fees24h: '0.0', // TODO: Calculate from recent fee events
								feesTotal: totalFees.toFixed(4),
								range: priceRange,
								inRange: isInRange,
								performance: '0.0', // TODO: Calculate from entry price
								amountX,
								amountY,
								feeX,
								feeY,
								shares: binBalance.toString(),
							}

							userPositions.push(position)
						} catch (binError) {
							console.error('Error processing bin:', binId, 'for pair:', lpBalance.pairAddress, binError)
						}
					}
				} catch (pairError) {
					console.error('Error processing pair:', lpBalance.pairAddress, pairError)
				}
			}

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
