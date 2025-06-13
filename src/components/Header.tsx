import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaExchangeAlt, FaWallet, FaChartBar, FaLayerGroup } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";

interface Props {
  title?: string;
  subtitle?: string;
}

const Header = (props?: Props) => {
  const location = useLocation();

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
    <div className="bg-[#1f2937] border-b border-[#374151]">
      {/* Main Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#10B981] to-[#3B82F6] rounded-lg flex items-center justify-center">
              <FaExchangeAlt className="text-white text-sm" />
            </div>
            <span className="text-xl font-bold text-[#fafafa]">Universal DEX</span>
          </Link>

          {/* Title/Subtitle */}
          {props?.title && (
            <div className="ml-8">
              <h1 className="text-xl font-semibold text-[#fafafa]">{props.title}</h1>
              {props.subtitle && (
                <p className="text-sm text-[#10B981]">{props.subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Connect Wallet Button */}
        <div className="flex items-center gap-4">
          <ConnectButton 
            chainStatus="icon" 
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 pb-2">
        <div className="flex space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-[#10B981] text-white shadow-lg"
                  : "text-[#9CA3AF] hover:text-[#fafafa] hover:bg-[#374151]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Header;
