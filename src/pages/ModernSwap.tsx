import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useNavigate } from "react-router-dom";
import { FaInfoCircle } from "react-icons/fa";
import { IoSwapVertical } from "react-icons/io5";
import { MdKeyboardArrowDown, MdSettings } from "react-icons/md";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      {/* Navigation */}
      <MainNavigation />
      
      <div className="flex justify-center items-center py-8 px-5">
        <div className="w-full max-w-lg">
          {/* Main Swap Card */}
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          {/* Header with Settings */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#fafafa]">Exchange</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-[#252b36] rounded-lg transition-colors"
            >
              <MdSettings 
                size={18} 
                color="#717A8C" 
                className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-[#161d29] border border-[#3a4553] rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#fafafa] font-medium">Slippage Tolerance</span>
                <div className="flex items-center gap-2">
                  {["0.1", "0.5", "1.0"].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        slippage === value
                          ? "bg-[#516AE4] text-white"
                          : "bg-[#252b36] text-[#717A8C] hover:bg-[#2d3440]"
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-16 px-2 py-1 bg-[#252b36] border border-[#3a4553] rounded-lg text-[#fafafa] text-sm text-center"
                    step="0.1"
                    min="0.1"
                    max="5"
                  />
                  <span className="text-[#717A8C] text-sm">%</span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-red-400" />
                <p className="text-red-300 text-sm">Transaction failed: {error.message}</p>
              </div>
            </div>
          )}
          {isSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-green-400" />
                <p className="text-green-300 text-sm">Transaction successful!</p>
              </div>
            </div>
          )}
          {isPending && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-yellow-300 text-sm">Transaction pending...</p>
              </div>
            </div>
          )}

          <div className="relative">
            {/* From Token */}
            <div className="bg-[#252b36] border border-[#3a4553] rounded-2xl p-4 mb-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[#717A8C] text-sm font-medium">From</span>
                <span className="text-[#717A8C] text-sm">
                  Balance: {getFromBalance()} {getFromToken()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0.0"
                  value={isSwapReversed ? swapAmountB : swapAmountA}
                  onChange={(e) => isSwapReversed ? setSwapAmountB(e.target.value) : setSwapAmountA(e.target.value)}
                  className="flex-1 bg-transparent text-[#fafafa] text-2xl font-semibold placeholder-[#717A8C] border-none outline-none"
                />
                <button className="flex items-center gap-2 bg-[#1a1f2a] hover:bg-[#161d29] border border-[#3a4553] px-4 py-2 rounded-xl transition-colors">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <span className="text-[#fafafa] font-medium">{getFromToken()}</span>
                  <MdKeyboardArrowDown className="text-[#717A8C]" />
                </button>
              </div>
            </div>

            {/* Swap Icon */}
            <div className="flex justify-center relative z-10">
              <button
                onClick={handleReverseSwap}
                className="bg-[#1a1f2a] border-2 border-[#516AE4] hover:bg-[#516AE4] p-2 rounded-xl transition-all duration-200 transform hover:scale-110"
              >
                <IoSwapVertical size={20} className="text-[#fafafa]" />
              </button>
            </div>

            {/* To Token */}
            <div className="bg-[#252b36] border border-[#3a4553] rounded-2xl p-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[#717A8C] text-sm font-medium">To</span>
                <span className="text-[#717A8C] text-sm">
                  Balance: {getToBalance()} {getToToken()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[#fafafa] text-2xl font-semibold">
                    {isSwapReversed ? swapAmountA || "0.0" : swapAmountB || "0.0"}
                  </div>
                </div>
                <button className="flex items-center gap-2 bg-[#1a1f2a] hover:bg-[#161d29] border border-[#3a4553] px-4 py-2 rounded-xl transition-colors">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full"></div>
                  <span className="text-[#fafafa] font-medium">{getToToken()}</span>
                  <MdKeyboardArrowDown className="text-[#717A8C]" />
                </button>
              </div>
            </div>
          </div>

          {/* Swap Details */}
          {getCurrentInputAmount() > 0 && (
            <div className="bg-[#161d29] border border-[#3a4553] rounded-xl p-4 mt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#717A8C]">
                  <span>Exchange Rate:</span>
                  <span className="text-[#fafafa]">
                    1 {getFromToken()} = {tokenAPrice.toFixed(6)} {getToToken()}
                  </span>
                </div>
                <div className="flex justify-between text-[#717A8C]">
                  <span>Trading Fee (0.3%):</span>
                  <span className="text-[#fafafa]">
                    {(getCurrentInputAmount() * 0.003).toFixed(6)} {getFromToken()}
                  </span>
                </div>
                <div className="flex justify-between text-[#717A8C]">
                  <span>Slippage Tolerance:</span>
                  <span className="text-[#fafafa]">{slippage}%</span>
                </div>
                <div className="flex justify-between text-[#717A8C]">
                  <span>Minimum Received:</span>
                  <span className="text-[#fafafa]">
                    {(calculateEstimatedOutput(getCurrentInputAmount(), !isSwapReversed)).toFixed(6)} {getToToken()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            className={`w-full py-4 rounded-2xl font-semibold text-lg mt-6 transition-all duration-200 ${
              isSwapDisabled
                ? "bg-[#3a4553] text-[#717A8C] cursor-not-allowed"
                : "bg-gradient-to-r from-[#516AE4] to-[#7c3aed] hover:from-[#4056d6] hover:to-[#6d28d9] text-white shadow-lg transform hover:scale-[1.02]"
            }`}
            onClick={handleSwap}
            disabled={isSwapDisabled}
          >
            {getSwapButtonText()}
          </button>

          {/* Additional Actions */}
          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 py-3 bg-[#252b36] hover:bg-[#2d3440] text-[#fafafa] rounded-xl border border-[#3a4553] transition-colors"
              onClick={() => navigate("/liquidity")}
            >
              Add Liquidity
            </button>
            <button
              className="flex-1 py-3 bg-[#252b36] hover:bg-[#2d3440] text-[#fafafa] rounded-xl border border-[#3a4553] transition-colors"
              onClick={() => navigate("/analytics")}
            >
              View Analytics
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernSwap;
