import { Bin, LB_FACTORY_V22_ADDRESS, LB_ROUTER_V22_ADDRESS, jsonAbis } from "@lb-xyz/sdk-v2"
import * as ethers from "ethers"
import { useCallback } from "react"
import { useChainId, useWriteContract } from "wagmi"
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { createViemClient } from "../viemClient"

// Hook for LB DEX operations (add/remove liquidity, claim fees)
export const useDexOperations = () => {
	const { writeContractAsync } = useWriteContract()
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
		distributionY?: bigint[]
	) => {
		try {
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]

			if (!lbRouterAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			// Convert amounts to proper decimals
			const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18)
			const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18)

			// Get the active bin ID if not provided
			let activeBin = activeBinId
			if (!activeBin) {
				const publicClient = createViemClient(chainId)
				activeBin = await publicClient.readContract({
					address: pairAddress as `0x${string}`,
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
			}

			// Default distribution: add liquidity around active bin
			const defaultDeltaIds = deltaIds || [-2, -1, 0, 1, 2] // 5 bins around active
			const totalBins = defaultDeltaIds.length

			// Simple uniform distribution if not provided
			const defaultDistributionX = distributionX || Array(totalBins).fill(BigInt(ethers.parseUnits("0.2", 18))) // 20% each
			const defaultDistributionY = distributionY || Array(totalBins).fill(BigInt(ethers.parseUnits("0.2", 18))) // 20% each

			console.log("Adding LB liquidity:", {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				tokenA: tokenA.toString(),
				tokenB: tokenB.toString(),
				activeBin,
				deltaIds: defaultDeltaIds,
				routerAddress: lbRouterAddress
			})

			// Use LB Router's addLiquidity function
			const deadline = Math.floor(Date.now() / 1000) + 1200 // 20 minutes from now

			const result = await writeContractAsync({
				abi: jsonAbis.LBRouterV22ABI,
				address: lbRouterAddress as `0x${string}`,
				functionName: "addLiquidity",
				args: [
					{
						tokenX: tokenXAddress as `0x${string}`,
						tokenY: tokenYAddress as `0x${string}`,
						binStep: BigInt(25), // 0.25% fee tier
						amountX: tokenA,
						amountY: tokenB,
						amountXMin: BigInt(tokenA * BigInt(95) / BigInt(100)), // 5% slippage
						amountYMin: BigInt(tokenB * BigInt(95) / BigInt(100)), // 5% slippage
						activeIdDesired: BigInt(activeBin),
						idSlippage: BigInt(5), // Allow 5 bins of slippage
						deltaIds: defaultDeltaIds.map(id => BigInt(id)),
						distributionX: defaultDistributionX,
						distributionY: defaultDistributionY,
						to: undefined as any, // Will be filled by the contract call
						deadline: BigInt(deadline)
					}
				],
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
		amounts: bigint[]
	) => {
		try {
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID]

			if (!lbRouterAddress) {
				throw new Error("LB Router not supported on this chain")
			}

			console.log("Removing LB liquidity:", {
				pairAddress,
				tokenXAddress,
				tokenYAddress,
				binIds,
				amounts: amounts.map(a => a.toString()),
				routerAddress: lbRouterAddress
			})

			const deadline = Math.floor(Date.now() / 1000) + 1200 // 20 minutes from now

			const result = await writeContractAsync({
				abi: jsonAbis.LBRouterV22ABI,
				address: lbRouterAddress as `0x${string}`,
				functionName: "removeLiquidity",
				args: [
					{
						tokenX: tokenXAddress as `0x${string}`,
						tokenY: tokenYAddress as `0x${string}`,
						binStep: BigInt(25), // 0.25% fee tier
						amountXMin: BigInt(0), // Accept any amount out (could add slippage protection)
						amountYMin: BigInt(0),
						ids: binIds.map(id => BigInt(id)),
						amounts: amounts,
						to: undefined as any, // Will be filled by the contract call
						deadline: BigInt(deadline)
					}
				],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Remove LB liquidity error:", error)
			throw error
		}
	}

	// Real LB Pair operation for claiming collected fees
	const claimFees = async (pairAddress: string, binIds: number[]) => {
		try {
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
					undefined as any, // account (will be msg.sender)
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
		activePrice: string
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
