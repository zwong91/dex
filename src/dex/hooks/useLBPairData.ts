import { LB_FACTORY_V22_ADDRESS, jsonAbis } from '@lb-xyz/sdk-v2'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from '../lbSdkConfig'
import { createViemClient } from '../viemClient'

// Hook to get all LB pairs that exist on the current chain
export const useAllLBPairs = () => {
	const [pairs, setPairs] = useState<{
		pairAddress: string
		tokenX: string
		tokenY: string
		tokenXAddress: string
		tokenYAddress: string
		binStep: number
	}[]>([])
	const [loading, setLoading] = useState(false)
	const chainId = useChainId()

	const fetchAllPairs = useCallback(async () => {
		console.log('=== FETCHING ALL LB PAIRS ===')
		console.log('Current wagmi chainId:', chainId)

		try {
			setLoading(true)

			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			console.log('Mapped SDK chainId:', CHAIN_ID)

			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]
			console.log('Factory address for chain:', factoryAddress)

			if (!factoryAddress) {
				console.warn('LB Factory not supported on chain:', chainId)
				console.log('Available factory addresses:', LB_FACTORY_V22_ADDRESS)
				setPairs([])
				return
			}

			const publicClient = createViemClient(chainId)
			console.log('Created viem client for chainId:', chainId)

			// Test basic connectivity first
			try {
				const blockNumber = await publicClient.getBlockNumber()
				console.log('✅ RPC connection successful, block:', blockNumber)
			} catch (rpcError) {
				console.error('❌ RPC connection failed:', rpcError)
				throw new Error('RPC connection failed')
			}

			// Get total number of pairs
			console.log('Calling getNumberOfLBPairs on factory:', factoryAddress)
			const numberOfPairs = await publicClient.readContract({
				address: factoryAddress as `0x${string}`,
				abi: jsonAbis.LBFactoryV21ABI,
				functionName: 'getNumberOfLBPairs'
			}) as bigint

			const totalPairs = Number(numberOfPairs)
			console.log(`Found ${totalPairs} LB pairs on chain ${chainId}`)

			if (totalPairs === 0) {
				console.log('No pairs found on this network')
				setPairs([])
				return
			}

			// Fetch pairs using getLBPairAtIndex (this function exists in LBFactoryV21ABI)
			const allPairs: any[] = []

			// Fetch pairs in batches to avoid RPC timeouts
			const batchSize = 10
			for (let i = 0; i < totalPairs; i += batchSize) {
				const batchEnd = Math.min(i + batchSize, totalPairs)

				try {
					const pairPromises = []
					for (let j = i; j < batchEnd; j++) {
						pairPromises.push(
							publicClient.readContract({
								address: factoryAddress as `0x${string}`,
								abi: jsonAbis.LBFactoryV21ABI,
								functionName: 'getLBPairAtIndex',
								args: [BigInt(j)]
							})
						)
					}

					const pairResults = await Promise.all(pairPromises)
					allPairs.push(...pairResults)
				} catch (error) {
					console.warn(`Error fetching pairs batch ${i}-${batchEnd}:`, error)
					// Continue with other batches
				}
			}

			console.log(`Fetched ${allPairs.length} pair addresses from factory`)

			// Process pairs and get token info
			const processedPairs = await Promise.all(
				allPairs.map(async (pairAddress: string, index: number) => {
					try {
						// Skip invalid addresses
						if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
							return null
						}

						// Get pair information
						const [tokenX, tokenY, binStep] = await Promise.all([
							publicClient.readContract({
								address: pairAddress as `0x${string}`,
								abi: [{
									"inputs": [],
									"name": "getTokenX",
									"outputs": [{ "internalType": "contract IERC20", "name": "tokenX", "type": "address" }],
									"stateMutability": "view",
									"type": "function"
								}],
								functionName: 'getTokenX'
							}),
							publicClient.readContract({
								address: pairAddress as `0x${string}`,
								abi: [{
									"inputs": [],
									"name": "getTokenY",
									"outputs": [{ "internalType": "contract IERC20", "name": "tokenY", "type": "address" }],
									"stateMutability": "view",
									"type": "function"
								}],
								functionName: 'getTokenY'
							}),
							publicClient.readContract({
								address: pairAddress as `0x${string}`,
								abi: [{
									"inputs": [],
									"name": "getBinStep",
									"outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }],
									"stateMutability": "view",
									"type": "function"
								}],
								functionName: 'getBinStep'
							})
						])

						// Get token symbols using SDK
						const tokenXInfo = getSDKTokenByAddress(tokenX as string, chainId)
						const tokenYInfo = getSDKTokenByAddress(tokenY as string, chainId)

						if (!tokenXInfo || !tokenYInfo || !tokenXInfo.symbol || !tokenYInfo.symbol) {
							// Skip pairs with unknown tokens
							return null
						}

						return {
							pairAddress,
							tokenX: tokenXInfo.symbol,
							tokenY: tokenYInfo.symbol,
							tokenXAddress: tokenX as string,
							tokenYAddress: tokenY as string,
							binStep: Number(binStep)
						}
					} catch (error) {
						console.warn(`Error processing pair ${index}:`, error)
						return null
					}
				})
			)

			// Filter out null results and ensure type safety
			const validPairs = processedPairs.filter((pair): pair is {
				pairAddress: string;
				tokenX: string;
				tokenY: string;
				tokenXAddress: string;
				tokenYAddress: string;
				binStep: number;
			} => pair !== null)
			setPairs(validPairs)

		} catch (error) {
			console.error('Error fetching all pairs:', error)
		} finally {
			setLoading(false)
		}
	}, [chainId])

	useEffect(() => {
		fetchAllPairs()
	}, [fetchAllPairs])

	return {
		pairs,
		loading,
		refetch: fetchAllPairs
	}
}

