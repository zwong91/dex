import { http, createConfig } from "wagmi";
import { bsc, bscTestnet, mainnet } from "wagmi/chains";

import {
  coinbaseWallet,
  walletConnectWallet,
  metaMaskWallet,
  rabbyWallet,
  trustWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";

const projectId = "09c1182f7b2cb58c98f0b8ed1f223d91";

// Multi-chain wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, trustWallet, injectedWallet],
    },
    {
      groupName: "Multi-Chain Wallets",
      wallets: [coinbaseWallet, rabbyWallet],
    },
    {
      groupName: "Wallet Connect",
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: "EntySquare",
    projectId: projectId,
  }
);

// Multi-chain Configuration
export const config = createConfig({
  chains: [bscTestnet, bsc, mainnet],
  connectors,
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
    [bsc.id]: http("https://bsc-dataseed1.binance.org/"),
    [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
  },
  ssr: true,
});

// Network Constants (keeping for backward compatibility)
export const BSC_NETWORKS = {
  testnet: {
    id: bscTestnet.id,
    name: bscTestnet.name,
    nativeCurrency: bscTestnet.nativeCurrency,
    rpcUrls: bscTestnet.rpcUrls,
    blockExplorers: bscTestnet.blockExplorers,
    contracts: {
      uncToken: "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882",
      pairedToken: "0xafC9D020d0b67522337058f0fDea057769dd386A",
      uncSwap: "0xC8fb994B992B01C72c969eC9C077CD030eaD2A7F",
      uncLiquidityToken: "0x4a62fa31Cd52BE39a57621783f16DEC3c54e30ac",
    }
  },
  mainnet: {
    id: bsc.id,
    name: bsc.name,
    nativeCurrency: bsc.nativeCurrency,
    rpcUrls: bsc.rpcUrls,
    blockExplorers: bsc.blockExplorers,
    contracts: {
      uncToken: "0x8f6fDE1B60e0d74CA7B3fD496444Dac2f2C7d882", // Placeholder - update with mainnet addresses
      pairedToken: "0xafC9D020d0b67522337058f0fDea057769dd386A", // Placeholder - update with mainnet addresses
      uncSwap: "0xC8fb994B992B01C72c969eC9C077CD030eaD2A7F", // Placeholder - update with mainnet addresses
      uncLiquidityToken: "0x4a62fa31Cd52BE39a57621783f16DEC3c54e30ac", // Placeholder - update with mainnet addresses
    }
  }
};

export const DEFAULT_CHAIN = bscTestnet; // Use testnet as default for development
