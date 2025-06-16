import { switchChain } from "@wagmi/core";
import { useState } from "react";
import { FaChartBar, FaCog, FaExchangeAlt, FaLayerGroup, FaWallet } from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import { MdDashboard } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import { useChainId } from "wagmi";
import { SUPPORTED_NETWORKS } from "../dex/dexConfig";
import { config } from "../dex/wagmiConfig";
import WalletConnector from "./WalletConnector";

const MainNavigation = () => {
  const location = useLocation();
  const chainId = useChainId();
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const supportedNetworks = Object.values(SUPPORTED_NETWORKS);
  const currentNetwork = supportedNetworks.find(n => n.id === chainId);

  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <MdDashboard size={18} />,
    },
    {
      path: "/swap",
      label: "Swap",
      icon: <FaExchangeAlt size={18} />,
    },
    {
      path: "/liquidity",
      label: "Liquidity",
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
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="bg-[#1a1f2a] border-b border-[#3a4553] sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#516AE4] to-[#7c3aed] rounded-lg flex items-center justify-center">
              <FaExchangeAlt className="text-white text-sm" />
            </div>
            <span className="text-xl font-bold text-[#fafafa] hidden sm:block">Universal DEX</span>
          </Link>

          {/* Main Navigation Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-[#516AE4] to-[#7c3aed] text-white shadow-lg"
                    : "text-[#9CA3AF] hover:text-[#fafafa] hover:bg-[#252b36]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right Side - Network Selector + Wallet */}
          <div className="flex items-center gap-4">
            {/* Network Selector */}
            <div className="relative">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="flex items-center gap-2 bg-[#252b36] hover:bg-[#2d3440] border border-[#3a4553] px-3 py-2 rounded-lg transition-colors"
              >
                <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                <span className="text-[#fafafa] text-sm font-medium hidden sm:block">
                  {currentNetwork?.name || "Unknown"}
                </span>
                <IoChevronDown className={`text-[#717A8C] transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Network Dropdown */}
              {showNetworkDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-[#1a1f2a] border border-[#3a4553] rounded-xl shadow-2xl min-w-[200px] py-2 z-50">
                  {supportedNetworks.map((network) => (
                    <button
                      key={network.id}
                      onClick={async () => {
                        try {
                          await switchChain(config, { chainId: network.id });
                          setShowNetworkDropdown(false);
                        } catch (error) {
                          console.error("Failed to switch network:", error);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252b36] transition-colors ${
                        chainId === network.id ? 'bg-[#252b36]' : ''
                      }`}
                    >
                      <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                      <span className="text-[#fafafa] text-sm">{network.name}</span>
                      {chainId === network.id && (
                        <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet Connector */}
            <WalletConnector />

            {/* Settings */}
            <button className="p-2 hover:bg-[#252b36] rounded-lg transition-colors">
              <FaCog className="text-[#717A8C] hover:text-[#fafafa]" size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-[#3a4553] py-2">
          <div className="flex items-center justify-between overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 min-w-0 ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-[#516AE4] to-[#7c3aed] text-white"
                    : "text-[#9CA3AF] hover:text-[#fafafa] hover:bg-[#252b36]"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showNetworkDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNetworkDropdown(false)}
        />
      )}
    </nav>
  );
};

export default MainNavigation;