// Hook to get user's LP token balances across all pairs
export const useUserLPBalances = (userAddress: `0x${string}` | undefined) => {
	const [balances, setBalances] = useState<{
		pairAddress: string
		balance: bigint
		tokenX: string
		tokenY: string
	}[]>([])
	const [loading, setLoading] = useState(false)
	const { pairs } = useAllLBPairs()
	const chainId = useChainId()

	const fetchBalances = useCallback(async () => {
		console.log('=== FETCHING LP BALANCES ===')
		console.log('User address:', userAddress)
		console.log('Total pairs available:', pairs.length)
		console.log('Pairs:', pairs.map(p => `${p.tokenX}/${p.tokenY} - ${p.pairAddress}`))

		if (!userAddress || pairs.length === 0) {
			setBalances([])
			return
		}

		try {
			setLoading(true)
			const publicClient = createViemClient(chainId)

			// Check LP token balance for each pair using a more efficient approach
			const balancePromises = pairs.map(async (pair) => {
				try {
					console.log(`🔍 Checking balances for ${pair.tokenX}/${pair.tokenY} at ${pair.pairAddress}`)
					
					// Get the active bin for reference
					const activeBin = await publicClient.readContract({
						address: pair.pairAddress as `0x${string}`,
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

					console.log(`📍 Active bin for ${pair.tokenX}/${pair.tokenY}:`, activeBin)

					// Instead of checking a range, let's use a broader and more strategic approach
					// Check a wider range but with better error handling and logging
					const rangeToCheck = 500 // Increased range to catch more positions
					const startBin = Math.max(0, activeBin - rangeToCheck)
					const endBin = Math.min(16777215, activeBin + rangeToCheck)

					let totalBalance = BigInt(0)
					let binsWithBalance = 0

					console.log(`🔍 Checking bins ${startBin} to ${endBin} for ${pair.tokenX}/${pair.tokenY}`)

					// Check balances in smaller batches with better error handling
					const batchSize = 10 // Reduced batch size for better reliability
					for (let i = startBin; i <= endBin; i += batchSize) {
						const batchEnd = Math.min(i + batchSize - 1, endBin)
						const binIds = []
						for (let j = i; j <= batchEnd; j++) {
							binIds.push(j)
						}

						try {
							const balanceChecks = await Promise.all(
								binIds.map(async binId => {
									try {
										const balance = await publicClient.readContract({
											address: pair.pairAddress as `0x${string}`,
											abi: [{
												"inputs": [
													{"internalType": "address", "name": "account", "type": "address"},
													{"internalType": "uint256", "name": "id", "type": "uint256"}
												],
												"name": "balanceOf",
												"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
												"stateMutability": "view",
												"type": "function"
											}],
											functionName: 'balanceOf',
											args: [userAddress, BigInt(binId)]
										}) as bigint
										
										if (balance > 0) {
											console.log(`💰 Found balance in bin ${binId}: ${balance.toString()}`)
											binsWithBalance++
										}
										return balance
									} catch (balanceError) {
										// Silent fail for individual bin checks
										return BigInt(0)
									}
								})
							)

							const batchBalance = balanceChecks.reduce((sum, balance) => sum + balance, BigInt(0))
							totalBalance += batchBalance
						} catch (batchError) {
							console.warn(`Error checking batch ${i}-${batchEnd} for pair:`, pair.pairAddress, batchError)
						}

						// Add a small delay to avoid overwhelming the RPC
						if (i < endBin - batchSize) {
							await new Promise(resolve => setTimeout(resolve, 10))
						}
					}

					console.log(`🔍 Completed check for ${pair.tokenX}/${pair.tokenY}: totalBalance=${totalBalance.toString()}, binsWithBalance=${binsWithBalance}`)

					if (totalBalance > 0) {
						console.log(`✅ Found LP balance for ${pair.tokenX}/${pair.tokenY}:`, totalBalance.toString())
						return {
							pairAddress: pair.pairAddress,
							balance: totalBalance,
							tokenX: pair.tokenX,
							tokenY: pair.tokenY
						}
					} else {
						console.log(`❌ No LP balance for ${pair.tokenX}/${pair.tokenY}`)
					}

					return null
				} catch (error) {
					console.warn(`Error checking balance for pair ${pair.pairAddress}:`, error)
					
					// Fallback: Try to check just around the active bin with different ranges
					try {
						console.log(`🔄 Fallback: checking smaller range for ${pair.tokenX}/${pair.tokenY}`)
						const activeBin = await publicClient.readContract({
							address: pair.pairAddress as `0x${string}`,
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

						// Check smaller ranges with different strategies
						const ranges = [
							{ start: activeBin - 50, end: activeBin + 50 },    // Close to active
							{ start: activeBin - 200, end: activeBin - 51 },   // Below active
							{ start: activeBin + 51, end: activeBin + 200 },   // Above active
						]

						let totalFallbackBalance = BigInt(0)

						for (const range of ranges) {
							const startBin = Math.max(0, range.start)
							const endBin = Math.min(16777215, range.end)

							try {
								// Check just a few key bins in each range
								const keyBins = [startBin, Math.floor((startBin + endBin) / 2), endBin]
								
								for (const binId of keyBins) {
									try {
										const balance = await publicClient.readContract({
											address: pair.pairAddress as `0x${string}`,
											abi: [{
												"inputs": [
													{"internalType": "address", "name": "account", "type": "address"},
													{"internalType": "uint256", "name": "id", "type": "uint256"}
												],
												"name": "balanceOf",
												"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
												"stateMutability": "view",
												"type": "function"
											}],
											functionName: 'balanceOf',
											args: [userAddress, BigInt(binId)]
										}) as bigint

										if (balance > 0) {
											console.log(`💰 Fallback found balance in bin ${binId}: ${balance.toString()}`)
											totalFallbackBalance += balance
										}
									} catch {
										// Continue to next bin
									}
								}
							} catch {
								// Continue to next range
							}
						}

						if (totalFallbackBalance > 0) {
							console.log(`✅ Fallback found LP balance for ${pair.tokenX}/${pair.tokenY}:`, totalFallbackBalance.toString())
							return {
								pairAddress: pair.pairAddress,
								balance: totalFallbackBalance,
								tokenX: pair.tokenX,
								tokenY: pair.tokenY
							}
						}
					} catch (fallbackError) {
						console.warn(`Fallback also failed for ${pair.pairAddress}:`, fallbackError)
					}

					return null
				}
			})

			const results = await Promise.all(balancePromises)
			const validBalances = results.filter(balance => balance !== null)

			setBalances(validBalances)

		} catch (error) {
			console.error('Error fetching LP balances:', error)
		} finally {
			setLoading(false)
		}
	}, [userAddress, pairs, chainId])

	useEffect(() => {
		fetchBalances()
	}, [fetchBalances])

	return {
		balances,
		loading,
		refetch: fetchBalances
	}
}

// Hook to get user's active bin IDs for a specific pair
export const useUserActiveBins = (
	pairAddress: string,
	userAddress: `0x${string}` | undefined
) => {
	const [activeBins, setActiveBins] = useState<number[]>([])
	const [loading, setLoading] = useState(false)
	const chainId = useChainId()

	const fetchActiveBins = useCallback(async () => {
		if (!userAddress || !pairAddress) {
			setActiveBins([])
			return
		}

		try {
			setLoading(true)
			const publicClient = createViemClient(chainId)

			// Check a range of bin IDs around the active bin
			// In a real implementation, you might want to use events to find user's bins
			const centerBin = 8388608 // Active bin (this should be fetched from the pair)
			const range = 100 // Check ±100 bins around center

			const binIds = []
			for (let i = centerBin - range; i <= centerBin + range; i++) {
				binIds.push(i)
			}

			// Check balances for all these bins
			const balancePromises = binIds.map(async (binId) => {
				try {
					const balance = await publicClient.readContract({
						address: pairAddress as `0x${string}`,
						abi: [{
							"inputs": [
								{"internalType": "address", "name": "account", "type": "address"},
								{"internalType": "uint256", "name": "id", "type": "uint256"}
							],
							"name": "balanceOf",
							"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
							"stateMutability": "view",
							"type": "function"
						}],
						functionName: 'balanceOf',
						args: [userAddress, BigInt(binId)]
					}) as bigint

					return balance > 0 ? binId : null
				} catch {
					return null
				}
			})

			const results = await Promise.all(balancePromises)
			const activeBinIds = results.filter(binId => binId !== null) as number[]

			setActiveBins(activeBinIds)

		} catch (error) {
			console.error('Error fetching active bins:', error)
		} finally {
			setLoading(false)
		}
	}, [pairAddress, userAddress, chainId])

	useEffect(() => {
		fetchActiveBins()
	}, [fetchActiveBins])

	return {
		activeBins,
		loading,
		refetch: fetchActiveBins
	}
}
