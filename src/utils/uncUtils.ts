import { erc20Abi } from "viem";
import * as ethers from "ethers";
import { useChainId, useReadContract, useWatchContractEvent } from "wagmi";
import { useWriteContract } from "wagmi";
import { uncSwapAbi } from "./abis/uncSwap";
import { useEffect, useState } from "react";
import { BSC_NETWORKS } from "./wagmiConfig";

// Check allowances for UNC DEX trading
export const checkAllowance = (address: `0x${string}`, chainId: number) => {
  // BSC Network Configuration
  let UNCAddress: `0x${string}`;
  let PairedTokenAddress: `0x${string}`;
  let uncSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
    PairedTokenAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCAddress = BSC_NETWORKS.mainnet.contracts.uncToken as `0x${string}`;
    PairedTokenAddress = BSC_NETWORKS.mainnet.contracts.pairedToken as `0x${string}`;
    uncSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet for unsupported chains
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
    PairedTokenAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  let { writeContract } = useWriteContract();

  const { data: allowancePaired } = useReadContract({
    abi: erc20Abi,
    address: PairedTokenAddress,
    functionName: "allowance",
    args: [address!, uncSwapAddress],
    account: address,
    chainId: chainId,
  });
  
  const { data: allowanceUNC } = useReadContract({
    abi: erc20Abi,
    address: UNCAddress,
    functionName: "allowance",
    args: [address!, uncSwapAddress],
    account: address,
    chainId: chainId,
  });

  let UNC_allowance = allowanceUNC;
  let Paired_allowance = allowancePaired;

  console.log("UNC allowance", UNC_allowance);
  console.log("Paired token allowance", Paired_allowance);

  if (Paired_allowance == BigInt(0)) {
    writeContract({
      abi: erc20Abi,
      address: PairedTokenAddress,
      functionName: "approve",
      args: [uncSwapAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  }
  if (UNC_allowance == BigInt(0)) {
    writeContract({
      abi: erc20Abi,
      address: UNCAddress,
      functionName: "approve",
      args: [uncSwapAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  }
};

// Get UNC Liquidity Token balance
export const getUNCLTBalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();

  let UNCLTAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCLTAddress = BSC_NETWORKS.testnet.contracts.uncLiquidityToken as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCLTAddress = BSC_NETWORKS.mainnet.contracts.uncLiquidityToken as `0x${string}`;
  } else {
    // Default to testnet
    UNCLTAddress = BSC_NETWORKS.testnet.contracts.uncLiquidityToken as `0x${string}`;
  }

  const { data: balanceUNCLT, refetch } = useReadContract({
    abi: erc20Abi,
    address: UNCLTAddress,
    functionName: "balanceOf",
    args: [address],
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceUNCLT) {
      setBalance(ethers.formatUnits(balanceUNCLT, 18));
    }
  }, [balanceUNCLT]);

  useWatchContractEvent({
    address: UNCLTAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      const relevantLog = logs.find(
        (log) => log.args.from === address || log.args.to === address
      );
      if (relevantLog) {
        refetch();
      }
    },
  });

  return Number(balance).toFixed(4);
};

// Get UNC token balance
export const getUNCBalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();

  let UNCAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCAddress = BSC_NETWORKS.mainnet.contracts.uncToken as `0x${string}`;
  } else {
    // Default to testnet
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
  }

  const { data: balanceUNC, refetch } = useReadContract({
    abi: erc20Abi,
    address: UNCAddress,
    functionName: "balanceOf",
    args: [address],
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceUNC) {
      setBalance(ethers.formatUnits(balanceUNC, 18));
    }
  }, [balanceUNC]);

  useWatchContractEvent({
    address: UNCAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      const relevantLog = logs.find(
        (log) => log.args.from === address || log.args.to === address
      );
      if (relevantLog) {
        refetch();
      }
    },
  });

  return Number(balance).toFixed(4);
};

// Get paired token balance (USDT, USDC, etc.)
export const getPairedTokenBalance = (address: `0x${string}`) => {
  const [balance, setBalance] = useState<string>("0");
  const chainId = useChainId();

  let PairedTokenAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    PairedTokenAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    PairedTokenAddress = BSC_NETWORKS.mainnet.contracts.pairedToken as `0x${string}`;
  } else {
    // Default to testnet
    PairedTokenAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
  }

  const { data: balancePaired, refetch } = useReadContract({
    abi: erc20Abi,
    address: PairedTokenAddress,
    functionName: "balanceOf",
    args: [address],
    account: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balancePaired) {
      setBalance(ethers.formatUnits(balancePaired, 18));
    }
  }, [balancePaired]);

  useWatchContractEvent({
    address: PairedTokenAddress,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      const relevantLog = logs.find(
        (log) => log.args.from === address || log.args.to === address
      );
      if (relevantLog) {
        refetch();
      }
    },
  });

  return Number(balance).toFixed(4);
};

// Get DEX pool ratio for price calculation
export const getPoolRatio = () => {
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  const { data: poolRatio } = useReadContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "getPoolRatio",
    chainId: chainId,
  });

  console.log("Pool Ratio:", poolRatio);

  return poolRatio ? Number(poolRatio) : 1;
};

// Get UNC token price in paired token
export const getUNCPrice = () => {
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }
  
  const { data: uncPrice } = useReadContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "getUNCTokenPrice",
    chainId: chainId,
  });

  console.log("UNC Price:", uncPrice);

  return uncPrice ? Number(uncPrice) : 1;
};

// Add liquidity to UNC DEX pool
export const addLiquidity = (uncAmount: number, pairedAmount: number) => {
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }
  
  const { writeContract } = useWriteContract();

  const unc = ethers.parseUnits((uncAmount * 10 ** 18).toString(), "wei");
  const paired = ethers.parseUnits((pairedAmount * 10 ** 18).toString(), "wei");

  console.log("Adding liquidity - UNC:", unc, "Paired:", paired);

  writeContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "addLiquidity",
    args: [unc, paired],
    chainId: chainId,
  });

  return;
};

// Remove liquidity from UNC DEX pool
export const removeLiquidity = (uncltAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  const unclt = ethers.parseUnits((uncltAmount * 10 ** 18).toString(), "wei");

  console.log("Removing liquidity - UNCLT:", unclt);

  writeContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "removeLiquidity",
    args: [unclt],
    chainId: chainId,
  });

  return;
};

// Swap UNC tokens for paired tokens
export const swapUNC = (uncAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  const unc = ethers.parseUnits((uncAmount * 10 ** 18).toString(), "wei");

  console.log("Swapping UNC:", unc);

  writeContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "swapUNC",
    args: [unc],
    chainId: chainId,
  });

  return;
};

// Swap paired tokens for UNC tokens
export const swapToUNC = (pairedAmount: number) => {
  const { writeContract } = useWriteContract();
  const chainId = useChainId();

  let UNCSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    UNCSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    UNCSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  const paired = ethers.parseUnits((pairedAmount * 10 ** 18).toString(), "wei");

  console.log("Swapping to UNC:", paired);

  writeContract({
    abi: uncSwapAbi,
    address: UNCSwapAddress,
    functionName: "swapToUNC",
    args: [paired],
    chainId: chainId,
  });

  return;
};
