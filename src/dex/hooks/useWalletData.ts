import { formatUnits } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { getTokensForChain } from '../networkTokens'
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

					// Simple price estimation for demo
					// In real app, this would come from a price oracle or API
					let price = '0'
					let value = '0'
					let change24h = '0.00%'

					if (token.symbol === 'USDC' || token.symbol === 'USDT') {
						price = '1.00'
						value = (parseFloat(balanceFormatted) * 1.0).toFixed(2)
						change24h = '+0.01%'
					} else if (token.symbol === 'WBNB' || token.symbol === 'BNB') {
						price = '600.00' // Demo price
						value = (parseFloat(balanceFormatted) * 600).toFixed(2)
						change24h = '+2.45%'
					} else if (token.symbol === 'ETH' || token.symbol === 'WETH') {
						price = '3400.00' // Demo price
						value = (parseFloat(balanceFormatted) * 3400).toFixed(2)
						change24h = '+1.85%'
					}

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
						price: '0.00',
						change24h: '0.00%',
					}
				}
			})

			const balances = await Promise.all(balancePromises)

			// Filter out zero balances for cleaner display
			const nonZeroBalances = balances.filter(
				balance => parseFloat(balance.balanceFormatted) > 0.000001
			)

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
			(sum, token) => sum + parseFloat(token.value || '0'),
			0
		)

		const totalLPValue = lpPositions.reduce(
			(sum, position) => sum + parseFloat(position.value || '0'),
			0
		)

		const totalUnclaimedFees = lpPositions.reduce(
			(sum, position) => sum + parseFloat(position.feesTotal || '0'),
			0
		)

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
