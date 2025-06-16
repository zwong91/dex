import { Bin, LB_FACTORY_V22_ADDRESS, jsonAbis } from "@lb-xyz/sdk-v2"
import * as ethers from "ethers"
import { useCallback } from "react"
import { useChainId, useReadContract, useWriteContract } from "wagmi"
import { genericDexAbi } from "../abis/dex"
import { getNetworkById } from "../dexConfig"
import { getSDKTokenByAddress, wagmiChainIdToSDKChainId } from "../lbSdkConfig"
import { createViemClient } from "../viemClient"

// Hook to get DEX pool ratio for price calculation
export const usePoolRatio = () => {
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`

	const { data: poolRatio } = useReadContract({
		abi: genericDexAbi,
		address: dexRouterAddress,
		functionName: "getPoolRatio",
		chainId: chainId,
	})

	return poolRatio ? Number(poolRatio) : 1
}

// Hook to get Token X price in Token Y
export const useTokenPrice = () => {
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`

	const { data: tokenAPrice } = useReadContract({
		abi: genericDexAbi,
		address: dexRouterAddress,
		functionName: "getTokenAPrice",
		chainId: chainId,
	})

	return tokenAPrice ? Number(tokenAPrice) : 1
}

// Hook for DEX operations (add/remove liquidity, swaps)
export const useDexOperations = () => {
	const { writeContractAsync } = useWriteContract()
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`

	const addLiquidity = async (tokenAAmount: number, tokenBAmount: number) => {
		try {
			const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18)
			const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18)

			console.log("Adding liquidity - Token A:", tokenA.toString(), "Token B:", tokenB.toString())

			const result = await writeContractAsync({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "addLiquidity",
				args: [tokenA, tokenB],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Add liquidity error:", error)
			throw error
		}
	}

	const removeLiquidity = async (liquidityAmount: number) => {
		try {
			const liquidity = ethers.parseUnits(liquidityAmount.toString(), 18)

			console.log("Removing liquidity - LP tokens:", liquidity.toString())

			const result = await writeContractAsync({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "removeLiquidity",
				args: [liquidity],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Remove liquidity error:", error)
			throw error
		}
	}

	const claimFees = async (positionId: number) => {
		try {
			console.log("Claiming fees for position:", positionId)

			const result = await writeContractAsync({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "claimFees",
				args: [BigInt(positionId)],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Claim fees error:", error)
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
					abi: jsonAbis.LBFactoryABI,
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
				abi: jsonAbis.LBFactoryABI,
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
