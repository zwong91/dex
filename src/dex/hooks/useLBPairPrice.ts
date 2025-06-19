import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { createViemClient } from '../viemClient'
import { Bin } from '@lb-xyz/sdk-v2'

/**
 * Hook to get the current price from a Liquidity Book pair
 * Fetches the active bin ID and calculates the current price based on bin step
 */
export const useLBPairPrice = (pairAddress: string | undefined, binStep: number | undefined) => {
	const [currentPrice, setCurrentPrice] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const chainId = useChainId()

	const fetchCurrentPrice = useCallback(async () => {
		if (!pairAddress || !binStep) {
			setCurrentPrice(null)
			return
		}

		try {
			setLoading(true)
			setError(null)

			const publicClient = createViemClient(chainId)

			// Get the active bin ID from the LB pair
			const activeBinId = await publicClient.readContract({
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

			console.log(`📍 Active bin ID for pair ${pairAddress}:`, activeBinId)

			// Calculate the price from the active bin ID using LB SDK
			// This is more accurate than manual calculation
			const price = Bin.getPriceFromId(activeBinId, binStep)

			console.log(`💰 Calculated price for ${pairAddress}:`, {
				activeBinId,
				binStep,
				calculatedPrice: price
			})

			setCurrentPrice(price)

		} catch (err) {
			console.error('Error fetching LB pair price:', err)
			setError(err instanceof Error ? err.message : 'Failed to fetch price')
			setCurrentPrice(null)
		} finally {
			setLoading(false)
		}
	}, [pairAddress, binStep, chainId])

	useEffect(() => {
		fetchCurrentPrice()
	}, [fetchCurrentPrice])

	return {
		currentPrice,
		loading,
		error,
		refetch: fetchCurrentPrice
	}
}

/**
 * Hook to get current prices for multiple LB pairs
 */
export const useMultipleLBPairPrices = (
	pairs: Array<{ pairAddress: string; binStep: number }> | undefined
) => {
	const [prices, setPrices] = useState<Record<string, number>>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const chainId = useChainId()

	const fetchAllPrices = useCallback(async () => {
		if (!pairs || pairs.length === 0) {
			setPrices({})
			return
		}

		try {
			setLoading(true)
			setError(null)

			const publicClient = createViemClient(chainId)

			// Fetch all active bin IDs in parallel
			const activeBinPromises = pairs.map(async ({ pairAddress, binStep }) => {
				try {
					const activeBinId = await publicClient.readContract({
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

					// Calculate price using LB SDK's Bin.getPriceFromId
					const price = Bin.getPriceFromId(activeBinId, binStep)

					return { pairAddress, price }
				} catch (err) {
					console.error(`Failed to fetch price for ${pairAddress}:`, err)
					return { pairAddress, price: null }
				}
			})

			const results = await Promise.all(activeBinPromises)

			// Build prices object
			const newPrices: Record<string, number> = {}
			results.forEach(({ pairAddress, price }) => {
				if (price !== null) {
					newPrices[pairAddress] = price
				}
			})

			setPrices(newPrices)

		} catch (err) {
			console.error('Error fetching multiple LB pair prices:', err)
			setError(err instanceof Error ? err.message : 'Failed to fetch prices')
		} finally {
			setLoading(false)
		}
	}, [pairs, chainId])

	useEffect(() => {
		fetchAllPrices()
	}, [fetchAllPrices])

	return {
		prices,
		loading,
		error,
		refetch: fetchAllPrices
	}
}
