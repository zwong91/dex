import { Bin, LB_FACTORY_V22_ADDRESS, LB_ROUTER_V22_ADDRESS, jsonAbis, PairV2, getUniformDistributionFromBinRange } from "@lb-xyz/sdk-v2"
import { TokenAmount } from '@lb-xyz/sdk-core'
import * as ethers from "ethers"
import { useCallback } from "react"
import { useAccount, useChainId, useWriteContract } from "wagmi"
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { createViemClient } from "../viemClient"
import JSBI from 'jsbi'

// Hook for LB DEX operations (add/remove liquidity, claim fees)
export const useDexOperations = () => {
	const { writeContractAsync } = useWriteContract()
	const { address: userAddress } = useAccount()
	const chainId = useChainId()

	// Real LB Router operations for adding liquidity to specific pair and bins
	const addLiquidity = async (
		pairAddress: string,
		tokenXAddress: string,
		tokenYAddress: string,
		tokenAAmount: number,
		tokenBAmount: number,
		activeBinId?: number,
		deltaIds?: number[],
		distributionX?: bigint[],
		distributionY?: bigint[],
		binStep?: number
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
				binStep 
			})

			if (!userAddress) {
				console.error("❌ Wallet not connected")
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

			// 滑点容忍度 (50 bips = 0.5%)
			const allowedAmountsSlippage = 50

			// 基于滑点计算最小数量
			const minTokenAmount0 = JSBI.divide(
				JSBI.multiply(tokenAmountToken0.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
				JSBI.BigInt(10000)
			)
			const minTokenAmount1 = JSBI.divide(
				JSBI.multiply(tokenAmountToken1.raw, JSBI.BigInt(10000 - allowedAmountsSlippage)),
				JSBI.BigInt(10000)
			)

			// 获取LBPair信息
			const pairVersion = 'v22' as const
			const publicClient = createViemClient(chainId)
			const lbPair = await pair.fetchLBPair(binStep || 25, pairVersion, publicClient, CHAIN_ID)
			
			if (lbPair.LBPair === '0x0000000000000000000000000000000000000000') {
				throw new Error(`LB pair not found for ${pair.token0.symbol}/${pair.token1.symbol} with bin step ${binStep || 25}`)
			}

			console.log(`✅ Found LBPair: ${lbPair.LBPair}`)

			// 获取活跃bin ID
			const lbPairData = await PairV2.getLBPairReservesAndId(lbPair.LBPair, pairVersion, publicClient)
			const activeBin = activeBinId || lbPairData.activeId

			console.log(`🎯 Active bin ID: ${activeBin}`)

			// 生成流动性分布
			const binRange: [number, number] = deltaIds ? 
				[activeBin + Math.min(...deltaIds), activeBin + Math.max(...deltaIds)] :
				[activeBin - 2, activeBin + 2] // 默认5个bin

			const { deltaIds: finalDeltaIds, distributionX: finalDistributionX, distributionY: finalDistributionY } = 
				getUniformDistributionFromBinRange(activeBin, binRange)

			console.log("� Liquidity distribution:", {
				activeBin,
				binRange,
				deltaIds: finalDeltaIds,
				distributionCount: finalDistributionX.length
			})

			// 构建addLiquidity参数
			const currentTimeInSec = Math.floor(Date.now() / 1000)
			const deadline = currentTimeInSec + 1200 // 20分钟后过期

			const addLiquidityInput = {
				tokenX: pair.token0.address as `0x${string}`,  // 使用SDK排序后的token0
				tokenY: pair.token1.address as `0x${string}`,  // 使用SDK排序后的token1
				binStep: Number(binStep || 25),
				amountX: tokenAmountToken0.raw.toString(),
				amountY: tokenAmountToken1.raw.toString(),
				amountXMin: minTokenAmount0.toString(),
				amountYMin: minTokenAmount1.toString(),
				activeIdDesired: Number(activeBin),
				idSlippage: 5,
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
				activeBin: addLiquidityInput.activeIdDesired
			})

			// 最终验证token顺序
			const finalTokenXLower = addLiquidityInput.tokenX.toLowerCase()
			const finalTokenYLower = addLiquidityInput.tokenY.toLowerCase()
			if (finalTokenXLower >= finalTokenYLower) {
				throw new Error(`Token ordering error: tokenX (${finalTokenXLower}) must be < tokenY (${finalTokenYLower})`)
			}

			console.log("✅ Token ordering validated for LBRouter")

			const result = await writeContractAsync({
				abi: jsonAbis.LBRouterV22ABI,
				address: lbRouterAddress as `0x${string}`,
				functionName: "addLiquidity",
				args: [addLiquidityInput],
				chainId: chainId,
			})

			return result
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
		binStep?: number
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
				amounts: amounts.map(a => a.toString())
			})

			// 创建PairV2实例 - SDK会自动按地址排序
			const pair = new PairV2(tokenA, tokenB)
			
			// 获取LBPair信息
			const pairVersion = 'v22' as const
			const publicClient = createViemClient(chainId)
			const lbPair = await pair.fetchLBPair(binStep || 25, pairVersion, publicClient, CHAIN_ID)
			
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

			// 构建removeLiquidity参数
			const currentTimeInSec = Math.floor(Date.now() / 1000)
			const deadline = currentTimeInSec + 1200 // 20分钟后过期

			const removeLiquidityInput = {
				tokenX: pair.token0.address as `0x${string}`,  // 使用SDK排序后的token0
				tokenY: pair.token1.address as `0x${string}`,  // 使用SDK排序后的token1
				binStep: Number(binStep || 25),
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

			// 最终验证token顺序
			const finalTokenXLower = removeLiquidityInput.tokenX.toLowerCase()
			const finalTokenYLower = removeLiquidityInput.tokenY.toLowerCase()
			if (finalTokenXLower >= finalTokenYLower) {
				throw new Error(`Token ordering error: tokenX (${finalTokenXLower}) must be < tokenY (${finalTokenYLower})`)
			}

			console.log("✅ Token ordering validated for removeLiquidity")

			const result = await writeContractAsync({
				abi: jsonAbis.LBRouterV22ABI,
				address: lbRouterAddress as `0x${string}`,
				functionName: "removeLiquidity",
				args: [removeLiquidityInput],
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
