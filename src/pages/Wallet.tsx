import Header from "../components/Header";

import { useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import {
  Connector,
  useConnect,
  useAccount,
  useDisconnect,
  useWriteContract,
  useChainId,
  useReadContract,
  useWatchContractEvent,
} from "wagmi";

import { ethers } from "ethers";
import { getUNCBalance, getUNCLTBalance, getPairedTokenBalance } from "../utils/uncUtils";
import { uncSwapAbi } from "../utils/abis/uncSwap";
import { erc20Abi } from "viem";
import { BSC_NETWORKS } from "../utils/wagmiConfig";

const Wallet = () => {
  /*  const [init, setInit] = useState(false);
  const coins = [
    {
      id: 1,
      name: "Carbon Corp Wallet",
      image: cc,
    },
    {
      id: 2,
      name: "WalletConnect",
      image: wc,
    },
    {
      id: 3,
      name: "Metamask",
      image: mm,
    },
  ]; */

  const { connectors, connect } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [uncDepositAmount, setUNCDepositAmount] = useState(0);
  const [pairedDepositAmount, setPairedDepositAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [activeAction, setActiveAction] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  let { writeContract, isSuccess, error, isPending } = useWriteContract();

  const chainId = useChainId();

  // BSC Network Configuration
  let uncSwapAddress: `0x${string}`;
  let UNCAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    uncSwapAddress = BSC_NETWORKS.mainnet.contracts.uncSwap as `0x${string}`;
    UNCAddress = BSC_NETWORKS.mainnet.contracts.uncToken as `0x${string}`;
  } else {
    // Default to testnet for unsupported chains
    uncSwapAddress = BSC_NETWORKS.testnet.contracts.uncSwap as `0x${string}`;
    UNCAddress = BSC_NETWORKS.testnet.contracts.uncToken as `0x${string}`;
  }

  let PairedAddress: `0x${string}`;

  if (chainId === 97) { // BSC Testnet
    PairedAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
  } else if (chainId === 56) { // BSC Mainnet
    PairedAddress = BSC_NETWORKS.mainnet.contracts.pairedToken as `0x${string}`;
  } else {
    // Default to testnet
    PairedAddress = BSC_NETWORKS.testnet.contracts.pairedToken as `0x${string}`;
  }
  //get allowance
  const { data: allowancePaired, refetch } = useReadContract({
    abi: erc20Abi,
    address: PairedAddress,
    functionName: "allowance",
    args: [address!, uncSwapAddress],
    account: address,
    chainId: chainId,
  });

  useWatchContractEvent({
    address: PairedAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetch();
      }
    },
  });

  const { data: allowanceUNC } = useReadContract({
    abi: erc20Abi,
    address: UNCAddress,
    functionName: "allowance",
    args: [address!, uncSwapAddress],
    account: address,
    chainId: chainId,
  });

  useWatchContractEvent({
    address: UNCAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetch();
      }
    },
  });

  let UNC_allowance;
  let Paired_allowance;

  if (allowanceUNC) {
    UNC_allowance = ethers.formatUnits(allowanceUNC!, 18);
  } else {
    UNC_allowance = 0;
  }

  if (allowancePaired) {
    Paired_allowance = ethers.formatUnits(allowancePaired!, 18);
  } else {
    Paired_allowance = 0;
  }

  useEffect(() => {
    if (allowancePaired) {
      Paired_allowance = ethers.formatUnits(allowancePaired!, 18);
    } else {
      Paired_allowance = 0;
    }
  }, [allowancePaired]);

  useEffect(() => {
    if (allowanceUNC) {
      UNC_allowance = ethers.formatUnits(allowanceUNC!, 18);
    } else {
      UNC_allowance = 0;
    }
  }, [allowanceUNC]);

  const approvePairedSpender = () => {
    writeContract({
      abi: erc20Abi,
      address: PairedAddress,
      functionName: "approve",
      args: [uncSwapAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  const approveUNCSpender = () => {
    writeContract({
      abi: erc20Abi,
      address: UNCAddress,
      functionName: "approve",
      args: [uncSwapAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  //check for allowance for the tokens, if zero give as 1m

  const depositLiquidity = (uncAmount: number, pairedAmount: number) => {
    const unc = ethers.parseUnits(uncAmount.toString(), "ether");
    let paired = ethers.parseUnits(pairedAmount.toString(), "ether");

    console.log("unc", unc, "paired", paired);

    writeContract({
      abi: uncSwapAbi,
      address: uncSwapAddress,
      functionName: "addLiquidity",
      args: [unc, paired],
      chainId: chainId,
    });
  };

  //const ratio = getPoolRatio();

  const handleDeposit = () => {
    setActiveAction(1);
    depositLiquidity(uncDepositAmount, pairedDepositAmount);
  };

  const withdrawLiquidity = (uncltAmount: number) => {
    const unclt = ethers.parseUnits(uncltAmount.toString(), "ether");

    console.log("unclt", unclt);

    writeContract({
      abi: uncSwapAbi,
      address: uncSwapAddress,
      functionName: "removeLiquidity",
      args: [unclt],
      chainId: chainId,
    });

    return;
  };

  const handleWithdrawal = () => {
    setActiveAction(2);
    withdrawLiquidity(withdrawalAmount);
  };

  function WalletOption({
    connector,
    onClick,
  }: {
    connector: Connector;
    onClick: () => void;
  }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      (async () => {
        const provider = await connector.getProvider();
        setReady(!!provider);
      })();
    }, [connector]);

    return (
      <button disabled={!ready} onClick={onClick}>
        {connector.name}
      </button>
    );
  }

  return (
    <div className="h-[75vh] relative">
      <Header
        title="CONNECT WALLET"
        subtitle="Connect a wallet that you own."
      />

      <section className="flex flex-col justify-center gap- items-center h-full space-y-1 mt-100">
        {!isConnected ? (
          <div className="rounded-lg w-[25rem] p-5 c bg-white">
            <h4 className="text-black font-semibold">Connect to wallet</h4>
            <div className="h-50">
              {connectors.map((connector) => (
                <div className="flex justify-between gap-3 bg-[#DBDDE5] border p-3 rounded-md shadow items-center mt-3">
                  <WalletOption
                    onClick={() => connect({ connector })}
                    key={connector.uid}
                    connector={connector}
                  ></WalletOption>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-center text-[#5A6689] text-sm">
                By connecting to a wallet, you agree to CC
              </p>
              <p className="text-center text-[#2563EB] text-sm">
                Terms of service
              </p>
            </div>
          </div>
        ) : null}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="p-5 bg-white rounded-lg w-[25rem]">
            <h4 className="text-black font-semibold">Deposit</h4>
            <div>
              <Dropdown label="Asset" asset="UNC : USDT Pair " />

              <div>
                <label
                  htmlFor="account-number"
                  className="block text-sm font-medium text-black"
                >
                  Amount in UNC:
                </label>
                <div className="relative mt-1 rounded-md shadow-sm ">
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 text-black"
                    onChange={(e) => setUNCDepositAmount(Number(e.target.value))}
                  />
                  <label
                    htmlFor="account-number"
                    className="block text-sm font-medium text-black"
                  >
                    Amount in Paired Token:
                  </label>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 text-black mt-1"
                    onChange={(e) => setPairedDepositAmount(Number(e.target.value))}
                  />
                  {/*   <div className="pointer-events-none absolute text-blue-400 inset-y-0 right-0 flex items-center pr-3">
                    MAX
                  </div> */}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[#76809D]">Available</p>
              <p className="text-[#76809D]">{getUNCBalance(address!)} UNC</p>
              <p className="text-[#76809D]">{getPairedTokenBalance(address!)} USDT</p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-[#76809D]">Allowance:</p>
              <p className="text-[#76809D]">
                {Number(UNC_allowance?.toString()).toFixed(4)} UNC
              </p>
              <p className="text-[#76809D]">
                {Number(Paired_allowance?.toString()).toFixed(4)} USDT
              </p>
            </div>
            {/* <p className="text-[#76809D]">
              Amount to be deposited: {depositAmount} CC :{" "}
              {(depositAmount / (getPoolRatio() * 10 ** -18)).toFixed(4)} TT
            </p> */}

            {/*  <div>
              <h6 className="text-[#76809D]">Expiration time</h6>
              <div className="flex justify-between my-3">
                <div className="flex items-center gap-2">
                  <input type="radio" name="time" id="" />
                  <label htmlFor="time" className="text-gray-600">
                    5 m
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" name="time" id="" />
                  <label htmlFor="time" className="text-gray-600">
                    10 m
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" name="time" id="" />
                  <label htmlFor="time" className="text-gray-600">
                    30 m
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" name="time" id="" />
                  <label htmlFor="time" className="text-gray-600">
                    1 h
                  </label>
                </div>
              </div>
            </div> */}
            <div className="mt-3 flex items-center gap-3 justify-end">
              <button
                className="text-black p-2 border  rounded-lg"
                onClick={() => {
                  setActiveAction(0);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-[#00632B] p-2 text-white rounded-lg"
                onClick={handleDeposit}
              >
                Confirm Deposit
              </button>
            </div>
            {activeAction == 1 && isPending && !isSuccess && (
              <p className="text-[#76809D]">Loading...</p>
            )}
            {activeAction == 1 && isSuccess && (
              <p className="text-[#76809D]">Deposit successful!</p>
            )}
            {activeAction == 1 && error && (
              <p className="text-[#76809D]">Error making transaction</p>
            )}
            {activeAction == 1 && error && (
              <div className="text-red-500 mt-2">Error: {error.name}</div>
            )}
          </div>
          <div className="p-5 bg-white rounded-lg w-[25rem]">
            <h4 className="text-black font-semibold">Withdraw</h4>
            <div>
              <Dropdown label="Asset" asset="CCLT(Liquidity Token)" />
              <div>
                <label
                  htmlFor="account-number"
                  className="block text-sm font-medium text-black"
                >
                  Amount
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 outline-none sm:text-sm text-black"
                    onChange={(e) =>
                      setWithdrawalAmount(Number(e.target.value))
                    }
                  />
                  <div className="pointer-events-none absolute text-blue-400 inset-y-0 right-0 flex items-center pr-3">
                    MAX
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[#76809D]">Available</p>
                <p className="text-[#76809D]">
                  {getUNCLTBalance(address!)} UNCLT
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[#76809D]">Locked Balances</p>
                <p className="text-[#76809D]">
                  {getUNCLTBalance(address!)} UNCLT
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 justify-end">
              <button
                className="text-black p-2 border  rounded-lg"
                onClick={() => {
                  if (error) {
                    error.message = "";
                  }
                }}
              >
                Cancel
              </button>
              <button
                className="bg-[#00632B] p-2 text-white rounded-lg"
                onClick={handleWithdrawal}
              >
                Confirm Withdraw
              </button>
            </div>
            {activeAction == 2 && isPending && !isSuccess && (
              <p className="text-[#76809D]">Loading...</p>
            )}
            {activeAction == 2 && isSuccess && (
              <p className="text-[#76809D]">Withdrawal successful!</p>
            )}
            {activeAction == 2 && error && (
              <p className="text-[#76809D]">Error making transaction</p>
            )}
            {activeAction == 2 && error && (
              <div className="text-red-500 mt-2">Error: {error.message}</div>
            )}
          </div>

          <div>
            <div className="flex flex-row justify-between gap-5">
              <button
                className="bg-[#00632B] p-2 text-white rounded-lg"
                onClick={approveUNCSpender}
              >
                Increase UNC Allowance
              </button>
              <button
                className="bg-[#00632B] p-2 text-white rounded-lg"
                onClick={approvePairedSpender}
              >
                Increase Paired Token Allowance
              </button>
            </div>

            <div className="flex justify-center mt-3">
              <button
                className="bg-[#00632B] p-2 text-white rounded-lg"
                onClick={async () => {
                  //make call to faucet
                  const url = `https://api.carboncorp.xyz/faucet/${address!}`;

                  setIsRequesting(true);

                  try {
                    const response = await fetch(url, {
                      /* body: JSON.stringify({ wallet: address }),
                      method: "POST", */
                    });
                    if (!response.ok) {
                      throw new Error(`Response status: ${response.status}`);
                    }
                    console.log(response);

                    const json = await response.json();
                    console.log(json);

                    setIsRequesting(false);

                    return alert(
                      JSON.stringify({
                        msg: json.msg,
                        tx1_hash: json.CC,
                        tx2_hash: json.TT,
                      })
                    );
                  } catch (error: any) {
                    console.error(error.message);
                    setIsRequesting(false);
                    alert(error);
                  }
                }}
              >
                {isRequesting ? "Requesting..." : "Request Faucet Tokens"}
              </button>
            </div>

            <div className="flex justify-center mt-3">
              <button
                className="bg-[red] p-2 text-white rounded-lg"
                onClick={() => disconnect()}
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Wallet;
