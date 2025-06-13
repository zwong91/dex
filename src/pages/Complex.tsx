import Header from "../components/Header";
import Logo from "../assets/user.png.png";

const Complex = () => {
  return (
    <div>
      <div>
        <Header
          title="MARKETPLACE"
          subtitle="Welcome to UNC Protocol Marketplace"
        />
      </div>
      <div className="grid grid-cols-5 gap-5 w-full">
        <article className="col-span-3 ">
          <div className="bg-white p-4 rounded-lg flex mb-2 text-xs  items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={Logo} className="h-10" />
              <p className="font-bold text-sm text-black">UNC/USDT</p>
            </div>
            <div>
              <p className="text-[#419E6A] font-bold text-sm">2,238.00</p>
              <p className="text-[#767E9C]">Last market price</p>
            </div>
            <div>
              <p className="text-[#419E6A] font-semibold text-sm">+1.75%</p>
              <p className="text-[#767E9C]">24h Change</p>
            </div>
            <div>
              <p className="text-[#111] font-semibold text-sm">3,597.80</p>
              <p className="text-[#767E9C]">24h High</p>
            </div>
            <div>
              <p className="text-[#111] font-semibold text-lg">3,233.6</p>
              <p className="text-[#767E9C]">24h Low</p>
            </div>
            <div>
              <p className="text-[#111] font-semibold text-lg">
                2,548,722,097.16
              </p>
              <p className="text-[#767E9C]">Market Volume</p>
            </div>
          </div>
          <div className="p-5 bg-white w-full">
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-gray-600 mb-4">Advanced Trading Chart</h3>
              <p className="text-gray-500">Chart functionality will be implemented here</p>
            </div>
          </div>
        </article>

        <article className="col-span-2 border p-5"></article>
      </div>
    </div>
  );
};

export default Complex;
