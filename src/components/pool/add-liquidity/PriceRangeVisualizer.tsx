import { Box, Typography } from '@mui/material'
import { LiquidityStrategy } from './StrategySelection'

interface PriceRangeVisualizerProps {
	activeBinPrice: number
	minPrice: string
	maxPrice: string
	amount0: string
	amount1: string
	strategy: LiquidityStrategy
	calculateDynamicRange: () => {
		minPrice: number
		maxPrice: number
		leftMultiplier: number
		rightMultiplier: number
	}
}

const PriceRangeVisualizer = ({
	activeBinPrice,
	minPrice,
	maxPrice,
	amount0,
	amount1,
	strategy,
	calculateDynamicRange,
}: PriceRangeVisualizerProps) => {
	const getCurrentPrice = () => {
		return activeBinPrice.toFixed(8)
	}

	// 计算当前价格指示线的位置 - 固定锚点
	const getCurrentPriceIndicatorPosition = () => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		if (amt0 > 0 && amt1 === 0) {
			// 只有Token X，指示线固定在左边作为锚点
			return '1%'
		} else if (amt1 > 0 && amt0 === 0) {
			// 只有Token Y，指示线固定在右边作为锚点
			return '99%'
		}
		// AutoFill模式或混合，指示线在中间
		return '50%'
	}

	// 获取价格标签的定位样式
	const getPriceLabelStyles = () => {
		const position = getCurrentPriceIndicatorPosition()
		
		if (position === '1%') {
			// 指示器在最左边：标签显示在右侧，紧贴指示棒
			return {
				left: '1%',
				transform: 'translateX(4px)', // 减小偏移距离，更贴近指示棒
			}
		} else if (position === '99%') {
			// 指示器在最右边：标签显示在左侧，紧贴指示棒
			return {
				right: '1%',
				transform: 'translateX(-4px)', // 减小偏移距离，更贴近指示棒
			}
		} else {
			// 指示器在中间：标签居中对齐
			return {
				left: '50%',
				transform: 'translateX(-50%)',
			}
		}
	}

	const renderLiquidityBars = () => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		if (amt0 === 0 && amt1 === 0) {
			return (
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100%',
						color: 'rgba(255, 255, 255, 0.5)',
						fontSize: '14px',
						fontStyle: 'italic'
					}}
				>
					Enter token amounts to see liquidity distribution
				</Box>
			)
		}

		// 根据token分布决定柱子数量和分布
		let barsToRender = []
		const baseHeight = 100
		const numBars = 50 // 固定渲染50根柱子

		if (amt0 > 0 && amt1 === 0) {
			// 只有Token X：从指示棒(锚点)向右渲染
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					const decay = Math.max(0.3, 1 - (i * 0.02))
					height = baseHeight * decay
				} else if (strategy === 'bid-ask') {
					const decay = Math.max(0.4, 1 - (i * 0.015))
					height = baseHeight * decay
				}

				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 6,
							height: Math.max(30, Math.min(180, height)),
							background: `linear-gradient(135deg,
								rgba(123, 104, 238, 0.8) 0%,
								rgba(100, 80, 200, 0.9) 50%,
								rgba(80, 60, 160, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(123, 104, 238, 0.4), 0 2px 8px rgba(123, 104, 238, 0.3)',
						}}
					/>
				)
			}
		} else if (amt1 > 0 && amt0 === 0) {
			// 只有Token Y：从指示棒(锚点)向左渲染，但要用reverse排列
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					const decay = Math.max(0.3, 1 - (i * 0.02))
					height = baseHeight * decay
				} else if (strategy === 'bid-ask') {
					const decay = Math.max(0.4, 1 - (i * 0.015))
					height = baseHeight * decay
				}

				barsToRender.unshift( // 用unshift让柱子从右往左递减
					<Box
						key={i}
						sx={{
							width: 6,
							height: Math.max(30, Math.min(180, height)),
							background: `linear-gradient(135deg,
								rgba(0, 217, 255, 0.8) 0%,
								rgba(0, 150, 200, 0.9) 50%,
								rgba(0, 100, 150, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(0, 217, 255, 0.4), 0 2px 8px rgba(0, 217, 255, 0.3)',
						}}
					/>
				)
			}
		} else if (amt0 > 0 && amt1 > 0) {
			// AutoFill模式：以指示棒为中心，左右分布
			for (let i = -25; i <= 25; i++) {
				let height = baseHeight
				const distance = Math.abs(i)
				
				if (strategy === 'curve') {
					const decay = Math.max(0.3, 1 - (distance * 0.02))
					height = baseHeight * decay
				} else if (strategy === 'bid-ask') {
					const decay = Math.max(0.4, 1 - (distance * 0.015))
					height = baseHeight * decay
				}

				const isCenter = i === 0
				let barColor
				if (isCenter) {
					barColor = 'linear-gradient(to bottom, #7B68EE 50%, #00D9FF 50%)'
				} else if (i < 0) {
					barColor = `linear-gradient(135deg,
						rgba(0, 217, 255, 0.8) 0%,
						rgba(0, 150, 200, 0.9) 50%,
						rgba(0, 100, 150, 0.7) 100%)`
				} else {
					barColor = `linear-gradient(135deg,
						rgba(123, 104, 238, 0.8) 0%,
						rgba(100, 80, 200, 0.9) 50%,
						rgba(80, 60, 160, 0.7) 100%)`
				}

				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 6,
							height: Math.max(30, Math.min(180, height)),
							background: barColor,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: isCenter 
								? '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
								: i < 0 
									? '0 0 10px rgba(0, 217, 255, 0.4), 0 2px 8px rgba(0, 217, 255, 0.3)'
									: '0 0 10px rgba(123, 104, 238, 0.4), 0 2px 8px rgba(123, 104, 238, 0.3)',
						}}
					/>
				)
			}
		}

		return barsToRender
	}

	return (
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>
			<Box
				sx={{
					position: 'relative',
					height: 200,
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'stretch',
					gap: '1px',
					background: 'linear-gradient(135deg, #1A1B2E 0%, #252749 50%, #1A1B2E 100%)',
					borderRadius: 3,
					p: 1,
					mb: 2,
					mt: 2,
					mx: 1,
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'radial-gradient(ellipse at center bottom, rgba(123, 104, 238, 0.1) 0%, transparent 70%)',
						pointerEvents: 'none',
					},
				}}
			>
				{renderLiquidityBars()}

				{/* Current price indicator line */}
				<Box sx={{
					position: 'absolute',
					left: getCurrentPriceIndicatorPosition(),
					top: 30,
					bottom: 0,
					width: 2,
					background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
					transform: 'translateX(-50%)',
					zIndex: 3,
					borderRadius: '1px',
					boxShadow: `
						0 0 8px rgba(255, 255, 255, 0.6),
						0 0 16px rgba(255, 255, 255, 0.3),
						0 2px 4px rgba(0, 0, 0, 0.2)
					`,
					// 添加脉冲动画增强视觉关联
					animation: 'pulse 2s ease-in-out infinite',
					'@keyframes pulse': {
						'0%, 100%': {
							boxShadow: `
								0 0 8px rgba(255, 255, 255, 0.6),
								0 0 16px rgba(255, 255, 255, 0.3),
								0 2px 4px rgba(0, 0, 0, 0.2)
							`,
						},
						'50%': {
							boxShadow: `
								0 0 12px rgba(255, 255, 255, 0.8),
								0 0 24px rgba(255, 255, 255, 0.5),
								0 2px 4px rgba(0, 0, 0, 0.2)
							`,
						},
					},
				}} />

				{/* Connecting line between indicator and label */}
				<Box sx={{
					position: 'absolute',
					left: getCurrentPriceIndicatorPosition(),
					top: getCurrentPriceIndicatorPosition() === '50%' ? 26 : 24, // 根据位置调整连接线起点
					width: getCurrentPriceIndicatorPosition() === '50%' ? 2 : 
						  getCurrentPriceIndicatorPosition() === '1%' ? 20 : 20, // 连接线长度
					height: getCurrentPriceIndicatorPosition() === '50%' ? 4 : 2,
					background: getCurrentPriceIndicatorPosition() === '50%' 
						? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)'
						: getCurrentPriceIndicatorPosition() === '1%'
							? 'linear-gradient(to right, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 100%)'
							: 'linear-gradient(to left, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 100%)',
					transform: getCurrentPriceIndicatorPosition() === '50%' 
						? 'translateX(-50%)'
						: getCurrentPriceIndicatorPosition() === '1%'
							? 'translateX(-1px)'
							: 'translateX(-19px)',
					zIndex: 2,
					borderRadius: '1px',
					opacity: 0.7,
				}} />

				{/* Current price label */}
				<Box sx={{
					position: 'absolute',
					top: 8,
					...getPriceLabelStyles(), // 使用动态定位样式
					background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.9) 100%)',
					color: '#1A1B2E',
					px: 2,
					py: 0.5,
					borderRadius: 1.5,
					fontSize: '11px',
					fontWeight: 600,
					zIndex: 4,
					boxShadow: `
						0 2px 8px rgba(0, 0, 0, 0.2),
						0 1px 4px rgba(0, 0, 0, 0.1),
						inset 0 1px 0 rgba(255, 255, 255, 0.8),
						0 0 0 2px rgba(255, 255, 255, 0.3)
					`,
					border: '1px solid rgba(255, 255, 255, 0.6)',
					backdropFilter: 'blur(4px)',
					// 添加浮动动画 - 与指示棒同步
					animation: 'labelFloat 2s ease-in-out infinite',
					'@keyframes labelFloat': {
						'0%, 100%': {
							transform: getPriceLabelStyles().transform + ' translateY(0px)',
							boxShadow: `
								0 2px 8px rgba(0, 0, 0, 0.2),
								0 1px 4px rgba(0, 0, 0, 0.1),
								inset 0 1px 0 rgba(255, 255, 255, 0.8),
								0 0 0 2px rgba(255, 255, 255, 0.3)
							`,
						},
						'50%': {
							transform: getPriceLabelStyles().transform + ' translateY(-1px)',
							boxShadow: `
								0 4px 12px rgba(0, 0, 0, 0.3),
								0 2px 6px rgba(0, 0, 0, 0.15),
								inset 0 1px 0 rgba(255, 255, 255, 0.9),
								0 0 0 3px rgba(255, 255, 255, 0.5)
							`,
						},
					},
					'&:hover': {
						transform: getPriceLabelStyles().transform + ' translateY(-4px) scale(1.05)',
						boxShadow: `
							0 6px 16px rgba(0, 0, 0, 0.4),
							0 3px 8px rgba(0, 0, 0, 0.25),
							inset 0 1px 0 rgba(255, 255, 255, 0.95),
							0 0 0 4px rgba(255, 255, 255, 0.7)
						`,
						transition: 'all 0.2s ease',
					},
					transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
					// 添加一个小箭头或指示符号来增强关联
					'&::after': {
						content: '""',
						position: 'absolute',
						bottom: '-4px',
						left: '50%',
						transform: 'translateX(-50%)',
						width: 0,
						height: 0,
						borderLeft: '4px solid transparent',
						borderRight: '4px solid transparent',
						borderTop: '4px solid rgba(255, 255, 255, 0.8)',
						display: getCurrentPriceIndicatorPosition() === '50%' ? 'block' : 'none',
					},
				}}>
					{getCurrentPrice()}
				</Box>
			</Box>

			{/* Price scale */}
			<Box sx={{
				display: 'flex',
				justifyContent: 'space-between',
				fontSize: '11px',
				color: 'rgba(255, 255, 255, 0.7)',
				mb: 4,
				px: 2,
				py: 1,
				backgroundColor: 'rgba(255, 255, 255, 0.02)',
				borderRadius: 2,
				border: '1px solid rgba(255, 255, 255, 0.05)',
			}}>
				{Array.from({ length: 11 }, (_, i) => {
					const { minPrice: dynMinPrice, maxPrice: dynMaxPrice } = calculateDynamicRange()
					const minRange = parseFloat(minPrice) || dynMinPrice
					const maxRange = parseFloat(maxPrice) || dynMaxPrice
					const totalRange = maxRange - minRange
					const price = minRange + (i * totalRange / 10)
					const isActivePrice = Math.abs(price - activeBinPrice) < (activeBinPrice * 0.01)

					return (
						<Box
							key={i}
							sx={{
								textAlign: 'center',
								transition: 'all 0.3s ease',
								'&:hover': {
									transform: 'translateY(-2px)',
									color: 'white',
								},
							}}
						>
							<Typography
								variant="caption"
								sx={{
									fontSize: '10px',
									fontWeight: isActivePrice ? 700 : 400,
									color: isActivePrice ? '#ffffff' : 
										  price < activeBinPrice ? '#00D9FF' : 
										  price > activeBinPrice ? '#7B68EE' : 'rgba(255, 255, 255, 0.6)',
									transition: 'color 0.3s ease',
								}}
							>
								{price.toFixed(5)}
							</Typography>
						</Box>
					)
				})}
			</Box>
		</Box>
	)
}

export default PriceRangeVisualizer
