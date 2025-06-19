import { LB_FACTORY_V22_ADDRESS, jsonAbis } from '@lb-xyz/sdk-v2'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useChainId } from 'wagmi'
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from '../lbSdkConfig'
import { PoolData } from '../types'
import { generateTokenIcon } from '../utils/tokenIconGenerator'
import { createViemClient } from '../viemClient'

// Cache for pool data to avoid redundant fetches
const poolDataCache = new Map<string, { data: PoolData[]; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute cache

// Use dynamic icon generation instead of static emoji
const getTokenIcon = (symbol: string): string => {
	return generateTokenIcon(symbol, 32)
}

// Batch fetch pair addresses using multicall approach
const fetchPairAddressesBatch = async (
	publicClient: any,
	factoryAddress: string,
	startIndex: number,
	endIndex: number
): Promise<string[]> => {
	const batchSize = 10 // Fetch 10 addresses at once
	const results: string[] = []
	
	for (let i = startIndex; i < endIndex; i += batchSize) {
		const batchEnd = Math.min(i + batchSize, endIndex)
		const batch = []
		
		for (let j = i; j < batchEnd; j++) {
			batch.push(
				publicClient.readContract({
					address: factoryAddress as `0x${string}`,
					abi: jsonAbis.LBFactoryV21ABI,
					functionName: "getLBPairAtIndex",
					args: [BigInt(j)]
				})
			)
		}
		
		try {
			const batchResults = await Promise.allSettled(batch)
			batchResults.forEach((result) => {
				if (result.status === 'fulfilled') {
					results.push(result.value as string)
				}
			})
		} catch (error) {
			console.warn(`Batch fetch failed for indices ${i}-${batchEnd}:`, error)
		}
	}
	
	return results
}

// Fetch basic pair info in batches
const fetchPairBasicInfoBatch = async (
	publicClient: any,
	pairAddresses: string[]
): Promise<Array<{ address: string; tokenX: string; tokenY: string; binStep: number } | null>> => {
	const batchSize = 5 // Process 5 pairs at once to avoid rate limits
	const results: Array<{ address: string; tokenX: string; tokenY: string; binStep: number } | null> = []
	
	for (let i = 0; i < pairAddresses.length; i += batchSize) {
		const batch = pairAddresses.slice(i, i + batchSize)
		
		const batchPromises = batch.map(async (pairAddress) => {
			try {
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
				
				return {
					address: pairAddress,
					tokenX: tokenX as string,
					tokenY: tokenY as string,
					binStep: Number(binStep)
				}
			} catch (error) {
				console.warn(`Failed to fetch basic info for pair ${pairAddress}:`, error)
				return null
			}
		})
		
		const batchResults = await Promise.allSettled(batchPromises)
		batchResults.forEach((result) => {
			if (result.status === 'fulfilled') {
				results.push(result.value)
			} else {
				results.push(null)
			}
		})
		
		// Small delay between batches to avoid overwhelming the RPC
		if (i + batchSize < pairAddresses.length) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
	}
	
	return results
}

// Fetch real 24h volume and fees from LBPair events
const fetch24hVolumeAndFees = async (
	publicClient: any,
	pairAddress: string,
	tokenXDecimals: number,
	tokenYDecimals: number
): Promise<{ volume24h: string; fees24h: string }> => {
	try {
		// Get current block and 24h ago block
		const currentBlock = await publicClient.getBlockNumber()
		
		// Estimate block 24h ago (assuming ~3 sec per block on BSC/Avalanche)
		const estimatedBlocksPerDay = 28800 // 86400 / 3
		const fromBlock = currentBlock - BigInt(estimatedBlocksPerDay)
		
		// Define Swap event ABI
		const swapEventABI = [{
			"anonymous": false,
			"inputs": [
				{"indexed": true, "name": "sender", "type": "address"},
				{"indexed": true, "name": "to", "type": "address"},
				{"indexed": false, "name": "id", "type": "uint24"},
				{"indexed": false, "name": "amountsIn", "type": "bytes32"},
				{"indexed": false, "name": "amountsOut", "type": "bytes32"},
				{"indexed": false, "name": "volatilityAccumulator", "type": "uint24"},
				{"indexed": false, "name": "totalFees", "type": "bytes32"},
				{"indexed": false, "name": "protocolFees", "type": "bytes32"}
			],
			"name": "Swap",
			"type": "event"
		}]

		// Get swap events from the last 24 hours
		const swapLogs = await publicClient.getLogs({
			address: pairAddress as `0x${string}`,
			event: swapEventABI[0],
			fromBlock: fromBlock,
			toBlock: currentBlock
		})

		let totalVolumeX = 0
		let totalVolumeY = 0
		let totalFeesX = 0
		let totalFeesY = 0

		// Process each swap event
		for (const log of swapLogs) {
			try {
				const decodedLog = publicClient.decodeEventLog({
					abi: swapEventABI,
					data: log.data,
					topics: log.topics
				})

				// Extract amounts and fees from the event
				const amountsIn = decodedLog.args.amountsIn
				const amountsOut = decodedLog.args.amountsOut
				const totalFees = decodedLog.args.totalFees

				// Decode bytes32 to get X and Y amounts
				// LB protocol stores amounts as bytes32 with X in the lower 128 bits, Y in upper 128 bits
				const amountInX = Number(amountsIn & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) / Math.pow(10, tokenXDecimals)
				const amountInY = Number(amountsIn >> 128n) / Math.pow(10, tokenYDecimals)
				const amountOutX = Number(amountsOut & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) / Math.pow(10, tokenXDecimals)
				const amountOutY = Number(amountsOut >> 128n) / Math.pow(10, tokenYDecimals)

				const feeX = Number(totalFees & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) / Math.pow(10, tokenXDecimals)
				const feeY = Number(totalFees >> 128n) / Math.pow(10, tokenYDecimals)

				// Add to totals
				totalVolumeX += amountInX + amountOutX
				totalVolumeY += amountInY + amountOutY
				totalFeesX += feeX
				totalFeesY += feeY
			} catch (decodeError) {
				console.warn('Failed to decode swap event:', decodeError)
			}
		}

		// Calculate total volume in USD (simplified estimation)
		let totalVolumeUSD = 0
		if (totalVolumeX > 0 || totalVolumeY > 0) {
			// Rough USD estimation - in real implementation you'd use price oracles
			totalVolumeUSD = totalVolumeX + totalVolumeY // Simplified for demo
		}

		// Calculate total fees in USD
		let totalFeesUSD = 0
		if (totalFeesX > 0 || totalFeesY > 0) {
			totalFeesUSD = totalFeesX + totalFeesY // Simplified for demo
		}

		// Format volume
		let volume24h = '$0.00'
		if (totalVolumeUSD >= 1000000) {
			volume24h = `$${(totalVolumeUSD / 1000000).toFixed(1)}M`
		} else if (totalVolumeUSD >= 1000) {
			volume24h = `$${(totalVolumeUSD / 1000).toFixed(1)}K`
		} else if (totalVolumeUSD > 0) {
			volume24h = `$${totalVolumeUSD.toFixed(2)}`
		}

		// Format fees
		let fees24h = '$0.00'
		if (totalFeesUSD >= 1000000) {
			fees24h = `$${(totalFeesUSD / 1000000).toFixed(1)}M`
		} else if (totalFeesUSD >= 1000) {
			fees24h = `$${(totalFeesUSD / 1000).toFixed(1)}K`
		} else if (totalFeesUSD > 0) {
			fees24h = `$${totalFeesUSD.toFixed(2)}`
		}

		return { volume24h, fees24h }

	} catch (error) {
		console.warn('Failed to fetch 24h volume and fees:', error)
		return { volume24h: '$0.00', fees24h: '$0.00' }
	}
}

// Optimized pool data processing
const processPoolData = (
	pairInfo: { address: string; tokenX: string; tokenY: string; binStep: number },
	chainId: number,
	reserves?: [bigint, bigint],
	volumeAndFees?: { volume24h: string; fees24h: string }
): PoolData | null => {
	const { address, tokenX, tokenY, binStep } = pairInfo
	
	// Get token info from config using addresses
	const sdkTokenX = getSDKTokenByAddress(tokenX, chainId)
	const sdkTokenY = getSDKTokenByAddress(tokenY, chainId)
	
	// Skip if tokens not found in config
	if (!sdkTokenX || !sdkTokenY) {
		return null
	}
	
	const token0Symbol = sdkTokenX.symbol || 'UNK'
	const token1Symbol = sdkTokenY.symbol || 'UNK'
	
	// Get token icons
	const token0Icon = getTokenIcon(token0Symbol)
	const token1Icon = getTokenIcon(token1Symbol)
	
	// Calculate TVL and liquidity info
	let tvl = '$0.00'
	let hasLiquidity = false
	let estimatedAPR = '0%'
	
	if (reserves) {
		const [reserveX, reserveY] = reserves
		
		if (reserveX > 0n || reserveY > 0n) {
			hasLiquidity = true
			
			// Convert reserves to human readable format
			const tokenXDecimals = sdkTokenX.decimals
			const tokenYDecimals = sdkTokenY.decimals
			
			const reserveXFormatted = Number(reserveX) / Math.pow(10, tokenXDecimals)
			const reserveYFormatted = Number(reserveY) / Math.pow(10, tokenYDecimals)
			
			// Calculate TVL using more accurate method
			let totalValue = 0
			
			// Check if either token is a stablecoin
			const isTokenXStable = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'].includes(token0Symbol)
			const isTokenYStable = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'].includes(token1Symbol)
			
			if (isTokenXStable && isTokenYStable) {
				// Both stablecoins: simple sum
				totalValue = reserveXFormatted + reserveYFormatted
			} else if (isTokenXStable) {
				// TokenX is stable, use its value * 2 as approximation
				totalValue = reserveXFormatted * 2
			} else if (isTokenYStable) {
				// TokenY is stable, use its value * 2 as approximation
				totalValue = reserveYFormatted * 2
			} else {
				// Neither is stable, try to estimate based on known ratios
				const estimatedPrice = getEstimatedTokenPrice(token0Symbol, token1Symbol)
				if (estimatedPrice.tokenXPrice > 0) {
					totalValue = (reserveXFormatted * estimatedPrice.tokenXPrice) + (reserveYFormatted * estimatedPrice.tokenYPrice)
				} else {
					// Fallback: assume equal value (very rough estimate)
					totalValue = (reserveXFormatted + reserveYFormatted) * 100 // Rough multiplier for non-stables
				}
			}
			
			// Format TVL
			if (totalValue >= 1000000) {
				tvl = `$${(totalValue / 1000000).toFixed(1)}M`
			} else if (totalValue >= 1000) {
				tvl = `$${(totalValue / 1000).toFixed(1)}K`
			} else if (totalValue >= 1) {
				tvl = `$${totalValue.toFixed(2)}`
			} else {
				tvl = `$${totalValue.toFixed(4)}`
			}
			
			// Estimate APR based on bin step
			const baseAPR = binStep / 100
			estimatedAPR = `${Math.min(baseAPR, 200).toFixed(1)}%`
		}
	}
	
	// Use real volume and fees data if available, otherwise fallback to estimates
	const volume24h = volumeAndFees?.volume24h || (hasLiquidity ? '$1,000+' : '$0.00')
	const fees24h = volumeAndFees?.fees24h || (hasLiquidity ? '$10+' : '$0.00')
	
	return {
		id: address,
		token0: token0Symbol,
		token1: token1Symbol,
		icon0: token0Icon,
		icon1: token1Icon,
		tvl: tvl,
		apr: estimatedAPR,
		volume24h: volume24h,
		fees24h: fees24h,
		pairAddress: address,
		binStep: binStep,
		tokenXAddress: tokenX,
		tokenYAddress: tokenY
	}
}

// Estimated token prices for better TVL calculation
const getEstimatedTokenPrice = (tokenXSymbol: string, tokenYSymbol: string): { tokenXPrice: number; tokenYPrice: number } => {
	// Simple price estimation based on common pairs
	const priceMap: Record<string, number> = {
		'BNB': 600,
		'ETH': 3400,
		'BTC': 65000,
		'AVAX': 40,
		'MATIC': 0.8,
		'USDC': 1,
		'USDT': 1,
		'DAI': 1,
		'BUSD': 1,
		'FRAX': 1
	}
	
	const tokenXPrice = priceMap[tokenXSymbol] || 0
	const tokenYPrice = priceMap[tokenYSymbol] || 0
	
	return { tokenXPrice, tokenYPrice }
}

// Hook to fetch real pool data with optimized batching
export const useRealPoolData = () => {
	const [pools, setPools] = useState<PoolData[]>([])
	const [loading, setLoading] = useState(true)
	const chainId = useChainId()

	// Memoize cache key to avoid unnecessary re-renders
	const cacheKey = useMemo(() => `pools_${chainId}`, [chainId])

	const fetchPoolData = useCallback(async () => {
		try {
			setLoading(true)

			// Check cache first
			const cached = poolDataCache.get(cacheKey)
			if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
				setPools(cached.data)
				setLoading(false)
				return
			}

			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				console.warn("LB Factory not supported on this chain")
				setPools([])
				return
			}

			const publicClient = createViemClient(chainId)
			console.log("Reading pool data with optimized batching:", factoryAddress)

			// Step 1: Get total number of pairs
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

			// Step 2: Fetch pair addresses in batches
			const pairsToFetch = Math.min(pairCount, 30) // Reduced for better performance
			const startIndex = Math.max(0, pairCount - pairsToFetch)

			console.log(`Fetching ${pairsToFetch} pairs from index ${startIndex} with batching`)

			const pairAddresses = await fetchPairAddressesBatch(
				publicClient,
				factoryAddress,
				startIndex,
				pairCount
			)

			if (pairAddresses.length === 0) {
				setPools([])
				return
			}

			console.log(`Got ${pairAddresses.length} pair addresses`)

			// Step 3: Fetch basic info for all pairs in batches
			const pairBasicInfos = await fetchPairBasicInfoBatch(publicClient, pairAddresses)
			const validPairInfos = pairBasicInfos.filter(info => info !== null) as Array<{
				address: string
				tokenX: string
				tokenY: string
				binStep: number
			}>

			// Step 4: Process pools without reserves first (faster initial load)
			const quickPools: PoolData[] = []
			for (const pairInfo of validPairInfos) {
				const pool = processPoolData(pairInfo, chainId)
				if (pool) {
					quickPools.push(pool)
				}
			}

			// Show pools immediately without reserve data
			setPools(quickPools)
			console.log(`Quick load: ${quickPools.length} pools displayed`)

			// Step 5: Fetch reserves and real volume/fees data in background and update
			const poolsWithReserves: PoolData[] = []
			const reserveBatchSize = 2 // Reduced batch size for volume/fees fetching

			for (let i = 0; i < validPairInfos.length; i += reserveBatchSize) {
				const batch = validPairInfos.slice(i, i + reserveBatchSize)
				
				const reservePromises = batch.map(async (pairInfo) => {
					try {
						// Fetch reserves
						const reserves = await publicClient.readContract({
							address: pairInfo.address as `0x${string}`,
							abi: jsonAbis.LBPairV21ABI,
							functionName: 'getReserves'
						}) as [bigint, bigint]

						// Get token info for decimals
						const sdkTokenX = getSDKTokenByAddress(pairInfo.tokenX, chainId)
						const sdkTokenY = getSDKTokenByAddress(pairInfo.tokenY, chainId)

						// Fetch real 24h volume and fees data
						let volumeAndFees: { volume24h: string; fees24h: string } | undefined
						if (sdkTokenX && sdkTokenY) {
							volumeAndFees = await fetch24hVolumeAndFees(
								publicClient,
								pairInfo.address,
								sdkTokenX.decimals,
								sdkTokenY.decimals
							)
						}

						return processPoolData(pairInfo, chainId, reserves, volumeAndFees)
					} catch (error) {
						console.log(`Could not get complete data for ${pairInfo.address}:`, error)
						// Fallback to basic data without volume/fees
						return processPoolData(pairInfo, chainId)
					}
				})

				const batchResults = await Promise.allSettled(reservePromises)
				batchResults.forEach((result) => {
					if (result.status === 'fulfilled' && result.value) {
						poolsWithReserves.push(result.value)
					}
				})

				// Update UI progressively as we get more data
				if (poolsWithReserves.length > 0) {
					const sortedPools = [...poolsWithReserves].reverse()
					setPools(sortedPools)
				}

				// Longer delay between batches for volume/fees fetching (more intensive)
				if (i + reserveBatchSize < validPairInfos.length) {
					await new Promise(resolve => setTimeout(resolve, 500))
				}
			}

			const finalPools = poolsWithReserves.reverse()
			setPools(finalPools)

			// Cache the results
			poolDataCache.set(cacheKey, {
				data: finalPools,
				timestamp: Date.now()
			})

			console.log(`Successfully fetched ${finalPools.length} pools with reserves`)

		} catch (error) {
			console.error("Error fetching pool data:", error)
			setPools([])
		} finally {
			setLoading(false)
		}
	}, [chainId, cacheKey])

	useEffect(() => {
		fetchPoolData()
	}, [fetchPoolData])

	return { pools, loading, refetch: fetchPoolData }
}
