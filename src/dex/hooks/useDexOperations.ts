import { Bin, LB_FACTORY_V22_ADDRESS, LB_ROUTER_V22_ADDRESS, jsonAbis, PairV2, getUniformDistributionFromBinRange } from "@lb-xyz/sdk-v2"
import * as ethers from "ethers"
import { useCallback } from "react"
import { useAccount, useChainId, useWriteContract } from "wagmi"
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { createViemClient } from "../viemClient"

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
		singleSidedMode?: boolean,
		singleSidedStrategy?: 'conservative' | 'balanced' | 'aggressive',
		customSlippageTolerance?: number,
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

			// Detect single-sided mode
			const isSingleSided = singleSidedMode || (tokenAAmount > 0 && tokenBAmount === 0) || (tokenAAmount === 0 && tokenBAmount > 0)

			if (isSingleSided) {
				console.log("🎯 Single-sided liquidity detected:", {
					strategy: singleSidedStrategy || 'balanced'
				})
			}

			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]

			if (!lbRouterAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			// Get SDK Token objects
			const tokenA = getSDKTokenByAddress(tokenXAddress, chainId)
			const tokenB = getSDKTokenByAddress(tokenYAddress, chainId)

			if (!tokenA || !tokenB) {
				throw new Error(`Token not found in SDK configuration`)
			}

			console.log("🔍 SDK Tokens:", {
				tokenA: { symbol: tokenA.symbol, address: tokenA.address, decimals: tokenA.decimals },
				tokenB: { symbol: tokenB.symbol, address: tokenB.address, decimals: tokenB.decimals }
			})

			// Create PairV2 instance - SDK automatically sorts by address (token0 < token1)
			const pair = new PairV2(tokenA, tokenB)
			
			console.log("🔧 PairV2 ordered tokens:", {
				token0: { symbol: pair.token0.symbol, address: pair.token0.address, decimals: pair.token0.decimals },
				token1: { symbol: pair.token1.symbol, address: pair.token1.address, decimals: pair.token1.decimals }
			})

			// Get LBPair info first to determine actual token ordering
			const pairVersion = 'v22'
			const publicClient = createViemClient(chainId)
			const lbPair = await pair.fetchLBPair(binStep, pairVersion, publicClient, CHAIN_ID)
			
			if (lbPair.LBPair === '0x0000000000000000000000000000000000000000') {
				throw new Error(`LB pair not found for ${pair.token0.symbol}/${pair.token1.symbol} with bin step ${binStep || 25}`)
			}

			console.log(`✅ Found LBPair: ${lbPair.LBPair}`)

			// Get actual token ordering from the LBPair contract
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

			console.log("🔍 Contract token order:", {
				actualTokenX: actualTokenX.toLowerCase(),
				actualTokenY: actualTokenY.toLowerCase()
			})

			// Map input tokens to contract tokens
			let amountX: string = "0"
			let amountY: string = "0"
			let tokenXDecimals: number
			let tokenYDecimals: number

			// Determine which input token corresponds to tokenX and tokenY
			if (tokenXAddress.toLowerCase() === actualTokenX.toLowerCase()) {
				// tokenA -> tokenX, tokenB -> tokenY
				amountX = tokenAAmount > 0 ? ethers.parseUnits(tokenAAmount.toString(), tokenA.decimals).toString() : "0"
				amountY = tokenBAmount > 0 ? ethers.parseUnits(tokenBAmount.toString(), tokenB.decimals).toString() : "0"
				tokenXDecimals = tokenA.decimals
				tokenYDecimals = tokenB.decimals
			} else if (tokenXAddress.toLowerCase() === actualTokenY.toLowerCase()) {
				// tokenA -> tokenY, tokenB -> tokenX
				amountX = tokenBAmount > 0 ? ethers.parseUnits(tokenBAmount.toString(), tokenB.decimals).toString() : "0"
				amountY = tokenAAmount > 0 ? ethers.parseUnits(tokenAAmount.toString(), tokenA.decimals).toString() : "0"
				tokenXDecimals = tokenB.decimals
				tokenYDecimals = tokenA.decimals
			} else {
				throw new Error("Token mapping error: Input tokens don't match contract tokens")
			}

			console.log("🔍 Final amount mapping:", {
				inputAmounts: { tokenAAmount, tokenBAmount },
				contractAmounts: { amountX, amountY },
				decimals: { tokenXDecimals, tokenYDecimals },
				mapping: {
					tokenAToContract: tokenXAddress.toLowerCase() === actualTokenX.toLowerCase() ? 'tokenX' : 'tokenY',
					tokenBToContract: tokenYAddress.toLowerCase() === actualTokenX.toLowerCase() ? 'tokenX' : 'tokenY'
				}
			})

			// Validate amounts
			if (BigInt(amountX) === BigInt(0) && BigInt(amountY) === BigInt(0)) {
				throw new Error("Both amounts cannot be zero")
			}

			// Calculate slippage tolerance
			const userSlippagePercentage = customSlippageTolerance || (isSingleSided ? 10 : 5)
			const slippageBips = userSlippagePercentage * 100 // Convert to bips

			// Calculate minimum amounts with proper slippage
			const amountXMin = BigInt(amountX) > 0 ? 
				(BigInt(amountX) * BigInt(10000 - slippageBips) / BigInt(10000)).toString() : 
				"0"
			
			const amountYMin = BigInt(amountY) > 0 ? 
				(BigInt(amountY) * BigInt(10000 - slippageBips) / BigInt(10000)).toString() : 
				"0"

			console.log("🎯 Slippage calculation:", {
				userSlippagePercentage: userSlippagePercentage + "%",
				slippageBips: slippageBips + " bips",
				amounts: { amountX, amountY },
				minAmounts: { amountXMin, amountYMin },
				calculation: `(amount * ${10000 - slippageBips}) / 10000`
			})

			// Get active bin ID
			const lbPairData = await PairV2.getLBPairReservesAndId(lbPair.LBPair, pairVersion, publicClient)
			const activeBin = activeBinId || lbPairData.activeId

			console.log(`🎯 Active bin ID: ${activeBin}`)

			// Generate liquidity distribution
			let finalDeltaIds: number[]
			let finalDistributionX: bigint[]
			let finalDistributionY: bigint[]

			if (isSingleSided) {
				// Single-sided liquidity mode - use simple bin range around active bin
				const binCount = 5 // Default to 5 bins for single-sided liquidity
				
				// Determine if providing tokenX or tokenY
				const isProvidingTokenX = BigInt(amountX) > 0
				
				// Create appropriate bin range for single-sided liquidity
				let binRange: [number, number]
				if (isProvidingTokenX) {
					// TokenX goes to higher price bins (right side)
					binRange = [activeBin, activeBin + binCount - 1]
				} else {
					// TokenY goes to lower price bins (left side)
					binRange = [activeBin - binCount + 1, activeBin]
				}
				
				// Use official LB SDK distribution function
				const { deltaIds: calculatedDeltaIds, distributionX: sdkDistributionX, distributionY: sdkDistributionY } = 
					getUniformDistributionFromBinRange(activeBin, binRange)

				finalDeltaIds = deltaIds || calculatedDeltaIds
				
				// For single-sided liquidity, only provide in the appropriate direction
				if (isProvidingTokenX) {
					finalDistributionX = distributionX || sdkDistributionX
					finalDistributionY = new Array(finalDistributionX.length).fill(BigInt(0))
				} else {
					finalDistributionY = distributionY || sdkDistributionY
					finalDistributionX = new Array(finalDistributionY.length).fill(BigInt(0))
				}

				console.log("🔍 Single-sided liquidity distribution (using LB SDK):", {
					activeBin,
					binRange,
					deltaIds: finalDeltaIds,
					isProvidingTokenX,
					distributionXSum: finalDistributionX.reduce((sum, val) => sum + val, BigInt(0)).toString(),
					distributionYSum: finalDistributionY.reduce((sum, val) => sum + val, BigInt(0)).toString()
				})
			} else {
				// Dual-sided liquidity mode
				const binRange: [number, number] = deltaIds ? 
					[activeBin + Math.min(...deltaIds), activeBin + Math.max(...deltaIds)] :
					[activeBin - 2, activeBin + 2] // Default 5 bins

				const { deltaIds: calculatedDeltaIds, distributionX: calculatedDistributionX, distributionY: calculatedDistributionY } = 
					getUniformDistributionFromBinRange(activeBin, binRange)

				finalDeltaIds = deltaIds || calculatedDeltaIds
				finalDistributionX = distributionX || calculatedDistributionX
				finalDistributionY = distributionY || calculatedDistributionY

				console.log("🔍 Dual-sided liquidity distribution (using LB SDK):", {
					activeBin,
					binRange,
					deltaIds: finalDeltaIds,
					distributionCount: finalDistributionX.length
				})
			}

			// Build addLiquidity parameters
			const currentTimeInSec = Math.floor(Date.now() / 1000)
			const deadline = currentTimeInSec + 1200 // 20 minutes

			const addLiquidityInput = {
				tokenX: actualTokenX as `0x${string}`,
				tokenY: actualTokenY as `0x${string}`,
				binStep: Number(binStep),
				amountX,
				amountY,
				amountXMin,
				amountYMin,
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
				...addLiquidityInput,
				mode: isSingleSided ? 'single-sided' : 'dual-sided',
				strategy: isSingleSided ? (singleSidedStrategy || 'balanced') : 'standard'
			})

			// Check and handle token approvals
			console.log("🔍 Checking token allowances...")
			
			if (!userAddress) {
				throw new Error("Wallet not connected")
			}
			
			// Smart approval - only approve tokens that are actually needed
			const needTokenXApproval = BigInt(amountX) > 0
			const needTokenYApproval = BigInt(amountY) > 0
			
			console.log("💡 Smart approval detection:", {
				needTokenXApproval,
				needTokenYApproval,
				amountX,
				amountY,
				mode: isSingleSided ? 'single-sided' : 'dual-sided'
			})

			// Check tokenX allowance
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
					required: amountX
				})

				if (tokenXAllowance < BigInt(amountX)) {
					console.log("🔑 TokenX allowance insufficient, requesting approval...")
					
					try {
						const approvalTx = await writeContractAsync({
							address: actualTokenX as `0x${string}`,
							abi: ERC20_ABI,
							functionName: 'approve',
							args: [lbRouterAddress as `0x${string}`, BigInt(amountX)],
							chainId: chainId,
						})

						console.log(`✅ TokenX approval sent: ${approvalTx}`)
						
						// Wait for approval transaction confirmation
						await publicClient.waitForTransactionReceipt({ 
							hash: approvalTx as `0x${string}`,
							timeout: 60000
						})
						console.log("✅ TokenX approval confirmed!")
					} catch (approvalError: any) {
						if (approvalError.message?.includes('User denied transaction') || 
							approvalError.message?.includes('not been authorized by the user') ||
							approvalError.code === 4001) {
							throw new Error(`User cancelled authorization transaction. Please approve ${tokenA?.symbol || 'TokenX'} to continue adding liquidity.`)
						}
						console.error("TokenX approval error:", approvalError)
						throw new Error(`Failed to approve ${tokenA?.symbol || 'TokenX'}: ${approvalError.message}`)
					}
				}
			}

			// Check tokenY allowance
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
					required: amountY
				})

				if (tokenYAllowance < BigInt(amountY)) {
					console.log("🔑 TokenY allowance insufficient, requesting approval...")
					
					try {
						const approvalTx = await writeContractAsync({
							address: actualTokenY as `0x${string}`,
							abi: ERC20_ABI,
							functionName: 'approve',
							args: [lbRouterAddress as `0x${string}`, BigInt(amountY)],
							chainId: chainId,
						})

						console.log(`✅ TokenY approval sent: ${approvalTx}`)
						
						// Wait for approval transaction confirmation
						await publicClient.waitForTransactionReceipt({ 
							hash: approvalTx as `0x${string}`,
							timeout: 60000
						})
						console.log("✅ TokenY approval confirmed!")
					} catch (approvalError: any) {
						if (approvalError.message?.includes('User denied transaction') || 
							approvalError.message?.includes('not been authorized by the user') ||
							approvalError.code === 4001) {
							throw new Error(`User cancelled authorization transaction. Please approve ${tokenB?.symbol || 'TokenY'} to continue adding liquidity.`)
						}
						console.error("TokenY approval error:", approvalError)
						throw new Error(`Failed to approve ${tokenB?.symbol || 'TokenY'}: ${approvalError.message}`)
					}
				}
			}

			console.log("✅ All token approvals validated")

			try {
				const actionDescription = isSingleSided ? 
					`Single-sided liquidity (${BigInt(amountX) > 0 ? 'TokenX' : 'TokenY'} only, ${singleSidedStrategy || 'balanced'} strategy)` : 
					'Dual-sided liquidity'
				
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
						'User cancelled single-sided liquidity transaction. Please confirm the transaction to complete the operation.' : 
						'User cancelled liquidity addition transaction. Please confirm the transaction to complete the operation.'
					throw new Error(errorMessage)
				}
				
				// Handle slippage error specifically
				if (addLiquidityError.message?.includes('LBRouter__AmountSlippageCaught')) {
					console.error("🎯 Amount slippage caught - detailed analysis:", {
						errorMessage: addLiquidityError.message,
						inputParams: {
							amountX,
							amountY,
							amountXMin,
							amountYMin,
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
					`Failed to add single-sided liquidity: ${addLiquidityError.message}` : 
					`Failed to add liquidity: ${addLiquidityError.message}`
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

			// 获取合约的实际token顺序，而不是简单排序
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

			console.log("🔄 Contract token ordering:", {
				actualTokenX: actualTokenX.toLowerCase(),
				actualTokenY: actualTokenY.toLowerCase(),
				inputTokenX: tokenXAddress.toLowerCase(),
				inputTokenY: tokenYAddress.toLowerCase()
			})

			const removeLiquidityInput = {
				tokenX: actualTokenX as `0x${string}`,  // 使用合约实际的tokenX地址
				tokenY: actualTokenY as `0x${string}`,  // 使用合约实际的tokenY地址
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

	// Combined operation: explain auto-compounding first, then withdraw all liquidity (principal + fees)
	const collectFeesAndWithdrawAll = async (
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

			console.log("💎 开始完整流动性提取操作（本金 + 复利费用）...")

			// Step 1: Explain auto-compounding mechanism
			console.log("📈 第一步：确认自动复利状态...")

			// Step 2: Remove all liquidity (which includes compounded fees)
			console.log("🏊‍♀️ 第二步：提取全部流动性（包含复利费用）...")
			const withdrawResult = await removeLiquidity(
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				binIds,
				amounts,
				binStep
			)

			console.log("🎉 完整提取操作完成：")
			console.log("  ✅ 已提取原始投入的本金")
			console.log("  ✅ 已提取所有复利后的交易费用收益")
			console.log("  🔒 流动性仓位已完全关闭")
			
			return withdrawResult
		} catch (error) {
			console.error("❌ 完整提取操作失败:", error)
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
		createPool,
		checkPoolExists,
		collectFeesAndWithdrawAll
	}
}
