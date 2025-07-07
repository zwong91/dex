// Utility functions for wallet operations like adding tokens to MetaMask

import { generateTokenIcon } from './utils/tokenIconGenerator'

export interface TokenInfo {
	address: string;
	symbol: string;
	decimals: number;
	image?: string;
}

// BSC Testnet token configurations
export const BSC_TESTNET_TOKENS: Record<string, TokenInfo> = {
	USDT: {
		address: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
		symbol: "USDT",
		decimals: 18,
		image: generateTokenIcon('USDT')
	},
	USDC: {
		address: "0x64544969ed7EBf5f083679233325356EbE738930",
		symbol: "USDC",
		decimals: 18,
		image: generateTokenIcon('USDC')
	},
	BNB: {
		address: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
		symbol: "BNB",
		decimals: 18,
		image: generateTokenIcon('BNB')
	}
};

/**
 * Add a token to MetaMask wallet
 */
export const addTokenToWallet = async (tokenInfo: TokenInfo): Promise<boolean> => {
	try {
		// Check if MetaMask is installed
		if (!window.ethereum) {
			alert("请安装 MetaMask 钱包");
			return false;
		}

		// Request to add token to wallet
		const wasAdded = await window.ethereum.request({
			method: 'wallet_watchAsset',
			params: {
				type: 'ERC20',
				options: {
					address: tokenInfo.address,
					symbol: tokenInfo.symbol,
					decimals: tokenInfo.decimals,
					image: tokenInfo.image,
				},
			},
		});

		return wasAdded as boolean;
	} catch (error) {
		console.error('添加代币失败:', error);
		return false;
	}
};

/**
 * Add multiple tokens to wallet
 */
export const addAllTestnetTokens = async (): Promise<void> => {
	const tokens = Object.values(BSC_TESTNET_TOKENS);

	for (const token of tokens) {
		try {
			await addTokenToWallet(token);
			// Add small delay between requests
			await new Promise(resolve => setTimeout(resolve, 500));
		} catch (error) {
			console.error(`添加 ${token.symbol} 失败:`, error);
		}
	}
};

/**
 * Switch to BSC Testnet network
 */
export const switchToBSCTestnet = async (): Promise<boolean> => {
	try {
		if (!window.ethereum) {
			alert("请安装 MetaMask 钱包");
			return false;
		}

		// Try to switch to BSC Testnet
		await window.ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: '0x61' }], // 97 in hex
		});

		return true;
	} catch (switchError: any) {
		// If network is not added, add it
		if (switchError.code === 4902) {
			try {
				await window.ethereum.request({
					method: 'wallet_addEthereumChain',
					params: [
						{
							chainId: '0x61',
							chainName: 'BSC Testnet',
							nativeCurrency: {
								name: 'BNB',
								symbol: 'BNB',
								decimals: 18,
							},
							rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
							blockExplorerUrls: ['https://testnet.bscscan.com/'],
						},
					],
				});
				return true;
			} catch (addError) {
				console.error('添加 BSC Testnet 失败:', addError);
				return false;
			}
		}
		console.error('切换网络失败:', switchError);
		return false;
	}
};

// Add type declaration for window.ethereum
declare global {
	interface Window {
		ethereum?: any;
	}
}
