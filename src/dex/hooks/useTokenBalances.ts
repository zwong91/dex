import * as ethers from "ethers"
import { useEffect, useState } from "react"
import { erc20Abi } from "viem"
import { useChainId, useReadContract, useWatchContractEvent, useWriteContract } from "wagmi"
import { getNetworkById } from "../dexConfig"

// Hook to check allowances for DEX trading
export const useCheckAllowance = (address: `0x${string}` | undefined, chainId: number) => {
	const network = getNetworkById(chainId)

	let tokenAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`
	let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`
	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`

	const { writeContractAsync } = useWriteContract()

	const { data: allowanceTokenB } = useReadContract({
		abi: erc20Abi,
		address: tokenBAddress,
		functionName: "allowance",
		args: address ? [address, dexRouterAddress] : undefined,
		account: address,
		chainId: chainId,
	})

	const { data: allowanceTokenA } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "allowance",
		args: address ? [address, dexRouterAddress] : undefined,
		account: address,
		chainId: chainId,
	})

	const approveTokens = () => {
		if (!address) return

		if (allowanceTokenB === BigInt(0)) {
			writeContractAsync({
				abi: erc20Abi,
				address: tokenBAddress,
				functionName: "approve",
				args: [dexRouterAddress, ethers.parseEther("1000000")],
				chainId: chainId,
			})
		}
		if (allowanceTokenA === BigInt(0)) {
			writeContractAsync({
				abi: erc20Abi,
				address: tokenAddress,
				functionName: "approve",
				args: [dexRouterAddress, ethers.parseEther("1000000")],
				chainId: chainId,
			})
		}
	}

	return {
		tokenAAllowance: allowanceTokenA || BigInt(0),
		tokenBAllowance: allowanceTokenB || BigInt(0),
		approveTokens
	}
}

// Hook to get Liquidity Token balance
export const useLiquidityTokenBalance = (address: `0x${string}` | undefined) => {
	const [balance, setBalance] = useState<string>("0")
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	let liquidityTokenAddress: `0x${string}` = network.contracts.liquidityToken as `0x${string}`

	const { data: balanceLP, refetch } = useReadContract({
		abi: erc20Abi,
		address: liquidityTokenAddress,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		account: address,
		chainId: chainId,
	})

	useEffect(() => {
		if (balanceLP) {
			setBalance(ethers.formatUnits(balanceLP, 18))
		}
	}, [balanceLP])

	useWatchContractEvent({
		address: liquidityTokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log("LP Token transfer event:", logs)
			refetch()
		},
	})

	return Number(balance).toFixed(4)
}

// Hook to get specific Token balance (tokenA only)
export const useTokenBalance = (address: `0x${string}` | undefined) => {
	const [balance, setBalance] = useState<string>("0")
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	let tokenAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`

	const { data: balanceToken, refetch } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		account: address,
		chainId: chainId,
	})

	useEffect(() => {
		if (balanceToken) {
			const formattedBalance = ethers.formatUnits(balanceToken, 18)
			setBalance(formattedBalance)
		} else if (address) {
			setBalance("0")
		}
	}, [balanceToken, address])

	useWatchContractEvent({
		address: tokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log("Token A transfer event:", logs)
			refetch()
		},
	})

	return balance
}

// Hook to get any token balance by address
export const useTokenBalanceByAddress = (userAddress: `0x${string}` | undefined, tokenAddress: `0x${string}` | undefined) => {
	const { data: balanceToken, refetch } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "balanceOf",
		args: userAddress && tokenAddress ? [userAddress] : undefined,
		account: userAddress,
	})

	useWatchContractEvent({
		address: tokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log(`Token ${tokenAddress} transfer event:`, logs)
			refetch()
		},
		enabled: !!tokenAddress,
	})

	return balanceToken || BigInt(0)
}

// Hook for token approvals
export const useTokenApproval = () => {
	const { writeContractAsync } = useWriteContract()
	const chainId = useChainId()
	const network = getNetworkById(chainId)

	const approveToken = async (tokenAddress: `0x${string}`, spenderAddress: `0x${string}`, amount: string) => {
		try {
			const approveAmount = ethers.parseUnits(amount, 18)

			console.log("Approving token:", tokenAddress, "to spender:", spenderAddress, "amount:", approveAmount.toString())

			const result = await writeContractAsync({
				abi: erc20Abi,
				address: tokenAddress,
				functionName: "approve",
				args: [spenderAddress, approveAmount],
				chainId: chainId,
			})

			return result
		} catch (error) {
			console.error("Token approval error:", error)
			throw error
		}
	}

	const approveTokenX = async (amount: string) => {
		const tokenAddress = network.contracts.tokenA as `0x${string}`
		const dexRouterAddress = network.contracts.dexRouter as `0x${string}`
		return approveToken(tokenAddress, dexRouterAddress, amount)
	}

	const approveTokenY = async (amount: string) => {
		const tokenBAddress = network.contracts.tokenB as `0x${string}`
		const dexRouterAddress = network.contracts.dexRouter as `0x${string}`
		return approveToken(tokenBAddress, dexRouterAddress, amount)
	}

	return {
		approveToken,
		approveTokenX,
		approveTokenY
	}
}
