import { useState } from "react";
import { useAccount, useWriteContract, useChainId } from "wagmi";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { FaArrowRight, FaCog } from "react-icons/fa";
import { IoSwapVertical } from "react-icons/io5";
import Dropdown from "../components/Dropdown";
import {
  getUNCBalance,
  getPairedTokenBalance,
  getUNCPrice,
} from "../utils/uncUtils";
import { uncSwapAbi } from "../utils/abis/uncSwap";
import { BSC_NETWORKS } from "../utils/wagmiConfig";

const Simple = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [swapAmount, setSwapAmount] = useState(0);
  const [swapAmountPaired, setSwapAmountPaired] = useState(0);
  const { writeContract, isSuccess, error, isPending } = useWriteContract();
  const [activeAction, setActiveAction] = useState(0);

  const chainId = useChainId();

  // BSC Network Configuration
  let uncSwapAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    uncSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
  } else {
    // Default to testnet
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
  }

  const swapUNCToOther = (uncAmount: number) => {
    const unc = ethers.parseUnits(uncAmount.toString(), "ether");

    console.log("unc", unc);

    writeContract({
      abi: uncSwapAbi,
      address: uncSwapAddress,
      functionName: "swapUNC",
      args: [unc],
      chainId: chainId,
    });

    return;
  };

  const swapOtherToUNC = (pairedAmount: number) => {
    const paired = ethers.parseUnits(pairedAmount.toString(), "ether");

    console.log("paired", paired);

    writeContract({
      abi: uncSwapAbi,
      address: uncSwapAddress,
      functionName: "swapToUNC",
      args: [paired],
      chainId: chainId,
    });

    return;
  };

  const handleSwap = () => {
    setActiveAction(1);
    swapUNCToOther(swapAmount);
  };
  
  const handleSwapToUNC = () => {
    setActiveAction(2);
    swapOtherToUNC(swapAmountPaired);
  };

  return (
    <div className="flex gap-10 justify-center items-center">
      <article>
        <div className="flex justify-end">
          <button
            className="bg-[#516AE4] text-white py-2 px-4 rounded-md flex items-center gap-2"
            onClick={() => navigate("/wallet")}
          >
            <FaArrowRight />
            Wallet
          </button>
        </div>
        <div className="p-7 bg-[#252b36] rounded-lg w-[30rem]">
          <div className="flex items-center justify-between">
            <p className="text-[#717A8C] font-bold">Swap UNC</p>
            <FaCog size={20} color="#717A8C" />
          </div>
          <div className="relative flex flex-col gap-3 mt-3">
            <div className="w-14 absolute inset-0 m-auto h-14 border flex justify-center items-center rounded-full p-5 bg-[#2b3342]">
              <IoSwapVertical color="#717A8C" size={30} />
            </div>
            <div className="h-24 bg-[#2b3342] rounded-lg flex flex-col justify-between p-3">
              <div className="flex justify-between items-center">
                <Dropdown asset="UNC" label="" />
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  className="block py-2 pl-3 w-40 border rounded-md border-gray-300 pr-10 text-black"
                  onChange={(e) => setSwapAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#717A8C]">
                  Balance: {getUNCBalance(address!)} UNC{" "}
                </p>
                <p className="text-[#717A8C]"> = $ 626.23</p>
              </div>
            </div>
            <div className="h-24 bg-[#2b3342] rounded-lg flex flex-col justify-between p-3">
              <div className="flex justify-between items-center">
                <Dropdown asset="USDT" label="" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#717A8C]">
                  Balance: {getPairedTokenBalance(address!)} USDT
                </p>
                <p className="text-[#717A8C]"> = $ 626.23</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-7 bg-[#252b36] rounded-lg w-[30rem] mt-3">
          <div className="relative flex flex-col gap-3 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[#717A8C] font-bold">Summary</p>
            </div>
            <div className=" p-3 bg-[#2b3342] rounded-lg border border-[#516AE4]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#717A8C]">Price</p>
                <p className="text-[#717A8C]">
                  1 UNC = {getUNCPrice() * 10 ** -18} USDT
                </p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#717A8C]">You will receive</p>
                <p className="text-[#717A8C]">
                  {swapAmount} UNC ={" "}
                  {swapAmount * (getUNCPrice() * 10 ** -18)} USDT
                </p>
              </div>
              <div className="flex items-center justify-between mb-2">
                {/* <p className="text-[#717A8C]">Fee</p>
                <p className="text-[#717A8C]">0 USDT</p> */}
              </div>
            </div>

            <button
              className="w-full text-lg p-3 shadow-lg bg-[#516AE4] rounded-lg"
              onClick={handleSwap}
            >
              Swap UNC to USDT
            </button>
          </div>
          {activeAction == 1 && isPending && !isSuccess && (
            <p className="text-[#76809D]">Loading...</p>
          )}
          {activeAction == 1 && isSuccess && (
            <p className="text-[#76809D]">Swap successful!</p>
          )}
          {activeAction == 1 && error && (
            <p className="text-[#76809D]">Error making transaction</p>
          )}
          {activeAction == 1 && error && (
            <div className="text-red-500 mt-2">Error: {error.name}</div>
          )}
        </div>
      </article>
      <article>
        <div className="flex justify-end"></div>
        <div className="p-7 bg-[#252b36] rounded-lg w-[30rem]">
          <div className="flex items-center justify-between">
            <p className="text-[#717A8C] font-bold">Swap to UNC</p>
            <FaCog size={20} color="#717A8C" />
          </div>
          <div className="relative flex flex-col gap-3 mt-3">
            <div className="w-14 absolute inset-0 m-auto h-14 border flex justify-center items-center rounded-full p-5 bg-[#2b3342]">
              <IoSwapVertical color="#717A8C" size={30} />
            </div>
            <div className="h-24 bg-[#2b3342] rounded-lg flex flex-col justify-between p-3">
              <div className="flex justify-between items-center">
                <Dropdown asset="USDT" label="" />
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  className="block py-2 pl-3 w-40 border rounded-md border-gray-300 pr-10 text-black"
                  onChange={(e) => setSwapAmountPaired(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#717A8C]">
                  Balance: {getPairedTokenBalance(address!)} USDT{" "}
                </p>
                <p className="text-[#717A8C]"> = $ 626.23</p>
              </div>
            </div>
            <div className="h-24 bg-[#2b3342] rounded-lg flex flex-col justify-between p-3">
              <div className="flex justify-between items-center">
                <Dropdown asset="UNC" label="" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#717A8C]">
                  Balance: {getUNCBalance(address!)} UNC
                </p>
                <p className="text-[#717A8C]"> = $ 626.23</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-7 bg-[#252b36] rounded-lg w-[30rem] mt-3">
          <div className="relative flex flex-col gap-3 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[#717A8C] font-bold">Summary</p>
            </div>
            <div className=" p-3 bg-[#2b3342] rounded-lg border border-[#516AE4]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#717A8C]">Price</p>
                <p className="text-[#717A8C]">
                  1 USDT = {1 / (getUNCPrice() * 10 ** -18)} UNC
                </p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#717A8C]">You will receive</p>
                <p className="text-[#717A8C]">
                  {swapAmountPaired} USDT ={" "}
                  {swapAmountPaired * (1 / (getUNCPrice() * 10 ** -18))} UNC
                </p>
              </div>
              <div className="flex items-center justify-between mb-2">
                {/* <p className="text-[#717A8C]">Fee</p>
                <p className="text-[#717A8C]">0 UNC</p> */}
              </div>
            </div>

            <button
              className="w-full text-lg p-3 shadow-lg bg-[#516AE4] rounded-lg"
              onClick={handleSwapToUNC}
            >
              Swap USDT to UNC
            </button>
          </div>
          {activeAction == 2 && isPending && !isSuccess && (
            <p className="text-[#76809D]">Loading...</p>
          )}
          {activeAction == 2 && isSuccess && (
            <p className="text-[#76809D]">Swap successful!</p>
          )}
          {activeAction == 2 && error && (
            <p className="text-[#76809D]">Error making transaction</p>
          )}
          {activeAction == 2 && error && (
            <div className="text-red-500 mt-2">Error: {error.name}</div>
          )}
        </div>
      </article>
    </div>
  );
};

export default Simple;
