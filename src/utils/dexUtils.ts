import { erc20Abi } from "viem";
import * as ethers from "ethers";
import { useChainId, useReadContract, useWatchContractEvent } from "wagmi";
import { useWriteContract } from "wagmi";
import { useEffect, useState } from "react";
import { getNetworkById } from "./dexConfig";

// Generic AMM/DEX ABI - simplified version that works with most DEX implementations
export const genericDexAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenAAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_tokenBAmount", 
        "type": "uint256"
      }
    ],
    "name": "addLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_shares",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_tokenAAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256", 
        "name": "_tokenBAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amountIn",
        "type": "uint256"
      }
    ],
    "name": "swapTokenAForB",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amountIn",
        "type": "uint256"
      }
    ],
    "name": "swapTokenBForA",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenAPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenBPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolRatio",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenAAmount",
        "type": "uint256"
      }
    ],
    "name": "estimateTokenAForB",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenBAmount",
        "type": "uint256"
      }
    ],
    "name": "estimateTokenBForA",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenAReserve",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenBReserve",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ====== REACT HOOKS VERSIONS ======
// These are the correct hook implementations that should be used in React components

// Hook to check allowances for DEX trading
export const useCheckAllowance = (address: `0x${string}` | undefined, chainId: number) => {
  const network = getNetworkById(chainId);
  
  let tokenAAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;
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
    address: tokenAAddress,
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
        address: tokenAAddress,
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

// Hook to get Token A balance
export const useTokenABalance = (address: `0x${string}` | undefined) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let tokenAAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;

  const { data: balanceTokenA, refetch } = useReadContract({
    abi: erc20Abi,
    address: tokenAAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceTokenA) {
      const formattedBalance = ethers.formatUnits(balanceTokenA, 18);
      setBalance(formattedBalance);
    } else if (address) {
      // If no balance data but address exists, set to 0
      setBalance("0");
    }
  }, [balanceTokenA, address]);

  useWatchContractEvent({
    address: tokenAAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      console.log("Token A transfer event:", logs);
      refetch();
    },
  });

  return balance;
};

// Hook to get Token B balance
export const useTokenBBalance = (address: `0x${string}` | undefined) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`;

  const { data: balanceTokenB, refetch } = useReadContract({
    abi: erc20Abi,
    address: tokenBAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceTokenB) {
      const formattedBalance = ethers.formatUnits(balanceTokenB, 18);
      setBalance(formattedBalance);
    } else if (address) {
      // If no balance data but address exists, set to 0
      setBalance("0");
    }
  }, [balanceTokenB, address]);

  useWatchContractEvent({
    address: tokenBAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      console.log("Token B transfer event:", logs);
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

// Hook to get Token A price in Token B
export const useTokenAPrice = () => {
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

  const swapTokenAForB = async (tokenAAmount: number) => {
    try {
      const tokenA = ethers.parseUnits(tokenAAmount.toString(), 18);

      console.log("Swapping Token A for B:", tokenA.toString());

      const result = await writeContract({
        abi: genericDexAbi,
        address: dexRouterAddress,
        functionName: "swapTokenAForB",
        args: [tokenA],
        chainId: chainId,
      });

      return result;
    } catch (error) {
      console.error("Swap A for B error:", error);
      throw error;
    }
  };

  const swapTokenBForA = async (tokenBAmount: number) => {
    try {
      const tokenB = ethers.parseUnits(tokenBAmount.toString(), 18);

      console.log("Swapping Token B for A:", tokenB.toString());

      const result = await writeContract({
        abi: genericDexAbi,
        address: dexRouterAddress,
        functionName: "swapTokenBForA",
        args: [tokenB],
        chainId: chainId,
      });

      return result;
    } catch (error) {
      console.error("Swap B for A error:", error);
      throw error;
    }
  };

  return {
    addLiquidity,
    removeLiquidity,
    swapTokenAForB,
    swapTokenBForA
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

  const approveTokenA = async (amount: string) => {
    const tokenAAddress = network.contracts.tokenA as `0x${string}`;
    const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
    return approveToken(tokenAAddress, dexRouterAddress, amount);
  };

  const approveTokenB = async (amount: string) => {
    const tokenBAddress = network.contracts.tokenB as `0x${string}`;
    const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
    return approveToken(tokenBAddress, dexRouterAddress, amount);
  };

  return {
    approveToken,
    approveTokenA,
    approveTokenB
  };
};
