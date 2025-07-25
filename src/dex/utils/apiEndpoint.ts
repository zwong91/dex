import { bsc, bscTestnet } from "wagmi/chains"

/**
 * 根据当前网络选择对应的 API 端点
 * BSC Testnet -> 开发端点
 * BSC Mainnet -> 生产端点
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getApiEndpoint = (_chainId?: number): string => {
	// 所有网络都使用统一的生产端点
	// chainId 参数保留以供将来扩展使用
	return import.meta.env.VITE_API_ENDPOINT || 'https://api.dex.jongun2038.win'
}

/**
 * 判断当前是否为开发环境 (BSC Testnet)
 */
export const isDevEnvironment = (chainId?: number): boolean => {
	return chainId === bscTestnet.id
}

/**
 * 获取当前网络的显示名称
 */
export const getNetworkName = (chainId?: number): string => {
	switch (chainId) {
		case bscTestnet.id:
			return 'BSC Testnet'
		case bsc.id:
			return 'BSC Mainnet'
		default:
			return 'Unknown Network'
	}
}
