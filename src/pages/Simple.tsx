import { useState } from "react";
import { useAccount, useWriteContract, useChainId } from "wagmi";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaCog } from "react-icons/fa";
import { IoSwapVertical } from "react-icons/io5";
import {
  getTokenABalance,
  getTokenBBalance,
  getTokenAPrice,
  swapTokenAForB,
  swapTokenBForA,
} from "../utils/dexUtils";
import { getNetworkById } from "../utils/dexConfig";

const Simple = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [swapAmountA, setSwapAmountA] = useState(0);
  const [swapAmountB, setSwapAmountB] = useState(0);
  const [isSwapReversed, setIsSwapReversed] = useState(false);
  const { isSuccess, error, isPending } = useWriteContract();
  const [selectedTokenA] = useState("TOKEN A");
  const [selectedTokenB] = useState("TOKEN B");

  const chainId = useChainId();
  const network = getNetworkById(chainId);

  const handleSwap = () => {
    if (isSwapReversed) {
      swapTokenBForA(swapAmountB);
    } else {
      swapTokenAForB(swapAmountA);
    }
  };

  const handleReverseSwap = () => {
    setIsSwapReversed(!isSwapReversed);
    setSwapAmountA(swapAmountB);
    setSwapAmountB(swapAmountA);
  };

  const calculateEstimatedOutput = (inputAmount: number, isAToB: boolean) => {
    // Simple estimation - in real implementation, this would call contract view functions
    const price = getTokenAPrice();
    if (isAToB) {
      return inputAmount * price * 0.997; // 0.3% fee
    } else {
      return (inputAmount / price) * 0.997; // 0.3% fee
    }
  };

  const getCurrentInputAmount = () => isSwapReversed ? swapAmountB : swapAmountA;
  const getFromToken = () => isSwapReversed ? selectedTokenB : selectedTokenA;
  const getToToken = () => isSwapReversed ? selectedTokenA : selectedTokenB;
  const getFromBalance = () => isSwapReversed ? 
    (address ? getTokenBBalance(address) : "0.0000") : 
    (address ? getTokenABalance(address) : "0.0000");
  const getToBalance = () => isSwapReversed ? 
    (address ? getTokenABalance(address) : "0.0000") : 
    (address ? getTokenBBalance(address) : "0.0000");

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#161d29] p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            className="bg-[#516AE4] text-white py-2 px-4 rounded-md flex items-center gap-2 hover:bg-[#4056d6] transition-colors"
            onClick={() => navigate("/wallet")}
          >
            <FaArrowRight />
            Wallet
          </button>
        </div>

        <div className="p-7 bg-[#252b36] rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[#fafafa] font-bold text-xl">Universal Swap</h2>
            <FaCog size={20} color="#717A8C" className="cursor-pointer hover:rotate-90 transition-transform" />
          </div>

          {/* Network Info */}
          <div className="bg-[#1a1f2a] p-3 rounded-lg mb-4">
            <div className="flex justify-between text-sm text-[#717A8C]">
              <span>Network:</span>
              <span className="text-[#fafafa]">{network.name}</span>
            </div>
            <div className="flex justify-between text-sm text-[#717A8C]">
              <span>Chain ID:</span>
              <span className="text-[#fafafa]">{chainId}</span>
            </div>
          </div>

          {/* Transaction Status */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded-lg mb-4">
              <p className="text-red-300 text-sm">Error: {error.message}</p>
            </div>
          )}
          {isSuccess && (
            <div className="bg-green-500/20 border border-green-500 p-3 rounded-lg mb-4">
              <p className="text-green-300 text-sm">Transaction successful!</p>
            </div>
          )}
          {isPending && (
            <div className="bg-yellow-500/20 border border-yellow-500 p-3 rounded-lg mb-4">
              <p className="text-yellow-300 text-sm">Transaction pending...</p>
            </div>
          )}

          <div className="relative flex flex-col gap-6">
            {/* Swap Icon */}
            <div 
              className="w-14 absolute inset-0 m-auto h-14 border-2 border-[#516AE4] flex justify-center items-center rounded-full bg-[#2b3342] z-10 cursor-pointer hover:bg-[#516AE4] transition-colors"
              onClick={handleReverseSwap}
            >
              <IoSwapVertical color="#fafafa" size={24} />
            </div>

            {/* From Token */}
            <div className="bg-[#1a1f2a] p-4 rounded-lg border border-[#3a4553]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[#717A8C] text-sm font-medium">From</label>
                <div className="text-[#717A8C] text-sm">
                  Balance: {getFromBalance()} {getFromToken()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={isSwapReversed ? (swapAmountB || "") : (swapAmountA || "")}
                    onChange={(e) => isSwapReversed ? setSwapAmountB(Number(e.target.value)) : setSwapAmountA(Number(e.target.value))}
                    className="w-full bg-transparent text-[#fafafa] text-xl font-semibold placeholder-[#717A8C] border-none outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#252b36] px-3 py-2 rounded-lg cursor-pointer hover:bg-[#2d3440] transition-colors">
                  <div className={`w-6 h-6 rounded-full ${isSwapReversed ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}></div>
                  <span className="text-[#fafafa] font-medium">{getFromToken()}</span>
                </div>
              </div>
            </div>

            {/* To Token */}
            <div className="bg-[#1a1f2a] p-4 rounded-lg border border-[#3a4553]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[#717A8C] text-sm font-medium">To</label>
                <div className="text-[#717A8C] text-sm">
                  Balance: {getToBalance()} {getToToken()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[#fafafa] text-xl font-semibold">
                    {getCurrentInputAmount() > 0 ? calculateEstimatedOutput(getCurrentInputAmount(), !isSwapReversed).toFixed(6) : "0.0"}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#252b36] px-3 py-2 rounded-lg cursor-pointer hover:bg-[#2d3440] transition-colors">
                  <div className={`w-6 h-6 rounded-full ${isSwapReversed ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-green-500 to-teal-500'}`}></div>
                  <span className="text-[#fafafa] font-medium">{getToToken()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Details */}
          {getCurrentInputAmount() > 0 && (
            <div className="bg-[#1a1f2a] p-4 rounded-lg mt-4 border border-[#3a4553]">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#717A8C]">
                  <span>Exchange Rate:</span>
                  <span className="text-[#fafafa]">
                    1 {getFromToken()} = {isSwapReversed ? (1/getTokenAPrice()).toFixed(6) : getTokenAPrice().toFixed(6)} {getToToken()}
                  </span>
                </div>
                <div className="flex justify-between text-[#717A8C]">
                  <span>Trading Fee (0.3%):</span>
                  <span className="text-[#fafafa]">{(getCurrentInputAmount() * 0.003).toFixed(6)} {getFromToken()}</span>
                </div>
                <div className="flex justify-between text-[#717A8C]">
                  <span>Minimum Received:</span>
                  <span className="text-[#fafafa]">{(calculateEstimatedOutput(getCurrentInputAmount(), !isSwapReversed) * 0.995).toFixed(6)} {getToToken()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            className={`w-full py-4 rounded-lg font-semibold text-lg mt-6 transition-all ${
              getCurrentInputAmount() > 0 && address
                ? "bg-gradient-to-r from-[#516AE4] to-[#7c3aed] text-white hover:from-[#4056d6] hover:to-[#6d28d9] shadow-lg"
                : "bg-[#3a4553] text-[#717A8C] cursor-not-allowed"
            }`}
            onClick={handleSwap}
            disabled={!address || getCurrentInputAmount() <= 0 || isPending}
          >
            {!address ? "Connect Wallet" : isPending ? "Swapping..." : `Swap ${getFromToken()} for ${getToToken()}`}
          </button>

          {/* Additional Actions */}
          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 py-2 bg-[#1a1f2a] text-[#fafafa] rounded-lg border border-[#3a4553] hover:bg-[#252b36] transition-colors"
              onClick={() => navigate("/wallet")}
            >
              Add Liquidity
            </button>
            <button
              className="flex-1 py-2 bg-[#1a1f2a] text-[#fafafa] rounded-lg border border-[#3a4553] hover:bg-[#252b36] transition-colors"
              onClick={() => navigate("/dashboard")}
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simple;
