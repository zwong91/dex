import { formatUnits } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { getTokensForChain } from '../networkTokens'
import { priceService, formatPriceChange, formatPrice } from '../services/priceService'
import { createViemClient } from '../viemClient'
import { useUserLiquidityPositions } from './useUserPositions'

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

		try {
			setLoading(true)
			setError(null)

			const tokens = getTokensForChain(chainId)
			const client = createViemClient(chainId)

			// First, fetch real prices for all tokens
			const tokenSymbols = tokens.map(token => token.symbol)
			console.log('🔄 Fetching prices for tokens:', tokenSymbols)
			const priceData = await priceService.fetchPrices(tokenSymbols)

			const balancePromises = tokens.map(async (token) => {
				try {
					const balance = await client.readContract({
						address: token.address as `0x${string}`,
						abi: erc20Abi,
						functionName: 'balanceOf',
						args: [address],
					}) as bigint

					// Get token decimals
					const decimals = await client.readContract({
						address: token.address as `0x${string}`,
						abi: erc20Abi,
						functionName: 'decimals',
						args: [],
					}) as number

					const balanceFormatted = formatUnits(balance, decimals)

					// Get real price data
					const tokenPriceData = priceData[token.symbol]
					const price = formatPrice(tokenPriceData?.price || 0)
					const value = (parseFloat(balanceFormatted) * (tokenPriceData?.price || 0)).toFixed(2)
					const change24h = formatPriceChange(tokenPriceData?.change24h || 0)

					const tokenBalance: TokenBalance = {
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

					return tokenBalance
				} catch (error) {
					console.warn(`Failed to fetch balance for ${token.symbol}:`, error)
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

			const balances = await Promise.all(balancePromises)

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

		setWalletStats({
			totalTokensValue,
			totalLPValue,
			totalUnclaimedFees,
			totalPortfolioValue: totalTokensValue + totalLPValue,
			tokenCount: tokenBalances.length,
			lpPositionCount: lpPositions.length,
		})
	}, [tokenBalances, lpPositions])

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
