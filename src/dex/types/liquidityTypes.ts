/**
 * 单边流动性相关的类型定义
 */

// 流动性策略类型
export type LiquidityStrategy = 'conservative' | 'balanced' | 'aggressive'

// 流动性模式类型  
export type LiquidityMode = 'dual-sided' | 'single-sided'

// 添加流动性的参数接口
export interface AddLiquidityParams {
	pairAddress: string
	tokenXAddress: string
	tokenYAddress: string
	tokenAAmount: number
	tokenBAmount: number
	activeBinId: number
	binStep: number
	deltaIds?: number[]
	distributionX?: bigint[]
	distributionY?: bigint[]
	singleSidedMode?: boolean
	singleSidedStrategy?: LiquidityStrategy
}

// 单边流动性配置接口
export interface SingleSidedConfig {
	strategy: LiquidityStrategy
	customBinCount?: number
	concentration?: number
	volatilityEstimate?: number
}

// 流动性分布配置
export interface DistributionConfig {
	deltaIds: number[]
	distributionX: bigint[]
	distributionY: bigint[]
}

// 策略参数映射
export const STRATEGY_PARAMS: Record<LiquidityStrategy, {
	volatility: number
	concentration: number
	description: string
}> = {
	conservative: {
		volatility: 0.05,
		concentration: 5,
		description: '保守策略：高集中度，适合稳定市场'
	},
	balanced: {
		volatility: 0.1,
		concentration: 3,
		description: '平衡策略：中等集中度，平衡收益和风险'
	},
	aggressive: {
		volatility: 0.2,
		concentration: 2,
		description: '激进策略：低集中度，适合高波动市场'
	}
}

// 使用示例接口
export interface LiquidityExample {
	name: string
	description: string
	params: Partial<AddLiquidityParams>
	mode: LiquidityMode
}

// 预定义的流动性示例
export const LIQUIDITY_EXAMPLES: LiquidityExample[] = [
	{
		name: '双边流动性',
		description: '传统的双边流动性提供，同时提供两种代币',
		params: {
			tokenAAmount: 100,
			tokenBAmount: 50,
			singleSidedMode: false
		},
		mode: 'dual-sided'
	},
	{
		name: '单边TokenA - 保守',
		description: '只提供TokenA，使用保守策略，流动性集中在当前价格附近',
		params: {
			tokenAAmount: 100,
			tokenBAmount: 0,
			singleSidedMode: true,
			singleSidedStrategy: 'conservative'
		},
		mode: 'single-sided'
	},
	{
		name: '单边TokenB - 激进',
		description: '只提供TokenB，使用激进策略，流动性分布更广',
		params: {
			tokenAAmount: 0,
			tokenBAmount: 50,
			singleSidedMode: true,
			singleSidedStrategy: 'aggressive'
		},
		mode: 'single-sided'
	},
	{
		name: '自动检测单边',
		description: '系统自动检测单边模式，无需手动设置',
		params: {
			tokenAAmount: 200,
			tokenBAmount: 0,
			singleSidedStrategy: 'balanced'
		},
		mode: 'single-sided'
	}
]

// 工具函数：检查是否为单边流动性
export const isSingleSidedLiquidity = (tokenAAmount: number, tokenBAmount: number): boolean => {
	return (tokenAAmount > 0 && tokenBAmount === 0) || (tokenAAmount === 0 && tokenBAmount > 0)
}

// 工具函数：获取单边流动性的代币类型
export const getSingleSidedTokenType = (tokenAAmount: number, tokenBAmount: number): 'tokenA' | 'tokenB' | 'dual' => {
	if (tokenAAmount > 0 && tokenBAmount === 0) return 'tokenA'
	if (tokenAAmount === 0 && tokenBAmount > 0) return 'tokenB'
	return 'dual'
}

// 工具函数：验证流动性参数
export const validateLiquidityParams = (params: AddLiquidityParams): string[] => {
	const errors: string[] = []
	
	if (!params.pairAddress || params.pairAddress === '0x0000000000000000000000000000000000000000') {
		errors.push('无效的交易对地址')
	}
	
	if (!params.tokenXAddress || !params.tokenYAddress) {
		errors.push('代币地址不能为空')
	}
	
	if (params.tokenAAmount < 0 || params.tokenBAmount < 0) {
		errors.push('代币数量不能为负数')
	}
	
	if (params.tokenAAmount === 0 && params.tokenBAmount === 0) {
		errors.push('至少需要提供一种代币')
	}
	
	if (params.binStep <= 0) {
		errors.push('binStep必须大于0')
	}
	
	return errors
}

export default {
	STRATEGY_PARAMS,
	LIQUIDITY_EXAMPLES,
	isSingleSidedLiquidity,
	getSingleSidedTokenType,
	validateLiquidityParams
}
