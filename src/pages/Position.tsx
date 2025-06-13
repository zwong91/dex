import { useState } from "react";
import { useAccount } from "wagmi";
import MainNavigation from "../components/MainNavigation";
import { FaInfo } from "react-icons/fa";
import { MdTrendingUp, MdWaves } from "react-icons/md";

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

const Position = () => {
  const { address } = useAccount();

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

  const handleClosePosition = (position: PositionData) => {
    console.log("Closing position for:", position);
    // Close position logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <MainNavigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Position</h1>
          <p className="text-gray-400 text-lg">
            View and manage your trading positions
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Your Positions</h2>
            
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <MdWaves className="text-6xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No positions found</p>
                <p className="text-gray-500 text-sm mt-2">Start trading to create positions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => (
                  <div key={position.id} className="bg-zinc-800 bg-opacity-50 border border-zinc-600 rounded-xl p-6 hover:border-blue-500 hover:border-opacity-50 transition-all duration-200 group">
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
                          <h3 className="text-xl font-bold text-white">{position.pair}</h3>
                          <p className="text-gray-400 text-sm">Position: {position.liquidity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{position.value}</div>
                        <div className="text-green-400 font-semibold text-sm">APR: {position.apr}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-zinc-900 bg-opacity-50 rounded-lg p-3 border border-zinc-600">
                        <div className="text-gray-400 text-sm">{position.tokens.tokenA.symbol}</div>
                        <div className="text-white font-semibold">{position.tokens.tokenA.amount}</div>
                      </div>
                      <div className="bg-zinc-900 bg-opacity-50 rounded-lg p-3 border border-zinc-600">
                        <div className="text-gray-400 text-sm">{position.tokens.tokenB.symbol}</div>
                        <div className="text-white font-semibold">{position.tokens.tokenB.amount}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-600">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <MdTrendingUp className="text-green-400" />
                        <span>Active position</span>
                      </div>
                      <button 
                        onClick={() => handleClosePosition(position)}
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 transform group-hover:scale-105 shadow-lg"
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaInfo className="text-blue-400" />
              <h3 className="text-xl font-bold text-white">Position Information</h3>
            </div>
            <div className="space-y-3 text-gray-300">
              <p>• Monitor your trading positions and performance</p>
              <p>• Track profits and losses in real-time</p>
              <p>• Manage risk with position sizing tools</p>
              <p>• Close positions when you're ready to take profits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Position;
