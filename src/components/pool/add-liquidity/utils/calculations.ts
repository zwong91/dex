import { LiquidityStrategy } from '../StrategySelection'

export const calculateAutoFillAmount = (
	inputAmount: string,
	activeBinPrice: number,
	strategy: LiquidityStrategy,
	isToken0ToToken1: boolean // true: calculate token1 from token0, false: calculate token0 from token1
): string => {
	if (!inputAmount || inputAmount === '0' || inputAmount === '0.') {
		return ''
	}

	const numValue = parseFloat(inputAmount)
	if (isNaN(numValue) || numValue <= 0) {
		return ''
	}

	let calculatedAmount = 0

	if (isToken0ToToken1) {
		// Calculate token1 amount based on token0 input
		if (strategy === 'spot') {
			calculatedAmount = numValue * activeBinPrice * 0.5 // 50% allocation
		} else if (strategy === 'curve') {
			calculatedAmount = numValue * activeBinPrice * 0.8 // 80% allocation
		} else if (strategy === 'bid-ask') {
			calculatedAmount = numValue * activeBinPrice * 0.2 // 20% allocation
		}
	} else {
		// Calculate token0 amount based on token1 input
		if (strategy === 'spot') {
			calculatedAmount = numValue / activeBinPrice * 0.5 // 50% allocation
		} else if (strategy === 'curve') {
			calculatedAmount = numValue / activeBinPrice * 0.8 // 80% allocation
		} else if (strategy === 'bid-ask') {
			calculatedAmount = numValue / activeBinPrice * 0.2 // 20% allocation
		}
	}

	return calculatedAmount.toFixed(6)
}

export const calculatePercentageAmount = (
	balance: string,
	percentage: number
): string => {
	const balanceNum = parseFloat(balance || '0')
	const amount = balanceNum * percentage
	return amount.toFixed(6)
}
