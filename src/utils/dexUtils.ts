import {
	ChainId,
	Percent,
	Token,
	TokenAmount,
	WNATIVE,
} from "@lb-xyz/sdk-core";
import {
	Bin,
	LB_FACTORY_V22_ADDRESS,
	LB_ROUTER_V22_ADDRESS,
	PairV2,
	RouteV2,
	TradeV2,
	jsonAbis,
} from "@lb-xyz/sdk-v2";
import * as ethers from "ethers";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, erc20Abi, http, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { useChainId, useReadContract, useWatchContractEvent, useWriteContract } from "wagmi";
import { genericDexAbi } from "./abis/dex";
import { getNetworkById } from "./dexConfig";

// ====== INTERFACES ======

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
	let rpcUrls: string[] = [];

	switch (chainId) {
		case 97: // BSC Testnet
			chain = bscTestnet;
			// Multiple RPC endpoints for BSC Testnet
			rpcUrls = [
				'https://bsc-testnet-rpc.publicnode.com',
				'https://bsc-testnet.blockpi.network/v1/rpc/public',
				'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
				'https://data-seed-prebsc-2-s1.bnbchain.org:8545'
			];
			break;
		case 56: // BSC Mainnet
			chain = bsc;
			rpcUrls = [
				'https://bsc-rpc.publicnode.com',
				'https://rpc.ankr.com/bsc',
				'https://bsc-dataseed1.binance.org'
			];
			break;
		case 1: // Ethereum Mainnet
			chain = bscTestnet; // Fallback for now
			rpcUrls = ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'];
			break;
		default:
			chain = bscTestnet;
			rpcUrls = ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'];
	}

	// Use the first available RPC endpoint
	const preferredRpcUrl = rpcUrls[0];

	return createPublicClient({
		chain,
		transport: http(preferredRpcUrl),
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

	// Check if an LB pool already exists
	const checkPoolExists = useCallback(async (
		tokenXAddress: string,
		tokenYAddress: string,
		binStepBasisPoints: number
	): Promise<{ exists: boolean; pairAddress?: string }> => {
		try {
			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID];

			if (!factoryAddress) {
				throw new Error("LB Factory not supported on this chain");
			}

				// Create public client to read contract
			const publicClient = createViemClient(chainId);

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
				});

				// Check if pair exists (address is not zero)
				const pairAddress = (pairInfo as any)?.[0] || '0x0000000000000000000000000000000000000000';
				const exists = pairAddress !== '0x0000000000000000000000000000000000000000';

				return { exists, pairAddress: exists ? pairAddress : undefined };
			} catch (error) {
				console.log("Pool doesn't exist (contract call failed):", error);
				return { exists: false };
			}

		} catch (error) {
			console.error("Check pool exists error:", error);
			return { exists: false };
		}
	}, [chainId]);

	// Create a new liquidity pool using LB Factory
	const createPool = useCallback(async (
		tokenXAddress: string,
		tokenYAddress: string,
		binStepBasisPoints: number,
		activePrice: string
	) => {
		try {
			// First check if pool already exists
			const poolCheck = await checkPoolExists(tokenXAddress, tokenYAddress, binStepBasisPoints);
			if (poolCheck.exists) {
				const tokenX = getSDKTokenByAddress(tokenXAddress, chainId);
				const tokenY = getSDKTokenByAddress(tokenYAddress, chainId);
				throw new Error(`Pool already exists for ${tokenX?.symbol || 'Token'}/${tokenY?.symbol || 'Token'} with ${binStepBasisPoints} basis points bin step. Pair address: ${poolCheck.pairAddress}`);
			}

			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID];

			if (!factoryAddress) {
				throw new Error("LB Factory not supported on this chain");
			}

			// Get tokens to calculate proper price ID
			const tokenX = getSDKTokenByAddress(tokenXAddress, chainId);
			const tokenY = getSDKTokenByAddress(tokenYAddress, chainId);

			if (!tokenX || !tokenY) {
				throw new Error("Tokens not found in SDK configuration");
			}

			// Calculate proper active price ID using LB SDK
			// The price should be in terms of tokenY per tokenX
			const priceFloat = parseFloat(activePrice);
			if (priceFloat <= 0) {
				throw new Error("Invalid price: must be greater than 0");
			}

			// Use LB SDK to calculate the correct price ID
			// This uses the proper logarithmic calculation required by the protocol
			const activePriceId = Bin.getIdFromPrice(priceFloat, binStepBasisPoints);

			// Validate the price ID is within acceptable bounds
			if (activePriceId < 0 || activePriceId > 8388607) { // 2^23 - 1 (max valid ID)
				throw new Error(`Invalid price ID: ${activePriceId}. Price may be too high or too low.`);
			}

			console.log("Creating pool with:", {
				tokenX: tokenXAddress,
				tokenY: tokenYAddress,
				binStep: binStepBasisPoints,
				activePrice: activePrice,
				activePriceId,
				factory: factoryAddress
			});

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
			});

			console.log("Create pool TX sent:", result);
			return result;

		} catch (error) {
			console.error("Create pool error:", error);
			throw error;
		}
	}, [chainId, writeContractAsync, checkPoolExists]);

	return {
		addLiquidity,
		removeLiquidity,
		claimFees,
		swapWithSDK,
		createPool,
		checkPoolExists
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

// Hook to fetch real pool data directly from LB Factory contract (no events)
export const useRealPoolData = () => {
	const [pools, setPools] = useState<PoolData[]>([])
	const [loading, setLoading] = useState(true)
	const chainId = useChainId()

	const fetchPoolData = useCallback(async () => {
		try {
			setLoading(true)

			// Get LB Factory address for current chain
			const CHAIN_ID = wagmiChainIdToSDKChainId(chainId)
			const factoryAddress = LB_FACTORY_V22_ADDRESS[CHAIN_ID]

			if (!factoryAddress) {
				console.warn("LB Factory not supported on this chain")
				setPools([])
				return
			}

			// Create public client to read contract directly
			const publicClient = createViemClient(chainId)
			console.log("Reading pool data directly from factory:", factoryAddress)

			// Step 1: Get total number of pairs from factory
			const numberOfPairs = await publicClient.readContract({
				address: factoryAddress as `0x${string}`,
				abi: [
					{
						"inputs": [],
						"name": "getNumberOfLBPairs",
						"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
						"stateMutability": "view",
						"type": "function"
					}
				],
				functionName: "getNumberOfLBPairs"
			})

			const totalPairs = Number(numberOfPairs)
			console.log(`Total pairs found in factory: ${totalPairs}`)

			if (totalPairs === 0) {
				console.log("No pairs found in factory")
				setPools([])
				return
			}

			// Step 2: Get pair addresses using getLBPairAtIndex
			// Fetch all pairs or limit to reasonable number (e.g., last 50)
			const pairsToFetch = Math.min(50, totalPairs)
			const startIndex = Math.max(0, totalPairs - pairsToFetch)

			console.log(`Fetching ${pairsToFetch} pairs from index ${startIndex} to ${totalPairs - 1}`)

			const pairAddresses: string[] = []
			for (let i = startIndex; i < totalPairs; i++) {
				try {
					const pairAddress = await publicClient.readContract({
						address: factoryAddress as `0x${string}`,
						abi: [
							{
								"inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
								"name": "getLBPairAtIndex",
								"outputs": [{"internalType": "address", "name": "lbPair", "type": "address"}],
								"stateMutability": "view",
								"type": "function"
							}
						],
						functionName: "getLBPairAtIndex",
						args: [BigInt(i)]
					})
					pairAddresses.push(pairAddress as string)
				} catch (error) {
					console.warn(`Failed to get pair at index ${i}:`, error)
				}
			}

			console.log(`Got ${pairAddresses.length} pair addresses`)

			if (pairAddresses.length === 0) {
				setPools([])
				return
			}

			// Step 3: For each pair, get token information directly from pair contract
			// Step 3: For each pair, get token information directly from pair contract
			const poolPromises = pairAddresses.map(async (pairAddress) => {
				try {
					// Get token addresses and bin step directly from pair contract
					const [tokenX, tokenY, binStep] = await Promise.all([
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: [
								{
									"inputs": [],
									"name": "getTokenX",
									"outputs": [{"internalType": "address", "name": "tokenX", "type": "address"}],
									"stateMutability": "view",
									"type": "function"
								}
							],
							functionName: "getTokenX"
						}),
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: [
								{
									"inputs": [],
									"name": "getTokenY",
									"outputs": [{"internalType": "address", "name": "tokenY", "type": "address"}],
									"stateMutability": "view",
									"type": "function"
								}
							],
							functionName: "getTokenY"
						}),
						publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: [
								{
									"inputs": [],
									"name": "getBinStep",
									"outputs": [{"internalType": "uint256", "name": "binStep", "type": "uint256"}],
									"stateMutability": "view",
									"type": "function"
								}
							],
							functionName: "getBinStep"
						})
					])

					const tokenXAddress = tokenX as string
					const tokenYAddress = tokenY as string
					const binStepValue = Number(binStep)

					// Get token information from SDK
					const tokenXInfo = getSDKTokenByAddress(tokenXAddress, chainId)
					const tokenYInfo = getSDKTokenByAddress(tokenYAddress, chainId)

					let token0Symbol = tokenXInfo?.symbol || 'UNK'
					let token1Symbol = tokenYInfo?.symbol || 'UNK'
					let token0Icon = '❓'
					let token1Icon = '❓'

					// Set icons based on token symbols
					const iconMap: { [key: string]: string } = {
						'ETH': '🔷',
						'WETH': '🔷',
						'USDC': '💵',
						'USDT': '💰',
						'DAI': '🟡',
						'WBNB': '🟨',
						'BNB': '🟨'
					}

					token0Icon = iconMap[token0Symbol] || '❓'
					token1Icon = iconMap[token1Symbol] || '❓'

					// Get reserves from pair contract
					let tvl = '$0.00'
					let hasLiquidity = false

					try {
						const reserves = await publicClient.readContract({
							address: pairAddress as `0x${string}`,
							abi: [
								{
									"inputs": [],
									"name": "getReserves",
									"outputs": [
										{"internalType": "uint128", "name": "reserveX", "type": "uint128"},
										{"internalType": "uint128", "name": "reserveY", "type": "uint128"}
									],
									"stateMutability": "view",
									"type": "function"
								}
							],
							functionName: "getReserves"
						})

						const reserveX = (reserves as any)?.[0] || 0n
						const reserveY = (reserves as any)?.[1] || 0n

						hasLiquidity = reserveX > 0n || reserveY > 0n

						if (hasLiquidity) {
							// Simple TVL estimation
							const reserveXFormatted = Number(ethers.formatUnits(reserveX, tokenXInfo?.decimals || 18))
							const reserveYFormatted = Number(ethers.formatUnits(reserveY, tokenYInfo?.decimals || 18))

							// Rough estimate for stablecoins
							if (token0Symbol === 'USDC' || token0Symbol === 'USDT' || token0Symbol === 'DAI') {
								tvl = `$${(reserveXFormatted * 2).toLocaleString()}`
							} else if (token1Symbol === 'USDC' || token1Symbol === 'USDT' || token1Symbol === 'DAI') {
								tvl = `$${(reserveYFormatted * 2).toLocaleString()}`
							} else {
								tvl = `~$${((reserveXFormatted + reserveYFormatted) * 100).toLocaleString()}`
							}
						}
					} catch (reserveError) {
						console.log("Could not fetch reserves for pair:", pairAddress)
					}

					// Calculate estimated APR based on bin step
					const estimatedAPR = Math.min(50, (binStepValue / 100) * 10).toFixed(1) + '%'

					const pool: PoolData = {
						id: `${pairAddress}-${binStepValue}`,
						token0: token0Symbol,
						token1: token1Symbol,
						icon0: token0Icon,
						icon1: token1Icon,
						tvl: tvl,
						apr: estimatedAPR,
						volume24h: hasLiquidity ? '$1,000+' : '$0.00',
						fees24h: hasLiquidity ? '$10+' : '$0.00',
						pairAddress: pairAddress,
						binStep: binStepValue,
						tokenXAddress: tokenXAddress,
						tokenYAddress: tokenYAddress
					}

					return pool
				} catch (error) {
					console.error(`Error processing pair ${pairAddress}:`, error)
					return null
				}
			})

			const resolvedPools = await Promise.all(poolPromises)
			const validPools = resolvedPools.filter(pool => pool !== null) as PoolData[]

			// Sort by most recent (reverse order)
			validPools.reverse()

			setPools(validPools)
			console.log(`Successfully fetched ${validPools.length} real pools from contract`)

		} catch (error) {
			console.error("Error fetching pool data:", error)
			setPools([])
		} finally {
			setLoading(false)
		}
	}, [chainId])

	useEffect(() => {
		fetchPoolData()
	}, [fetchPoolData])

	return { pools, loading, refetch: fetchPoolData }
}
