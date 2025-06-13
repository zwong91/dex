import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { Link } from "react-router-dom";
import MainNavigation from "../components/MainNavigation";
import { 
  MdTrendingUp, 
  MdSwapHoriz,
  MdAccountBalance,
  MdShowChart,
  MdArrowForward
} from "react-icons/md";
import { IoWallet, IoWater, IoSparkles } from "react-icons/io5";
import { FaExchangeAlt, FaCoins, FaChartLine, FaUsers, FaLock, FaShieldAlt } from "react-icons/fa";
import { HiSparkles as HiSparklesOutline } from "react-icons/hi2";

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
      description: "Trade tokens instantly with the best rates and lowest fees",
      icon: <FaExchangeAlt size={28} />,
      href: "/swap",
      gradient: "from-primary-500 to-primary-600",
      bgGradient: "from-primary-500/10 to-primary-600/10",
      borderGradient: "from-primary-500/30 to-primary-600/30",
      hoverGradient: "from-primary-500/20 to-primary-600/20"
    },
    {
      title: "Position",
      description: "View and manage your trading positions",
      icon: <IoWater size={28} />,
      href: "/position",
      gradient: "from-success-500 to-success-600",
      bgGradient: "from-success-500/10 to-success-600/10",
      borderGradient: "from-success-500/30 to-success-600/30",
      hoverGradient: "from-success-500/20 to-success-600/20"
    },
    {
      title: "Analytics",
      description: "Deep insights into market trends and opportunities",
      icon: <FaChartLine size={28} />,
      href: "/analytics",
      gradient: "from-accent-500 to-accent-600",
      bgGradient: "from-accent-500/10 to-accent-600/10",
      borderGradient: "from-accent-500/30 to-accent-600/30",
      hoverGradient: "from-accent-500/20 to-accent-600/20"
    },
    {
      title: "Portfolio",
      description: "Track and manage your DeFi assets and positions",
      icon: <IoWallet size={28} />,
      href: "/wallet",
      gradient: "from-warning-500 to-warning-600",
      bgGradient: "from-warning-500/10 to-warning-600/10",
      borderGradient: "from-warning-500/30 to-warning-600/30",
      hoverGradient: "from-warning-500/20 to-warning-600/20"
    }
  ];

  const protocolStats = [
    {
      title: "Total Value Locked",
      value: loading ? "..." : "$127.8M",
      change: "+12.4%",
      icon: <MdAccountBalance size={24} />,
      gradient: "from-primary-500 to-primary-600"
    },
    {
      title: "24h Volume",
      value: loading ? "..." : "$8.2M",
      change: "+5.7%",
      icon: <MdSwapHoriz size={24} />,
      gradient: "from-success-500 to-success-600"
    },
    {
      title: "Total Users",
      value: loading ? "..." : "47,832",
      change: "+18.2%",
      icon: <FaUsers size={24} />,
      gradient: "from-accent-500 to-accent-600"
    },
    {
      title: "Active Pools",
      value: loading ? "..." : "234",
      change: "+8.1%",
      icon: <FaCoins size={24} />,
      gradient: "from-warning-500 to-warning-600"
    }
  ];

  const features = [
    {
      icon: <FaShieldAlt size={24} />,
      title: "Secure & Audited",
      description: "Smart contracts audited by leading security firms"
    },
    {
      icon: <FaLock size={24} />,
      title: "Non-Custodial",
      description: "You always maintain full control of your assets"
    },
    {
      icon: <MdTrendingUp size={24} />,
      title: "Best Rates",
      description: "Aggregated liquidity for optimal trading prices"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <MainNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center py-16 relative">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-success-500/10 rounded-3xl blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500/30 px-4 py-2 rounded-full mb-6">
              <HiSparklesOutline className="text-primary-400" />
              <span className="text-sm font-medium text-primary-300">Next-Gen DeFi Trading</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Trade</span>{" "}
              <span className="text-white">with</span>{" "}
              <span className="gradient-text">Confidence</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              The most advanced decentralized exchange with institutional-grade security, 
              lightning-fast swaps, and unmatched liquidity.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/swap"
                className="btn-primary px-8 py-4 text-lg flex items-center space-x-2 group"
              >
                <span>Start Trading</span>
                <MdArrowForward className="group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                to="/analytics"
                className="btn-secondary px-8 py-4 text-lg"
              >
                Explore Analytics
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {protocolStats.map((stat, index) => (
            <div key={index} className="glass-card glass-card-hover p-6 group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} bg-opacity-20`}>
                  <div className={`text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-success-400 font-medium">
                    {stat.change}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white group-hover:gradient-text transition-all duration-300">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">
                  {stat.title}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Features */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-300">
              Comprehensive DeFi tools in one powerful platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mainFeatures.map((feature, index) => (
              <Link
                key={index}
                to={feature.href}
                className={`
                  glass-card p-8 group hover:shadow-card-hover transition-all duration-300
                  bg-gradient-to-br ${feature.bgGradient} hover:${feature.hoverGradient}
                  border-gradient-to-r ${feature.borderGradient}
                `}
              >
                <div className="flex items-start space-x-6">
                  <div className={`
                    p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} 
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:gradient-text transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <div className="flex items-center mt-4 text-gray-400 group-hover:text-primary-400 transition-colors">
                      <span className="text-sm font-medium">Learn more</span>
                      <MdArrowForward className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Why Choose MetaDEX
            </h2>
            <p className="text-xl text-gray-300">
              Built for traders, by traders
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-primary-400">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:gradient-text transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-card p-12 text-center bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
              Ready to Start Trading?
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Join thousands of traders who trust MetaDEX for their DeFi needs. 
              Experience the future of decentralized trading today.
            </p>
            
            {!address ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary px-8 py-4 text-lg">
                  Connect Wallet to Start
                </button>
                <Link to="/analytics" className="btn-secondary px-8 py-4 text-lg">
                  View Analytics
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/swap" className="btn-primary px-8 py-4 text-lg">
                  Start Swapping
                </Link>
                <Link to="/dashboard" className="btn-secondary px-8 py-4 text-lg">
                  View Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernHome;


