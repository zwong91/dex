import { useState } from "react";
import { Outlet } from "react-router-dom";
import MainNavigation from "../components/MainNavigation";

const MarketPlace = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const tokens = [
    { symbol: "ETH", name: "Ethereum", price: "$3,245.67", change: "+5.24%", volume: "$2.1B", isPositive: true },
    { symbol: "BTC", name: "Bitcoin", price: "$67,842.30", change: "+2.18%", volume: "$1.8B", isPositive: true },
    { symbol: "USDT", name: "Tether", price: "$1.00", change: "+0.01%", volume: "$1.2B", isPositive: true },
    { symbol: "SOL", name: "Solana", price: "$156.89", change: "-1.23%", volume: "$890M", isPositive: false },
    { symbol: "ADA", name: "Cardano", price: "$0.72", change: "+3.45%", volume: "$456M", isPositive: true },
    { symbol: "DOT", name: "Polkadot", price: "$8.94", change: "-0.87%", volume: "$234M", isPositive: false },
  ];

  const filteredTokens = tokens.filter(token => 
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#fafafa] mb-4">Token Marketplace</h1>
          <p className="text-[#717A8C] text-lg">
            Discover and trade your favorite cryptocurrencies.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#252b36] border border-[#3a4553] rounded-xl px-4 py-3 text-[#fafafa] placeholder-[#717A8C] focus:outline-none focus:border-[#516AE4]"
                />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-3 bg-[#516AE4] text-white rounded-xl hover:bg-[#4056d6] transition-colors">
                  All Tokens
                </button>
                <button className="px-4 py-3 bg-[#252b36] text-[#717A8C] border border-[#3a4553] rounded-xl hover:bg-[#2d3440] transition-colors">
                  Favorites
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <h3 className="text-[#717A8C] text-sm font-medium mb-2">Market Cap</h3>
            <div className="text-[#fafafa] text-2xl font-bold">$2.1T</div>
            <div className="text-green-400 text-sm">+2.34% (24h)</div>
          </div>
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <h3 className="text-[#717A8C] text-sm font-medium mb-2">24h Volume</h3>
            <div className="text-[#fafafa] text-2xl font-bold">$67.2B</div>
            <div className="text-red-400 text-sm">-1.23% (24h)</div>
          </div>
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <h3 className="text-[#717A8C] text-sm font-medium mb-2">Active Pairs</h3>
            <div className="text-[#fafafa] text-2xl font-bold">1,247</div>
            <div className="text-green-400 text-sm">+12 (today)</div>
          </div>
        </div>

        {/* Token List */}
        <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[#fafafa] mb-6">Popular Tokens</h2>
          
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 text-[#717A8C] text-sm font-medium mb-4 pb-2 border-b border-[#3a4553]">
            <div className="col-span-4">Token</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">24h Change</div>
            <div className="col-span-2 text-right">Volume</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Token Rows */}
          <div className="space-y-2">
            {filteredTokens.map((token, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center py-4 hover:bg-[#252b36] rounded-xl transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{token.symbol.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-[#fafafa] font-semibold">{token.symbol}</div>
                    <div className="text-[#717A8C] text-sm">{token.name}</div>
                  </div>
                </div>
                <div className="col-span-2 text-right text-[#fafafa] font-semibold">
                  {token.price}
                </div>
                <div className={`col-span-2 text-right font-semibold ${token.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {token.change}
                </div>
                <div className="col-span-2 text-right text-[#717A8C]">
                  {token.volume}
                </div>
                <div className="col-span-2 text-right">
                  <button className="px-4 py-2 bg-[#516AE4] text-white rounded-lg hover:bg-[#4056d6] transition-colors text-sm">
                    Trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Outlet />
    </div>
  );
};

export default MarketPlace;
