import { createPublicClient, http } from "viem"
import { bsc, bscTestnet } from "viem/chains"

// Create public client for blockchain interaction
export const createViemClient = (chainId: number) => {
	let chain
	let rpcUrls: string[] = []

	switch (chainId) {
		case 97: // BSC Testnet
			chain = bscTestnet
			// Multiple RPC endpoints for BSC Testnet
			rpcUrls = [
				'https://bsc-testnet-rpc.publicnode.com',
				'https://bsc-testnet.blockpi.network/v1/rpc/public',
				'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
				'https://data-seed-prebsc-2-s1.bnbchain.org:8545'
			]
			break
		case 56: // BSC Mainnet
			chain = bsc
			rpcUrls = [
				'https://bsc-rpc.publicnode.com',
				'https://rpc.ankr.com/bsc',
				'https://bsc-dataseed1.binance.org'
			]
			break
		default:
			chain = bsc
			rpcUrls = ['hhttps://bsc-dataseed1.binance.org']
	}

	// Use the first available RPC endpoint
	const preferredRpcUrl = rpcUrls[0]

	return createPublicClient({
		chain,
		transport: http(preferredRpcUrl),
	})
}
