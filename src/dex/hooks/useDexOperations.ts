import { Bin, LB_FACTORY_V22_ADDRESS, LB_ROUTER_V22_ADDRESS, jsonAbis, PairV2, getUniformDistributionFromBinRange } from "@lb-xyz/sdk-v2"
import { TokenAmount } from '@lb-xyz/sdk-core'
import * as ethers from "ethers"
import { useCallback } from "react"
import { useAccount, useChainId, useWriteContract } from "wagmi"
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { createViemClient } from "../viemClient"
import { calculateSingleSidedBinRange, getRecommendedBinCount, createConcentratedDistribution, createUniformDistribution, createWeightedDistribution } from "../utils/calculations"
import JSBI from 'jsbi'

// ERC20 ABI for allowance and approve functions
const ERC20_ABI = [
	{
		"inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
		"name": "allowance",
		"outputs": [{"name": "", "type": "uint256"}],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
		"name": "approve",
		"outputs": [{"name": "", "type": "bool"}],
		"stateMutability": "nonpayable",
		"type": "function"
	}
] as const

// Hook for LB DEX operations (add/remove liquidity, claim fees)
export const useDexOperations = () => {
	const { writeContractAsync } = useWriteContract()
	const { address: userAddress } = useAccount()
	const chainId = useChainId()

	// Real LB Router operations for adding liquidity to specific pair and bins
	// Supports both dual-sided and single-sided liquidity provision
	const addLiquidity = async (
		pairAddress: string,
		tokenXAddress: string,
		tokenYAddress: string,
		tokenAAmount: number,
		tokenBAmount: number,
		activeBinId: number,
		binStep: number,
		deltaIds?: number[],
		distributionX?: bigint[],
		distributionY?: bigint[],
		singleSidedMode?: boolean, // Enable single-sided liquidity
		singleSidedStrategy?: 'conservative' | 'balanced' | 'aggressive', // Strategy for single-sided
		customSlippageTolerance?: number, // Custom slippage tolerance percentage (e.g., 5 for 5%)
	) => {
		try {
			console.log("🔍 addLiquidity called with:", { 
				pairAddress, 
				tokenXAddress, 
				tokenYAddress, 
				tokenAAmount, 
				tokenBAmount, 
				activeBinId, 
				deltaIds, 
				distributionX, 
				distributionY, 
				binStep,
				singleSidedMode,
				singleSidedStrategy
			})

			if (!userAddress) {
				console.error("❌ Wallet not connected")
				throw new Error("Wallet not connected")
			}

			// 检测是否为单边流动性模式
			const isSingleSided = singleSidedMode || (tokenAAmount > 0 && tokenBAmount === 0) || (tokenAAmount === 0 && tokenBAmount > 0)
			const isTokenXOnly = tokenAAmount > 0 && tokenBAmount === 0
			const isTokenYOnly = tokenAAmount === 0 && tokenBAmount > 0

			if (isSingleSided) {
				console.log("🎯 Single-sided liquidity detected:", {
					isTokenXOnly,
					isTokenYOnly,
					strategy: singleSidedStrategy || 'balanced'
				})
			}

			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]

			if (!lbRouterAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			// 获取SDK Token对象
			const tokenA = getSDKTokenByAddress(tokenXAddress, chainId)
			const tokenB = getSDKTokenByAddress(tokenYAddress, chainId)

			if (!tokenA || !tokenB) {
				throw new Error(`Token not found in SDK configuration`)
			}

			console.log("🔍 SDK Tokens:", {
				tokenA: { symbol: tokenA.symbol, address: tokenA.address },
				tokenB: { symbol: tokenB.symbol, address: tokenB.address }
			})

			// 创建PairV2实例 - SDK会自动按地址排序 (token0 < token1)
			const pair = new PairV2(tokenA, tokenB)
			
			console.log("� PairV2 ordered tokens:", {
				token0: { symbol: pair.token0.symbol, address: pair.token0.address },
				token1: { symbol: pair.token1.symbol, address: pair.token1.address }
			})

			// 确定金额对应关系
			let amountToken0: number, amountToken1: number
			if (tokenA.address.toLowerCase() === pair.token0.address.toLowerCase()) {
				// tokenA -> token0, tokenB -> token1
				amountToken0 = tokenAAmount || 0
				amountToken1 = tokenBAmount || 0
			} else {
				// tokenA -> token1, tokenB -> token0 (交换了)
				amountToken0 = tokenBAmount || 0
				amountToken1 = tokenAAmount || 0
			}

			console.log("🔍 Amounts after ordering:", {
				amountToken0,
				amountToken1
			})

			// 解析代币数量
			const typedValueToken0Parsed = ethers.parseUnits(amountToken0.toString(), pair.token0.decimals)
			const typedValueToken1Parsed = ethers.parseUnits(amountToken1.toString(), pair.token1.decimals)

			// 创建TokenAmount对象
			const tokenAmountToken0 = new TokenAmount(pair.token0, typedValueToken0Parsed)
			const tokenAmountToken1 = new TokenAmount(pair.token1, typedValueToken1Parsed)

			// 使用用户设置的滑点容忍度，或根据模式使用默认值
			// customSlippageTolerance 是百分比 (e.g., 5 for 5%)
			const userSlippagePercentage = customSlippageTolerance || (isSingleSided ? 10 : 5)
			const allowedAmountsSlippage = userSlippagePercentage * 100 // 转换为 bips (5% = 500 bips)

			console.log("🎯 Slippage configuration:", {
				userSlippagePercentage: userSlippagePercentage + "%",
				allowedAmountsSlippage: allowedAmountsSlippage + " bips",
				mode: isSingleSided ? 'single-sided' : 'dual-sided'
			})

			// 基于滑点计算最小数量 - 对于单边流动性，只有一个代币有值，另一个为0
			const minTokenAmount0 = amountToken0 > 0 ? JSBI.divide(
				JSBI.multiply(tokenAmountToken0.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
				JSBI.BigInt(10000)
			) : JSBI.BigInt(0)
			
			const minTokenAmount1 = amountToken1 > 0 ? JSBI.divide(
				JSBI.multiply(tokenAmountToken1.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
				JSBI.BigInt(10000)
			) : JSBI.BigInt(0)

			// 获取LBPair信息
			const pairVersion = 'v22'
			const publicClient = createViemClient(chainId)
			const lbPair = await pair.fetchLBPair(binStep, pairVersion, publicClient, CHAIN_ID)
			
			if (lbPair.LBPair === '0x0000000000000000000000000000000000000000') {
				throw new Error(`LB pair not found for ${pair.token0.symbol}/${pair.token1.symbol} with bin step ${binStep || 25}`)
			}

			console.log(`✅ Found LBPair: ${lbPair.LBPair}`)

			// 获取活跃bin ID
			const lbPairData = await PairV2.getLBPairReservesAndId(lbPair.LBPair, pairVersion, publicClient)
			const activeBin = activeBinId || lbPairData.activeId

			console.log(`🎯 Active bin ID: ${activeBin}`)

			// 生成流动性分布 - 支持单边和双边模式
			let finalDeltaIds: number[]
			let finalDistributionX: bigint[]
			let finalDistributionY: bigint[]

			if (isSingleSided) {
				// 单边流动性模式
				const strategy = singleSidedStrategy || 'balanced'
				const recommendedBinCount = getRecommendedBinCount(
					Math.max(tokenAAmount, tokenBAmount), 
					strategy === 'conservative' ? 0.05 : strategy === 'aggressive' ? 0.2 : 0.1
				)
				
				const concentration = strategy === 'conservative' ? 5 : strategy === 'aggressive' ? 2 : 3
				
				// 确定是tokenX还是tokenY
				const isProvidingTokenX = isTokenXOnly
				
				const { deltaIds: calculatedDeltaIds } = calculateSingleSidedBinRange(
					activeBin, 
					isProvidingTokenX, 
					recommendedBinCount, 
					concentration
				)

				finalDeltaIds = deltaIds || calculatedDeltaIds
				
				// 生成基础分布
				const binRange: [number, number] = [
					activeBin + Math.min(...finalDeltaIds), 
					activeBin + Math.max(...finalDeltaIds)
				]
				
				// 不需要SDK的分布，直接创建自定义分布

				// 创建自定义分布
				let customDistribution: bigint[]
				switch (strategy) {
					case 'conservative':
						customDistribution = createConcentratedDistribution(finalDeltaIds.length)
						break
					case 'aggressive':
						customDistribution = createWeightedDistribution(finalDeltaIds.length, isProvidingTokenX)
						break
					default: // balanced
						customDistribution = createUniformDistribution(finalDeltaIds.length)
				}

				// 对于单边流动性，只在相应方向提供流动性
				if (isProvidingTokenX) {
					finalDistributionX = distributionX || customDistribution
					finalDistributionY = new Array(finalDistributionX.length).fill(BigInt(0))
				} else {
					finalDistributionY = distributionY || customDistribution
					finalDistributionX = new Array(finalDistributionY.length).fill(BigInt(0))
				}

				console.log("🔍 Single-sided liquidity distribution:", {
					strategy,
					activeBin,
					binRange,
					deltaIds: finalDeltaIds,
					isProvidingTokenX,
					distributionXSum: finalDistributionX.reduce((sum, val) => sum + val, BigInt(0)).toString(),
					distributionYSum: finalDistributionY.reduce((sum, val) => sum + val, BigInt(0)).toString()
				})
			} else {
				// 双边流动性模式（原有逻辑）
				const binRange: [number, number] = deltaIds ? 
					[activeBin + Math.min(...deltaIds), activeBin + Math.max(...deltaIds)] :
					[activeBin - 2, activeBin + 2] // 默认5个bin

				const { deltaIds: calculatedDeltaIds, distributionX: calculatedDistributionX, distributionY: calculatedDistributionY } = 
					getUniformDistributionFromBinRange(activeBin, binRange)

				finalDeltaIds = deltaIds || calculatedDeltaIds
				finalDistributionX = distributionX || calculatedDistributionX
				finalDistributionY = distributionY || calculatedDistributionY

				console.log("🔍 Dual-sided liquidity distribution:", {
					activeBin,
					binRange,
					deltaIds: finalDeltaIds,
					distributionCount: finalDistributionX.length
				})
			}

			// 验证LBPair的实际token顺序
			const actualTokenX = await publicClient.readContract({
				address: lbPair.LBPair as `0x${string}`,
				abi: jsonAbis.LBPairV21ABI,
				functionName: 'getTokenX'
			}) as string
			
			const actualTokenY = await publicClient.readContract({
				address: lbPair.LBPair as `0x${string}`,
				abi: jsonAbis.LBPairV21ABI,
				functionName: 'getTokenY'
			}) as string

			// 分析 token 顺序映射
			const isTokenXToken0 = actualTokenX.toLowerCase() === pair.token0.address.toLowerCase()
			const isTokenYToken1 = actualTokenY.toLowerCase() === pair.token1.address.toLowerCase()
			
			console.log("🔍 Token order analysis:", {
				contractOrder: {
					tokenX: actualTokenX.toLowerCase(),
					tokenY: actualTokenY.toLowerCase()
				},
				sdkOrder: {
					token0: pair.token0.address.toLowerCase(),
					token1: pair.token1.address.toLowerCase()
				},
				mapping: {
					tokenXIsToken0: isTokenXToken0,
					tokenYIsToken1: isTokenYToken1,
					orderMatches: isTokenXToken0 && isTokenYToken1
				}
			})

			// 根据映射关系确定数量
			const amountX = isTokenXToken0 ? tokenAmountToken0.raw.toString() : tokenAmountToken1.raw.toString()
			const amountY = isTokenYToken1 ? tokenAmountToken1.raw.toString() : tokenAmountToken0.raw.toString()
			const amountXMin = isTokenXToken0 ? minTokenAmount0.toString() : minTokenAmount1.toString()
			const amountYMin = isTokenYToken1 ? minTokenAmount1.toString() : minTokenAmount0.toString()

			console.log("🔍 Amount calculation debug:", {
				originalAmounts: { tokenAAmount, tokenBAmount },
				orderedAmounts: { amountToken0, amountToken1 },
				parsedAmounts: {
					token0Raw: tokenAmountToken0.raw.toString(),
					token1Raw: tokenAmountToken1.raw.toString(),
					token0Decimals: pair.token0.decimals,
					token1Decimals: pair.token1.decimals
				},
				finalAmounts: { amountX, amountY },
				minAmounts: { amountXMin, amountYMin },
				slippageConfig: {
					userSlippagePercentage: userSlippagePercentage + "%",
					allowedAmountsSlippage: allowedAmountsSlippage + " bips",
					calculation: `${10000 - allowedAmountsSlippage}/10000 = ${(10000 - allowedAmountsSlippage)/10000}`
				},
				tokenMapping: {
					isTokenXToken0,
					isTokenYToken1,
					actualTokenX,
					actualTokenY
				}
			})

			// 验证金额合理性
			if (BigInt(amountX) === BigInt(0) && BigInt(amountY) === BigInt(0)) {
				throw new Error("Both amounts cannot be zero")
			}

			// 验证最小金额不会超过实际金额（这可能是导致slippage错误的原因）
			// 如果检测到这种情况，自动调整最小金额为更安全的值
			let finalAmountXMin = amountXMin
			let finalAmountYMin = amountYMin

			if (BigInt(amountX) > 0 && BigInt(amountXMin) > BigInt(amountX)) {
				console.warn("⚠️ AmountXMin exceeds amountX, adjusting to safer value:", { 
					original: amountXMin, 
					actual: amountX,
					ratio: Number(BigInt(amountXMin)) / Number(BigInt(amountX))
				})
				// 使用实际金额的 90% 作为最小值，而不是基于错误计算的值
				finalAmountXMin = (BigInt(amountX) * BigInt(90) / BigInt(100)).toString()
				console.log("🔧 Adjusted amountXMin from", amountXMin, "to", finalAmountXMin)
			}

			if (BigInt(amountY) > 0 && BigInt(amountYMin) > BigInt(amountY)) {
				console.warn("⚠️ AmountYMin exceeds amountY, adjusting to safer value:", { 
					original: amountYMin, 
					actual: amountY,
					ratio: Number(BigInt(amountYMin)) / Number(BigInt(amountY))
				})
				// 使用实际金额的 90% 作为最小值
				finalAmountYMin = (BigInt(amountY) * BigInt(90) / BigInt(100)).toString()
				console.log("🔧 Adjusted amountYMin from", amountYMin, "to", finalAmountYMin)
			}

			// 构建addLiquidity参数
			const currentTimeInSec = Math.floor(Date.now() / 1000)
			const deadline = currentTimeInSec + 1200 // 20分钟后过期

			const addLiquidityInput = {
				tokenX: actualTokenX as `0x${string}`,
				tokenY: actualTokenY as `0x${string}`,
				binStep: Number(binStep || 25),
				amountX,
				amountY,
				amountXMin: finalAmountXMin,
				amountYMin: finalAmountYMin,
				activeIdDesired: Number(activeBin),
				idSlippage: Math.max(5, Math.min(50, Math.round(userSlippagePercentage * 2))), // ID slippage: 2x amount slippage, capped between 5-50
				deltaIds: finalDeltaIds,
				distributionX: finalDistributionX,
				distributionY: finalDistributionY,
				to: userAddress as `0x${string}`,
				refundTo: userAddress as `0x${string}`,
				deadline: Number(deadline)
			}

			console.log("🔍 Final addLiquidityInput:", {
				tokenX: addLiquidityInput.tokenX,
				tokenY: addLiquidityInput.tokenY,
				amountX: addLiquidityInput.amountX,
				amountY: addLiquidityInput.amountY,
				binStep: addLiquidityInput.binStep,
				activeBin: addLiquidityInput.activeIdDesired,
				mode: isSingleSided ? 'single-sided' : 'dual-sided',
				strategy: isSingleSided ? (singleSidedStrategy || 'balanced') : 'standard',
				actualTokenOrder: {
					actualTokenX: actualTokenX.toLowerCase(),
					actualTokenY: actualTokenY.toLowerCase()
				}
			})

			// 验证token顺序 - 确保我们使用的tokenX匹配合约的tokenX
			if (addLiquidityInput.tokenX.toLowerCase() !== actualTokenX.toLowerCase()) {
				throw new Error(`Token ordering error: Expected tokenX ${actualTokenX}, got ${addLiquidityInput.tokenX}`)
			}
			
			if (addLiquidityInput.tokenY.toLowerCase() !== actualTokenY.toLowerCase()) {
				throw new Error(`Token ordering error: Expected tokenY ${actualTokenY}, got ${addLiquidityInput.tokenY}`)
			}

			console.log("✅ Token ordering validated for LBRouter")

			// 检查和处理 token 授权 - 智能检测需要授权的token
			console.log("🔍 Checking token allowances...")
			
			// 额外的钱包连接验证
			if (!userAddress) {
				throw new Error("钱包未连接，请先连接钱包")
			}
			
			// 智能授权 - 只授权实际需要的token
			const needTokenXApproval = BigInt(addLiquidityInput.amountX) > 0
			const needTokenYApproval = BigInt(addLiquidityInput.amountY) > 0
			
			console.log("💡 Smart approval detection:", {
				needTokenXApproval,
				needTokenYApproval,
				amountX: addLiquidityInput.amountX,
				amountY: addLiquidityInput.amountY,
				mode: isSingleSided ? 'single-sided' : 'dual-sided'
			})

			// 检查 tokenX 授权
			if (needTokenXApproval) {
				const tokenXAllowance = await publicClient.readContract({
					address: actualTokenX as `0x${string}`,
					abi: ERC20_ABI,
					functionName: 'allowance',
					args: [userAddress as `0x${string}`, lbRouterAddress as `0x${string}`]
				}) as bigint

				console.log("💰 TokenX allowance:", {
					address: actualTokenX,
					allowance: tokenXAllowance.toString(),
					required: addLiquidityInput.amountX
				})

				if (tokenXAllowance < BigInt(addLiquidityInput.amountX)) {
					console.log("🔑 TokenX allowance insufficient, requesting approval...")
					
					try {
						const approvalTx = await writeContractAsync({
							address: actualTokenX as `0x${string}`,
							abi: ERC20_ABI,
							functionName: 'approve',
							args: [lbRouterAddress as `0x${string}`, BigInt(addLiquidityInput.amountX)],
							chainId: chainId,
						})

						console.log(`✅ TokenX approval sent: ${approvalTx}`)
						
						// 等待授权交易确认
						await publicClient.waitForTransactionReceipt({ 
							hash: approvalTx as `0x${string}`,
							timeout: 60000
						})
						console.log("✅ TokenX approval confirmed!")
					} catch (approvalError: any) {
						if (approvalError.message?.includes('User denied transaction') || 
							approvalError.message?.includes('not been authorized by the user') ||
							approvalError.code === 4001) {
							throw new Error(`用户取消了授权交易。请批准授权 ${tokenA?.symbol || 'TokenX'} 才能继续添加流动性。`)
						}
						console.error("TokenX approval error:", approvalError)
						throw new Error(`授权 ${tokenA?.symbol || 'TokenX'} 失败: ${approvalError.message}`)
					}
				}
			}

			// 检查 tokenY 授权
			if (needTokenYApproval) {
				const tokenYAllowance = await publicClient.readContract({
					address: actualTokenY as `0x${string}`,
					abi: ERC20_ABI,
					functionName: 'allowance',
					args: [userAddress as `0x${string}`, lbRouterAddress as `0x${string}`]
				}) as bigint

				console.log("💰 TokenY allowance:", {
					address: actualTokenY,
					allowance: tokenYAllowance.toString(),
					required: addLiquidityInput.amountY
				})

				if (tokenYAllowance < BigInt(addLiquidityInput.amountY)) {
					console.log("🔑 TokenY allowance insufficient, requesting approval...")
					
					try {
						const approvalTx = await writeContractAsync({
							address: actualTokenY as `0x${string}`,
							abi: ERC20_ABI,
							functionName: 'approve',
							args: [lbRouterAddress as `0x${string}`, BigInt(addLiquidityInput.amountY)],
							chainId: chainId,
						})

						console.log(`✅ TokenY approval sent: ${approvalTx}`)
						
						// 等待授权交易确认
						await publicClient.waitForTransactionReceipt({ 
							hash: approvalTx as `0x${string}`,
							timeout: 60000
						})
						console.log("✅ TokenY approval confirmed!")
					} catch (approvalError: any) {
						if (approvalError.message?.includes('User denied transaction') || 
							approvalError.message?.includes('not been authorized by the user') ||
							approvalError.code === 4001) {
							throw new Error(`用户取消了授权交易。请批准授权 ${tokenB?.symbol || 'TokenY'} 才能继续添加流动性。`)
						}
						console.error("TokenY approval error:", approvalError)
						throw new Error(`授权 ${tokenB?.symbol || 'TokenY'} 失败: ${approvalError.message}`)
					}
				}
			}

			console.log("✅ All token approvals validated")

			try {
				const actionDescription = isSingleSided ? 
					`单边流动性 (${isTokenXOnly ? 'TokenX' : 'TokenY'} only, ${singleSidedStrategy || 'balanced'} strategy)` : 
					'双边流动性'
				
				console.log(`🚀 Executing ${actionDescription} transaction...`)
				const result = await writeContractAsync({
					abi: jsonAbis.LBRouterV22ABI,
					address: lbRouterAddress as `0x${string}`,
					functionName: "addLiquidity",
					args: [addLiquidityInput],
					chainId: chainId,
				})

				console.log(`✅ ${actionDescription} transaction sent:`, result)
				return result
			} catch (addLiquidityError: any) {
				if (addLiquidityError.message?.includes('User denied transaction') || 
					addLiquidityError.message?.includes('not been authorized by the user') ||
					addLiquidityError.code === 4001) {
					const errorMessage = isSingleSided ? 
						'用户取消了添加单边流动性交易。请确认交易以完成操作。' : 
						'用户取消了添加流动性交易。请确认交易以完成操作。'
					throw new Error(errorMessage)
				}
				
				// 专门处理滑点捕获错误
				if (addLiquidityError.message?.includes('LBRouter__AmountSlippageCaught')) {
					console.error("🎯 Amount slippage caught - detailed analysis:", {
						errorMessage: addLiquidityError.message,
						inputParams: {
							amountX,
							amountY,
							amountXMin: finalAmountXMin,
							amountYMin: finalAmountYMin,
							userSlippage: userSlippagePercentage + "%"
						},
						suggestions: [
							"1. Increase slippage tolerance to 10-15%",
							"2. Try smaller amounts",
							"3. Wait for less volatile market conditions",
							"4. Check if pool has sufficient liquidity"
						]
					})
					
					throw new Error(`Price slippage too high! The transaction was rejected because the expected minimum amounts were not met. Current slippage: ${userSlippagePercentage}%. Try increasing slippage tolerance to 10-15% or wait for more stable market conditions.`)
				}
				
				console.error("AddLiquidity transaction error:", addLiquidityError)
				const errorMessage = isSingleSided ? 
					`添加单边流动性失败: ${addLiquidityError.message}` : 
					`添加流动性失败: ${addLiquidityError.message}`
				throw new Error(errorMessage)
			}
		} catch (error) {
			console.error("Add LB liquidity error:", error)
			throw error
		}
	}

	// Real LB Router operation for removing liquidity from specific bins
	const removeLiquidity = async (
		pairAddress: string,
		tokenXAddress: string,
		tokenYAddress: string,
		binIds: number[],
		amounts: bigint[],
		binStep: number
	) => {
		try {
			if (!userAddress) {
				throw new Error("Wallet not connected")
			}

			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]

			if (!lbRouterAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			// 获取SDK Token对象
			const tokenA = getSDKTokenByAddress(tokenXAddress, chainId)
			const tokenB = getSDKTokenByAddress(tokenYAddress, chainId)

			if (!tokenA || !tokenB) {
				throw new Error(`Token not found in SDK configuration`)
			}

			console.log("🏊‍♀️ 开始移除 LB 流动性:", {
				pairAddress,
				tokenA: { symbol: tokenA.symbol, address: tokenA.address },
				tokenB: { symbol: tokenB.symbol, address: tokenB.address },
				binIds,
				amounts: amounts.map(a => a.toString()),
				binStep
			})

			// 验证参数
			if (!binStep || binStep <= 0) {
				throw new Error(`Invalid binStep: ${binStep}`)
			}

			if (binIds.length === 0 || amounts.length === 0) {
				throw new Error("No bins or amounts specified")
			}

			if (binIds.length !== amounts.length) {
				throw new Error("Bin IDs and amounts arrays must have the same length")
			}

			// 创建PairV2实例 - SDK会自动按地址排序
			const pair = new PairV2(tokenA, tokenB)
			
			// 获取LBPair信息
			const pairVersion = 'v22'
			const publicClient = createViemClient(chainId)
			const lbPair = await pair.fetchLBPair(binStep, pairVersion, publicClient, CHAIN_ID)
			
			if (lbPair.LBPair === '0x0000000000000000000000000000000000000000') {
				throw new Error(`LB pair not found for ${pair.token0.symbol}/${pair.token1.symbol}`)
			}

			console.log(`✅ Found LBPair: ${lbPair.LBPair}`)

			// 检查是否已授权LBPair操作
			console.log("🔍 检查LBPair授权状态...")
			const approved = await publicClient.readContract({
				address: lbPair.LBPair as `0x${string}`,
				abi: jsonAbis.LBPairABI,
				functionName: 'isApprovedForAll',
				args: [userAddress as `0x${string}`, lbRouterAddress as `0x${string}`]
			}) as boolean

			if (!approved) {
				console.log("🔑 需要授权LBPair操作...")
				const approvalResult = await writeContractAsync({
					address: lbPair.LBPair as `0x${string}`,
					abi: jsonAbis.LBPairABI,
					functionName: 'setApprovalForAll',
					args: [lbRouterAddress as `0x${string}`, true],
					chainId: chainId,
				})
				console.log(`✅ LBPair授权交易已发送: ${approvalResult}`)
				
				// 等待授权交易确认
				await publicClient.waitForTransactionReceipt({ 
					hash: approvalResult as `0x${string}`,
					timeout: 60000
				})
				console.log("✅ LBPair授权成功!")
			} else {
				console.log("✅ LBPair已授权，无需重新授权")
			}

			// 验证用户在指定bins中是否有足够的流动性
			console.log("🔍 验证用户流动性...")
			
			// 检查用户在这些bins中的余额
			for (let i = 0; i < binIds.length; i++) {
				const binId = binIds[i]
				const requestedAmount = amounts[i]
				
				try {
					// 获取用户在此bin中的余额
					const userBalance = await publicClient.readContract({
						address: lbPair.LBPair as `0x${string}`,
						abi: jsonAbis.LBPairABI,
						functionName: 'balanceOf',
						args: [userAddress as `0x${string}`, BigInt(binId)]
					}) as bigint

					console.log(`📊 Bin ${binId}: 用户余额=${userBalance.toString()}, 请求移除=${requestedAmount.toString()}`)

					if (userBalance < requestedAmount) {
						throw new Error(`Insufficient liquidity in bin ${binId}. Available: ${userBalance.toString()}, Requested: ${requestedAmount.toString()}`)
					}
				} catch (balanceError) {
					console.error(`❌ 无法检查bin ${binId}的余额:`, balanceError)
					throw new Error(`Failed to check balance for bin ${binId}: ${balanceError}`)
				}
			}

			console.log("✅ 用户流动性验证通过")

			// 构建removeLiquidity参数
			const currentTimeInSec = Math.floor(Date.now() / 1000)
			const deadline = currentTimeInSec + 1200 // 20分钟后过期

			// 确保代币地址顺序正确 (tokenX < tokenY)
			let finalTokenX: string, finalTokenY: string
			if (tokenXAddress.toLowerCase() < tokenYAddress.toLowerCase()) {
				finalTokenX = tokenXAddress
				finalTokenY = tokenYAddress
			} else {
				finalTokenX = tokenYAddress
				finalTokenY = tokenXAddress
			}

			console.log("🔄 Token address ordering:", {
				original: { tokenX: tokenXAddress, tokenY: tokenYAddress },
				sorted: { tokenX: finalTokenX, tokenY: finalTokenY },
				swapped: finalTokenX !== tokenXAddress
			})

			const removeLiquidityInput = {
				tokenX: finalTokenX as `0x${string}`,  // 使用排序后的tokenX地址
				tokenY: finalTokenY as `0x${string}`,  // 使用排序后的tokenY地址
				binStep: Number(binStep),
				amountXMin: 0, // 接受任何数量输出（可以添加滑点保护）
				amountYMin: 0,
				ids: binIds.map(id => Number(id)),
				amounts: amounts,
				to: userAddress as `0x${string}`,
				deadline: Number(deadline)
			}

			console.log("🔍 removeLiquidity parameters:", {
				tokenX: removeLiquidityInput.tokenX,
				tokenY: removeLiquidityInput.tokenY,
				binStep: removeLiquidityInput.binStep,
				binCount: removeLiquidityInput.ids.length,
				totalAmounts: removeLiquidityInput.amounts.reduce((sum, amount) => sum + amount, 0n).toString()
			})

			console.log("✅ Token ordering automatically handled for removeLiquidity")

			const result = await writeContractAsync({
				abi: jsonAbis.LBRouterV22ABI,
				address: lbRouterAddress as `0x${string}`,
				functionName: "removeLiquidity",
				args: [
					removeLiquidityInput.tokenX,
					removeLiquidityInput.tokenY,
					removeLiquidityInput.binStep,
					removeLiquidityInput.amountXMin,
					removeLiquidityInput.amountYMin,
					removeLiquidityInput.ids,
					removeLiquidityInput.amounts,
					removeLiquidityInput.to,
					removeLiquidityInput.deadline
				],
				chainId: chainId,
			})

			console.log(`✅ 流动性移除交易已发送: ${result}`)
			return result
		} catch (error) {
			console.error("❌ Remove LB liquidity error:", error)
			throw error
		}
	}

	// Real LB Pair operation for claiming collected fees
	const claimFees = async (pairAddress: string, binIds: number[]) => {
		try {
			if (!userAddress) {
				throw new Error("Wallet not connected")
			}

			console.log("Claiming LB fees:", {
				pairAddress,
				binIds
			})

			// Use the LB Pair's collectFees function directly
			const result = await writeContractAsync({
				abi: jsonAbis.LBPairABI,
				address: pairAddress as `0x${string}`,
				functionName: "collectFees",
				args: [
					userAddress as `0x${string}`, // account address
					binIds.map(id => BigInt(id))
				],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Claim LB fees error:", error)
			throw error
		}
	}

	// Check if an LB pool already exists
	const checkPoolExists = useCallback(async (
		tokenXAddress: string,
		tokenYAddress: string,
		binStepBasisPoints: number
	): Promise<{ exists: boolean; pairAddress?: string }> => {
		try {
			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				throw new Error("LB Factory not supported on this chain")
			}

			// Create public client to read contract
			const publicClient = createViemClient(chainId)

			try {
				const pairInfo = await publicClient.readContract({
					address: factoryAddress as `0x${string}`,
					abi: jsonAbis.LBFactoryV21ABI,
					functionName: "getLBPairInformation",
					args: [
						tokenXAddress as `0x${string}`,
						tokenYAddress as `0x${string}`,
						BigInt(binStepBasisPoints)
					],
				})

				// Check if pair exists (address is not zero)
				const pairAddress = (pairInfo as any)?.[0] || '0x0000000000000000000000000000000000000000'
				const exists = pairAddress !== '0x0000000000000000000000000000000000000000'

				return { exists, pairAddress: exists ? pairAddress : undefined }
			} catch (error) {
				console.log("Pool doesn't exist (contract call failed):", error)
				return { exists: false }
			}

		} catch (error) {
			console.error("Check pool exists error:", error)
			return { exists: false }
		}
	}, [chainId])

	// Create a new liquidity pool using LB Factory
	const createPool = useCallback(async (
		tokenXAddress: string,
		tokenYAddress: string,
		binStepBasisPoints: number,
		activePrice: string,
		baseFee?: string // Optional base fee parameter
	) => {
		try {
			// First check if pool already exists
			const poolCheck = await checkPoolExists(tokenXAddress, tokenYAddress, binStepBasisPoints)
			if (poolCheck.exists) {
				const tokenX = getSDKTokenByAddress(tokenXAddress, chainId)
				const tokenY = getSDKTokenByAddress(tokenYAddress, chainId)
				throw new Error(`Pool already exists for ${tokenX?.symbol || 'Token'}/${tokenY?.symbol || 'Token'} with ${binStepBasisPoints} basis points bin step. Pair address: ${poolCheck.pairAddress}`)
			}

			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				throw new Error("LB Factory not supported on this chain")
			}

			// Get tokens to calculate proper price ID
			const tokenX = getSDKTokenByAddress(tokenXAddress, chainId)
			const tokenY = getSDKTokenByAddress(tokenYAddress, chainId)

			if (!tokenX || !tokenY) {
				throw new Error("Tokens not found in SDK configuration")
			}

			// Calculate proper active price ID using LB SDK
			const priceFloat = parseFloat(activePrice)
			if (priceFloat <= 0) {
				throw new Error("Invalid price: must be greater than 0")
			}

			// Use LB SDK to calculate the correct price ID
			const activePriceId = Bin.getIdFromPrice(priceFloat, binStepBasisPoints)

			// Validate the price ID is within acceptable bounds
			if (activePriceId < 0 || activePriceId > 8388607) { // 2^23 - 1 (max valid ID)
				throw new Error(`Invalid price ID: ${activePriceId}. Price may be too high or too low.`)
			}

			console.log("Creating pool with:", {
				tokenX: tokenXAddress,
				tokenY: tokenYAddress,
				binStep: binStepBasisPoints,
				activePrice: activePrice,
				activePriceId,
				baseFee: baseFee,
				factory: factoryAddress
			})

			// Call createLBPair function on the factory
			const result = await writeContractAsync({
				address: factoryAddress as `0x${string}`,
				abi: jsonAbis.LBFactoryV21ABI,
				functionName: "createLBPair",
				args: [
					tokenXAddress as `0x${string}`,
					tokenYAddress as `0x${string}`,
					BigInt(activePriceId),
					BigInt(binStepBasisPoints)
				],
				chainId: chainId,
			})

			console.log("Create pool TX sent:", result)
			return result

		} catch (error) {
			console.error("Create pool error:", error)
			throw error
		}
	}, [chainId, writeContractAsync, checkPoolExists])

	return {
		addLiquidity,
		removeLiquidity,
		claimFees,
		createPool,
		checkPoolExists
	}
}
