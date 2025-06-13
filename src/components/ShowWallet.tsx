import { IoIosArrowDown } from "react-icons/io";

import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";

const ShowWallet = () => {
  const { isConnected, address } = useAccount();

  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => {
          if (!isConnected) {
            navigate("/wallet");
          }
        }}
        className="flex text-sm items-center gap-2 bg-[#1f2a40] text-white px-2 py-1 rounded"
      >
        {isConnected ? address : "CONNECT WALLET"}
        <IoIosArrowDown />
      </button>

      <div className=""></div>
    </div>
  );
};

export default ShowWallet;
