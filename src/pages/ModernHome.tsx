import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import MainNavigation from "../components/MainNavigation";
import { 
  MdTrendingUp, 
  MdSwapHoriz,
  MdAccountBalance,
  MdShowChart
} from "react-icons/md";
import { IoWallet, IoWater } from "react-icons/io5";
import { FaExchangeAlt, FaCoins, FaChartLine } from "react-icons/fa";

const ModernHome = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch DEX stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const mainFeatures = [
    {
      title: "Swap",
      description: "Trade tokens instantly with the best rates",
      icon: <FaExchangeAlt size={24} />,
      href: "/swap",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Liquidity",
      description: "Provide liquidity and earn trading fees",
      icon: <IoWater size={24} />,
      href: "/liquidity",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Dashboard",
      description: "Monitor your portfolio and track performance",
      icon: <MdShowChart size={24} />,
      href: "/dashboard",
      color: "from-purple-500 to-violet-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Analytics",
      description: "Explore market data and trading insights",
      icon: <FaChartLine size={24} />,
      href: "/analytics",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20"
    }
  ];

  const protocolStats = [
    {
      title: "Total Value Locked",
      value: loading ? "..." : "$127.8M",
      change: "+12.4%",
      icon: <MdAccountBalance size={24} />,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "24h Volume",
      value: loading ? "..." : "$8.2M",
      change: "+5.7%",
      icon: <MdSwapHoriz size={24} />,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Total Users",
      value: loading ? "..." : "47,832",
      change: "+18.2%",
      icon: <IoWallet size={24} />,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Avg APY",
      value: loading ? "..." : "24.8%",
      change: "+2.1%",
      icon: <MdTrendingUp size={24} />,
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-[#fafafa] mb-6">
            Universal <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#516AE4] to-[#7c3aed]">DEX</span>
          </h1>
          <p className="text-[#717A8C] text-xl mb-8 max-w-2xl mx-auto">
            The next-generation decentralized exchange built for speed, security, and seamless trading across multiple blockchains.
          </p>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/swap"
              className="px-8 py-4 bg-gradient-to-r from-[#516AE4] to-[#7c3aed] text-white rounded-xl font-semibold hover:from-[#4056d6] hover:to-[#6d28d9] transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Start Trading
            </Link>
            <Link
              to="/liquidity"
              className="px-8 py-4 bg-[#252b36] hover:bg-[#2d3440] text-[#fafafa] rounded-xl border border-[#3a4553] hover:border-[#516AE4] font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Provide Liquidity
            </Link>
          </div>
        </div>

        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {protocolStats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border rounded-2xl p-6 backdrop-blur-sm transition-all duration-200 hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <div className="text-white">{stat.icon}</div>
                </div>
                <div className="text-green-400 text-sm font-medium">
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-[#717A8C] text-sm font-medium">
                  {stat.title}
                </h3>
                <p className="text-[#fafafa] text-2xl font-bold">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#fafafa] text-center mb-12">
            Explore DeFi Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainFeatures.map((feature, index) => (
              <Link
                key={index}
                to={feature.href}
                className={`group ${feature.bgColor} ${feature.borderColor} border rounded-2xl p-6 hover:border-[#516AE4] transition-all duration-200 hover:scale-105 backdrop-blur-sm`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color} group-hover:scale-110 transition-transform duration-200`}>
                    <div className="text-white">{feature.icon}</div>
                  </div>
                </div>
                <h3 className="text-[#fafafa] font-semibold mb-2 text-lg">
                  {feature.title}
                </h3>
                <p className="text-[#717A8C] text-sm">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Pairs Section */}
        <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-[#fafafa] mb-6">Popular Trading Pairs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { pair: "BNB/USDC", price: "$643.21", change: "+5.2%", volume: "$2.1M" },
              { pair: "ETH/USDT", price: "$3,245.67", change: "+2.8%", volume: "$1.8M" },
              { pair: "USDC/USDT", price: "$1.0001", change: "+0.01%", volume: "$890K" }
            ].map((pair, index) => (
              <div key={index} className="bg-[#252b36] border border-[#3a4553] rounded-xl p-4 hover:border-[#516AE4] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full -ml-2"></div>
                    </div>
                    <span className="text-[#fafafa] font-semibold">{pair.pair}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    pair.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {pair.change}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[#fafafa] text-lg font-bold">{pair.price}</div>
                  <div className="text-[#717A8C] text-sm">Vol: {pair.volume}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-[#516AE4]/10 to-[#7c3aed]/10 border border-[#516AE4]/20 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-[#fafafa] mb-4">
              Ready to start trading?
            </h2>
            <p className="text-[#717A8C] mb-6">
              Connect your wallet and experience the future of decentralized finance
            </p>
            {!address ? (
              <div className="text-[#717A8C]">
                Connect your wallet to get started
              </div>
            ) : (
              <Link
                to="/swap"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#516AE4] to-[#7c3aed] text-white rounded-xl font-semibold hover:from-[#4056d6] hover:to-[#6d28d9] transition-all duration-200 transform hover:scale-105"
              >
                <FaCoins />
                Start Trading Now
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernHome;
