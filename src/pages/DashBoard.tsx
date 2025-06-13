import { MdToken, MdTrendingUp } from "react-icons/md";
import { IoWallet } from "react-icons/io5";
import { RiExchangeFill, RiWaterPercentFill } from "react-icons/ri";
import { FaChartLine, FaUsers } from "react-icons/fa";
import ShowWallet from "../components/ShowWallet";

import { useChainId, useAccount } from "wagmi";
import { switchChain } from "@wagmi/core";
import { config } from "../utils/wagmiConfig";
import { getNetworkById, SUPPORTED_NETWORKS } from "../utils/dexConfig";
import { getTokenABalance, getTokenBBalance, getLiquidityTokenBalance } from "../utils/dexUtils";

const recentTransactions = [
  {
    id: "0x1a2b3c",
    type: "Swap",
    user: "0x742d...35Ae",
    date: "2024-09-01",
    amount: "$1,234.56",
    status: "Completed",
  },
  {
    id: "0x4d5e6f",
    type: "Add Liquidity",
    user: "0x8f3c...92Bd",
    date: "2024-08-31",
    amount: "$2,456.78",
    status: "Completed",
  },
  {
    id: "0x7g8h9i",
    type: "Remove Liquidity",
    user: "0x1e4d...67Cf",
    date: "2024-08-30",
    amount: "$987.65",
    status: "Completed",
  },
];

const DashBoard = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const network = getNetworkById(chainId);

  // Mock data - in real implementation, these would come from blockchain/API
  const dexStats = {
    totalValueLocked: "$12,450,789",
    dailyVolume: "$3,456,789",
    totalUsers: "15,432",
    activePairs: "24",
    fees24h: "$10,370",
    averageAPR: "45.6%",
  };

  const supportedNetworks = Object.values(SUPPORTED_NETWORKS);

  return (
    <div className="min-h-screen bg-[#161d29]">
      <div className="p-5 flex justify-between items-center border-b border-[#2d3748]">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa]">DEX DASHBOARD</h1>
          <p className="text-[#10B981]">Welcome to Universal Decentralized Exchange</p>
        </div>
        <div className="flex items-center gap-3">
          <ShowWallet />
          
          {/* Network Switcher */}
          <div className="relative">
            <select
              className="bg-[#2d3748] text-[#fafafa] px-4 py-2 rounded-lg border border-[#4a5568] focus:border-[#10B981] outline-none"
              value={chainId}
              onChange={async (e) => {
                const selectedChainId = parseInt(e.target.value) as 1 | 137 | 97 | 56 | 42161;
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
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 p-5">
        {/* Total Value Locked */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <IoWallet size={24} color="#10B981" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.totalValueLocked}</p>
                <p className="text-sm text-[#9CA3AF]">Total Value Locked</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#10B981] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#10B981] text-sm">
            +12.5% from yesterday
          </div>
        </article>

        {/* Daily Volume */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <RiExchangeFill size={24} color="#3B82F6" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.dailyVolume}</p>
                <p className="text-sm text-[#9CA3AF]">24h Volume</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#3B82F6] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#3B82F6] text-sm">
            +8.3% from yesterday
          </div>
        </article>

        {/* Active Users */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <FaUsers size={24} color="#8B5CF6" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.totalUsers}</p>
                <p className="text-sm text-[#9CA3AF]">Total Users</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#8B5CF6] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#8B5CF6] text-sm">
            +156 new users
          </div>
        </article>

        {/* Trading Pairs */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <MdToken size={24} color="#F59E0B" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.activePairs}</p>
                <p className="text-sm text-[#9CA3AF]">Active Pairs</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#F59E0B] text-sm">
            2 new pairs added
          </div>
        </article>

        {/* Daily Fees */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <MdTrendingUp size={24} color="#EF4444" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.fees24h}</p>
                <p className="text-sm text-[#9CA3AF]">24h Fees</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#EF4444] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#EF4444] text-sm">
            +15.7% from yesterday
          </div>
        </article>

        {/* Average APR */}
        <article className="bg-[#1f2937] p-4 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <RiWaterPercentFill size={24} color="#06B6D4" />
              <div>
                <p className="text-2xl font-bold text-[#fafafa]">{dexStats.averageAPR}</p>
                <p className="text-sm text-[#9CA3AF]">Average APR</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#06B6D4] rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-[#06B6D4] text-sm">
            Liquidity providers
          </div>
        </article>
      </div>

      {/* User Balances (if connected) */}
      {address && (
        <div className="px-5 mb-5">
          <div className="bg-[#1f2937] p-5 rounded-lg border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#fafafa] mb-4">Your Balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111827] p-4 rounded-lg">
                <p className="text-[#9CA3AF] text-sm">Token A Balance</p>
                <p className="text-xl font-bold text-[#fafafa]">{getTokenABalance(address)}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-lg">
                <p className="text-[#9CA3AF] text-sm">Token B Balance</p>
                <p className="text-xl font-bold text-[#fafafa]">{getTokenBBalance(address)}</p>
              </div>
              <div className="bg-[#111827] p-4 rounded-lg">
                <p className="text-[#9CA3AF] text-sm">LP Tokens</p>
                <p className="text-xl font-bold text-[#fafafa]">{getLiquidityTokenBalance(address)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Section */}
      <div className="px-5 mb-5">
        <div className="bg-[#1f2937] p-5 rounded-lg border border-[#374151]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-[#fafafa]">Trading Statistics</h4>
            <FaChartLine color="#3B82F6" size={20} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#111827] rounded-lg">
              <p className="text-2xl font-bold text-[#10B981]">$2.4M</p>
              <p className="text-sm text-[#9CA3AF]">24h Volume</p>
            </div>
            <div className="text-center p-4 bg-[#111827] rounded-lg">
              <p className="text-2xl font-bold text-[#3B82F6]">1,234</p>
              <p className="text-sm text-[#9CA3AF]">Total Trades</p>
            </div>
            <div className="text-center p-4 bg-[#111827] rounded-lg">
              <p className="text-2xl font-bold text-[#F59E0B]">$156K</p>
              <p className="text-sm text-[#9CA3AF]">Fees Generated</p>
            </div>
            <div className="text-center p-4 bg-[#111827] rounded-lg">
              <p className="text-2xl font-bold text-[#8B5CF6]">98.7%</p>
              <p className="text-sm text-[#9CA3AF]">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-5">
        <div className="bg-[#1f2937] p-5 rounded-lg border border-[#374151]">
          <h4 className="text-lg font-semibold text-[#fafafa] mb-4">Recent Transactions</h4>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="bg-[#111827] p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#10B981] font-medium">{tx.id}</p>
                    <p className="text-[#9CA3AF] text-sm">{tx.type} • {tx.user}</p>
                    <p className="text-[#6B7280] text-xs">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#fafafa] font-medium">{tx.amount}</p>
                    <span className="text-xs bg-[#10B981] text-white px-2 py-1 rounded">
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="p-5">
        <div className="bg-[#1f2937] p-5 rounded-lg border border-[#374151]">
          <h4 className="text-lg font-semibold text-[#fafafa] mb-4">Current Network</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[#9CA3AF] text-sm">Network</p>
              <p className="text-[#fafafa] font-medium">{network.name}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-sm">Chain ID</p>
              <p className="text-[#fafafa] font-medium">{chainId}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-sm">Native Currency</p>
              <p className="text-[#fafafa] font-medium">{network.nativeCurrency.symbol}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-sm">Block Explorer</p>
              <a 
                href={network.blockExplorers?.default?.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#10B981] hover:underline"
              >
                View Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;
