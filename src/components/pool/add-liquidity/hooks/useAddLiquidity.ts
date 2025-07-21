import { ethers } from 'ethers'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId } from 'wagmi'
import { getUniformDistributionFromBinRange } from '@lb-xyz/sdk-v2'
import { useDexOperations, useTokenBalanceByAddress, createViemClient } from '../../../../dex'
import { getTokensForChain } from '../../../../dex/networkTokens'
import { LiquidityStrategy } from '../StrategySelection'

interface PoolData {
	id: string
	token0: string
	token1: string
	icon0: string
	icon1: string
	tvl: string
	apr: string
	volume24h: string
	fees24h: string
	userLiquidity?: string
	pairAddress?: string
	binStep?: number
	tokenXAddress?: string
	tokenYAddress?: string
}

export const useAddLiquidity = (
	selectedPool: PoolData | null,
	onSuccess?: () => void
) => {
	const { address: userWalletAddress } = useAccount()
	const currentChainId = useChainId()
	const [isPending, setIsPending] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [slippageTolerance] = useState(1)

	const { addLiquidity } = useDexOperations()
	
	// 🎯 动态获取token地址
	const getTokenAddress = (symbol: string): string | undefined => {
		const tokens = getTokensForChain(currentChainId)
		const token = tokens.find(t => t.symbol === symbol)
		console.log(`� Finding token address for ${symbol}:`, {
			found: !!token,
			address: token?.address,
			allTokens: tokens.map(t => ({ symbol: t.symbol, address: t.address }))
		})
		return token?.address
	}
	
	// 🎯 确定最终的token地址
	const finalTokenXAddress = selectedPool?.tokenXAddress || getTokenAddress(selectedPool?.token0 || '')
	const finalTokenYAddress = selectedPool?.tokenYAddress || getTokenAddress(selectedPool?.token1 || '')
	
	// �🚨 Debug: Log token addresses and pool data
	console.log('🔍 useAddLiquidity Debug:', {
		selectedPool: selectedPool,
		originalTokenXAddress: selectedPool?.tokenXAddress,
		originalTokenYAddress: selectedPool?.tokenYAddress,
		finalTokenXAddress: finalTokenXAddress,
		finalTokenYAddress: finalTokenYAddress,
		userWalletAddress: userWalletAddress,
		poolToken0: selectedPool?.token0,
		poolToken1: selectedPool?.token1,
		currentChainId: currentChainId
	})
	
	const tokenXBalance = useTokenBalanceByAddress(
		userWalletAddress,
		finalTokenXAddress as `0x${string}`,
	)
	const tokenYBalance = useTokenBalanceByAddress(
		userWalletAddress,
		finalTokenYAddress as `0x${string}`,
	)
	
	// 🚨 Debug: Log balances with correct decimals
	const getTokenDecimals = (symbol: string): number => {
		const tokens = getTokensForChain(currentChainId)
		const token = tokens.find(t => t.symbol === symbol)
		
		if (token?.decimals) {
			console.log(`🔍 Found decimals for ${symbol}:`, token.decimals)
			return token.decimals
		}
		
		// Fallback 
		const fallbackDecimals = ['USDT', 'USDC'].includes(symbol.toUpperCase()) ? 6 : 18
		console.log(`🔍 Using fallback ${fallbackDecimals} decimals for ${symbol}`)
		return fallbackDecimals
	}
	
	console.log('💰 Token Balances Debug:', {
		tokenXBalance: tokenXBalance,
		tokenYBalance: tokenYBalance,
		tokenXDecimals: getTokenDecimals(selectedPool?.token0 || ''),
		tokenYDecimals: getTokenDecimals(selectedPool?.token1 || ''),
		tokenXFormatted: tokenXBalance ? ethers.formatUnits(tokenXBalance, getTokenDecimals(selectedPool?.token0 || '')) : 'undefined',
		tokenYFormatted: tokenYBalance ? ethers.formatUnits(tokenYBalance, getTokenDecimals(selectedPool?.token1 || '')) : 'undefined',
		finalAddresses: { finalTokenXAddress, finalTokenYAddress }
	})

	// Map strategy to single-sided strategy
	const getSingleSidedStrategy = (strategy: LiquidityStrategy): 'conservative' | 'balanced' | 'aggressive' => {
		switch (strategy) {
			case 'curve': return 'conservative'
			case 'spot': return 'balanced'
			case 'bid-ask': return 'aggressive'
			default: return 'balanced'
		}
	}

	const handleAddLiquidity = async (
		amount0: string,
		amount1: string,
		strategy: LiquidityStrategy,
		// 🎯 新增：接收前端计算的价格范围参数
		minPrice?: number,
		maxPrice?: number,
		binCount?: number
	) => {
		console.log('🚀 handleAddLiquidity called')

		if ((!amount0 && !amount1) || !selectedPool) {
			console.error('❌ Validation failed: Please enter at least one token amount')
			toast.error('Please enter at least one token amount')
			return
		}

		if (!userWalletAddress) {
			console.error('❌ Validation failed: Please connect your wallet')
			toast.error('Please connect your wallet')
			return
		}

		try {
			console.log('⏳ Starting liquidity addition process...')
			setIsPending(true)
			setError(null)

			const amt0 = amount0 ? parseFloat(amount0) : 0
			const amt1 = amount1 ? parseFloat(amount1) : 0

			if (amt0 <= 0 && amt1 <= 0) {
				console.error('❌ Amount validation failed: Please enter at least one valid amount')
				toast.error('Please enter at least one valid amount')
				return
			}

			// 🎯 使用已经计算好的最终token地址
			let tokenXAddress = finalTokenXAddress
			let tokenYAddress = finalTokenYAddress
			
			console.log('🎯 使用最终token地址:', {
				tokenXAddress,
				tokenYAddress,
				来源: {
					fromPool: {
						tokenXAddress: selectedPool.tokenXAddress,
						tokenYAddress: selectedPool.tokenYAddress
					},
					fromNetworkConfig: {
						token0Symbol: selectedPool.token0,
						token1Symbol: selectedPool.token1,
						token0Address: getTokenAddress(selectedPool.token0),
						token1Address: getTokenAddress(selectedPool.token1)
					}
				}
			})

			if (!tokenXAddress || !tokenYAddress) {
				console.error('❌ Token addresses not found in pool data')
				toast.error('Token addresses not found in pool data')
				return
			}

			if (!tokenXAddress.startsWith('0x') || !tokenYAddress.startsWith('0x')) {
				console.error('❌ Invalid address format:', { tokenXAddress, tokenYAddress })
				toast.error('Invalid token address format')
				return
			}

			const pairAddress = selectedPool.pairAddress || selectedPool.id

			console.log('🔍 DEBUG: Checking pairAddress:', {
				selectedPoolPairAddress: selectedPool.pairAddress,
				selectedPoolId: selectedPool.id,
				finalPairAddress: pairAddress,
				selectedPoolKeys: Object.keys(selectedPool || {}),
				fullSelectedPool: selectedPool
			})

			if (!pairAddress) {
				console.error('❌ Pair address is undefined')
				toast.error('Pool pair address not found')
				return
			}

			// Get current active bin ID
			const publicClient = createViemClient(currentChainId)
			const currentActiveBinId = await publicClient.readContract({
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

			if (!selectedPool.binStep) {
				console.error('❌ Bin step not found in selected pool')
				toast.error('Pool bin step not available')
				return
			}

			// Enhanced pre-transaction validation
			const tokenXBal = tokenXBalance ? parseFloat(ethers.formatUnits(tokenXBalance, 18)) : 0
			const tokenYBal = tokenYBalance ? parseFloat(ethers.formatUnits(tokenYBalance, 18)) : 0
			
			if (amt0 > 0 && tokenXBal < amt0) {
				console.error('❌ Insufficient Token X balance:', { required: amt0, available: tokenXBal })
				toast.error(`Insufficient ${selectedPool.token0} balance. Required: ${amt0}, Available: ${tokenXBal.toFixed(6)}`)
				return
			}
			
			if (amt1 > 0 && tokenYBal < amt1) {
				console.error('❌ Insufficient Token Y balance:', { required: amt1, available: tokenYBal })
				toast.error(`Insufficient ${selectedPool.token1} balance. Required: ${amt1}, Available: ${tokenYBal.toFixed(6)}`)
				return
			}

			// Validate active bin ID
			if (currentActiveBinId < 0 || currentActiveBinId > 16777215) {
				console.error('❌ Invalid active bin ID:', currentActiveBinId)
				toast.error('Invalid pool state. Please try a different pool.')
				return
			}

			// Validate bin step
			const supportedBinSteps = [1, 5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 500, 1000]
			if (!supportedBinSteps.includes(selectedPool.binStep)) {
				console.error('❌ Unsupported bin step:', selectedPool.binStep)
				toast.error('Unsupported pool bin step.')
				return
			}

			// Validate amounts are not too small
			const minAmount = 0.000001
			if (amt0 > 0 && amt0 < minAmount) {
				console.error('❌ Amount0 too small:', amt0)
				toast.error(`${selectedPool.token0} amount too small. Minimum: ${minAmount}`)
				return
			}
			
			if (amt1 > 0 && amt1 < minAmount) {
				console.error('❌ Amount1 too small:', amt1)
				toast.error(`${selectedPool.token1} amount too small. Minimum: ${minAmount}`)
				return
			}

			// Verify contract exists
			try {
				await publicClient.readContract({
					address: pairAddress as `0x${string}`,
					abi: [{
						inputs: [],
						name: 'getActiveId',
						outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
						stateMutability: 'view',
						type: 'function'
					}],
					functionName: 'getActiveId'
				})
				console.log('✅ Pair contract is valid and responsive')
			} catch (contractError) {
				console.error('❌ Pair contract validation failed:', contractError)
				toast.error('Invalid pool contract. Please try a different pool.')
				return
			}

			// Smart detection for single-sided liquidity
			const isSingleSided = amt0 === 0 || amt1 === 0
			const mappedSingleSidedStrategy = getSingleSidedStrategy(strategy)

			// 🎯 计算 deltaIds, distributionX, distributionY 基于价格范围
			let deltaIds: number[] | undefined
			let distributionX: bigint[] | undefined
			let distributionY: bigint[] | undefined

			if (minPrice && maxPrice && binCount) {
				console.log('🎯 使用前端价格范围计算分布:', {
					minPrice,
					maxPrice,
					binCount,
					currentActiveBinId,
					binStep: selectedPool.binStep,
					isSingleSided,
					tokenAmounts: { amt0, amt1 }
				})

				// 使用LB SDK的 getUniformDistributionFromBinRange 来计算bin IDs
				try {
					// 🎯 使用 LB SDK 的 getUniformDistributionFromBinRange - 简单直接
					console.log('🎯 使用 LB SDK getUniformDistributionFromBinRange:', {
						minPrice,
						maxPrice,
						binCount,
						currentActiveBinId,
						binStep: selectedPool.binStep
					})
					
					// LB协议的价格到binId转换公式
					const binStepDecimal = selectedPool.binStep / 10000
					
					// 计算minPrice和maxPrice对应的binId
					const BASE_BIN_ID = 8388608 // 2^23, binId when price = 1
					let minBinId = Math.round(Math.log(minPrice) / Math.log(1 + binStepDecimal) + BASE_BIN_ID)
					let maxBinId = Math.round(Math.log(maxPrice) / Math.log(1 + binStepDecimal) + BASE_BIN_ID)
					
					// 🎯 针对单边流动性调整bin范围
					if (isSingleSided) {
						if (amt0 > 0 && amt1 === 0) {
							// Token0 单边流动性 - 只使用当前bin及以上的bins (deltaIds >= 0)
							minBinId = currentActiveBinId  // 从当前bin开始
							maxBinId = Math.max(maxBinId, currentActiveBinId + 20) // 至少向右扩展20个bins
						} else if (amt1 > 0 && amt0 === 0) {
							// Token1 单边流动性 - 只使用当前bin及以下的bins (deltaIds <= 0)
							minBinId = Math.min(minBinId, currentActiveBinId - 20) // 至少向左扩展20个bins
							maxBinId = currentActiveBinId  // 到当前bin结束
						}
					}
					
					console.log('🔍 价格范围对应的binId:', {
						minPrice,
						maxPrice,
						minBinId,
						maxBinId,
						binRange: maxBinId - minBinId + 1
					})
					
					// 🎯 直接使用 LB SDK 的 getUniformDistributionFromBinRange
					const binRange: [number, number] = [minBinId, maxBinId]
					
					const result = getUniformDistributionFromBinRange(
						currentActiveBinId,
						binRange
					)
					
					deltaIds = result.deltaIds
					distributionX = result.distributionX
					distributionY = result.distributionY
					
					console.log('🎯 LB SDK 生成的分布参数:', {
						deltaIds,
						distributionX: distributionX?.map(d => d.toString()),
						distributionY: distributionY?.map(d => d.toString()),
						distributionXSum: distributionX?.reduce((sum, val) => sum + val, BigInt(0)).toString(),
						distributionYSum: distributionY?.reduce((sum, val) => sum + val, BigInt(0)).toString(),
						binRange,
						tokenAmounts: { amt0, amt1 }
					})

					// 🚨 关键验证：确保分布数组长度和deltaIds匹配
					if (distributionX && distributionY && deltaIds) {
						const deltaIdsLength = deltaIds.length
						const distXLength = distributionX.length
						const distYLength = distributionY.length
						
						if (deltaIdsLength !== distXLength || deltaIdsLength !== distYLength) {
							console.error('❌ 数组长度不匹配:', {
								deltaIdsLength,
								distXLength,
								distYLength
							})
							throw new Error('Distribution arrays length mismatch with deltaIds')
						}
						
						// 验证总和 - LB SDK 使用更高精度的基数 (10^18 instead of 10^4)
						const sumX = distributionX.reduce((sum, val) => sum + val, BigInt(0))
						const sumY = distributionY.reduce((sum, val) => sum + val, BigInt(0))
						
						// LB SDK 使用 10^18 作为基数，而不是 10000
						const expectedTotal = BigInt('1000000000000000000') // 10^18
						const tolerance = BigInt('100000000000000000') // 10% tolerance for precision (SDK rounding)
						
						const isWithinTolerance = (value: bigint, expected: bigint) => {
							const diff = value > expected ? value - expected : expected - value
							return diff <= tolerance
						}
						
						if (isSingleSided) {
							// 单边流动性：检查哪个token有金额，对应的分布应该接近10^18
							if (amt0 > 0 && amt1 === 0) {
								// Token0 (X) 单边流动性 - distributionX应该接近10^18
								if (!isWithinTolerance(sumX, expectedTotal)) {
									console.error('❌ 单边X流动性分布错误:', { sumX: sumX.toString(), sumY: sumY.toString(), expected: expectedTotal.toString() })
									throw new Error('Single-sided X liquidity distribution error')
								}
							} else if (amt1 > 0 && amt0 === 0) {
								// Token1 (Y) 单边流动性 - distributionY应该接近10^18
								if (!isWithinTolerance(sumY, expectedTotal)) {
									console.error('❌ 单边Y流动性分布错误:', { sumX: sumX.toString(), sumY: sumY.toString(), expected: expectedTotal.toString() })
									throw new Error('Single-sided Y liquidity distribution error')
								}
							}
						} else {
							// 双边流动性：两个都应该接近10^18
							if (!isWithinTolerance(sumX, expectedTotal) || !isWithinTolerance(sumY, expectedTotal)) {
								console.error('❌ 双边流动性分布错误:', { sumX: sumX.toString(), sumY: sumY.toString(), expected: expectedTotal.toString() })
								throw new Error('Dual-sided liquidity distribution error')
							}
						}
					}

					console.log('🎯 计算完成的分布参数 (验证通过):', {
						deltaIds,
						distributionX: distributionX?.map(d => d.toString()),
						distributionY: distributionY?.map(d => d.toString()),
						distributionXSum: distributionX?.reduce((sum, val) => sum + val, BigInt(0)).toString(),
						distributionYSum: distributionY?.reduce((sum, val) => sum + val, BigInt(0)).toString(),
						isSingleSided,
						tokenAmounts: { amt0, amt1 },
						// 🔍 额外调试信息
						activeBinPosition: deltaIds?.indexOf(0), // 当前价格在数组中的位置
						binRange: [minBinId, maxBinId],
						activeBinId: currentActiveBinId
					})

				} catch (priceCalcError) {
					console.error('❌ 价格范围计算失败:', priceCalcError)
					// 回退到undefined，让useDexOperations使用默认逻辑
					deltaIds = undefined
					distributionX = undefined
					distributionY = undefined
				}
			}

			// 🚨 最终参数验证和日志
			console.log('🎯 即将调用addLiquidity，最终参数:', {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				currentActiveBinId,
				binStep: selectedPool.binStep,
				deltaIds,
				distributionX: distributionX?.map(d => d.toString()),
				distributionY: distributionY?.map(d => d.toString()),
				isSingleSided,
				strategy: isSingleSided ? mappedSingleSidedStrategy : undefined,
				slippageTolerance
			})

			// 🎯 临时测试：先用undefined让后端生成默认分布，对比差异
			console.log('🔍 测试：使用fallback参数 (设置为undefined)')

			await addLiquidity(
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				amt0,
				amt1,
				currentActiveBinId,
				selectedPool.binStep,
				deltaIds, // 🎯 使用计算的deltaIds
				distributionX, // 🎯 使用计算的distributionX
				distributionY, // 🎯 使用计算的distributionY
				isSingleSided,
				isSingleSided ? mappedSingleSidedStrategy : undefined,
				slippageTolerance
			)

			console.log('✅ Liquidity added successfully!')
			toast.success('Liquidity added successfully!')
			setIsSuccess(true)
			if (onSuccess) {
				onSuccess()
			}
		} catch (err: unknown) {
			console.error('💥 Add liquidity error:', err)
			const error = err instanceof Error ? err : new Error('Unknown error occurred')
			
			// Enhanced error detection
			let errorMessage = 'Failed to add liquidity'
			
			if (error.message.includes('User rejected') || error.message.includes('user denied')) {
				errorMessage = 'Transaction was cancelled by user'
			} else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
				errorMessage = 'Insufficient funds for transaction'
			} else if (error.message.includes('allowance') || error.message.includes('ERC20: transfer amount exceeds allowance')) {
				errorMessage = 'Token allowance insufficient. Please approve tokens first.'
			} else if (error.message.includes('LBRouter__AmountSlippageCaught')) {
				const match = error.message.match(/LBRouter__AmountSlippageCaught \(amountXMin=(\d+), amountX=(\d+), amountYMin=(\d+), amountY=(\d+)/)
				if (match) {
					const [, amountXMin, amountX, amountYMin, amountY] = match
					errorMessage = `Price slippage protection triggered. Expected minimum: X=${amountXMin}, Y=${amountYMin}, but got: X=${amountX}, Y=${amountY}. Please try again when market conditions are more stable, or try with smaller amounts.`
				} else {
					errorMessage = 'Price slippage too high. The price moved significantly during transaction. Please try again with higher slippage tolerance or when markets are less volatile.'
				}
			} else if (error.message.includes('execution reverted')) {
				if (error.message.includes('INSUFFICIENT_AMOUNT') || error.message.includes('InsufficientAmount')) {
					errorMessage = 'Insufficient token amount. Try increasing the amount.'
				} else if (error.message.includes('INSUFFICIENT_LIQUIDITY') || error.message.includes('InsufficientLiquidity')) {
					errorMessage = 'Insufficient liquidity in the pool. Try a different amount.'
				} else {
					errorMessage = 'Transaction failed (execution reverted). Please check your inputs and try again.'
				}
			} else if (error.message.includes('gas')) {
				errorMessage = 'Transaction failed due to gas issues. Try increasing gas limit.'
			} else if (error.message.includes('network') || error.message.includes('connection')) {
				errorMessage = 'Network connection error. Please check your connection and try again.'
			} else if (error.message) {
				errorMessage = error.message
			}
			
			toast.error(errorMessage)
			setError(error)
		} finally {
			setIsPending(false)
		}
	}

	return {
		isPending,
		isSuccess,
		error,
		slippageTolerance,
		tokenXBalance,
		tokenYBalance,
		userWalletAddress,
		handleAddLiquidity,
	}
}
