import MainNavigation from "../components/MainNavigation";
import ProjectsTable from "../components/ProjectsTable";

const Projects = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#fafafa] mb-4">Projects & Analytics</h1>
          <p className="text-[#717A8C] text-lg">
            Explore DeFi projects and trading analytics across different protocols.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Value Locked */}
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#717A8C] text-sm font-medium">Total Value Locked</h3>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0 2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="text-[#fafafa] text-2xl font-bold">$2.4B</div>
            <div className="text-green-400 text-sm mt-1">+12.5% (24h)</div>
          </div>

          {/* Active Projects */}
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#717A8C] text-sm font-medium">Active Projects</h3>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="text-[#fafafa] text-2xl font-bold">147</div>
            <div className="text-green-400 text-sm mt-1">+8 (this week)</div>
          </div>

          {/* Trading Volume */}
          <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#717A8C] text-sm font-medium">24h Volume</h3>
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-[#fafafa] text-2xl font-bold">$127M</div>
            <div className="text-red-400 text-sm mt-1">-3.2% (24h)</div>
          </div>
        </div>

        {/* Featured Projects */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#fafafa] mb-6">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Uniswap V3",
                description: "Leading decentralized exchange with concentrated liquidity",
                tvl: "$3.2B",
                apy: "12.4%",
                image: "🦄",
                category: "DEX"
              },
              {
                name: "Aave",
                description: "Decentralized lending and borrowing protocol",
                tvl: "$1.8B",
                apy: "8.7%",
                image: "👻",
                category: "Lending"
              },
              {
                name: "Compound",
                description: "Autonomous interest rate protocol",
                tvl: "$1.2B",
                apy: "6.9%",
                image: "🏛️",
                category: "Lending"
              }
            ].map((project, index) => (
              <div key={index} className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 hover:border-[#516AE4] transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{project.image}</div>
                  <div>
                    <h3 className="text-[#fafafa] font-semibold">{project.name}</h3>
                    <span className="text-[#516AE4] text-sm bg-[#516AE4]/10 px-2 py-1 rounded-lg">{project.category}</span>
                  </div>
                </div>
                <p className="text-[#717A8C] text-sm mb-4">{project.description}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[#717A8C] text-xs">TVL</div>
                    <div className="text-[#fafafa] font-semibold">{project.tvl}</div>
                  </div>
                  <div>
                    <div className="text-[#717A8C] text-xs">APY</div>
                    <div className="text-green-400 font-semibold">{project.apy}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[#fafafa] mb-6">All Projects</h2>
          <ProjectsTable />
        </div>
      </div>
    </div>
  );
};

export default Projects;
