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
import { 
  getTokenABalance, 
  getTokenBBalance, 
  getLiquidityTokenBalance,
  genericDexAbi 
} from "../utils/dexUtils";
import { erc20Abi } from "viem";
import { getNetworkById } from "../utils/dexConfig";

const Wallet = () => {
  const { connectors, connect } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [tokenADepositAmount, setTokenADepositAmount] = useState(0);
  const [tokenBDepositAmount, setTokenBDepositAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  let { writeContract, isSuccess, error, isPending } = useWriteContract();

  const chainId = useChainId();
  const network = getNetworkById(chainId);

  // Network-specific contract addresses
  const dexRouterAddress = network.contracts.dexRouter as `0x${string}`;
  const tokenAAddress = network.contracts.tokenA as `0x${string}`;
  const tokenBAddress = network.contracts.tokenB as `0x${string}`;

  // Get allowances for both tokens
  const { data: allowanceTokenA, refetch: refetchTokenA } = useReadContract({
    abi: erc20Abi,
    address: tokenAAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });

  const { data: allowanceTokenB, refetch: refetchTokenB } = useReadContract({
    abi: erc20Abi,
    address: tokenBAddress,
    functionName: "allowance",
    args: [address!, dexRouterAddress],
    account: address,
    chainId: chainId,
  });

  // Watch for approval events
  useWatchContractEvent({
    address: tokenAAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetchTokenA();
      }
    },
  });

  useWatchContractEvent({
    address: tokenBAddress,
    abi: erc20Abi,
    eventName: "Approval",
    onLogs(logs) {
      const relevantLog = logs.find((log) => log.args.owner === address);
      if (relevantLog) {
        refetchTokenB();
      }
    },
  });

  let tokenA_allowance;
  let tokenB_allowance;

  if (allowanceTokenA) {
    tokenA_allowance = ethers.formatUnits(allowanceTokenA!, 18);
  } else {
    tokenA_allowance = 0;
  }

  if (allowanceTokenB) {
    tokenB_allowance = ethers.formatUnits(allowanceTokenB!, 18);
  } else {
    tokenB_allowance = 0;
  }

  useEffect(() => {
    if (allowanceTokenB) {
      tokenB_allowance = ethers.formatUnits(allowanceTokenB!, 18);
    } else {
      tokenB_allowance = 0;
    }
  }, [allowanceTokenB]);

  useEffect(() => {
    if (allowanceTokenA) {
      tokenA_allowance = ethers.formatUnits(allowanceTokenA!, 18);
    } else {
      tokenA_allowance = 0;
    }
  }, [allowanceTokenA]);

  const approveTokenBSpender = () => {
    writeContract({
      abi: erc20Abi,
      address: tokenBAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  const approveTokenASpender = () => {
    writeContract({
      abi: erc20Abi,
      address: tokenAAddress,
      functionName: "approve",
      args: [dexRouterAddress, ethers.parseEther("1000000")],
      chainId: chainId,
    });
  };

  const depositLiquidity = (tokenAAmount: number, tokenBAmount: number) => {
    const tokenA = ethers.parseUnits(tokenAAmount.toString(), "ether");
    let tokenB = ethers.parseUnits(tokenBAmount.toString(), "ether");

    console.log("tokenA", tokenA, "tokenB", tokenB);

    writeContract({
      abi: genericDexAbi,
      address: dexRouterAddress,
      functionName: "addLiquidity",
      args: [tokenA, tokenB],
      chainId: chainId,
    });
  };

  const handleDeposit = () => {
    depositLiquidity(tokenADepositAmount, tokenBDepositAmount);
  };

  const withdrawLiquidity = (liquidityAmount: number) => {
    const liquidity = ethers.parseUnits(liquidityAmount.toString(), "ether");

    console.log("liquidity", liquidity);

    writeContract({
      abi: genericDexAbi,
      address: dexRouterAddress,
      functionName: "removeLiquidity",
      args: [liquidity],
      chainId: chainId,
    });

    return;
  };

  const handleWithdrawal = () => {
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
      <button
        disabled={!ready}
        onClick={onClick}
        className="p-2 bg-white rounded-lg flex justify-between items-center w-[30rem]"
      >
        <div className="flex items-center gap-3">
          <img
            src={connector.icon}
            alt={connector.name}
            className="w-8 h-8 rounded-md"
          />
          <h4 className="text-black">{connector.name}</h4>
        </div>
        {ready ? (
          <div className="bg-green-500 p-2 rounded-lg">
            <p className="text-white">Ready</p>
          </div>
        ) : (
          <div className="bg-red-500 p-2 rounded-lg">
            <p className="text-white">Not Ready</p>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="bg-[#161d29] min-h-screen">
      <Header />
      <div className="p-5">
        <h3 className="text-[#fafafa] text-xl font-semibold">
          Liquidity Management
        </h3>
        <div className="my-8">
          {error && (
            <div className="bg-red-500 p-3 rounded-lg mb-4">
              <p className="text-white">Error: {error.message}</p>
            </div>
          )}
          {isSuccess && (
            <div className="bg-green-500 p-3 rounded-lg mb-4">
              <p className="text-white">Transaction successful!</p>
            </div>
          )}
          {isPending && (
            <div className="bg-yellow-500 p-3 rounded-lg mb-4">
              <p className="text-white">Transaction pending...</p>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="flex justify-center">
            <div className="p-5 bg-white rounded-lg w-[35rem]">
              <h3 className="text-black text-center font-semibold text-lg mb-5">
                Connect Wallet
              </h3>
              <div className="space-y-3">
                {connectors.map((connector) => (
                  <WalletOption
                    key={connector.uid}
                    connector={connector}
                    onClick={() => connect({ connector })}
                  />
                ))}
              </div>
              <p className="text-center text-gray-600 text-sm mt-4">
                By connecting to a wallet, you agree to the Terms of Service
              </p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="p-5 bg-white rounded-lg w-[25rem]">
              <h4 className="text-black font-semibold">Add Liquidity</h4>
              <div>
                <Dropdown label="Trading Pair" asset="Token A : Token B Pair" />

                <div>
                  <label
                    htmlFor="tokenA-amount"
                    className="block text-sm font-medium text-black"
                  >
                    Amount in Token A:
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 text-black"
                      onChange={(e) => setTokenADepositAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="tokenB-amount"
                    className="block text-sm font-medium text-black"
                  >
                    Amount in Token B:
                  </label>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 text-black mt-1"
                    onChange={(e) => setTokenBDepositAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[#76809D]">Available</p>
                <p className="text-[#76809D]">{getTokenABalance(address!)} TOKEN A</p>
                <p className="text-[#76809D]">{getTokenBBalance(address!)} TOKEN B</p>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-[#76809D]">Allowance:</p>
                <p className="text-[#76809D]">
                  {Number(tokenA_allowance?.toString()).toFixed(4)} TOKEN A
                </p>
                <p className="text-[#76809D]">
                  {Number(tokenB_allowance?.toString()).toFixed(4)} TOKEN B
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={approveTokenASpender}
                  className="bg-blue-500 text-white p-2 rounded-lg text-sm"
                >
                  Approve Token A
                </button>
                <button
                  onClick={approveTokenBSpender}
                  className="bg-blue-500 text-white p-2 rounded-lg text-sm"
                >
                  Approve Token B
                </button>
              </div>

              <button
                className="bg-[#2563EB] p-2 text-white rounded-lg w-full mt-4"
                onClick={handleDeposit}
              >
                Add Liquidity
              </button>
            </div>

            {/* Withdraw Liquidity Section */}
            <div className="p-5 bg-white rounded-lg w-[25rem]">
              <h4 className="text-black font-semibold">Remove Liquidity</h4>
              <div>
                <label
                  htmlFor="withdrawal-amount"
                  className="block text-sm font-medium text-black"
                >
                  LP Token Amount:
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="block py-2 pl-3 w-full border rounded-md border-gray-300 pr-10 text-black"
                    onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[#76809D]">Available LP:</p>
                <p className="text-[#76809D]">{getLiquidityTokenBalance(address!)} LP</p>
              </div>

              <button
                className="bg-[red] p-2 text-white rounded-lg w-full mt-4"
                onClick={handleWithdrawal}
              >
                Remove Liquidity
              </button>
            </div>

            {/* Network Info Section */}
            <div className="p-5 bg-white rounded-lg w-[25rem]">
              <h4 className="text-black font-semibold">Network Information</h4>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="text-black">{network.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID:</span>
                  <span className="text-black">{chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="text-black">{network.nativeCurrency.symbol}</span>
                </div>
              </div>
              
              {network.faucet?.enabled && (
                <div className="mt-4">
                  <button
                    className="bg-green-500 p-2 text-white rounded-lg w-full"
                    onClick={async () => {
                      if (!address) return;
                      
                      const url = `${network.faucet.endpoint}/${address}`;
                      setIsRequesting(true);

                      try {
                        const response = await fetch(url);
                        if (!response.ok) {
                          throw new Error(`Response status: ${response.status}`);
                        }
                        const json = await response.json();
                        setIsRequesting(false);
                        alert(`Faucet request successful: ${JSON.stringify(json)}`);
                      } catch (error: any) {
                        console.error(error.message);
                        setIsRequesting(false);
                        alert(`Faucet error: ${error.message}`);
                      }
                    }}
                  >
                    {isRequesting ? "Requesting..." : "Request Test Tokens"}
                  </button>
                </div>
              )}

              <div className="flex justify-center mt-3">
                <button
                  className="bg-red-500 p-2 text-white rounded-lg"
                  onClick={() => disconnect()}
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
