import { MdCo2, MdToken } from "react-icons/md";
import BarChart from "../components/BarChart";
import GeographyChart from "../components/GeographyChart";
import { IoPersonAddSharp } from "react-icons/io5";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import ShowWallet from "../components/ShowWallet";

import LineChart from "../components/LineChart";

import { useChains, useChainId } from "wagmi";
import { switchChain } from "@wagmi/core";
import { config } from "../utils/wagmiConfig";

const transactions = [
  {
    id: "01e4dsa",
    name: "Lincoln",
    date: "2024-09-01",
    amount: "$43.95",
  },
  {
    id: "0315dsaa",
    name: "Emmanuel",
    date: "2024-04-01",
    amount: "$133.45",
  },
  // {
  //   id: "01e4dsa",
  //   name: "Kim",
  //   date: "2024-09-01",
  //   amount: "$43.95",
  // },
  // {
  //   id: "02fdgqwe",
  //   name: "Alice",
  //   date: "2023-12-11",
  //   amount: "$78.20",
  // },
  // {
  //   id: "0sdfg45w",
  //   name: "Mark",
  //   date: "2024-02-15",
  //   amount: "$97.00",
  // },
  // {
  //   id: "0fgh67tr",
  //   name: "Sophie",
  //   date: "2024-03-28",
  //   amount: "$52.30",
  // },
  // {
  //   id: "098fdsqw",
  //   name: "John",
  //   date: "2024-08-10",
  //   amount: "$109.50",
  // },
];

const DashBoard = () => {
  const chains = useChains();
  const chainId = useChainId();

  console.log("chains", chainId);
  console.log("chains", chains);

  const activeChain = chains.find((chain) => chain.id == chainId);

  console.log(activeChain?.name);

  return (
    <div>
      <div className="p-3 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">DASHBOARD</h3>
          <p className="text-[#4CCEAC]">Welcome to Carbon Corp's Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <ShowWallet />
          <button
            className="flex items-center text-sm gap-2 bg-[#3E4396] text-white px-2 py-1 rounded"
            onClick={async () => {
              await switchChain(config, { chainId: 97 }); // BSC Testnet
            }}
          >
            {activeChain?.name == "BSC Testnet" || activeChain?.name == "BNB Smart Chain Testnet"
              ? activeChain?.name
              : "CHANGE NETWORK"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-5 p-3">
        <article className="bg-[#1f2a40] p-3 ">
          <div className="flex justify-between ">
            <div className="flex flex-col gap-2">
              <MdCo2 size={22} color="#4CCEAC" />
              <p className="text-lg font-bold">5,000</p>
            </div>
            <div className="border-[5px] border-[#4CCEAC] w-10 h-10 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center text-[#4CCEAC]">
            <p className="text-sm">Reduced Emmissions</p>
            <p>+14%</p>
          </div>
        </article>
        <article className="bg-[#1f2a40] p-3 ">
          <div className="flex justify-between ">
            <div className="flex flex-col gap-2">
              <MdToken size={22} color="#4CCEAC" />
              <p className="text-lg font-bold">431,225</p>
            </div>
            <div className="border-[5px] border-[#4CCEAC] w-10 h-10 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center text-[#4CCEAC]">
            <p className="text-sm">CC Tokens</p>
            <p>+21%</p>
          </div>
        </article>
        <article className="bg-[#1f2a40] p-3 ">
          <div className="flex justify-between ">
            <div className="flex flex-col gap-2">
              <IoPersonAddSharp size={22} color="#4CCEAC" />
              <p className="text-lg font-bold">32</p>
            </div>
            <div className="border-[5px] border-[#4CCEAC] w-10 h-10 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center text-[#4CCEAC]">
            <p className="text-sm">New Carbon Projects</p>
            <p>+5%</p>
          </div>
        </article>
        <article className="bg-[#1f2a40] p-3 ">
          <div className="flex justify-between  ">
            <div className="flex flex-col gap-2">
              <RiVerifiedBadgeFill size={22} color="#4CCEAC" />
              <p className="text-lg font-bold">1,325,132</p>
            </div>
            <div className="border-[5px] border-[#4CCEAC] w-10 h-10 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center text-[#4CCEAC]">
            <p className="text-sm">Verified Emmissions</p>
            <p>+43%</p>
          </div>
        </article>
      </div>

      <section className="grid grid-cols-3 p-3 col-span-3 gap-3">
        <div className="col-span-2 rounded  h-[13rem] bg-[#1f2a40]">
          <LineChart />
        </div>
        <div className="col-span-1  h-[13rem]">
          <div className="text-sm bg-[#1f2a40] mb-1.5 font-semibold p-2">
            Recent CC Trasactions
          </div>
          <div className="overflow-hidden">
            {transactions.map((tsx) => (
              <div
                key={tsx.id}
                className="text-sm flex overflow-hidden justify-between items-center bg-[#1f2a40] mb-2 font-semibold p-2"
              >
                <div>
                  <p className="text-[#4CCEAC]">{tsx.id}</p>
                  <p>{tsx.name}</p>
                </div>
                <div>{tsx.date}</div>
                <div className="p-2 rounded bg-[#4CCEAC]">{tsx.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="my-3 p-3 grid lg:grid-cols-3 gap-3">
        <article className="rounded-lg p-3 h-[17rem] bg-[#1f2a40]">
          <h4 className="">Carbon Campaign</h4>
          <div className="flex flex-col justify-center items-center">
            <div className="border-[1.5rem] border-[#4CCEAC] rounded-full w-[8rem] h-[8rem] my-4" />
            <p className="text-[#4CCEAC] font-semibold text-center">
              $48,353 revenue generated
            </p>
            <p className="text-center">By Carbon Credits and offsets</p>
          </div>
        </article>
        <article className="rounded-lg p-3 h-[17rem] bg-[#1f2a40]">
          <h4 className="">Carbon Sales Quantity</h4>
          <BarChart />
        </article>
        <article className="rounded-lg p-3 h-[17rem] bg-[#1f2a40]">
          <h4>Geography Based Carbon Traffic</h4>

          <GeographyChart />
        </article>
      </section>
    </div>
  );
};

export default DashBoard;
