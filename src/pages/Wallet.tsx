import { useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import MainNavigation from "../components/MainNavigation";
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
  useTokenABalance, 
  useTokenBBalance, 
  useLiquidityTokenBalance,
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

  // Use the correct hooks for token balances
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const liquidityTokenBalance = useLiquidityTokenBalance(address);

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
    
    // Get wallet info based on connector name
    const getWalletInfoByName = (name: string) => {
      const walletMap: Record<string, { icon: string; description: string }> = {
        'MetaMask': {
          icon: '/src/assets/metamask.png',
          description: 'Connect using browser wallet'
        },
        'WalletConnect': {
          icon: '/src/assets/WalletConnect.png',
          description: 'Connect using mobile wallet'
        },
        'Coinbase Wallet': {
          icon: '/src/assets/coinbase.svg',
          description: 'Connect using Coinbase Wallet'
        },
        'Trust Wallet': {
          icon: '/src/assets/trust.svg',
          description: 'Connect using Trust Wallet'
        },
        'Rabby Wallet': {
          icon: '/src/assets/rabby.svg',
          description: 'Connect using Rabby Wallet'
        }
      };
      
      return walletMap[name] || {
        icon: '/src/assets/user.png',
        description: `Connect using ${name}`
      };
    };

    const walletInfo = getWalletInfoByName(connector.name);

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
        className="w-full flex items-center justify-between p-4 bg-[#252b36] hover:bg-[#2d3440] border border-[#3a4553] rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={walletInfo.icon}
              alt={connector.name}
              className="w-10 h-10 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/src/assets/user.png';
              }}
            />
            {ready && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1f2a]" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-[#fafafa] font-semibold text-base">
              {connector.name}
            </h3>
            <p className="text-[#717A8C] text-sm">
              {walletInfo.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          {ready ? (
            <div className="px-3 py-1 bg-green-500/20 border border-green-500 rounded-lg">
              <span className="text-green-300 text-sm font-medium">Ready</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-red-500/20 border border-red-500 rounded-lg">
              <span className="text-red-300 text-sm font-medium">Not Ready</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      <div className="max-w-7xl mx-auto px-6 py-8">
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
          <div className="flex justify-center min-h-screen items-center">
            <div className="p-8 bg-[#1a1f2a] border border-[#3a4553] rounded-2xl w-full max-w-md shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#fafafa] mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-[#717A8C]">
                  Choose a wallet to connect to Universal DEX
                </p>
              </div>
              
              <div className="space-y-4">
                {connectors.map((connector) => (
                  <WalletOption
                    key={connector.uid}
                    connector={connector}
                    onClick={() => connect({ connector })}
                  />
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-[#161d29] rounded-lg border border-[#3a4553]">
                <p className="text-[#717A8C] text-sm text-center">
                  By connecting a wallet, you agree to Universal DEX's{' '}
                  <a href="#" className="text-[#516AE4] hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-[#516AE4] hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
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
                <p className="text-[#76809D]">{tokenABalance} TOKEN A</p>
                <p className="text-[#76809D]">{tokenBBalance} TOKEN B</p>
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
                <p className="text-[#76809D]">{liquidityTokenBalance} LP</p>
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
