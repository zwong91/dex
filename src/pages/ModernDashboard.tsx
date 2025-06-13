import { useState, useEffect } from "react";
import { useChainId, useAccount } from "wagmi";
import { SUPPORTED_NETWORKS } from "../utils/dexConfig";
import { getTokenABalance, getTokenBBalance, getLiquidityTokenBalance } from "../utils/dexUtils";
import { 
  MdToken, 
  MdTrendingUp, 
  MdSwapHoriz,
  MdAccountBalance
} from "react-icons/md";
import { IoWallet } from "react-icons/io5";
import { RiExchangeFill } from "react-icons/ri";
import { FaChartLine, FaCoins } from "react-icons/fa";
import MainNavigation from "../components/MainNavigation";e, useEffect } from "react";
import { useChainId, useAccount } from "wagmi";
import { switchChain } from "@wagmi/core";
import { config } from "../utils/wagmiConfig";
import { getNetworkById, SUPPORTED_NETWORKS } from "../utils/dexConfig";
import { getTokenABalance, getTokenBBalance, getLiquidityTokenBalance } from "../utils/dexUtils";
import { 
  MdToken, 
  MdTrendingUp, 
  MdSwapHoriz,
  MdAccountBalance
} from "react-icons/md";
import { IoWallet } from "react-icons/io5";
import { RiExchangeFill } from "react-icons/ri";
import { FaChartLine, FaCoins } from "react-icons/fa";
import WalletConnector from "../components/WalletConnector";

const ModernDashboard = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supportedNetworks = Object.values(SUPPORTED_NETWORKS);

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
        // Use mock data if API fails
        setStats({
          totalValueLocked: "12,450,789.50",
          volume24h: "2,456,789.25",
          totalTransactions: 1250,
          activePairs: 24
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: "Total Value Locked",
      value: stats ? `$${stats.totalValueLocked}` : "$0",
      change: "+12.5%",
      icon: <IoWallet size={24} />,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "24h Volume",
      value: stats ? `$${stats.volume24h}` : "$0",
      change: "+8.2%",
      icon: <RiExchangeFill size={24} />,
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Total Transactions",
      value: stats ? stats.totalTransactions.toLocaleString() : "0",
      change: "+15.3%",
      icon: <MdSwapHoriz size={24} />,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Active Pairs",
      value: stats ? stats.activePairs : "0",
      change: "+2",
      icon: <MdToken size={24} />,
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20"
    },
    {
      title: "APY",
      value: "45.6%",
      change: "+3.2%",
      icon: <MdTrendingUp size={24} />,
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20"
    },
    {
      title: "Fees (24h)",
      value: "$10,370",
      change: "+7.8%",
      icon: <FaCoins size={24} />,
      color: "from-indigo-500 to-purple-600",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20"
    }
  ];

  const quickActions = [
    {
      title: "Swap Tokens",
      description: "Exchange tokens instantly",
      icon: <MdSwapHoriz size={20} />,
      href: "/swap",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Add Liquidity",
      description: "Provide liquidity and earn fees",
      icon: <MdAccountBalance size={20} />,
      href: "/liquidity",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Portfolio",
      description: "View your assets and positions",
      icon: <IoWallet size={20} />,
      href: "/wallet",
      color: "from-purple-500 to-violet-500"
    },
    {
      title: "Analytics",
      description: "View detailed market data",
      icon: <FaChartLine size={20} />,
      href: "/analytics",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      {/* Header */}
      <header className="border-b border-[#3a4553] bg-[#1a1f2a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#516AE4] to-[#7c3aed] rounded-xl flex items-center justify-center">
                  <RiExchangeFill className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#fafafa]">Universal DEX</h1>
                  <p className="text-[#717A8C] text-sm">Multi-chain Decentralized Exchange</p>
                </div>
              </div>
              
              {/* Network Switcher */}
              <div className="flex items-center gap-3">
                <span className="text-[#717A8C] text-sm">Network:</span>
                <select
                  className="bg-[#252b36] border border-[#3a4553] text-[#fafafa] px-3 py-2 rounded-lg text-sm focus:border-[#516AE4] outline-none"
                  value={chainId}
                  onChange={async (e) => {
                    const selectedChainId = parseInt(e.target.value) as 1 | 56 | 97 | 137 | 42161;
                    try {
                      await switchChain(config, { chainId: selectedChainId });
                    } catch (error) {
                      console.error("Failed to switch network:", error);
                    }
                  }}
                >
                  {supportedNetworks.map((net) => (
                    <option key={net.id} value={net.id}>
                      {net.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <WalletConnector />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#fafafa] mb-2">
            Welcome to Universal DEX
          </h2>
          <p className="text-[#717A8C] text-lg">
            Trade, provide liquidity, and earn rewards across multiple blockchains
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {statCards.map((stat, index) => (
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
                  {loading ? "..." : stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="group bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 hover:border-[#516AE4] transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                  <div className="text-white">{action.icon}</div>
                </div>
              </div>
              <h3 className="text-[#fafafa] font-semibold mb-2">
                {action.title}
              </h3>
              <p className="text-[#717A8C] text-sm">
                {action.description}
              </p>
            </a>
          ))}
        </div>

        {/* Portfolio Overview */}
        {address && (
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-[#fafafa] mb-6">
              Your Portfolio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#252b36] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <span className="text-[#fafafa] font-medium">TOKEN A</span>
                </div>
                <p className="text-2xl font-bold text-[#fafafa]">
                  {getTokenABalance(address)}
                </p>
                <p className="text-[#717A8C] text-sm">≈ $1,234.56</p>
              </div>
              
              <div className="bg-[#252b36] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full"></div>
                  <span className="text-[#fafafa] font-medium">TOKEN B</span>
                </div>
                <p className="text-2xl font-bold text-[#fafafa]">
                  {getTokenBBalance(address)}
                </p>
                <p className="text-[#717A8C] text-sm">≈ $2,456.78</p>
              </div>
              
              <div className="bg-[#252b36] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <span className="text-[#fafafa] font-medium">LP Tokens</span>
                </div>
                <p className="text-2xl font-bold text-[#fafafa]">
                  {getLiquidityTokenBalance(address)}
                </p>
                <p className="text-[#717A8C] text-sm">≈ $987.65</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernDashboard;
