import { LiquidityStrategy } from '../StrategySelection'

export interface ValidationError {
	field: string
	message: string
	severity: 'error' | 'warning'
}

export interface ValidateParams {
	amount0: string
	amount1: string
	tokenXBalance?: bigint
	tokenYBalance?: bigint
	activeBinPrice: number
	minPrice: string
	maxPrice: string
	strategy: LiquidityStrategy
	binStep?: number
	userWalletAddress?: string
	selectedPool?: {
		token0: string
		token1: string
		pairAddress?: string
		binStep?: number
	} | null
}

/**
 * 验证添加流动性的参数
 */
export function validateLiquidityParams(params: ValidateParams): ValidationError[] {
	const errors: ValidationError[] = []
	const {
		amount0,
		amount1,
		userWalletAddress,
		selectedPool
	} = params

	// 只保留最基本的验证
	if (!userWalletAddress) {
		errors.push({
			field: 'wallet',
			message: '请连接钱包',
			severity: 'error'
		})
		return errors
	}

	if (!selectedPool) {
		errors.push({
			field: 'pool',
			message: '请选择一个流动性池',
			severity: 'error'
		})
		return errors
	}

	const amt0 = parseFloat(amount0 || '0')
	const amt1 = parseFloat(amount1 || '0')

	if (amt0 <= 0 && amt1 <= 0) {
		errors.push({
			field: 'amounts',
			message: '请至少输入一种代币的数量',
			severity: 'error'
		})
	}

	return errors
}

/**
 * 检查是否有阻止交易的错误
 */
export function hasBlockingErrors(errors: ValidationError[]): boolean {
	return errors.some(error => error.severity === 'error')
}

/**
 * 按严重程度分组错误
 */
export function groupErrorsBySeverity(errors: ValidationError[]) {
	return {
		errors: errors.filter(e => e.severity === 'error'),
		warnings: errors.filter(e => e.severity === 'warning')
	}
}
