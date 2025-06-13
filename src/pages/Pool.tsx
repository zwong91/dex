import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useChainId, useReadContract, useWatchContractEvent } from "wagmi";
import MainNavigation from "../components/MainNavigation";
import Dropdown from "../components/Dropdown";
import { FaInfo, FaPlus, FaMinus, FaWallet, FaCheck } from "react-icons/fa";
import { MdTrendingUp, MdWaves } from "react-icons/md";
import { IoWater } from "react-icons/io5";
import { ethers } from "ethers";
import { 
  useTokenABalance, 
  useTokenBBalance, 
  useLiquidityTokenBalance,
  genericDexAbi 
} from "../utils/dexUtils";
import { erc20Abi } from "viem";
import { getNetworkById } from "../utils/dexConfig";

interface PositionData {
  id: string;
  pair: string;
  liquidity: string;
  value: string;
  apr: string;
  tokens: {
    tokenA: { symbol: string; amount: string };
    tokenB: { symbol: string; amount: string };
  };
}

interface AssetData {
  symbol: string;
  balance: string;
  value: string;
  change24h: string;
  icon: string;
}

const Pool = () => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"positions" | "assets" | "manage">("positions");
  
  // Liquidity management states
  const [tokenADepositAmount, setTokenADepositAmount] = useState(0);
  const [tokenBDepositAmount, setTokenBDepositAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  // Use the correct hooks for token balances
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const liquidityTokenBalance = useLiquidityTokenBalance(address);

  let { writeContract, isSuccess, error, isPending } = useWriteContract();

  const chainId = useChainId();
  const network = getNetworkById(chainId);

  // Network-specific contract addresses
  const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
  const tokenAAddress = network.contracts.tokenA as `0x${string}`;
  const tokenBAddress = network.contracts.tokenB as `0x${string}`;

  // Get allowances for both tokens
  const { data: allowanceTokenA, refetch: refetchTokenA } = useReadContract({
    abi: erc20Abi,
    address: tokenAAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });

  const { data: allowanceTokenB, refetch: refetchTokenB } = useReadContract({
    abi: erc20Abi,
    address: tokenBAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });

  // Watch for approval events
  useWatchContractEvent({
    address: tokenAAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetchTokenA();
      }
    },
  });

  useWatchContractEvent({
    address: tokenBAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetchTokenB();
      }
    },
  });

  let tokenA_allowance;
  let tokenB_allowance;

  if (allowanceTokenA) {
    tokenA_allowance = ethers.formatUnits(allowanceTokenA!, 18);
  } else {
    tokenA_allowance = 0;
  }

  if (allowanceTokenB) {
    tokenB_allowance = ethers.formatUnits(allowanceTokenB!, 18);
  } else {
    tokenB_allowance = 0;
  }

  useEffect(() => {
    if (allowanceTokenB) {
      tokenB_allowance = ethers.formatUnits(allowanceTokenB!, 18);
    } else {
      tokenB_allowance = 0;
    }
  }, [allowanceTokenB]);

  useEffect(() => {
    if (allowanceTokenA) {
      tokenA_allowance = ethers.formatUnits(allowanceTokenA!, 18);
    } else {
      tokenA_allowance = 0;
    }
  }, [allowanceTokenA]);

  const approveTokenBSpender = () => {
    writeContract({
      abi: erc20Abi,
      address: tokenBAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  const approveTokenASpender = () => {
    writeContract({
      abi: erc20Abi,
      address: tokenAAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  const depositLiquidity = (tokenAAmount: number, tokenBAmount: number) => {
    const tokenA = ethers.parseUnits(tokenAAmount.toString(), "ether");
    let tokenB = ethers.parseUnits(tokenBAmount.toString(), "ether");

    console.log("tokenA", tokenA, "tokenB", tokenB);

    writeContract({
      abi: genericDexAbi,
      address: dexRouterAddress,
      functionName: "addLiquidity",
      args: [tokenA, tokenB],
      chainId: chainId,
    });
  };

  const handleDeposit = () => {
    depositLiquidity(tokenADepositAmount, tokenBDepositAmount);
  };

  const withdrawLiquidity = (liquidityAmount: number) => {
    const liquidity = ethers.parseUnits(liquidityAmount.toString(), "ether");

    console.log("liquidity", liquidity);

    writeContract({
      abi: genericDexAbi,
      address: dexRouterAddress,
      functionName: "removeLiquidity",
      args: [liquidity],
      chainId: chainId,
    });

    return;
  };

  const handleWithdrawal = () => {
    withdrawLiquidity(withdrawalAmount);
  };

  // Mock data for user positions
  const [positions] = useState<PositionData[]>([
    {
      id: "1",
      pair: "BNB/USDC",
      liquidity: "0.5 LP",
      value: "$150.00",
      apr: "12.5%",
      tokens: {
        tokenA: { symbol: "BNB", amount: "0.45" },
        tokenB: { symbol: "USDC", amount: "104.25" }
      }
    },
    {
      id: "2", 
      pair: "USDC/USDT",
      liquidity: "500 LP",
      value: "$500.00",
      apr: "8.2%",
      tokens: {
        tokenA: { symbol: "USDC", amount: "250.00" },
        tokenB: { symbol: "USDT", amount: "250.00" }
      }
    }
  ]);

  // Mock data for user assets
  const [assets] = useState<AssetData[]>([
    { symbol: "BNB", balance: "2.5", value: "$650.00", change24h: "+2.4%", icon: "🟡" },
    { symbol: "USDC", balance: "1,250.00", value: "$1,250.00", change24h: "+0.1%", icon: "🔵" },
    { symbol: "USDT", balance: "800.00", value: "$800.00", change24h: "0.0%", icon: "🟢" },
    { symbol: "ETH", balance: "0.75", value: "$1,875.00", change24h: "+1.8%", icon: "⚪" },
  ]);

  const totalPortfolioValue = assets.reduce((total, asset) => {
    return total + parseFloat(asset.value.replace('$', '').replace(',', ''));
  }, 0);

  const totalLiquidityValue = positions.reduce((total, position) => {
    return total + parseFloat(position.value.replace('$', '').replace(',', ''));
  }, 0);

  const handleClosePosition = (position: PositionData) => {
    console.log("Closing position for:", position);
    // Close position logic here
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
        <MainNavigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="mb-6">
              <IoWater size={64} className="mx-auto text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view your liquidity positions and assets
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Messages */}
        <div className="mb-6">
          {error && (
            <div className="glass-card p-4 mb-4 border-l-4 border-red-500">
              <p className="text-red-400">Error: {error.message}</p>
            </div>
          )}
          {isSuccess && (
            <div className="glass-card p-4 mb-4 border-l-4 border-green-500">
              <p className="text-green-400">Transaction successful!</p>
            </div>
          )}
          {isPending && (
            <div className="glass-card p-4 mb-4 border-l-4 border-yellow-500">
              <p className="text-yellow-400">Transaction pending...</p>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <IoWater className="text-primary-400" />
            Pool & Portfolio
          </h1>
          <p className="text-gray-400">
            Manage your liquidity positions and track your DeFi assets
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary-500/20 to-primary-600/20">
                  <FaWallet className="text-primary-400" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Total Portfolio</h3>
                  <p className="text-gray-400 text-sm">All assets value</p>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalPortfolioValue.toLocaleString()}
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-success-500/20 to-success-600/20">
                  <IoWater className="text-success-400" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Total Liquidity</h3>
                  <p className="text-gray-400 text-sm">Active positions</p>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalLiquidityValue.toLocaleString()}
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-accent-500/20 to-accent-600/20">
                  <MdTrendingUp className="text-accent-400" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Average APR</h3>
                  <p className="text-gray-400 text-sm">Weighted average</p>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {positions.length > 0 ? "10.35%" : "0%"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 p-1 bg-gray-900/50 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("positions")}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "positions"
                  ? "bg-primary-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              Liquidity Positions
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "manage"
                  ? "bg-primary-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              Manage Liquidity
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "assets"
                  ? "bg-primary-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              Portfolio Assets
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "positions" ? (
          <div>
            {/* Add Liquidity Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your Liquidity Positions</h2>
              <button
                onClick={() => setActiveTab("manage")}
                className="btn-primary flex items-center gap-2"
              >
                <FaPlus size={14} />
                Manage Liquidity
              </button>
            </div>

            {/* Positions List */}
            {positions.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="mb-6">
                  <IoWater size={48} className="mx-auto text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Liquidity Positions</h3>
                <p className="text-gray-400 mb-6">
                  Start providing liquidity to earn fees and rewards
                </p>
                <button onClick={() => setActiveTab("manage")} className="btn-primary">
                  Add Your First Position
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => (
                  <div key={position.id} className="glass-card p-6 hover:bg-gray-800/30 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                            <MdWaves className="text-white" size={16} />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{position.pair}</h3>
                            <p className="text-gray-400 text-sm">{position.liquidity}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-white font-semibold">{position.value}</p>
                          <p className="text-success-400 text-sm">{position.apr} APR</p>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveTab("manage")}
                            className="btn-secondary-sm"
                          >
                            <FaPlus size={12} />
                          </button>
                          <button 
                            onClick={() => handleClosePosition(position)}
                            className="btn-outline-sm"
                          >
                            <FaMinus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Token A</p>
                          <p className="text-white">
                            {position.tokens.tokenA.amount} {position.tokens.tokenA.symbol}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Token B</p>
                          <p className="text-white">
                            {position.tokens.tokenB.amount} {position.tokens.tokenB.symbol}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "manage" ? (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Manage Liquidity</h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Add Liquidity Section */}
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FaPlus className="text-success-400" />
                  Add Liquidity
                </h3>
                
                <div className="space-y-4">
                  <Dropdown label="Trading Pair" asset="Token A : Token B Pair" />

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount in Token A:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.0"
                      onChange={(e) => setTokenADepositAmount(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount in Token B:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.0"
                      onChange={(e) => setTokenBDepositAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Available:</span>
                      <div className="text-right">
                        <p className="text-gray-300 text-sm">{tokenABalance} TOKEN A</p>
                        <p className="text-gray-300 text-sm">{tokenBBalance} TOKEN B</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Allowance:</span>
                      <div className="text-right">
                        <p className="text-gray-300 text-sm">
                          {Number(tokenA_allowance?.toString()).toFixed(4)} TOKEN A
                        </p>
                        <p className="text-gray-300 text-sm">
                          {Number(tokenB_allowance?.toString()).toFixed(4)} TOKEN B
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={approveTokenASpender}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                    >
                      <FaCheck size={12} />
                      Approve Token A
                    </button>
                    <button
                      onClick={approveTokenBSpender}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                    >
                      <FaCheck size={12} />
                      Approve Token B
                    </button>
                  </div>

                  <button
                    className="w-full btn-primary"
                    onClick={handleDeposit}
                  >
                    Add Liquidity
                  </button>
                </div>
              </div>

              {/* Remove Liquidity Section */}
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FaMinus className="text-red-400" />
                  Remove Liquidity
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      LP Token Amount:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.0"
                      onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Available LP:</span>
                      <span className="text-gray-300">{liquidityTokenBalance} LP</span>
                    </div>
                  </div>

                  <button
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    onClick={handleWithdrawal}
                  >
                    Remove Liquidity
                  </button>
                </div>
              </div>

              {/* Network & Faucet Section */}
              <div className="glass-card p-6 lg:col-span-2">
                <h3 className="text-white font-semibold mb-4">Network Information</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network:</span>
                      <span className="text-white">{network.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chain ID:</span>
                      <span className="text-white">{chainId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Currency:</span>
                      <span className="text-white">{network.nativeCurrency.symbol}</span>
                    </div>
                  </div>
                  
                  {network.faucet?.enabled && (
                    <div>
                      <button
                        className="w-full btn-primary"
                        onClick={async () => {
                          if (!address) return;
                          
                          const url = `${network.faucet.endpoint}/${address}`;
                          setIsRequesting(true);

                          try {
                            const response = await fetch(url);
                            if (!response.ok) {
                              throw new Error(`Response status: ${response.status}`);
                            }
                            const json = await response.json();
                            setIsRequesting(false);
                            alert(`Faucet request successful: ${JSON.stringify(json)}`);
                          } catch (error: any) {
                            console.error(error.message);
                            setIsRequesting(false);
                            alert(`Faucet error: ${error.message}`);
                          }
                        }}
                      >
                        {isRequesting ? "Requesting..." : "Request Test Tokens"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Portfolio Assets */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Portfolio Assets</h2>
            </div>

            <div className="space-y-4">
              {assets.map((asset, index) => (
                <div key={index} className="glass-card p-6 hover:bg-gray-800/30 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                        {asset.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{asset.symbol}</h3>
                        <p className="text-gray-400 text-sm">{asset.balance} {asset.symbol}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-white font-semibold">{asset.value}</p>
                      <p className={`text-sm ${
                        asset.change24h.startsWith('+') ? 'text-success-400' : 
                        asset.change24h.startsWith('-') ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {asset.change24h}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pool;
