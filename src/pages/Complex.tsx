import MainNavigation from "../components/MainNavigation";

const Complex = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#fafafa] mb-4">Advanced Trading</h1>
          <p className="text-[#717A8C] text-lg">
            Professional trading interface with advanced charting and analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Trading Chart */}
          <div className="xl:col-span-3">
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    <div>
                      <h3 className="text-[#fafafa] font-bold">UNC/USDT</h3>
                      <p className="text-[#717A8C] text-sm">$0.85 (+2.4%)</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["1m", "5m", "15m", "1h", "4h", "1d"].map((timeframe) => (
                    <button
                      key={timeframe}
                      className="px-3 py-1 text-sm bg-[#252b36] text-[#717A8C] hover:bg-[#516AE4] hover:text-white rounded-lg transition-colors"
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chart Placeholder */}
              <div className="bg-[#252b36] border border-[#3a4553] rounded-xl h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-[#fafafa] text-xl font-semibold mb-2">Trading Chart</h3>
                  <p className="text-[#717A8C]">Advanced charting will be integrated here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Book & Trade Panel */}
          <div className="space-y-6">
            {/* Order Book */}
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
              <h3 className="text-[#fafafa] font-semibold mb-4">Order Book</h3>
              
              {/* Sell Orders */}
              <div className="mb-4">
                <div className="text-[#717A8C] text-xs mb-2">SELL ORDERS</div>
                <div className="space-y-1">
                  {[
                    { price: "0.856", amount: "1,234", total: "1,056.30" },
                    { price: "0.855", amount: "2,567", total: "2,194.89" },
                    { price: "0.854", amount: "3,890", total: "3,322.06" },
                  ].map((order, i) => (
                    <div key={i} className="grid grid-cols-3 text-xs">
                      <span className="text-red-400">{order.price}</span>
                      <span className="text-[#717A8C] text-right">{order.amount}</span>
                      <span className="text-[#717A8C] text-right">{order.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Price */}
              <div className="bg-[#252b36] rounded-lg p-2 text-center mb-4">
                <span className="text-green-400 font-bold">$0.850</span>
              </div>

              {/* Buy Orders */}
              <div>
                <div className="text-[#717A8C] text-xs mb-2">BUY ORDERS</div>
                <div className="space-y-1">
                  {[
                    { price: "0.849", amount: "1,567", total: "1,330.38" },
                    { price: "0.848", amount: "2,234", total: "1,894.43" },
                    { price: "0.847", amount: "3,456", total: "2,927.23" },
                  ].map((order, i) => (
                    <div key={i} className="grid grid-cols-3 text-xs">
                      <span className="text-green-400">{order.price}</span>
                      <span className="text-[#717A8C] text-right">{order.amount}</span>
                      <span className="text-[#717A8C] text-right">{order.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Panel */}
            <div className="bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
              <div className="flex gap-2 mb-4">
                <button className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold">
                  BUY
                </button>
                <button className="flex-1 py-2 bg-[#252b36] text-[#717A8C] rounded-lg font-semibold">
                  SELL
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#717A8C] text-sm">Price</label>
                  <input
                    type="number"
                    placeholder="0.850"
                    className="w-full mt-1 bg-[#252b36] border border-[#3a4553] rounded-lg px-3 py-2 text-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="text-[#717A8C] text-sm">Amount</label>
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full mt-1 bg-[#252b36] border border-[#3a4553] rounded-lg px-3 py-2 text-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="text-[#717A8C] text-sm">Total</label>
                  <input
                    type="number"
                    placeholder="850.00"
                    className="w-full mt-1 bg-[#252b36] border border-[#3a4553] rounded-lg px-3 py-2 text-[#fafafa]"
                  />
                </div>

                <button className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                  Place Buy Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="mt-6 bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6">
          <h3 className="text-[#fafafa] font-semibold mb-4">Recent Trades</h3>
          <div className="grid grid-cols-4 text-[#717A8C] text-sm font-medium mb-2">
            <span>Time</span>
            <span>Price</span>
            <span>Amount</span>
            <span>Total</span>
          </div>
          <div className="space-y-2">
            {[
              { time: "14:23:45", price: "0.851", amount: "1,234", total: "1,050.23", type: "buy" },
              { time: "14:23:12", price: "0.849", amount: "567", total: "481.38", type: "sell" },
              { time: "14:22:58", price: "0.850", amount: "2,890", total: "2,456.50", type: "buy" },
            ].map((trade, i) => (
              <div key={i} className="grid grid-cols-4 text-sm py-1">
                <span className="text-[#717A8C]">{trade.time}</span>
                <span className={trade.type === "buy" ? "text-green-400" : "text-red-400"}>
                  {trade.price}
                </span>
                <span className="text-[#fafafa]">{trade.amount}</span>
                <span className="text-[#fafafa]">{trade.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complex;
