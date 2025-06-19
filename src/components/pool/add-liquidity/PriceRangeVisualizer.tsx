import React, { useState, useRef, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { LiquidityStrategy } from './StrategySelection'

/**
 * PriceRangeVisualizer Component
 * 
 * This component displays a 3D visualization of liquidity distribution across price ranges
 * based on the pool's bin step configuration. It calculates precise price scales using
 * the actual bin step of the liquidity pool.
 * 
 * Bin Step Calculation:
 * - binStep is measured in basis points (e.g., 1 = 0.01%, 25 = 0.25%)
 * - Each bin represents a discrete price level
 * - Price scales are calculated using compound interest formula: P * (1 + binStep/10000)^n
 * 
 * Examples:
 * - With binStep = 1 (0.01%) and activeBinPrice = 19.05560:
 *   - Bin 0: 19.05560
 *   - Bin 10: 19.05560 * (1.0001)^10 ≈ 19.07462
 *   - Bin 20: 19.05560 * (1.0001)^20 ≈ 19.09365
 */

interface PriceRangeVisualizerProps {
	activeBinPrice: number
	amount0: string
	amount1: string
	strategy: LiquidityStrategy
	binStep?: number // 添加 binStep prop，以基点为单位（例如25表示0.25%）
}

const PriceRangeVisualizer = ({
	activeBinPrice,
	amount0,
	amount1,
	strategy,
	binStep = 25, // 默认值25基点（0.25%）
}: PriceRangeVisualizerProps) => {
	// 拖动状态
	const [isDragging, setIsDragging] = useState(false)
	const [dragPosition, setDragPosition] = useState<string | null>(null) // 存储拖动位置，null表示使用默认位置
	const containerRef = useRef<HTMLDivElement>(null)
	
	// 价格锚点：永远显示 activeBinPrice
	const anchorPrice = activeBinPrice
	const getCurrentPrice = () => {
		return anchorPrice.toFixed(8)
	}
	
	// 计算位置基于鼠标坐标的拖动处理
	const calculatePositionFromMouse = useCallback((x: number, containerWidth: number) => {
		const percentage = Math.max(0, Math.min(1, x / containerWidth))
		return `${percentage * 100}%`
	}, [])
	
	// 拖动开始
	const handleDragStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])
	
	// 拖动进行中
	const handleDragMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !containerRef.current) return
		
		const rect = containerRef.current.getBoundingClientRect()
		const x = e.clientX - rect.left
		const newPosition = calculatePositionFromMouse(x, rect.width)
		setDragPosition(newPosition)
	}, [isDragging, calculatePositionFromMouse])
	
	// 拖动结束
	const handleDragEnd = useCallback(() => {
		if (isDragging) {
			setIsDragging(false)
			// 保持在最后拖动的位置，不需要回调
		}
	}, [isDragging])
	
	// 绑定全局鼠标事件
	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleDragMove)
			document.addEventListener('mouseup', handleDragEnd)
			return () => {
				document.removeEventListener('mousemove', handleDragMove)
				document.removeEventListener('mouseup', handleDragEnd)
			}
		}
	}, [isDragging, handleDragMove, handleDragEnd])

	// 计算当前价格指示线的位置 - 如果有拖动位置则使用拖动位置，否则使用默认位置
	const getCurrentPriceIndicatorPosition = () => {
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		// 如果有拖动位置（不管是否正在拖动），优先使用拖动位置
		if (dragPosition !== null) {
			return dragPosition
		}
		
		// 默认位置
		if (amt0 > 0 && amt1 === 0) {
			// Token X模式：指示线固定在左边作为锚点
			return '0.5%'
		} else if (amt1 > 0 && amt0 === 0) {
			// Token Y模式：指示线固定在右边作为锚点
			return '99.5%'
		}
		// AutoFill模式：指示线在中间
		return '50%'
	}

	// 获取价格标签的定位样式
	const getPriceLabelStyles = () => {
		const position = getCurrentPriceIndicatorPosition()
		const positionValue = parseFloat(position.replace('%', ''))
		
		// 判断指示器的位置范围来决定标签的定位策略
		if (positionValue <= 5) {
			// 指示器在最左边：标签显示在右侧，紧贴指示棒
			return {
				left: position,
				transform: 'translateX(4px)', // 减小偏移距离，更贴近指示棒
			}
		} else if (positionValue >= 95) {
			// 指示器在最右边：标签显示在左侧，紧贴指示棒
			return {
				left: position,
				transform: 'translateX(-100%) translateX(-4px)', // 完全向左偏移再减去间距
			}
		} else {
			// 指示器在中间：标签居中对齐到指示器位置
			return {
				left: position,
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
					// 每根柱子一个台阶 - 固定台阶高度（下台阶）
					height = 180 - (i * 3) // 每根柱子固定下降3个像素
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 固定台阶高度（上台阶）
					height = 30 + (i * 3) // 每根柱子固定上升3个像素
				}

				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 6,
							height: Math.max(30, height), // 移除最大高度限制，让台阶更明显
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
			// 只有Token Y：从指示棒向左渲染，第一根柱子最靠近指示线
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					// 每根柱子一个台阶 - 从指示线开始下降
					height = 180 - (i * 3) // 第一根最高，向左递减
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 从指示线开始上升
					height = 30 + (i * 3) // 第一根最低，向左递增
				}

				// 直接push，配合flexDirection: 'row-reverse'实现从右向左
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 6,
							height: Math.max(30, height),
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
					// 每根柱子一个台阶 - 固定台阶高度（下台阶）
					height = 180 - (distance * 3) // 每根柱子固定下降3个像素
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 固定台阶高度（上台阶）
					height = 30 + (distance * 3) // 每根柱子固定上升3个像素
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
							height: Math.max(30, height), // 移除最大高度限制，让台阶更明显
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

		return (
			<Box
				sx={{
					position: 'absolute',
					bottom: 8,
					left: 0,
					right: 0,
					display: 'flex',
					alignItems: 'flex-end',
					flexDirection: amt1 > 0 && amt0 === 0 ? 'row-reverse' : 'row',
					justifyContent: 'space-between',
					height: '85%',
					zIndex: 2,
				}}
			>
				{barsToRender}
			</Box>
		)
	}

	/**
	 * Helper function to demonstrate bin step price calculations
	 * This shows exactly how prices would be calculated for different bin steps
	 */
	const demonstrateBinStepCalculation = () => {
		if (process.env.NODE_ENV === 'development') {
			const examples = [
				{ binStep: 1, description: '0.01% (1 basis point)' },
				{ binStep: 25, description: '0.25% (25 basis points)' },
				{ binStep: 100, description: '1.00% (100 basis points)' }
			]
			
			console.log('📊 Bin Step Price Calculation Examples:')
			examples.forEach(({ binStep: exampleBinStep, description }) => {
				const binStepDecimal = exampleBinStep / 10000
				const prices = []
				
				for (let i = 0; i <= 10; i++) {
					const price = anchorPrice * Math.pow(1 + binStepDecimal, i * 10)
					prices.push(price.toFixed(5))
				}
				
				console.log(`  ${description}:`, prices.slice(0, 5), '...')
			})
		}
	}

	// Run demonstration on component mount (development only)
	React.useEffect(() => {
		demonstrateBinStepCalculation()
	}, [binStep, anchorPrice])

	return (
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>
			<Box
				ref={containerRef}
				sx={{
					position: 'relative',
					height: 200,
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
				{/* 简单渲染柱子 */}
				{renderLiquidityBars()}

				{/* Current price indicator line with draggable handle */}
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
					boxShadow: isDragging ? `
						0 0 16px rgba(255, 255, 255, 0.9),
						0 0 32px rgba(255, 255, 255, 0.5),
						0 4px 8px rgba(0, 0, 0, 0.3)
					` : `
						0 0 8px rgba(255, 255, 255, 0.6),
						0 0 16px rgba(255, 255, 255, 0.3),
						0 2px 4px rgba(0, 0, 0, 0.2)
					`,
					// 添加脉冲动画增强视觉关联
					animation: isDragging ? 'none' : 'pulse 2s ease-in-out infinite',
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

				{/* Draggable handle at the bottom of the indicator */}
				<Box
					onMouseDown={handleDragStart}
					sx={{
						position: 'absolute',
						left: getCurrentPriceIndicatorPosition(),
						bottom: -8,
						width: 20,
						height: 16,
						background: isDragging 
							? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
							: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.9) 100%)',
						transform: 'translateX(-50%)',
						zIndex: 4,
						borderRadius: '8px 8px 4px 4px',
						cursor: isDragging ? 'grabbing' : 'grab',
						border: isDragging ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.6)',
						boxShadow: isDragging ? `
							0 6px 20px rgba(0, 0, 0, 0.4),
							0 3px 10px rgba(0, 0, 0, 0.25),
							inset 0 1px 0 rgba(255, 255, 255, 0.95),
							0 0 0 4px rgba(255, 255, 255, 0.3)
						` : `
							0 4px 12px rgba(0, 0, 0, 0.3),
							0 2px 6px rgba(0, 0, 0, 0.15),
							inset 0 1px 0 rgba(255, 255, 255, 0.8),
							0 0 0 1px rgba(255, 255, 255, 0.2)
						`,
						transition: isDragging ? 'none' : 'all 0.2s ease',
						'&:hover': {
							transform: 'translateX(-50%) scale(1.1)',
							boxShadow: `
								0 6px 16px rgba(0, 0, 0, 0.4),
								0 3px 8px rgba(0, 0, 0, 0.25),
								inset 0 1px 0 rgba(255, 255, 255, 0.95),
								0 0 0 3px rgba(255, 255, 255, 0.4)
							`,
						},
						// 添加拖动图标
						'&::before': {
							content: '"⋮⋮"',
							position: 'absolute',
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
							fontSize: '8px',
							color: isDragging ? '#333' : 'rgba(0, 0, 0, 0.6)',
							fontWeight: 'bold',
							letterSpacing: '-1px',
						},
					}}
				/>

				{/* Current price label - moves with indicator */}
				<Box sx={{
					position: 'absolute',
					top: 8,
					...getPriceLabelStyles(), // 使用动态定位样式
					background: isDragging 
						? 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(245, 245, 245, 0.95) 100%)'
						: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.9) 100%)',
					color: '#1A1B2E',
					px: 2,
					py: 0.5,
					borderRadius: 1.5,
					fontSize: '11px',
					fontWeight: 600,
					zIndex: 4,
					boxShadow: isDragging ? `
						0 6px 20px rgba(0, 0, 0, 0.4),
						0 3px 10px rgba(0, 0, 0, 0.25),
						inset 0 1px 0 rgba(255, 255, 255, 1),
						0 0 0 3px rgba(255, 255, 255, 0.5)
					` : `
						0 2px 8px rgba(0, 0, 0, 0.2),
						0 1px 4px rgba(0, 0, 0, 0.1),
						inset 0 1px 0 rgba(255, 255, 255, 0.8),
						0 0 0 2px rgba(255, 255, 255, 0.3)
					`,
					border: isDragging ? '2px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.6)',
					backdropFilter: 'blur(4px)',
					// 拖动时禁用动画
					animation: isDragging ? 'none' : 'labelFloat 2s ease-in-out infinite',
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
					transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
						borderTop: `4px solid ${isDragging ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)'}`,
						// 总是显示小箭头，增强视觉关联
						display: 'block',
					},
				}}>
					{getCurrentPrice()}
					{isDragging && (
						<Typography variant="caption" sx={{ 
							ml: 1, 
							color: 'rgba(26, 27, 46, 0.7)',
							fontSize: '9px'
						}}>
							🔄
						</Typography>
					)}
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
					const amt0 = parseFloat(amount0 || '0')
					const amt1 = parseFloat(amount1 || '0')
					
					// 使用bin step计算精确的价格刻度
					// binStep是基点，例如1表示0.01%，25表示0.25%
					const binStepDecimal = binStep / 10000
					
					let price: number
					
					if (amt0 > 0 && amt1 === 0) {
						// Token X模式：从当前价格向右显示价格区间
						// 每个刻度代表几个bin的步长
						const binsPerTick = 10 // 每个刻度跨越10个bin
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						price = anchorPrice * Math.pow(priceMultiplier, i)
					} else if (amt1 > 0 && amt0 === 0) {
						// Token Y模式：从当前价格开始，向左递减
						const binsPerTick = 10 // 每个刻度跨越10个bin
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						price = anchorPrice * Math.pow(priceMultiplier, -(10 - i)) // 反转索引
					} else {
						// AutoFill模式：以当前价格为中心对称显示
						const binsPerTick = 5 // 中心模式使用更小的步长
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						price = anchorPrice * Math.pow(priceMultiplier, (i - 5)) // i=5时为当前价格
					}
					
					// 添加日志以验证计算结果（仅在开发模式下）
					if (process.env.NODE_ENV === 'development' && i === 0) {
						console.log('🔢 Price Scale Calculation:', {
							binStep,
							binStepDecimal,
							binStepPercentage: `${binStep / 100}%`,
							anchorPrice: anchorPrice,
							mode: amt0 > 0 && amt1 === 0 ? 'Token X' : 
								  amt1 > 0 && amt0 === 0 ? 'Token Y' : 'AutoFill',
							samplePrices: [
								anchorPrice.toFixed(5),
								price.toFixed(5)
							]
						})
					}
					
					const isActivePrice = Math.abs(price - anchorPrice) < (anchorPrice * 0.005)

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
										  price < anchorPrice ? '#00D9FF' : 
										  price > anchorPrice ? '#7B68EE' : 'rgba(255, 255, 255, 0.6)',
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
