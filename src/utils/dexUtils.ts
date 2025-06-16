import {
	ChainId,
	Percent,
	Token,
	TokenAmount,
	WNATIVE,
} from "@lb-xyz/sdk-core";
import {
	LB_ROUTER_V22_ADDRESS,
	PairV2,
	RouteV2,
	TradeV2,
	jsonAbis,
} from "@lb-xyz/sdk-v2";
import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { createPublicClient, erc20Abi, http, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { useChainId, useReadContract, useWatchContractEvent, useWriteContract } from "wagmi";
import { genericDexAbi } from "./abis/dex";
import { getNetworkById } from "./dexConfig";

// ====== LB SDK CONFIGURATION ======

// Multi-network token definitions
const TOKEN_CONFIGS = {
	[ChainId.BNB_TESTNET]: {
		WBNB: new Token(ChainId.BNB_TESTNET, "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", 18, "WBNB", "Wrapped BNB"),
		ETH: new Token(ChainId.BNB_TESTNET, "0x8babbb98678facc7342735486c851abd7a0d17ca", 18, "ETH", "Ethereum"),
		USDC: new Token(ChainId.BNB_TESTNET, "0x64544969ed7EBf5f083679233325356EbE738930", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_TESTNET, "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", 18, "USDT", "Tether"),
	},
	[ChainId.BNB_CHAIN]: {
		WBNB: new Token(ChainId.BNB_CHAIN, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "WBNB", "Wrapped BNB"),
		ETH: new Token(ChainId.BNB_CHAIN, "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", 18, "ETH", "Ethereum"),
		USDC: new Token(ChainId.BNB_CHAIN, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_CHAIN, "0x55d398326f99059fF775485246999027B3197955", 18, "USDT", "Tether"),
	},
	[ChainId.ETHEREUM]: {
		WETH: new Token(ChainId.ETHEREUM, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, "WETH", "Wrapped Ether"),
		USDC: new Token(ChainId.ETHEREUM, "0xA0b86a33E6441E3073E86c9Ed3B3Ad5e32E6f50A", 6, "USDC", "USD Coin"),
		USDT: new Token(ChainId.ETHEREUM, "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, "USDT", "Tether"),
	},
};

// Convert wagmi chain ID to SDK chain ID
const wagmiChainIdToSDKChainId = (wagmiChainId: number): ChainId => {
	switch (wagmiChainId) {
		case 97: // BSC Testnet
			return ChainId.BNB_TESTNET;
		case 56: // BSC Mainnet
			return ChainId.BNB_CHAIN;
		case 1: // Ethereum Mainnet
			return ChainId.ETHEREUM;
		default:
			return ChainId.BNB_TESTNET; // Default fallback
	}
};

// Get SDK tokens for specific chain (for trading operations)
const getSDKTokensForChain = (chainId: number) => {
	const sdkChainId = wagmiChainIdToSDKChainId(chainId);
	return TOKEN_CONFIGS[sdkChainId as keyof typeof TOKEN_CONFIGS] || TOKEN_CONFIGS[ChainId.BNB_TESTNET];
};

// Helper function to get SDK token by address for specific chain
const getSDKTokenByAddress = (address: string, chainId: number): Token | undefined => {
	const tokens = getSDKTokensForChain(chainId);
	return Object.values(tokens as Record<string, Token>).find(token =>
		token.address.toLowerCase() === address.toLowerCase()
	);
};

// Create public client for blockchain interaction
const createViemClient = (chainId: number) => {
	let chain;
	switch (chainId) {
		case 97: // BSC Testnet
			chain = bscTestnet;
			break;
		case 56: // BSC Mainnet
			chain = bsc;
			break;
		case 1: // Ethereum Mainnet
			// Note: You'll need to import mainnet from viem/chains if using Ethereum
			chain = bscTestnet; // Fallback for now
			break;
		default:
			chain = bscTestnet;
	}

	return createPublicClient({
		chain,
		transport: http(),
	});
};

// ====== REACT HOOKS VERSIONS ======
// These are the correct hook implementations that should be used in React components

// Hook to check allowances for DEX trading
export const useCheckAllowance = (address: `0x${string}` | undefined, chainId: number) => {
	const network = getNetworkById(chainId);

	let tokenAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;
	let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`;
	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const { writeContractAsync } = useWriteContract();

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
			writeContractAsync({
				abi: erc20Abi,
				address: tokenBAddress,
				functionName: "approve",
				args: [dexRouterAddress, ethers.parseEther("1000000")],
				chainId: chainId,
			});
		}
		if (allowanceTokenA === BigInt(0)) {
			writeContractAsync({
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

// Hook to get specific Token balance (tokenA only)
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

// Hook to get any token balance by address
export const useTokenBalanceByAddress = (userAddress: `0x${string}` | undefined, tokenAddress: `0x${string}` | undefined) => {
	const [balance, setBalance] = useState<string>("0");

	const { data: balanceToken, refetch } = useReadContract({
		abi: erc20Abi,
		address: tokenAddress,
		functionName: "balanceOf",
		args: userAddress && tokenAddress ? [userAddress] : undefined,
		account: userAddress,
	});

	useEffect(() => {
		if (balanceToken) {
			const formattedBalance = ethers.formatUnits(balanceToken, 18);
			setBalance(formattedBalance);
		} else if (userAddress && tokenAddress) {
			setBalance("0");
		}
	}, [balanceToken, userAddress, tokenAddress]);

	useWatchContractEvent({
		address: tokenAddress,
		abi: erc20Abi,
		eventName: "Transfer",
		onLogs(logs) {
			console.log(`Token ${tokenAddress} transfer event:`, logs);
			refetch();
		},
		enabled: !!tokenAddress,
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
	const { writeContractAsync } = useWriteContract();
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

	const addLiquidity = async (tokenAAmount: number, tokenBAmount: number) => {
		try {
			const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18);
			const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18);

			console.log("Adding liquidity - Token A:", tokenA.toString(), "Token B:", tokenB.toString());

			const result = await writeContractAsync({
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

			const result = await writeContractAsync({
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

	const claimFees = async (positionId: number) => {
		try {
			console.log("Claiming fees for position:", positionId);

			const result = await writeContractAsync({
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

	// Enhanced swap using LB SDK with proper slippage and routing
	const swapWithSDK = async (
		fromTokenContractAddress: string,
		toTokenContractAddress: string,
		inputAmount: string,
		recipientWalletAddress: `0x${string}`,
		slippagePercent: string = "0.5"
	) => {
		try {
			// Get tokens by address
			const inputToken = getSDKTokenByAddress(fromTokenContractAddress, chainId);
			const outputToken = getSDKTokenByAddress(toTokenContractAddress, chainId);

			if (!inputToken || !outputToken) {
				throw new Error("Token not found");
			}

			// Create clients
			const publicClient = createViemClient(chainId);
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);

			// Parse input amount
			const typedValueInParsed = parseUnits(inputAmount, inputToken.decimals);
			const amountInToken = new TokenAmount(inputToken, typedValueInParsed);

			// Check if tokens are native
			const nativeToken = WNATIVE[CHAIN_ID];
			const isNativeIn = nativeToken ? inputToken.equals(nativeToken) : false;
			const isNativeOut = nativeToken ? outputToken.equals(nativeToken) : false;

			// Build routes
			const currentChainTokens = getSDKTokensForChain(chainId);
			const BASES = Object.values(currentChainTokens as Record<string, Token>);
			const allTokenPairs = PairV2.createAllTokenPairs(inputToken, outputToken, BASES);
			const allPairs = PairV2.initPairs(allTokenPairs);
			const allRoutes = RouteV2.createAllRoutes(allPairs, inputToken, outputToken);

			// Get best trade
			const trades = await TradeV2.getTradesExactIn(
				allRoutes,
				amountInToken,
				outputToken,
				isNativeIn,
				isNativeOut,
				publicClient,
				CHAIN_ID
			);

			const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined);
			const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, true) : null;

			if (!bestTrade) {
				throw new Error("No valid trade found");
			}

			console.log("Best trade for swap:", bestTrade.toLog());

			// Slippage tolerance and swap call parameters
			const userSlippageTolerance = new Percent(
				Math.floor(parseFloat(slippagePercent) * 100).toString(),
				"10000"
			); // Convert percentage to basis points

			const swapOptions = {
				allowedSlippage: userSlippageTolerance,
				ttl: 3600, // 1 hour
				recipient: recipientWalletAddress,
				feeOnTransfer: false,
			};

			const { methodName, args, value } = bestTrade.swapCallParameters(swapOptions);

			// Get LB Router address
			const lbRouterContractAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID];
			if (!lbRouterContractAddress) {
				throw new Error("LB Router not supported on this chain");
			}

			console.log("Swap parameters:", { methodName, args, value, routerAddress: lbRouterContractAddress });

			// Execute the swap using writeContractAsync
			const txHash = await writeContractAsync({
				address: lbRouterContractAddress as `0x${string}`,
				abi: jsonAbis.LBRouterV22ABI,
				functionName: methodName as any,
				args: args as any,
				value: value ? BigInt(value) : undefined,
			});

			console.log("Swap TX sent:", txHash);
			return txHash;

		} catch (error) {
			console.error("LB SDK swap error:", error);
			throw error;
		}
	};

	return {
		addLiquidity,
		removeLiquidity,
		claimFees,
		swapWithSDK
	};
};

// Hook for token approvals
export const useTokenApproval = () => {
	const { writeContractAsync } = useWriteContract();
	const chainId = useChainId();
	const network = getNetworkById(chainId);

	const approveToken = async (tokenAddress: `0x${string}`, spenderAddress: `0x${string}`, amount: string) => {
		try {
			const approveAmount = ethers.parseUnits(amount, 18);

			console.log("Approving token:", tokenAddress, "to spender:", spenderAddress, "amount:", approveAmount.toString());

			const result = await writeContractAsync({
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

// Hook to get swap quotes with real-time pricing using LB SDK
export const useSwapQuote = (
	amountIn: string,
	tokenInAddress: string,
	tokenOutAddress: string
) => {
	const [quote, setQuote] = useState({
		amountOut: '',
		priceImpact: '0.05',
		path: [] as string[],
		tradeFee: {
			feeAmountIn: '0',
			totalFeePct: '0',
		},
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
				// Get tokens by address
				const tokenIn = getSDKTokenByAddress(tokenInAddress, chainId);
				const tokenOut = getSDKTokenByAddress(tokenOutAddress, chainId);

				if (!tokenIn || !tokenOut) {
					throw new Error("Token not found");
				}

				// Create public client
				const publicClient = createViemClient(chainId);
				const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);

				// Parse input amount
				const typedValueInParsed = parseUnits(amountIn, tokenIn.decimals);
				const amountInToken = new TokenAmount(tokenIn, typedValueInParsed);

				// Check if tokens are native
				const nativeToken = WNATIVE[CHAIN_ID];
				const isNativeIn = nativeToken ? tokenIn.equals(nativeToken) : false;
				const isNativeOut = nativeToken ? tokenOut.equals(nativeToken) : false;

				// Build routes - get tokens for current chain
				const currentChainTokens = getSDKTokensForChain(chainId);
				const BASES = Object.values(currentChainTokens as Record<string, Token>);

				console.log('SDK Debug Info:', {
					chainId: CHAIN_ID,
					tokenIn: tokenIn.symbol,
					tokenOut: tokenOut.symbol,
					basesCount: BASES.length,
					amountIn: amountInToken.toFixed(),
				});

				const allTokenPairs = PairV2.createAllTokenPairs(tokenIn, tokenOut, BASES);
				const allPairs = PairV2.initPairs(allTokenPairs);
				const allRoutes = RouteV2.createAllRoutes(allPairs, tokenIn, tokenOut);

				console.log('Route Info:', {
					tokenPairsCount: allTokenPairs.length,
					pairsCount: allPairs.length,
					routesCount: allRoutes.length,
				});

				// Create trades with better error handling
				let trades: (TradeV2 | undefined)[] = [];
				try {
					trades = await TradeV2.getTradesExactIn(
						allRoutes,
						amountInToken,
						tokenOut,
						isNativeIn,
						isNativeOut,
						publicClient,
						CHAIN_ID
					);
					console.log('Raw trades result:', trades.length, 'trades returned');
				} catch (tradeError) {
					console.warn('LB SDK trade creation failed:', tradeError);
					// If trade creation fails, fall through to fallback
					trades = [];
				}

				// Filter out undefined trades
				const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined);
				console.log('Valid trades after filtering:', validTrades.length);

				const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, true) : null;

				if (!bestTrade) {
					console.warn("No valid trade found via LB SDK");
					// Use fallback instead of throwing error
					throw new Error("No valid trade found via LB SDK");
				}

				console.log("Best trade log:", bestTrade.toLog());

				// Get trade fee information
				const tradeFee = await bestTrade.getTradeFee();

				// Extract quote data
				const outputAmount = bestTrade.outputAmount.toFixed(6);
				const priceImpact = bestTrade.priceImpact.toSignificant(3);
				const routePath = bestTrade.route.path.map(token => token.address);
				const executionPrice = bestTrade.executionPrice.toSignificant(6);
				const feeAmountIn = tradeFee.feeAmountIn.toSignificant(6);
				const totalFeePct = tradeFee.totalFeePct.toSignificant(3);

				setQuote({
					amountOut: outputAmount,
					priceImpact: priceImpact,
					path: routePath,
					tradeFee: {
						feeAmountIn: feeAmountIn,
						totalFeePct: totalFeePct,
					},
					loading: false,
					error: null,
				});

				console.log('Trade executed successfully:', {
					inputAmount: bestTrade.inputAmount.toFixed(6),
					outputAmount,
					priceImpact,
					executionPrice,
					tradeFee: {
						feeAmountIn,
						totalFeePct: `${totalFeePct}%`,
					},
				});

			} catch (error) {
				console.warn('LB SDK quote failed:', error);

				// Simple fallback with default values
				setQuote({
					amountOut: '0.0',
					priceImpact: '0.05',
					path: [tokenInAddress, tokenOutAddress],
					tradeFee: {
						feeAmountIn: '0',
						totalFeePct: '0',
					},
					loading: false,
					error: 'No liquidity data available',
				});
			}
		};

		// Debounce the quote requests
		const timeoutId = setTimeout(getQuote, 300);
		return () => clearTimeout(timeoutId);

	}, [amountIn, tokenInAddress, tokenOutAddress, chainId]);

	return quote;
};

// Hook to get estimated swap input amount based on desired output amount using LB SDK
export const useReverseSwapQuote = (amountOut: number, tokenIn: `0x${string}`, tokenOut: `0x${string}`) => {
	const [quote, setQuote] = useState({
		amountIn: null as string | null,
		priceImpact: null as string | null,
		path: [] as string[],
		tradeFee: {
			feeAmountIn: '0',
			totalFeePct: '0',
		},
		loading: false,
		error: null as string | null,
	});

	const chainId = useChainId();

	useEffect(() => {
		if (!amountOut || amountOut <= 0 || !tokenIn || !tokenOut) {
			setQuote({
				amountIn: null,
				priceImpact: null,
				path: [],
				tradeFee: {
					feeAmountIn: '0',
					totalFeePct: '0',
				},
				loading: false,
				error: null
			});
			return;
		}

		const getQuote = async () => {
			try {
				setQuote(prev => ({ ...prev, loading: true }));

				// Get tokens by address
				const tokenInObj = getSDKTokenByAddress(tokenIn, chainId);
				const tokenOutObj = getSDKTokenByAddress(tokenOut, chainId);

				if (!tokenInObj || !tokenOutObj) {
					throw new Error("Token not found");
				}

				// Create public client
				const publicClient = createViemClient(chainId);
				const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);

				// Parse output amount
				const typedValueOutParsed = parseUnits(amountOut.toString(), tokenOutObj.decimals);
				const amountOutToken = new TokenAmount(tokenOutObj, typedValueOutParsed);

				// Check if tokens are native
				const nativeToken = WNATIVE[CHAIN_ID];
				const isNativeIn = nativeToken ? tokenInObj.equals(nativeToken) : false;
				const isNativeOut = nativeToken ? tokenOutObj.equals(nativeToken) : false;

				// Build routes - get tokens for current chain
				const currentChainTokens = getSDKTokensForChain(chainId);
				const BASES = Object.values(currentChainTokens as Record<string, Token>);
				const allTokenPairs = PairV2.createAllTokenPairs(tokenInObj, tokenOutObj, BASES);
				const allPairs = PairV2.initPairs(allTokenPairs);
				const allRoutes = RouteV2.createAllRoutes(allPairs, tokenInObj, tokenOutObj);

				// Create trades for exact output with better error handling
				let trades: (TradeV2 | undefined)[] = [];
				try {
					trades = await TradeV2.getTradesExactOut(
						allRoutes,
						amountOutToken,
						tokenInObj,
						isNativeIn,
						isNativeOut,
						publicClient,
						CHAIN_ID
					);
				} catch (tradeError) {
					console.warn('LB SDK reverse trade creation failed:', tradeError);
					trades = [];
				}

				// Filter out undefined trades
				const validTrades = trades.filter((trade): trade is TradeV2 => trade !== undefined);
				const bestTrade = validTrades.length > 0 ? TradeV2.chooseBestTrade(validTrades, false) : null; // false for exact out

				if (!bestTrade) {
					console.warn("No valid reverse trade found via LB SDK");
					throw new Error("No valid reverse trade found via LB SDK");
				}

				console.log("Best reverse trade log:", bestTrade.toLog());

				// Get trade fee information
				const tradeFee = await bestTrade.getTradeFee();

				// Extract quote data
				const inputAmount = bestTrade.inputAmount.toFixed(6);
				const priceImpact = bestTrade.priceImpact.toSignificant(3);
				const routePath = bestTrade.route.path.map(token => token.address);
				const feeAmountIn = tradeFee.feeAmountIn.toSignificant(6);
				const totalFeePct = tradeFee.totalFeePct.toSignificant(3);

				setQuote({
					amountIn: inputAmount,
					priceImpact: priceImpact,
					path: routePath,
					tradeFee: {
						feeAmountIn: feeAmountIn,
						totalFeePct: totalFeePct,
					},
					loading: false,
					error: null,
				});

			} catch (error) {
				console.warn('LB SDK reverse quote failed:', error);

				// Simple fallback with default values
				setQuote({
					amountIn: '0.0',
					priceImpact: "0.08",
					path: [tokenIn, tokenOut],
					tradeFee: {
						feeAmountIn: '0',
						totalFeePct: '0',
					},
					loading: false,
					error: 'No liquidity data available',
				});
			}
		};

		getQuote();
	}, [amountOut, tokenIn, tokenOut, chainId]);

	return quote;
};
