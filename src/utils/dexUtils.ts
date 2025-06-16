import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import { useChainId, useReadContract, useWatchContractEvent, useWriteContract } from "wagmi";
import { genericDexAbi } from "./abis/dex";
import { getNetworkById } from "./dexConfig";


// ====== REACT HOOKS VERSIONS ======
// These are the correct hook implementations that should be used in React components

// Hook to check allowances for DEX trading
export const useCheckAllowance = (address: `0x${string}` | undefined, chainId: number) => {
	const network = getNetworkById(chainId);

	let tokenAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;
	let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`;
	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const { writeContract } = useWriteContract();

	const { data: allowanceTokenB } = useReadContract({
		abi: erc20Abi,
		address: tokenBAddress,
		functionName: "allowance",
		args: address ? [address, dexRouterAddress] : undefined,
		account: address,
		chainId: chainId,
	});

	const { data: allowanceTokenA } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "allowance",
		args: address ? [address, dexRouterAddress] : undefined,
		account: address,
		chainId: chainId,
	});

	const approveTokens = () => {
		if (!address) return;

		if (allowanceTokenB === BigInt(0)) {
			writeContract({
				abi: erc20Abi,
				address: tokenBAddress,
				functionName: "approve",
				args: [dexRouterAddress, ethers.parseEther("1000000")],
				chainId: chainId,
			});
		}
		if (allowanceTokenA === BigInt(0)) {
			writeContract({
				abi: erc20Abi,
				address: tokenAddress,
				functionName: "approve",
				args: [dexRouterAddress, ethers.parseEther("1000000")],
				chainId: chainId,
			});
		}
	};

	return {
		tokenAAllowance: allowanceTokenA || BigInt(0),
		tokenBAllowance: allowanceTokenB || BigInt(0),
		approveTokens
	};
};

// Hook to get Liquidity Token balance
export const useLiquidityTokenBalance = (address: `0x${string}` | undefined) => {
	const [balance, setBalance] = useState<string>("0");
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let liquidityTokenAddress: `0x${string}` = network.contracts.liquidityToken as `0x${string}`;

	const { data: balanceLP, refetch } = useReadContract({
		abi: erc20Abi,
		address: liquidityTokenAddress,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		account: address,
		chainId: chainId,
	});

	useEffect(() => {
		if (balanceLP) {
			setBalance(ethers.formatUnits(balanceLP, 18));
		}
	}, [balanceLP]);

	useWatchContractEvent({
		address: liquidityTokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log("LP Token transfer event:", logs);
			refetch();
		},
	});

	return Number(balance).toFixed(4);
};

// Hook to get Token balance
export const useTokenBalance = (address: `0x${string}` | undefined) => {
	const [balance, setBalance] = useState<string>("0");
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let tokenAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;

	const { data: balanceToken, refetch } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		account: address,
		chainId: chainId,
	});

	useEffect(() => {
		if (balanceToken) {
			const formattedBalance = ethers.formatUnits(balanceToken, 18);
			setBalance(formattedBalance);
		} else if (address) {
			// If no balance data but address exists, set to 0
			setBalance("0");
		}
	}, [balanceToken, address]);

	useWatchContractEvent({
		address: tokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log("Token A transfer event:", logs);
			refetch();
		},
	});

	return balance;
};

// ====== ADDITIONAL UTILITY HOOKS ======

// Hook to get DEX pool ratio for price calculation
export const usePoolRatio = () => {
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const { data: poolRatio } = useReadContract({
		abi: genericDexAbi,
		address: dexRouterAddress,
		functionName: "getPoolRatio",
		chainId: chainId,
	});

	return poolRatio ? Number(poolRatio) : 1;
};

// Hook to get Token X price in Token Y
export const useTokenPrice = () => {
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const { data: tokenAPrice } = useReadContract({
		abi: genericDexAbi,
		address: dexRouterAddress,
		functionName: "getTokenAPrice",
		chainId: chainId,
	});

	return tokenAPrice ? Number(tokenAPrice) : 1;
};

// Hook for DEX operations (add/remove liquidity, swaps)
export const useDexOperations = () => {
	const { writeContract } = useWriteContract();
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const addLiquidity = async (tokenAAmount: number, tokenBAmount: number) => {
		try {
			const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18);
			const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18);

			console.log("Adding liquidity - Token A:", tokenA.toString(), "Token B:", tokenB.toString());

			const result = await writeContract({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "addLiquidity",
				args: [tokenA, tokenB],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Add liquidity error:", error);
			throw error;
		}
	};

	const removeLiquidity = async (liquidityAmount: number) => {
		try {
			const liquidity = ethers.parseUnits(liquidityAmount.toString(), 18);

			console.log("Removing liquidity - LP tokens:", liquidity.toString());

			const result = await writeContract({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "removeLiquidity",
				args: [liquidity],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Remove liquidity error:", error);
			throw error;
		}
	};

	const swapTokenXForY = async (tokenAAmount: number) => {
		try {
			const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18);

			console.log("Swapping Token A for B:", tokenA.toString());

			const result = await writeContract({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "swapTokenXForY",
				args: [tokenA],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Swap A for B error:", error);
			throw error;
		}
	};

	const swapTokenYForX = async (tokenBAmount: number) => {
		try {
			const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18);

			console.log("Swapping Token B for A:", tokenB.toString());

			const result = await writeContract({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "swapTokenYForX",
				args: [tokenB],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Swap B for A error:", error);
			throw error;
		}
	};

	const claimFees = async (positionId: number) => {
		try {
			console.log("Claiming fees for position:", positionId);

			const result = await writeContract({
				abi: genericDexAbi,
				address: dexRouterAddress,
				functionName: "claimFees",
				args: [BigInt(positionId)],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Claim fees error:", error);
			throw error;
		}
	};

	return {
		addLiquidity,
		removeLiquidity,
		swapTokenXForY,
		swapTokenYForX,
		claimFees
	};
};

// Hook for token approvals
export const useTokenApproval = () => {
	const { writeContract } = useWriteContract();
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	const approveToken = async (tokenAddress: `0x${string}`, spenderAddress: `0x${string}`, amount: string) => {
		try {
			const approveAmount = ethers.parseUnits(amount, 18);

			console.log("Approving token:", tokenAddress, "to spender:", spenderAddress, "amount:", approveAmount.toString());

			const result = await writeContract({
				abi: erc20Abi,
				address: tokenAddress,
				functionName: "approve",
				args: [spenderAddress, approveAmount],
				chainId: chainId,
			});

			return result;
		} catch (error) {
			console.error("Token approval error:", error);
			throw error;
		}
	};

	const approveTokenX = async (amount: string) => {
		const tokenAddress = network.contracts.tokenA as `0x${string}`;
		const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
		return approveToken(tokenAddress, dexRouterAddress, amount);
	};

	const approveTokenY = async (amount: string) => {
		const tokenBAddress = network.contracts.tokenB as `0x${string}`;
		const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
		return approveToken(tokenBAddress, dexRouterAddress, amount);
	};

	return {
		approveToken,
		approveTokenX,
		approveTokenY
	};
};

// Hook to get swap quotes with real-time pricing
export const useSwapQuote = (
	amountIn: string,
	tokenInAddress: string,
	tokenOutAddress: string
) => {
	const [quote, setQuote] = useState({
		amountOut: '',
		priceImpact: '0.05',
		path: [] as string[],
		loading: false,
		error: null as string | null,
	});

	const chainId = useChainId();

	useEffect(() => {
		const getQuote = async () => {
			if (!amountIn || parseFloat(amountIn) <= 0 || !tokenInAddress || !tokenOutAddress) {
				setQuote(prev => ({
					...prev,
					amountOut: '',
					loading: false,
				}));
				return;
			}

			setQuote(prev => ({ ...prev, loading: true, error: null }));

			try {
				// For now, use simple calculation based on exchange rate
				// In production, this would call actual DEX contracts
				const amountInNum = parseFloat(amountIn);

				// Mock exchange rates (in production, fetch from contracts)
				let exchangeRate = 1850.5; // ETH/USDC rate

				if (tokenInAddress.includes('USDC') && tokenOutAddress.includes('ETH')) {
					exchangeRate = 1 / 1850.5;
				} else if (tokenInAddress.includes('ETH') && tokenOutAddress.includes('USDT')) {
					exchangeRate = 1850.0;
				} else if (tokenInAddress.includes('USDT') && tokenOutAddress.includes('ETH')) {
					exchangeRate = 1 / 1850.0;
				}

				const amountOut = amountInNum * exchangeRate;

				// Simulate network delay
				await new Promise(resolve => setTimeout(resolve, 500));

				setQuote({
					amountOut: amountOut.toFixed(6),
					priceImpact: '0.05',
					path: [tokenInAddress, tokenOutAddress],
					loading: false,
					error: null,
				});

			} catch (error) {
				console.error('Quote error:', error);
				setQuote(prev => ({
					...prev,
					loading: false,
					error: 'Failed to get quote',
				}));
			}
		};

		// Debounce the quote requests
		const timeoutId = setTimeout(getQuote, 300);
		return () => clearTimeout(timeoutId);

	}, [amountIn, tokenInAddress, tokenOutAddress, chainId]);

	return quote;
};

// Hook to get estimated swap input amount based on desired output amount
export const useReverseSwapQuote = (amountOut: number, tokenIn: `0x${string}`, tokenOut: `0x${string}`) => {
	const [quote, setQuote] = useState({
		amountIn: null as string | null,
		priceImpact: null as string | null,
		path: [] as string[],
		loading: false,
	});

	const chainId = useChainId();

	useEffect(() => {
		if (!amountOut || amountOut <= 0 || !tokenIn || !tokenOut) {
			setQuote({ amountIn: null, priceImpact: null, path: [], loading: false });
			return;
		}

		const getQuote = async () => {
			try {
				setQuote(prev => ({ ...prev, loading: true }));

				// Calculate reverse quote based on the output amount
				// For demonstration, we use the inverse of the normal exchange rate
				// In a real DEX, this would call a specific contract method for reverse quotes

				// Simple reverse calculation with some slippage
				const baseRate = 1850.5; // ETH price in USDC (example)
				let estimatedAmountIn: number;

				if (tokenIn.toLowerCase().includes('usdc') || tokenIn.toLowerCase().includes('usdt')) {
					// Input is stablecoin, output is ETH
					estimatedAmountIn = amountOut * baseRate * 1.01; // Add 1% for slippage
				} else {
					// Input is ETH, output is stablecoin
					estimatedAmountIn = amountOut / baseRate * 1.01; // Add 1% for slippage
				}

				// Simulate some network delay
				await new Promise(resolve => setTimeout(resolve, 500));

				setQuote({
					amountIn: estimatedAmountIn.toFixed(6),
					priceImpact: "0.08", // Slightly higher impact for reverse quotes
					path: [tokenIn, tokenOut],
					loading: false,
				});

			} catch (error) {
				console.error('Error getting reverse quote:', error);
				setQuote({ amountIn: null, priceImpact: null, path: [], loading: false });
			}
		};

		getQuote();
	}, [amountOut, tokenIn, tokenOut, chainId]);

	return quote;
};
