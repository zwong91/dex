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

// Check allowances for DEX trading
export const checkAllowance = (address: `0x${string}`, chainId: number) => {
  const network = getNetworkById(chainId);
  
  let tokenAAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;
  let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`;
  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

  let { writeContract } = useWriteContract();

  const { data: allowanceTokenB } = useReadContract({
    abi: erc20Abi,
    address: tokenBAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });
  
  const { data: allowanceTokenA } = useReadContract({
    abi: erc20Abi,
    address: tokenAAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });

  let tokenA_allowance = allowanceTokenA;
  let tokenB_allowance = allowanceTokenB;

  console.log("Token A allowance", tokenA_allowance);
  console.log("Token B allowance", tokenB_allowance);

  if (tokenB_allowance == BigInt(0)) {
    writeContract({
      abi: erc20Abi,
      address: tokenBAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  }
  if (tokenA_allowance == BigInt(0)) {
    writeContract({
      abi: erc20Abi,
      address: tokenAAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  }
};

// Get Liquidity Token balance
export const getLiquidityTokenBalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let liquidityTokenAddress: `0x${string}` = network.contracts.liquidityToken as `0x${string}`;

  const { data: balanceLP, refetch } = useReadContract({
    abi: erc20Abi,
    address: liquidityTokenAddress,
    functionName: "balanceOf",
    args: [address],
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

// Get Token A balance
export const getTokenABalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let tokenAAddress: `0x${string}` = network.contracts.tokenA as `0x${string}`;

  const { data: balanceTokenA, refetch } = useReadContract({
    abi: erc20Abi,
    address: tokenAAddress,
    functionName: "balanceOf",
    args: [address],
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceTokenA) {
      setBalance(ethers.formatUnits(balanceTokenA, 18));
    }
  }, [balanceTokenA]);

  useWatchContractEvent({
    address: tokenAAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      console.log("Token A transfer event:", logs);
      refetch();
    },
  });

  return Number(balance).toFixed(4);
};

// Get Token B balance
export const getTokenBBalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let tokenBAddress: `0x${string}` = network.contracts.tokenB as `0x${string}`;

  const { data: balanceTokenB, refetch } = useReadContract({
    abi: erc20Abi,
    address: tokenBAddress,
    functionName: "balanceOf",
    args: [address],
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceTokenB) {
      setBalance(ethers.formatUnits(balanceTokenB, 18));
    }
  }, [balanceTokenB]);

  useWatchContractEvent({
    address: tokenBAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      console.log("Token B transfer event:", logs);
      refetch();
    },
  });

  return Number(balance).toFixed(4);
};

// Get DEX pool ratio for price calculation
export const getPoolRatio = () => {
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

  const { data: poolRatio } = useReadContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "getPoolRatio",
    chainId: chainId,
  });

  console.log("Pool Ratio:", poolRatio);

  return poolRatio ? Number(poolRatio) : 1;
};

// Get Token A price in Token B
export const getTokenAPrice = () => {
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;
  
  const { data: tokenAPrice } = useReadContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "getTokenAPrice",
    chainId: chainId,
  });

  console.log("Token A Price:", tokenAPrice);

  return tokenAPrice ? Number(tokenAPrice) : 1;
};

// Add liquidity to DEX pool
export const addLiquidity = (tokenAAmount: number, tokenBAmount: number) => {
  const chainId = useChainId();
  const network = getNetworkById(chainId);
  
  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;
  
  const { writeContract } = useWriteContract();

  const tokenA = ethers.parseUnits((tokenAAmount * 10 ** 18).toString(), "wei");
  const tokenB = ethers.parseUnits((tokenBAmount * 10 ** 18).toString(), "wei");

  console.log("Adding liquidity - Token A:", tokenA, "Token B:", tokenB);

  writeContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "addLiquidity",
    args: [tokenA, tokenB],
    chainId: chainId,
  });

  return;
};

// Remove liquidity from DEX pool
export const removeLiquidity = (liquidityAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

  const liquidity = ethers.parseUnits((liquidityAmount * 10 ** 18).toString(), "wei");

  console.log("Removing liquidity - LP tokens:", liquidity);

  writeContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "removeLiquidity",
    args: [liquidity],
    chainId: chainId,
  });

  return;
};

// Swap Token A for Token B
export const swapTokenAForB = (tokenAAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

  const tokenA = ethers.parseUnits((tokenAAmount * 10 ** 18).toString(), "wei");

  console.log("Swapping Token A for B:", tokenA);

  writeContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "swapTokenAForB",
    args: [tokenA],
    chainId: chainId,
  });

  return;
};

// Swap Token B for Token A  
export const swapTokenBForA = (tokenBAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();
  const network = getNetworkById(chainId);

  let dexRouterAddress: `0x${string}` = network.contracts.dexRouter as `0x${string}`;

  const tokenB = ethers.parseUnits((tokenBAmount * 10 ** 18).toString(), "wei");

  console.log("Swapping Token B for A:", tokenB);

  writeContract({
    abi: genericDexAbi,
    address: dexRouterAddress,
    functionName: "swapTokenBForA",
    args: [tokenB],
    chainId: chainId,
  });

  return;
};
