import { formatUnits } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { getTokensForChain } from '../networkTokens'
import { priceService, formatPriceChange, formatPrice } from '../services/priceService'
import { createViemClient } from '../viemClient'
import { useUserLiquidityPositions } from './useUserPositions'

// Cache for token data to avoid repeated calls
const tokenDataCache = new Map<string, {
	data: TokenBalance[]
	timestamp: number
	walletStats: WalletStats
}>()

const CACHE_DURATION = 30000 // 30 seconds cache

export interface TokenBalance {
	symbol: string
	name: string
	icon: string
	address: string
	balance: string
	balanceFormatted: string
	decimals: number
	value?: string
	price?: string
	change24h?: string
}

export interface WalletStats {
	totalTokensValue: number
	totalLPValue: number
	totalUnclaimedFees: number
	totalPortfolioValue: number
	tokenCount: number
	lpPositionCount: number
}

export const useWalletData = () => {
	const { address } = useAccount()
	const chainId = useChainId()
	const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
	const [walletStats, setWalletStats] = useState<WalletStats>({
		totalTokensValue: 0,
		totalLPValue: 0,
		totalUnclaimedFees: 0,
		totalPortfolioValue: 0,
		tokenCount: 0,
		lpPositionCount: 0,
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Get user liquidity positions for LP stats
	const { positions: lpPositions, loading: positionsLoading } = useUserLiquidityPositions(address)

	const fetchTokenBalances = useCallback(async () => {
		if (!address) {
			setTokenBalances([])
			return
		}

		// Check cache first
		const cacheKey = `${address}-${chainId}`
		const cached = tokenDataCache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			console.log('💾 Using cached token balances')
			setTokenBalances(cached.data)
			setWalletStats(cached.walletStats)
			return
		}

		try {
			setLoading(true)
			setError(null)

			const tokens = getTokensForChain(chainId)
			const client = createViemClient(chainId)

			// First, fetch prices for all tokens in parallel
			const tokenSymbols = tokens.map(token => token.symbol)
			console.log('🔄 Fetching prices for tokens:', tokenSymbols)
			
			// Start price fetch early - don't wait
			const pricePromise = priceService.fetchPrices(tokenSymbols)

			// Batch balance and decimals calls using multicall
			const balanceCalls = tokens.map(token => ({
				address: token.address as `0x${string}`,
				abi: erc20Abi,
				functionName: 'balanceOf',
				args: [address],
			}))

			const decimalsCalls = tokens.map(token => ({
				address: token.address as `0x${string}`,
				abi: erc20Abi,
				functionName: 'decimals',
				args: [],
			}))

			console.log('🚀 Starting batch balance/decimals fetch for', tokens.length, 'tokens')

			// Execute batched calls
			const [balanceResults, decimalsResults, priceData] = await Promise.all([
				client.multicall({ contracts: balanceCalls }),
				client.multicall({ contracts: decimalsCalls }),
				pricePromise
			])

			console.log('✅ Batch calls completed')

			// Process results
			const balances: TokenBalance[] = tokens.map((token, index) => {
				try {
					const balanceResult = balanceResults[index]
					const decimalsResult = decimalsResults[index]

					if (balanceResult.status !== 'success' || decimalsResult.status !== 'success') {
						console.warn(`Failed batch call for ${token.symbol}`)
						return {
							symbol: token.symbol,
							name: token.name,
							icon: token.icon,
							address: token.address,
							balance: '0',
							balanceFormatted: '0.000000',
							decimals: 18,
							value: '0.00',
							price: '$0.00',
							change24h: '0.00%',
						}
					}

					const balance = balanceResult.result as bigint
					const decimals = decimalsResult.result as number
					const balanceFormatted = formatUnits(balance, decimals)

					// Get real price data
					const tokenPriceData = priceData[token.symbol]
					const price = formatPrice(tokenPriceData?.price || 0)
					const value = (parseFloat(balanceFormatted) * (tokenPriceData?.price || 0)).toFixed(2)
					const change24h = formatPriceChange(tokenPriceData?.change24h || 0)

					return {
						symbol: token.symbol,
						name: token.name,
						icon: token.icon,
						address: token.address,
						balance: balance.toString(),
						balanceFormatted: parseFloat(balanceFormatted).toFixed(6),
						decimals,
						value,
						price,
						change24h,
					}
				} catch (error) {
					console.warn(`Failed to process ${token.symbol}:`, error)
					return {
						symbol: token.symbol,
						name: token.name,
						icon: token.icon,
						address: token.address,
						balance: '0',
						balanceFormatted: '0.000000',
						decimals: 18,
						value: '0.00',
						price: '$0.00',
						change24h: '0.00%',
					}
				}
			})

			// Filter out zero balances for cleaner display
			const nonZeroBalances = balances.filter(
				balance => parseFloat(balance.balanceFormatted) > 0.000001
			)

			console.log('💰 Final token balances with real prices:', nonZeroBalances)
			setTokenBalances(nonZeroBalances)

		} catch (error) {
			console.error('Error fetching token balances:', error)
			setError('Failed to fetch token balances')
		} finally {
			setLoading(false)
		}
	}, [address, chainId])

	// Calculate wallet stats
	useEffect(() => {
		const totalTokensValue = tokenBalances.reduce(
			(sum, token) => {
				const value = parseFloat(token.value || '0')
				return sum + (isFinite(value) ? value : 0)
			},
			0
		)

		const totalLPValue = lpPositions.reduce(
			(sum, position) => {
				// Parse the position value, removing currency symbols and formatting
				const valueStr = position.value?.replace(/[$,BMK]/g, '') || '0'
				let value = parseFloat(valueStr)
				
				// Handle K, M, B suffixes
				if (position.value?.includes('B')) {
					value = value * 1000000000
				} else if (position.value?.includes('M')) {
					value = value * 1000000
				} else if (position.value?.includes('K')) {
					value = value * 1000
				}
				
				return sum + (isFinite(value) ? value : 0)
			},
			0
		)

		const totalUnclaimedFees = lpPositions.reduce(
			(sum, position) => {
				// Parse the fees total, removing currency symbols and formatting
				const feesStr = position.feesTotal?.replace(/[$,BMK]/g, '') || '0'
				let fees = parseFloat(feesStr)
				
				// Handle K, M, B suffixes
				if (position.feesTotal?.includes('B')) {
					fees = fees * 1000000000
				} else if (position.feesTotal?.includes('M')) {
					fees = fees * 1000000
				} else if (position.feesTotal?.includes('K')) {
					fees = fees * 1000
				}
				
				return sum + (isFinite(fees) ? fees : 0)
			},
			0
		)

		console.log('💰 Wallet stats calculation:', {
			totalTokensValue,
			totalLPValue,
			totalUnclaimedFees,
			totalPortfolioValue: totalTokensValue + totalLPValue,
			tokenCount: tokenBalances.length,
			lpPositionCount: lpPositions.length
		})

		const newWalletStats = {
			totalTokensValue,
			totalLPValue,
			totalUnclaimedFees,
			totalPortfolioValue: totalTokensValue + totalLPValue,
			tokenCount: tokenBalances.length,
			lpPositionCount: lpPositions.length,
		}

		setWalletStats(newWalletStats)

		// Cache the results
		if (address && tokenBalances.length > 0) {
			const cacheKey = `${address}-${chainId}`
			tokenDataCache.set(cacheKey, {
				data: tokenBalances,
				timestamp: Date.now(),
				walletStats: newWalletStats
			})
		}
	}, [tokenBalances, lpPositions, address, chainId])

	useEffect(() => {
		fetchTokenBalances()
	}, [fetchTokenBalances])

	return {
		tokenBalances,
		walletStats,
		lpPositions,
		loading: loading || positionsLoading,
		error,
		refetch: fetchTokenBalances,
	}
}

// Hook to get formatted wallet summary
export const useWalletSummary = () => {
	const { walletStats } = useWalletData()

	const formatCurrency = (amount: number) => {
		// Handle NaN, undefined, or invalid numbers
		if (!isFinite(amount) || amount < 0) {
			return '$0.00'
		}
		
		if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(1)}M`
		} else if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(1)}K`
		} else {
			return `$${amount.toFixed(2)}`
		}
	}

	return {
		totalValue: formatCurrency(walletStats.totalPortfolioValue),
		tokensValue: formatCurrency(walletStats.totalTokensValue),
		lpValue: formatCurrency(walletStats.totalLPValue),
		unclaimedFees: formatCurrency(walletStats.totalUnclaimedFees),
		tokenCount: walletStats.tokenCount,
		positionCount: walletStats.lpPositionCount,
	}
}
