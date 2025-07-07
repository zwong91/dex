import { ChainId, Token } from "@lb-xyz/sdk-core"

// ====== LB SDK CONFIGURATION ======

// Multi-network token definitions
export const TOKEN_CONFIGS = {
	[ChainId.BNB_TESTNET]: {
		BNB: new Token(ChainId.BNB_TESTNET, "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", 18, "BNB", "BNB"),
		USDC: new Token(ChainId.BNB_TESTNET, "0x64544969ed7EBf5f083679233325356EbE738930", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_TESTNET, "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", 18, "USDT", "Tether"),
	},
	[ChainId.BNB_CHAIN]: {
		BNB: new Token(ChainId.BNB_CHAIN, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "BNB", "BNB"),
		USDC: new Token(ChainId.BNB_CHAIN, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_CHAIN, "0x55d398326f99059fF775485246999027B3197955", 18, "USDT", "Tether"),
	},
}

// Convert wagmi chain ID to SDK chain ID
export const wagmiChainIdToSDKChainId = (wagmiChainId: number): ChainId => {
	switch (wagmiChainId) {
		case 97: // BSC Testnet
			return ChainId.BNB_TESTNET
		case 56: // BSC Mainnet
			return ChainId.BNB_CHAIN
		case 1: // Ethereum Mainnet
			return ChainId.ETHEREUM
		default:
			return ChainId.BNB_TESTNET // Default fallback
	}
}

// Get SDK tokens for specific chain (for trading operations)
export const getSDKTokensForChain = (chainId: number) => {
	const sdkChainId = wagmiChainIdToSDKChainId(chainId)
	return TOKEN_CONFIGS[sdkChainId as keyof typeof TOKEN_CONFIGS] || TOKEN_CONFIGS[ChainId.BNB_TESTNET]
}

// Helper function to get SDK token by address for specific chain
export const getSDKTokenByAddress = (address: string, chainId: number): Token | undefined => {
	if (!address) {
		console.warn('getSDKTokenByAddress: address is undefined or empty')
		return undefined
	}
	
	const tokens = getSDKTokensForChain(chainId)
	return Object.values(tokens as Record<string, Token>).find(token =>
		token.address.toLowerCase() === address.toLowerCase()
	)
}
