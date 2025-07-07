import { ChainId, Token } from "@lb-xyz/sdk-core"

// ====== LB SDK CONFIGURATION ======

// Multi-network token definitions
export const TOKEN_CONFIGS = {
	[ChainId.BNB_TESTNET]: {
		BNB: new Token(ChainId.BNB_TESTNET, "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", 18, "BNB", "BNB"),
		USDC: new Token(ChainId.BNB_TESTNET, "0x64544969ed7EBf5f083679233325356EbE738930", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_TESTNET, "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", 18, "USDT", "Tether"),
		ETH: new Token(ChainId.BNB_TESTNET, "0x8BaBbB98678facC7342735486C851ABD7A0d17Ca", 18, "ETH", "Ethereum"),
		BUSD: new Token(ChainId.BNB_TESTNET, "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7", 18, "BUSD", "Binance USD"),
		CAKE: new Token(ChainId.BNB_TESTNET, "0xFa60D973F7642B748046464e165A65B7323b0DEE", 18, "CAKE", "PancakeSwap Token"),
		BTCB: new Token(ChainId.BNB_TESTNET, "0x6ce8dA28E2f864420840cF74474eFf5fD80E65B8", 18, "BTCB", "Bitcoin BEP20"),
		ADA: new Token(ChainId.BNB_TESTNET, "0xcD34BC54106bd45A04Ed99EBcC2A6a3e70d7210F", 18, "ADA", "Cardano Token"),
		DOT: new Token(ChainId.BNB_TESTNET, "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", 18, "DOT", "Polkadot Token"),
		LINK: new Token(ChainId.BNB_TESTNET, "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06", 18, "LINK", "ChainLink Token"),
	},
	[ChainId.BNB_CHAIN]: {
		BNB: new Token(ChainId.BNB_CHAIN, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "BNB", "BNB"),
		USDC: new Token(ChainId.BNB_CHAIN, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18, "USDC", "USD Coin"),
		USDT: new Token(ChainId.BNB_CHAIN, "0x55d398326f99059fF775485246999027B3197955", 18, "USDT", "Tether"),
		ETH: new Token(ChainId.BNB_CHAIN, "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", 18, "ETH", "Ethereum"),
		BUSD: new Token(ChainId.BNB_CHAIN, "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 18, "BUSD", "Binance USD"),
		CAKE: new Token(ChainId.BNB_CHAIN, "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", 18, "CAKE", "PancakeSwap Token"),
		BTCB: new Token(ChainId.BNB_CHAIN, "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", 18, "BTCB", "Bitcoin BEP20"),
		ADA: new Token(ChainId.BNB_CHAIN, "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", 18, "ADA", "Cardano Token"),
		DOT: new Token(ChainId.BNB_CHAIN, "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", 18, "DOT", "Polkadot Token"),
		LINK: new Token(ChainId.BNB_CHAIN, "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", 18, "LINK", "ChainLink Token"),
		UNI: new Token(ChainId.BNB_CHAIN, "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", 18, "UNI", "Uniswap"),
		DOGE: new Token(ChainId.BNB_CHAIN, "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", 8, "DOGE", "Dogecoin"),
		MATIC: new Token(ChainId.BNB_CHAIN, "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", 18, "MATIC", "Polygon"),
		AVAX: new Token(ChainId.BNB_CHAIN, "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", 18, "AVAX", "Avalanche"),
		ATOM: new Token(ChainId.BNB_CHAIN, "0x0Eb3a705fc54725037CC9e008bDede697f62F335", 18, "ATOM", "Cosmos Token"),
		XRP: new Token(ChainId.BNB_CHAIN, "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", 18, "XRP", "XRP Token"),
		LTC: new Token(ChainId.BNB_CHAIN, "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", 18, "LTC", "Litecoin Token"),
		TRX: new Token(ChainId.BNB_CHAIN, "0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B", 18, "TRX", "TRON"),
		FIL: new Token(ChainId.BNB_CHAIN, "0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153", 18, "FIL", "Filecoin"),
		BCH: new Token(ChainId.BNB_CHAIN, "0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf", 18, "BCH", "Bitcoin Cash Token"),
		ETC: new Token(ChainId.BNB_CHAIN, "0x3d6545b08693daE087E957cb1180ee38B9e3c25E", 18, "ETC", "Ethereum Classic"),
	},
}

// Convert wagmi chain ID to SDK chain ID
export const wagmiChainIdToSDKChainId = (wagmiChainId: number): ChainId => {
	switch (wagmiChainId) {
		case 97: // BSC Testnet
			return ChainId.BNB_TESTNET
		case 56: // BSC Mainnet
			return ChainId.BNB_CHAIN
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
