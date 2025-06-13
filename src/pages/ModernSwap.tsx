import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useNavigate } from "react-router-dom";
import { FaInfoCircle, FaArrowDown, FaCog } from "react-icons/fa";
import { IoSwapVertical, IoSettingsOutline } from "react-icons/io5";
import { MdKeyboardArrowDown, MdRefresh, MdTrendingUp } from "react-icons/md";
import { HiSparkles } from "react-icons/hi2";
import {
  useTokenABalance,
  useTokenBBalance,
  useTokenAPrice,
  useDexOperations,
} from "../utils/dexUtils";
import MainNavigation from "../components/MainNavigation";

const ModernSwap = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [swapAmountA, setSwapAmountA] = useState("");
  const [swapAmountB, setSwapAmountB] = useState("");
  const [isSwapReversed, setIsSwapReversed] = useState(false);
  const { isSuccess, error, isPending } = useWriteContract();
  const [selectedTokenA] = useState("TOKEN A");
  const [selectedTokenB] = useState("TOKEN B");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);

  // Use the correct hooks for token balances and operations
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const tokenAPrice = useTokenAPrice();
  const { swapTokenAForB, swapTokenBForA } = useDexOperations();

  // Auto-calculate output amount when input changes
  useEffect(() => {
    if (swapAmountA && !isSwapReversed) {
      const output = calculateEstimatedOutput(parseFloat(swapAmountA), true);
      setSwapAmountB(output.toFixed(6));
    } else if (swapAmountB && isSwapReversed) {
      const output = calculateEstimatedOutput(parseFloat(swapAmountB), false);
      setSwapAmountA(output.toFixed(6));
    }
  }, [swapAmountA, swapAmountB, isSwapReversed]);

  const handleSwap = () => {
    const amount = isSwapReversed ? parseFloat(swapAmountB) : parseFloat(swapAmountA);
    if (isSwapReversed) {
      swapTokenBForA(amount);
    } else {
      swapTokenAForB(amount);
    }
  };

  const handleReverseSwap = () => {
    setIsSwapReversed(!isSwapReversed);
    const tempA = swapAmountA;
    setSwapAmountA(swapAmountB);
    setSwapAmountB(tempA);
  };

  const calculateEstimatedOutput = (inputAmount: number, isAToB: boolean) => {
    const price = tokenAPrice;
    const slippagePercent = parseFloat(slippage) / 100;
    const feePercent = 0.003; // 0.3% fee
    
    if (isAToB) {
      return inputAmount * price * (1 - feePercent) * (1 - slippagePercent);
    } else {
      return (inputAmount / price) * (1 - feePercent) * (1 - slippagePercent);
    }
  };

  const getCurrentInputAmount = () => isSwapReversed ? parseFloat(swapAmountB) : parseFloat(swapAmountA);
  const getFromToken = () => isSwapReversed ? selectedTokenB : selectedTokenA;
  const getToToken = () => isSwapReversed ? selectedTokenA : selectedTokenB;
  const getFromBalance = () => isSwapReversed ? 
    (address ? tokenBBalance : "0.0000") : 
    (address ? tokenABalance : "0.0000");
  const getToBalance = () => isSwapReversed ? 
    (address ? tokenABalance : "0.0000") : 
    (address ? tokenBBalance : "0.0000");

  const getSwapButtonText = () => {
    if (!address) return "Connect Wallet";
    if (isPending) return "Swapping...";
    if (getCurrentInputAmount() <= 0) return "Enter Amount";
    return `Swap ${getFromToken()} for ${getToToken()}`;
  };

  const isSwapDisabled = !address || getCurrentInputAmount() <= 0 || isPending;

  const priceImpact = getCurrentInputAmount() > 1000 ? "0.12%" : "0.05%";
  const estimatedGas = "~$2.45";

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      <MainNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Swap Interface */}
          <div className="flex-1 max-w-lg mx-auto lg:mx-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl">
                  <IoSwapVertical className="text-white text-xl" />
                </div>
                <h1 className="text-2xl font-bold text-white">Swap Tokens</h1>
              </div>
              <p className="text-gray-400">Trade tokens with zero slippage and minimal fees</p>
            </div>

            {/* Swap Card */}
            <div className="glass-card p-6 space-y-4">
              {/* Settings Button */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <HiSparkles className="text-primary-400" />
                  <span className="text-sm font-medium text-gray-300">Best Route</span>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <IoSettingsOutline className="text-gray-400 hover:text-gray-200" />
                </button>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="glass-card p-4 space-y-4 animate-slide-down">
                  <h3 className="text-sm font-medium text-gray-200">Trading Settings</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Slippage Tolerance
                    </label>
                    <div className="flex space-x-2">
                      {["0.1", "0.5", "1.0"].map((value) => (
                        <button
                          key={value}
                          onClick={() => setSlippage(value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            slippage === value
                              ? "bg-primary-500 text-white"
                              : "bg-dark-800 text-gray-300 hover:bg-dark-700"
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="input-field w-20 text-center"
                        placeholder="Custom"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* From Token */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">From</span>
                  <span className="text-gray-400">
                    Balance: {getFromBalance()}
                  </span>
                </div>
                
                <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-600 focus-within:border-primary-500 transition-colors">
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={isSwapReversed ? swapAmountB : swapAmountA}
                      onChange={(e) => {
                        if (isSwapReversed) {
                          setSwapAmountB(e.target.value);
                        } else {
                          setSwapAmountA(e.target.value);
                        }
                      }}
                      placeholder="0.0"
                      className="bg-transparent text-2xl font-bold text-white placeholder:text-gray-500 outline-none flex-1"
                    />
                    
                    <div className="flex items-center space-x-3">
                      <button className="flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-2 rounded-xl transition-colors">
                        <div className="w-6 h-6 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"></div>
                        <span className="font-medium text-white">{getFromToken()}</span>
                        <MdKeyboardArrowDown className="text-gray-400" />
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (isSwapReversed) {
                            setSwapAmountB(getFromBalance());
                          } else {
                            setSwapAmountA(getFromBalance());
                          }
                        }}
                        className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleReverseSwap}
                  className="p-3 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-primary-500 rounded-full transition-all duration-200 group"
                >
                  <FaArrowDown className="text-gray-400 group-hover:text-primary-400 transition-colors" />
                </button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To</span>
                  <span className="text-gray-400">
                    Balance: {getToBalance()}
                  </span>
                </div>
                
                <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-600">
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={isSwapReversed ? swapAmountA : swapAmountB}
                      readOnly
                      placeholder="0.0"
                      className="bg-transparent text-2xl font-bold text-white placeholder:text-gray-500 outline-none flex-1"
                    />
                    
                    <button className="flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-2 rounded-xl transition-colors">
                      <div className="w-6 h-6 bg-gradient-to-r from-success-400 to-success-500 rounded-full"></div>
                      <span className="font-medium text-white">{getToToken()}</span>
                      <MdKeyboardArrowDown className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trading Info */}
              {getCurrentInputAmount() > 0 && (
                <div className="glass-card p-4 space-y-3 bg-primary-500/5 border border-primary-500/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Exchange Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white">1 {getFromToken()} = {tokenAPrice.toFixed(4)} {getToToken()}</span>
                      <MdRefresh className="text-gray-400 hover:text-primary-400 cursor-pointer transition-colors" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price Impact</span>
                    <span className={`${parseFloat(priceImpact) > 1 ? 'text-warning-400' : 'text-success-400'}`}>
                      {priceImpact}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Gas</span>
                    <span className="text-white">{estimatedGas}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Minimum Received</span>
                    <span className="text-white">
                      {(parseFloat(isSwapReversed ? swapAmountA : swapAmountB) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {getToToken()}
                    </span>
                  </div>
                </div>
              )}

              {/* Swap Button */}
              <button
                onClick={handleSwap}
                disabled={isSwapDisabled}
                className={`
                  w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200
                  ${
                    isSwapDisabled
                      ? "bg-dark-700 text-gray-500 cursor-not-allowed"
                      : "btn-primary hover:shadow-glow"
                  }
                `}
              >
                {getSwapButtonText()}
              </button>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <FaInfoCircle className="text-error-400" />
                    <span className="text-error-400 text-sm">
                      {error.message || "An error occurred during the swap"}
                    </span>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {isSuccess && (
                <div className="p-4 bg-success-500/10 border border-success-500/30 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <FaInfoCircle className="text-success-400" />
                    <span className="text-success-400 text-sm">
                      Swap completed successfully!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trading Information Sidebar */}
          <div className="lg:w-96 space-y-6">
            {/* Market Stats */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <MdTrendingUp className="text-primary-400" />
                <span>Market Overview</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume</span>
                  <span className="text-white font-medium">$2,845,290</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Fees</span>
                  <span className="text-success-400 font-medium">$8,535</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TVL</span>
                  <span className="text-white font-medium">$1.2M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">APY</span>
                  <span className="text-primary-400 font-medium">12.5%</span>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
              
              <div className="space-y-3">
                {[
                  { type: "Swap", amount: "100 TOKEN A", result: "245.67 TOKEN B", time: "2m ago" },
                  { type: "Swap", amount: "50 TOKEN B", result: "20.34 TOKEN A", time: "5m ago" },
                  { type: "Swap", amount: "200 TOKEN A", result: "491.23 TOKEN B", time: "8m ago" }
                ].map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-white">{trade.amount}</div>
                      <div className="text-xs text-gray-400">→ {trade.result}</div>
                    </div>
                    <div className="text-xs text-gray-400">{trade.time}</div>
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

export default ModernSwap;

