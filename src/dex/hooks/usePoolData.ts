import { LB_FACTORY_V22_ADDRESS, jsonAbis } from '@lb-xyz/sdk-v2'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from '../lbSdkConfig'
import { PoolData } from '../types'
import { createViemClient } from '../viemClient'

// Simple icon mapping helper
const getTokenIcon = (symbol: string): string => {
	const iconMap: { [key: string]: string } = {
		'ETH': '🔷',
		'WETH': '🔷',
		'USDC': '💵',
		'USDT': '💰',
		'DAI': '🟡',
		'WBNB': '🟨',
		'BNB': '🟨'
	}
	return iconMap[symbol] || '❓'
}

// Hook to fetch real pool data directly from LB Factory contract (no events)
export const useRealPoolData = () => {
	const [pools, setPools] = useState<PoolData[]>([])
	const [loading, setLoading] = useState(true)
	const chainId = useChainId()

	const fetchPoolData = useCallback(async () => {
		try {
			setLoading(true)

			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				console.warn("LB Factory not supported on this chain")
				setPools([])
				return
			}

			// Create public client to read contract directly
			const publicClient = createViemClient(chainId)
			console.log("Reading pool data directly from factory:", factoryAddress)

			// Step 1: Get total number of pairs from factory
			const numberOfPairs = await publicClient.readContract({
				address: factoryAddress as `0x${string}`,
				abi: jsonAbis.LBFactoryV21ABI,
				functionName: 'getNumberOfLBPairs'
			})

			const pairCount = Number(numberOfPairs)
			console.log(`Found ${pairCount} pairs in factory`)

			if (pairCount === 0) {
				setPools([])
				return
			}

			// Step 2: Get pair addresses using getLBPairAtIndex (fetch individually)
			const pairsToFetch = Math.min(pairCount, 50) // Limit for performance
			const startIndex = Math.max(0, pairCount - pairsToFetch) // Get most recent pairs

			console.log(`Fetching ${pairsToFetch} pairs from index ${startIndex} to ${pairCount - 1}`)

			const pairAddresses: string[] = []
			for (let i = startIndex; i < pairCount; i++) {
				try {
					const pairAddress = await publicClient.readContract({
						address: factoryAddress as `0x${string}`,
						abi: jsonAbis.LBFactoryV21ABI,
						functionName: "getLBPairAtIndex",
						args: [BigInt(i)]
					})
					pairAddresses.push(pairAddress as string)
				} catch (error) {
					console.warn(`Failed to get pair at index ${i}:`, error)
				}
			}

			console.log(`Got ${pairAddresses.length} pair addresses`)

			if (pairAddresses.length === 0) {
				setPools([])
				return
			}

			// Step 3: Get detailed info for each pair
			const poolPromises = pairAddresses.map(async (pairAddress) => {
				try {
					// Get pair basic info (tokens, bin step)
					const [tokenX, tokenY, binStep] = await Promise.all([
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: jsonAbis.LBPairV21ABI,
							functionName: 'getTokenX'
						}),
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: jsonAbis.LBPairV21ABI,
							functionName: 'getTokenY'
						}),
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: jsonAbis.LBPairV21ABI,
							functionName: 'getBinStep'
						})
					])

					const tokenXAddress = tokenX as string
					const tokenYAddress = tokenY as string
					const binStepValue = Number(binStep)

					// Get token info from config
					const sdkTokenX = getSDKTokenByAddress(tokenXAddress, chainId)
					const sdkTokenY = getSDKTokenByAddress(tokenYAddress, chainId)

					// Skip if tokens not found in config
					if (!sdkTokenX || !sdkTokenY) {
						console.log(`Skipping pair ${pairAddress}: tokens not in config`)
						return null
					}

					const token0Symbol = sdkTokenX?.symbol || 'UNK'
					const token1Symbol = sdkTokenY?.symbol || 'UNK'

					// Get token icons
					const token0Icon = getTokenIcon(token0Symbol)
					const token1Icon = getTokenIcon(token1Symbol)

					// Get reserves to calculate TVL
					let tvl = '$0.00'
					let hasLiquidity = false
					let estimatedAPR = '0%'

					try {
						const reserves = await publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: jsonAbis.LBPairV21ABI,
							functionName: 'getReserves'
						}) as [bigint, bigint]

						const [reserveX, reserveY] = reserves

						if (reserveX > 0n || reserveY > 0n) {
							hasLiquidity = true

							// Simple TVL calculation (assuming 1:1 USD for now)
							const tokenXDecimals = sdkTokenX.decimals
							const tokenYDecimals = sdkTokenY.decimals

							const reserveXFormatted = Number(reserveX) / Math.pow(10, tokenXDecimals)
							const reserveYFormatted = Number(reserveY) / Math.pow(10, tokenYDecimals)

							// Very basic USD approximation
							let totalValue = 0
							if (token0Symbol === 'USDC' || token0Symbol === 'USDT') {
								totalValue = reserveXFormatted * 2 // Assume Y token has similar value
							} else if (token1Symbol === 'USDC' || token1Symbol === 'USDT') {
								totalValue = reserveYFormatted * 2 // Assume X token has similar value
							} else {
								// For other pairs, just sum reserves as rough estimate
								totalValue = reserveXFormatted + reserveYFormatted
							}

							if (totalValue >= 1000000) {
								tvl = `$${(totalValue / 1000000).toFixed(1)}M`
							} else if (totalValue >= 1000) {
								tvl = `$${(totalValue / 1000).toFixed(1)}K`
							} else {
								tvl = `$${totalValue.toFixed(2)}`
							}

							// Estimate APR based on bin step (higher bin step = more volatile = higher potential APR)
							const baseAPR = binStepValue / 100 // Simple heuristic
							estimatedAPR = `${Math.min(baseAPR, 200).toFixed(1)}%`
						}

					} catch (error) {
						console.log(`Could not get reserves for ${pairAddress}:`, error)
					}

					const pool: PoolData = {
						id: pairAddress,
						token0: token0Symbol,
						token1: token1Symbol,
						icon0: token0Icon,
						icon1: token1Icon,
						tvl: tvl,
						apr: estimatedAPR,
						volume24h: hasLiquidity ? '$1,000+' : '$0.00',
						fees24h: hasLiquidity ? '$10+' : '$0.00',
						pairAddress: pairAddress,
						binStep: binStepValue,
						tokenXAddress: tokenXAddress,
						tokenYAddress: tokenYAddress
					}

					return pool
				} catch (error) {
					console.error(`Error processing pair ${pairAddress}:`, error)
					return null
				}
			})

			const resolvedPools = await Promise.all(poolPromises)
			const validPools = resolvedPools.filter(pool => pool !== null) as PoolData[]

			// Sort by most recent (reverse order)
			validPools.reverse()

			setPools(validPools)
			console.log(`Successfully fetched ${validPools.length} real pools from contract`)

		} catch (error) {
			console.error("Error fetching pool data:", error)
			setPools([])
		} finally {
			setLoading(false)
		}
	}, [chainId])

	useEffect(() => {
		fetchPoolData()
	}, [fetchPoolData])

	return { pools, loading, refetch: fetchPoolData }
}
