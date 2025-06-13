import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import MainNavigation from "../components/MainNavigation";
import { FaPlus, FaMinus, FaInfo } from "react-icons/fa";
import { MdTrendingUp, MdWaves } from "react-icons/md";
import { IoSwapVertical } from "react-icons/io5";

interface LiquidityPosition {
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

interface PopularPool {
  pair: string;
  apr: string;
  volume24h: string;
  tvl: string;
  tokens: { symbolA: string; symbolB: string };
}

const ModernLiquidity = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  
  // State for liquidity management
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");
  const [tokenAAmount, setTokenAAmount] = useState("");
  const [tokenBAmount, setTokenBAmount] = useState("");
  const [selectedTokenA, setSelectedTokenA] = useState("BNB");
  const [selectedTokenB, setSelectedTokenB] = useState("USDC");
  const [isApproved, setIsApproved] = useState(false);

  // Mock data for user positions
  const [liquidityPositions] = useState<LiquidityPosition[]>([
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

  // Mock data for popular pools
  const [popularPools] = useState<PopularPool[]>([
    {
      pair: "BNB/USDC",
      apr: "18.2%",
      volume24h: "$125k",
      tvl: "$2.1M",
      tokens: { symbolA: "BNB", symbolB: "USDC" }
    },
    {
      pair: "USDC/USDT",
      apr: "12.5%",
      volume24h: "$89k", 
      tvl: "$1.8M",
      tokens: { symbolA: "USDC", symbolB: "USDT" }
    },
    {
      pair: "ETH/BNB",
      apr: "22.8%",
      volume24h: "$67k",
      tvl: "$1.2M", 
      tokens: { symbolA: "ETH", symbolB: "BNB" }
    }
  ]);

  const handleAddLiquidity = () => {
    console.log("Adding liquidity:", { tokenAAmount, tokenBAmount, selectedTokenA, selectedTokenB });
    // Add liquidity logic here
  };

  const handleRemoveLiquidity = (position: LiquidityPosition) => {
    console.log("Removing liquidity for:", position);
    // Remove liquidity logic here
  };

  const handleApproveTokens = () => {
    console.log("Approving tokens...");
    setIsApproved(true);
    // Approval logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      {/* Header Section */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#fafafa] mb-4">Liquidity</h1>
          <p className="text-[#717A8C] text-lg">
            Add liquidity to earn fees on swaps
          </p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">{/* Left Panel - Add/Remove Liquidity */}
          <div className="xl:col-span-1">
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">{/* Tab Selector */}
              <div className="flex bg-[#252b36] rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab("add")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                    activeTab === "add"
                      ? "bg-[#516AE4] text-white shadow-lg"
                      : "text-[#717A8C] hover:text-[#fafafa]"
                  }`}
                >
                  <FaPlus size={16} />
                  Add Liquidity
                </button>
                <button
                  onClick={() => setActiveTab("remove")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                    activeTab === "remove"
                      ? "bg-[#516AE4] text-white shadow-lg"
                      : "text-[#717A8C] hover:text-[#fafafa]"
                  }`}
                >
                  <FaMinus size={16} />
                  Remove Liquidity
                </button>
              </div>

              {activeTab === "add" && (
                <div>
                  <h2 className="text-xl font-bold text-[#fafafa] mb-6">Add Liquidity</h2>
                  
                  {/* Token A Input */}
                  <div className="mb-4">
                    <label className="text-[#717A8C] text-sm font-medium mb-2 block">Token A</label>
                    <div className="bg-[#252b36] border border-[#3a4553] rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#717A8C] text-sm">Balance: 0.00</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          placeholder="0.0"
                          value={tokenAAmount}
                          onChange={(e) => setTokenAAmount(e.target.value)}
                          className="flex-1 bg-transparent text-[#fafafa] text-2xl font-bold placeholder-[#717A8C] border-none outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                          <select
                            value={selectedTokenA}
                            onChange={(e) => setSelectedTokenA(e.target.value)}
                            className="bg-[#1a1f2a] border border-[#3a4553] text-[#fafafa] px-3 py-2 rounded-lg font-medium hover:border-[#516AE4] transition-colors"
                          >
                            <option value="BNB">BNB</option>
                            <option value="ETH">ETH</option>
                            <option value="USDC">USDC</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plus Icon */}
                  <div className="flex justify-center my-4">
                    <div className="bg-[#252b36] border border-[#3a4553] p-2 rounded-lg">
                      <FaPlus className="text-[#717A8C]" />
                    </div>
                  </div>

                  {/* Token B Input */}
                  <div className="mb-6">
                    <label className="text-[#717A8C] text-sm font-medium mb-2 block">Token B</label>
                    <div className="bg-[#252b36] border border-[#3a4553] rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#717A8C] text-sm">Balance: 0.00</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          placeholder="0.0"
                          value={tokenBAmount}
                          onChange={(e) => setTokenBAmount(e.target.value)}
                          className="flex-1 bg-transparent text-[#fafafa] text-2xl font-bold placeholder-[#717A8C] border-none outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                          <select
                            value={selectedTokenB}
                            onChange={(e) => setSelectedTokenB(e.target.value)}
                            className="bg-[#1a1f2a] border border-[#3a4553] text-[#fafafa] px-3 py-2 rounded-lg font-medium hover:border-[#516AE4] transition-colors"
                          >
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                            <option value="BNB">BNB</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isApproved ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleApproveTokens}
                        className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl border border-yellow-500/20 font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                      >
                        🔐 Approve {selectedTokenA}
                      </button>
                      <button
                        disabled
                        className="w-full py-4 bg-[#3a4553] text-[#717A8C] rounded-xl font-semibold cursor-not-allowed"
                      >
                        🔐 Approve {selectedTokenB}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddLiquidity}
                      disabled={!tokenAAmount || !tokenBAmount}
                      className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg ${
                        tokenAAmount && tokenBAmount
                          ? "bg-gradient-to-r from-[#516AE4] to-[#7c3aed] hover:from-[#4056d6] hover:to-[#6d28d9] text-white"
                          : "bg-[#3a4553] text-[#717A8C] cursor-not-allowed"
                      }`}
                    >
                      💧 Add {selectedTokenA}-{selectedTokenB} Liquidity
                    </button>
                  )}
                </div>
              )}

              {activeTab === "remove" && (
                <div>
                  <h2 className="text-xl font-bold text-[#fafafa] mb-6">Remove Liquidity</h2>
                  <div className="text-center py-8">
                    <MdWaves className="text-6xl text-[#717A8C] mx-auto mb-4" />
                    <p className="text-[#717A8C]">Select a position from the right panel to remove liquidity</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Positions and Pools */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Your Liquidity Positions */}
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-[#fafafa] mb-6">Your Liquidity Positions</h2>
              
              {liquidityPositions.length === 0 ? (
                <div className="text-center py-8">
                  <MdWaves className="text-6xl text-[#717A8C] mx-auto mb-4" />
                  <p className="text-[#717A8C]">No liquidity positions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liquidityPositions.map((position) => (
                    <div key={position.id} className="bg-[#252b36] border border-[#3a4553] rounded-xl p-6 hover:border-[#516AE4] transition-all duration-200 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {position.tokens.tokenA.symbol.charAt(0)}
                            </div>
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full -ml-2 flex items-center justify-center text-white font-bold text-sm">
                              {position.tokens.tokenB.symbol.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#fafafa]">{position.pair}</h3>
                            <p className="text-[#717A8C] text-sm">Liquidity: {position.liquidity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#fafafa]">{position.value}</div>
                          <div className="text-green-400 font-semibold text-sm">APR: {position.apr}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#1a1f2a] rounded-lg p-3 border border-[#3a4553]">
                          <div className="text-[#717A8C] text-sm">{position.tokens.tokenA.symbol}</div>
                          <div className="text-[#fafafa] font-semibold">{position.tokens.tokenA.amount}</div>
                        </div>
                        <div className="bg-[#1a1f2a] rounded-lg p-3 border border-[#3a4553]">
                          <div className="text-[#717A8C] text-sm">{position.tokens.tokenB.symbol}</div>
                          <div className="text-[#fafafa] font-semibold">{position.tokens.tokenB.amount}</div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 py-3 bg-[#516AE4] hover:bg-[#4056d6] text-white rounded-xl font-semibold transition-all duration-200 transform group-hover:scale-[1.02]">
                          ➕ Add More
                        </button>
                        <button 
                          onClick={() => handleRemoveLiquidity(position)}
                          className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 transform group-hover:scale-[1.02]"
                        >
                          ➖ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Pools */}
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-[#fafafa] mb-6">Popular Pools</h2>
              
              <div className="space-y-4">
                {popularPools.map((pool, index) => (
                  <div key={index} className="bg-[#252b36] border border-[#3a4553] rounded-xl p-6 hover:border-[#516AE4] transition-all duration-200 cursor-pointer group transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                            {pool.tokens.symbolA.charAt(0)}
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full -ml-3 flex items-center justify-center text-white font-bold border-2 border-[#252b36]">
                            {pool.tokens.symbolB.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#fafafa] group-hover:text-[#516AE4] transition-colors">{pool.pair}</h3>
                          <p className="text-[#717A8C] text-sm">24h Volume: {pool.volume24h}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-xl">{pool.apr} APR</div>
                        <div className="text-[#717A8C] text-sm">{pool.tvl} TVL</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[#3a4553]">
                      <div className="flex items-center gap-2 text-[#717A8C] text-sm">
                        <MdTrendingUp className="text-green-400" />
                        <span>High volume pool</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedTokenA(pool.tokens.symbolA);
                          setSelectedTokenB(pool.tokens.symbolB);
                          setActiveTab("add");
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-[#516AE4] to-[#7c3aed] hover:from-[#4056d6] hover:to-[#6d28d9] text-white rounded-lg font-medium transition-all duration-200 transform group-hover:scale-105 shadow-lg"
                      >
                        💧 Add Liquidity
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLiquidity;
