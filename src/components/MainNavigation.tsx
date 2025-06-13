import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FaExchangeAlt, FaWallet, FaChartBar, FaLayerGroup, FaCog, FaCopy, FaEthereum } from "react-icons/fa";
import { MdDashboard, MdHome } from "react-icons/md";
import { IoChevronDown, IoSettingsOutline } from "react-icons/io5";
import { HiSparkles } from "react-icons/hi2";
import { RiSwapFill } from "react-icons/ri";
import { SiBinance } from "react-icons/si";
import WalletConnector from "./WalletConnector";
import { useChainId, useAccount, useBalance } from "wagmi";
import { switchChain } from "@wagmi/core";
import { config } from "../utils/wagmiConfig";
import { SUPPORTED_NETWORKS } from "../utils/dexConfig";

const MainNavigation = () => {
  const location = useLocation();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const supportedNetworks = Object.values(SUPPORTED_NETWORKS);
  const currentNetwork = supportedNetworks.find(n => n.id === chainId);
  const settingsRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: any) => {
    if (!balance) return "0.00";
    const value = parseFloat(balance.formatted);
    return value.toFixed(4);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Get network icon
  const getNetworkIcon = (chainId: number) => {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return <FaEthereum className="text-blue-400" size={14} />;
      case 56: // BSC Mainnet
        return <SiBinance className="text-yellow-400" size={14} />;
      case 97: // BSC Testnet
        return <SiBinance className="text-yellow-400" size={14} />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>;
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      if (networkRef.current && !networkRef.current.contains(event.target as Node)) {
        setShowNetworkDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: <MdHome size={20} />,
    },
    {
      path: "/dashboard",
      label: "Dashboard", 
      icon: <MdDashboard size={20} />,
    },
    {
      path: "/swap",
      label: "Swap",
      icon: <FaExchangeAlt size={18} />,
    },
    {
      path: "/position",
      label: "Position",
      icon: <FaLayerGroup size={18} />,
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: <FaChartBar size={18} />,
    },
    {
      path: "/wallet",
      label: "Portfolio",
      icon: <FaWallet size={18} />,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchChain(config, { chainId: networkId });
      setShowNetworkDropdown(false);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left Section - Wallet Info, Logo, Network and Settings */}
          <div className="flex items-center space-x-4">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <HiSparkles className="text-white text-lg" />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm"></div>
              </div>
              <div className="hidden xl:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">MetaDEX</h1>
                <p className="text-xs text-gray-400 -mt-1">Universal Exchange</p>
              </div>
            </Link>

            {/* Wallet Info - Always Visible When Connected */}
            {isConnected && address && (
              <div className="flex items-center space-x-3 px-4 py-2.5 bg-slate-800/60 rounded-xl border border-slate-600/50">
                {/* Wallet Address */}
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <FaWallet className="text-white text-xs" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-200">
                      {formatAddress(address)}
                    </span>
                    <div className="hidden lg:flex items-center space-x-1">
                      <span className="text-xs font-medium text-blue-400">
                        {formatBalance(balance)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {currentNetwork?.nativeCurrency?.symbol || "ETH"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Copy Button */}
                <button 
                  onClick={() => copyToClipboard(address)}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Copy Address"
                >
                  <FaCopy size={12} />
                </button>
                
                {/* Portfolio Link */}
                <Link 
                  to="/wallet"
                  className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors"
                >
                  Portfolio
                </Link>
              </div>
            )}

            {/* Connect Wallet Button - When Not Connected */}
            {!isConnected && (
              <WalletConnector />
            )}

            {/* Network Switcher */}
            {isConnected && (
              <div className="relative" ref={networkRef}>
                <button
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className="flex items-center space-x-3 px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-600/50 hover:border-green-500/50 transition-all duration-200 group"
                >
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg"></div>
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                    {currentNetwork?.name || "Unknown"}
                  </span>
                  <IoChevronDown className={`text-gray-400 group-hover:text-gray-200 transition-all duration-200 ${showNetworkDropdown ? 'rotate-180' : ''}`} size={14} />
                </button>

                {/* Network Dropdown */}
                {showNetworkDropdown && (
                  <div className="absolute top-full left-0 mt-3 w-72 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl shadow-black/50 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4">
                      <div className="text-xs font-semibold text-gray-400 px-3 py-2 mb-3 uppercase tracking-wider">
                        Switch Network
                      </div>
                      <div className="space-y-1">
                        {supportedNetworks.map((network) => (
                          <button
                            key={network.id}
                            onClick={() => handleNetworkSwitch(network.id)}
                            disabled={chainId === network.id}
                            className={`
                              w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-all duration-200 text-left group
                              ${
                                chainId === network.id
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed"
                                  : "text-gray-300 hover:text-white hover:bg-slate-700/50 border border-transparent cursor-pointer"
                              }
                            `}
                          >
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                              chainId === network.id 
                                ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                                : 'bg-gray-500 group-hover:bg-gray-400'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{network.name}</div>
                              <div className="text-xs text-gray-400 truncate">Chain ID: {network.id}</div>
                            </div>
                            {chainId === network.id && (
                              <div className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-lg font-medium">
                                Active
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Button */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className="flex items-center space-x-2 px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200 group"
              >
                <IoSettingsOutline className="text-gray-400 group-hover:text-gray-200 w-4 h-4" />
                <span className="hidden lg:block text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                  Settings
                </span>
              </button>

              {/* Settings Dropdown */}
              {showSettingsDropdown && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl shadow-black/50 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4">
                    <div className="text-xs font-semibold text-gray-400 px-3 py-2 mb-3 uppercase tracking-wider">
                      Preferences
                    </div>
                    <div className="space-y-1">
                      <button className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">Dark Mode</span>
                        </div>
                        <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                          <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                        </div>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Notifications</span>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200">
                        <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Language</span>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Help & Support</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Navigation Items */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-5 py-3 rounded-xl transition-all duration-200 font-medium
                  ${
                    isActive(item.path)
                      ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/25"
                      : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-3 text-gray-400 hover:text-white transition-colors">
            <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
              <span className="block w-5 h-0.5 bg-current rounded-full"></span>
              <span className="block w-5 h-0.5 bg-current rounded-full"></span>
              <span className="block w-5 h-0.5 bg-current rounded-full"></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-slate-700/50 bg-slate-900/50">
          <div className="grid grid-cols-3 gap-2 p-4">
            {navItems.slice(0, 6).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center space-y-2 p-4 rounded-xl transition-all duration-200
                  ${
                    isActive(item.path)
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-slate-700/30"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNavigation;