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
	onPriceRangeChange?: (minPrice: number, maxPrice: number, numBins: number) => void // 添加价格范围变化回调
}

const PriceRangeVisualizer = ({
	activeBinPrice,
	amount0,
	amount1,
	strategy,
	binStep = 1, // 默认值1基点（0.01%）
	onPriceRangeChange, // 添加价格范围变化回调
}: PriceRangeVisualizerProps) => {
	// 拖动状态
	const [isDragging, setIsDragging] = useState(false)
	const [dragPosition, setDragPosition] = useState<string | null>(null) // 存储拖动位置，null表示使用默认位置
	const containerRef = useRef<HTMLDivElement>(null)
	
	// 价格锚点：永远显示 activeBinPrice
	const anchorPrice = activeBinPrice
	const getCurrentPrice = () => {
		// 指示棒上的价格始终显示锚点价格，不随拖动变化
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
	
	// 计算基于拖动位置的价格范围
	const calculatePriceRangeFromPosition = useCallback((position: string) => {
		const positionValue = parseFloat(position.replace('%', ''))
		const binStepDecimal = binStep / 10000
		
		// Convert position (0-100%) to range spread (-100% to +100%)
		// positionValue 0% = -100% price change, 50% = 0%, 100% = +100%
		const rangeSpread = (positionValue / 50) - 1 // -1 to +1 range
		const maxRangePercent = Math.abs(rangeSpread) * 100 // 0% to 100%
		
		// Calculate min/max prices with anchor as boundary
		let minPrice: number
		let maxPrice: number
		
		if (rangeSpread >= 0) {
			// Right side: anchor to maxPrice (0% to +100%)
			minPrice = anchorPrice
			maxPrice = anchorPrice * (1 + maxRangePercent / 100)
		} else {
			// Left side: minPrice to anchor (-100% to 0%)
			minPrice = anchorPrice * (1 - maxRangePercent / 100)
			maxPrice = anchorPrice
		}
		
		// Calculate number of bins based on actual price range and bin step
		const priceRatio = maxPrice / minPrice
		const numBins = Math.ceil(Math.log(priceRatio) / Math.log(1 + binStepDecimal))
		
		// Limit bins to reasonable range
		const actualNumBins = Math.max(1, Math.min(500, numBins))
		
		// Log for debugging
		if (process.env.NODE_ENV === 'development') {
			console.log('🎯 Price Range Calculation:', {
				positionValue: positionValue.toFixed(1) + '%',
				rangeSpread: (rangeSpread * 100).toFixed(1) + '%',
				maxRangePercent: maxRangePercent.toFixed(1) + '%',
				anchorPrice: anchorPrice.toFixed(6),
				minPrice: minPrice.toFixed(6),
				maxPrice: maxPrice.toFixed(6),
				priceRatio: priceRatio.toFixed(4),
				actualNumBins,
				binStep,
				binStepDecimal: (binStepDecimal * 100).toFixed(4) + '%'
			})
		}
		
		return { 
			minPrice, 
			maxPrice, 
			numBins: actualNumBins 
		}
	}, [anchorPrice, binStep])

	// 拖动进行中
	const handleDragMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !containerRef.current) return
		
		const rect = containerRef.current.getBoundingClientRect()
		const x = e.clientX - rect.left
		const newPosition = calculatePositionFromMouse(x, rect.width)
		setDragPosition(newPosition)
		
		// 实时更新价格范围 (可选：可以添加节流以提高性能)
		if (onPriceRangeChange) {
			const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition(newPosition)
			onPriceRangeChange(minPrice, maxPrice, numBins)
		}
	}, [isDragging, calculatePositionFromMouse, onPriceRangeChange, calculatePriceRangeFromPosition])

	// 拖动结束
	const handleDragEnd = useCallback(() => {
		if (isDragging) {
			setIsDragging(false)
			
			// 如果有拖动位置且有回调函数，计算并更新价格范围
			if (dragPosition !== null && onPriceRangeChange) {
				const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition(dragPosition)
				onPriceRangeChange(minPrice, maxPrice, numBins)
				
				// 添加开发模式日志
				if (process.env.NODE_ENV === 'development') {
					console.log('🎯 Drag ended, updating price range:', {
						dragPosition,
						minPrice: minPrice.toFixed(6),
						maxPrice: maxPrice.toFixed(6),
						numBins,
						anchorPrice: anchorPrice.toFixed(6)
					})
				}
			}
		}
	}, [isDragging, dragPosition, onPriceRangeChange, calculatePriceRangeFromPosition, anchorPrice])
	
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

	// 监听模式变化，重置拖动位置
	React.useEffect(() => {
		// 当amount0或amount1变化时（即模式切换时），重置拖动位置
		setDragPosition(null)
	}, [amount0, amount1])

	// 计算当前价格指示线的位置 - 如果有拖动位置则使用拖动位置，否则使用默认位置
	const getCurrentPriceIndicatorPosition = () => {
		// 如果有拖动位置，使用拖动位置
		if (dragPosition !== null) {
			return dragPosition
		}
		
		// 默认位置 - anchor price 始终在中心位置 50%
		// 这样左边是 min 到 anchor，右边是 anchor 到 max
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

	// 计算哪些柱子应该变灰消失（被指示棒经过的柱子）
	const getBarDissolveEffect = (barIndex: number, totalBars: number, isReversed: boolean = false) => {
		if (dragPosition === null) {
			return { opacity: 1, background: null } // 没有拖动位置时正常显示
		}

		const currentPosition = parseFloat(dragPosition.replace('%', ''))
		
		// 计算柱子在容器中的位置百分比
		let barPosition: number
		if (isReversed) {
			// Token Y模式：柱子从右到左排列
			barPosition = 100 - ((barIndex + 1) / totalBars) * 100
		} else {
			// Token X模式和AutoFill模式：柱子从左到右排列
			barPosition = (barIndex / totalBars) * 100
		}

		// 判断指示棒是否经过了这个柱子
		const isPassed = isReversed ? currentPosition <= barPosition : currentPosition >= barPosition
		
		if (isPassed) {
			// 计算消失程度：越靠近指示棒消失得越明显
			const distance = Math.abs(currentPosition - barPosition)
			const maxDistance = 20 // 影响范围20%
			const dissolveFactor = Math.max(0, 1 - distance / maxDistance)
			
			return {
				opacity: 0.2 + (0.6 * (1 - dissolveFactor)), // 透明度从0.2到0.8
				background: `linear-gradient(135deg,
					rgba(128, 128, 128, ${0.3 + dissolveFactor * 0.4}) 0%,
					rgba(100, 100, 100, ${0.4 + dissolveFactor * 0.4}) 50%,
					rgba(80, 80, 80, ${0.3 + dissolveFactor * 0.3}) 100%)`, // 灰色渐变
			}
		}

		return { opacity: 1, background: null } // 未经过的柱子正常显示
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
						color: 'rgba(120, 113, 108, 0.7)',
						fontSize: '14px',
						fontStyle: 'italic'
					}}
				>
					Enter token amounts to see liquidity distribution
				</Box>
			)
		}

		// 根据token分布决定柱子数量和分布
		const barsToRender = []
		const baseHeight = 200
		
		// Get dynamic range info based on current drag position or default
		const currentPosition = dragPosition || getCurrentPriceIndicatorPosition()
		const { numBins: dynamicNumBins } = calculatePriceRangeFromPosition(currentPosition)
		
		// Use a reasonable number of visual bars (not necessarily equal to numBins)
		const numBars = Math.min(50, Math.max(10, Math.floor(dynamicNumBins / 2))) // Display 10-50 bars for visualization

		if (amt0 > 0 && amt1 === 0) {
			// 只有Token X：从指示棒(锚点)向右渲染
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					// 每根柱子一个台阶 - 固定台阶高度（下台阶）
					height = 450 - (i * 6) // 增加起始高度到450px，确保69根柱子6px阶梯完整显示
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 固定台阶高度（上台阶）
					height = 30 + (i * 6) // 增加阶梯步长：每根柱子上升6个像素
				}

				// 获取柱子的消失效果
				const dissolveEffect = getBarDissolveEffect(i, numBars, false)
				
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4,
							height: Math.max(30, height),
							background: dissolveEffect.background || `linear-gradient(135deg,
								rgba(249, 115, 22, 0.8) 0%,
								rgba(251, 146, 60, 0.9) 50%,
								rgba(234, 88, 12, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(249, 115, 22, 0.4), 0 2px 8px rgba(249, 115, 22, 0.3)',
							opacity: dissolveEffect.opacity,
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
					height = 450 - (i * 6) // 增加起始高度到450px，确保69根柱子6px阶梯完整显示
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 从指示线开始上升
					height = 30 + (i * 6) // 增加阶梯步长：每根柱子上升6个像素
				}

				// 获取柱子的消失效果
				const dissolveEffect = getBarDissolveEffect(i, numBars, true)
				
				// 直接push，配合flexDirection: 'row-reverse'实现从右向左
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4, // 减小宽度以适应69根柱子
							height: Math.max(30, height),
							background: dissolveEffect.background || `linear-gradient(135deg,
								rgba(245, 158, 11, 0.8) 0%,
								rgba(251, 146, 60, 0.9) 50%,
								rgba(217, 119, 6, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(245, 158, 11, 0.3)',
							opacity: dissolveEffect.opacity,
						}}
					/>
				)
			}
		} else if (amt0 > 0 && amt1 > 0) {
			// AutoFill模式：以指示棒为中心，左右分布
			for (let i = -34; i <= 34; i++) { // 总共69根柱子 (-34到34)
				let height = baseHeight
				const distance = Math.abs(i)
				
				if (strategy === 'curve') {
					// 每根柱子一个台阶 - 固定台阶高度（下台阶）
					height = 450 - (distance * 6) // 增加起始高度到450px，确保69根柱子6px阶梯完整显示
				} else if (strategy === 'bid-ask') {
					// 每根柱子一个台阶 - 固定台阶高度（上台阶）
					height = 30 + (distance * 6) // 增加阶梯步长：每根柱子上升6个像素
				}

				const isCenter = i === 0
				let barColor
				if (isCenter) {
					barColor = 'linear-gradient(to bottom, #f97316 50%, #f59e0b 50%)'
				} else if (i < 0) {
					barColor = `linear-gradient(135deg,
						rgba(245, 158, 11, 0.8) 0%,
						rgba(251, 146, 60, 0.9) 50%,
						rgba(217, 119, 6, 0.7) 100%)`
				} else {
					barColor = `linear-gradient(135deg,
						rgba(249, 115, 22, 0.8) 0%,
						rgba(251, 146, 60, 0.9) 50%,
						rgba(234, 88, 12, 0.7) 100%)`
				}

				// 获取柱子的消失效果（AutoFill模式使用索引 i + 34 来映射到0-68范围）
				const dissolveEffect = getBarDissolveEffect(i + 34, 69, false)

				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4, // 减小宽度以适应69根柱子
							height: Math.max(30, height), // 移除最大高度限制，让台阶更明显
							background: dissolveEffect.background || barColor,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: isCenter 
								? '0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4)'
								: i < 0 
									? '0 0 10px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(245, 158, 11, 0.3)'
									: '0 0 10px rgba(249, 115, 22, 0.4), 0 2px 8px rgba(249, 115, 22, 0.3)',
							opacity: dissolveEffect.opacity,
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
				{barsToRender.map((bar, index) => (
					<Box
						key={index}
						sx={getBarDissolveEffect(index, barsToRender.length, amt1 > 0 && amt0 === 0)}
					>
						{bar}
					</Box>
				))}
			</Box>
		)
	}

	/**
	 * Helper function to demonstrate bin step price calculations
	 * This shows exactly how prices would be calculated for different bin steps
	 */
	const demonstrateBinStepCalculation = useCallback(() => {
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
	}, [anchorPrice])

	// Run demonstration on component mount (development only)
	React.useEffect(() => {
		demonstrateBinStepCalculation()
	}, [binStep, anchorPrice, demonstrateBinStepCalculation])

	return (
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>		<Box
			ref={containerRef}
			sx={{
				position: 'relative',
				height: 480,
				background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.05) 0%, rgba(249, 115, 22, 0.08) 50%, rgba(251, 146, 60, 0.05) 100%)',
				borderRadius: 2,
				borderLeft: '2px solid rgba(249, 115, 22, 0.3)',
				borderBottom: '2px solid rgba(249, 115, 22, 0.3)',
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
					background: 'radial-gradient(ellipse at center bottom, rgba(249, 115, 22, 0.08) 0%, transparent 70%)',
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
					background: 'linear-gradient(to bottom, rgba(249, 115, 22, 0.9) 0%, rgba(249, 115, 22, 0.7) 100%)',
					transform: 'translateX(-50%)',
					zIndex: 3,
					borderRadius: '1px',				boxShadow: isDragging ? `
					0 0 16px rgba(249, 115, 22, 0.9),
					0 0 32px rgba(249, 115, 22, 0.5),
					0 4px 8px rgba(0, 0, 0, 0.3)
				` : `
					0 0 8px rgba(249, 115, 22, 0.6),
					0 0 16px rgba(249, 115, 22, 0.3),
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
						? 'linear-gradient(135deg, rgba(255, 251, 235, 1) 0%, rgba(254, 243, 199, 0.95) 100%)'
						: 'linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.9) 100%)',
					color: '#7c2d12',
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
					border: isDragging ? '2px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(249, 115, 22, 0.3)',
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

			{/* Price scale - 显示基于anchor price的动态刻度 */}
			<Box sx={{
				display: 'flex',
				justifyContent: 'space-between',
				fontSize: '11px',
				color: 'rgba(120, 113, 108, 0.8)',
				mb: 4,
				px: 1,
				py: 2,
				alignItems: 'flex-end',
				height: '40px',
				overflow: 'visible',
			}}>
				{Array.from({ length: 7 }, (_, i) => { // 显示7个刻度
					// 获取当前指示器位置
					const currentPosition = dragPosition || getCurrentPriceIndicatorPosition()
					const indicatorPositionValue = parseFloat(currentPosition.replace('%', ''))
					
					// 计算每个刻度在可视化器中的位置百分比 (0-100)
					const scalePositionPercent = (i / 6) * 100
					
					// 关键修复：以指示器位置为中心计算价格刻度
					// 指示器位置始终显示 anchor price，其他位置基于偏移计算
					const offsetFromIndicator = scalePositionPercent - indicatorPositionValue // -100% to +100%
					
					// 计算价格 - 基于 bin step 的精确计算
					let price: number
					
					if (Math.abs(offsetFromIndicator) < 1) {
						// 如果刻度接近指示器位置（1%容差），显示 anchor price
						price = anchorPrice
					} else {
						// 基于 bin step 计算精确价格
						// 将偏移量转换为 bin 数量
						const binStepDecimal = binStep / 10000
						const binsFromAnchor = (offsetFromIndicator / 100) * 50 // 简化：50个bin的跨度
						
						// 使用复合增长公式计算价格
						price = anchorPrice * Math.pow(1 + binStepDecimal, binsFromAnchor)
					}
					
					// 判断当前刻度是否是 anchor price 位置
					const isAtAnchor = Math.abs(offsetFromIndicator) < 2 // 2% 容差
					
					// 智能格式化价格显示
					const formatPrice = (price: number) => {
						if (price >= 1000) {
							return price.toFixed(0)
						} else if (price >= 100) {
							return price.toFixed(1)
						} else if (price >= 10) {
							return price.toFixed(2)
						} else if (price >= 1) {
							return price.toFixed(3)
						} else if (price >= 0.1) {
							return price.toFixed(4)
						} else if (price >= 0.01) {
							return price.toFixed(5)
						} else {
							return price.toFixed(6)
						}
					}

					return (
						<Box
							key={i}
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
								flex: 1,
								position: 'relative',
							}}
						>
							{/* 刻度线 */}
							<Box sx={{
								position: 'absolute',
								top: -10,
								width: isAtAnchor ? '2px' : '1px',
								height: isAtAnchor ? '12px' : '8px',
								background: isAtAnchor ? 'rgba(249, 115, 22, 0.9)' : 'rgba(120, 113, 108, 0.4)',
								zIndex: 1,
							}} />
							
							<Typography
								variant="caption"
								sx={{
									fontSize: isAtAnchor ? '11px' : '10px',
									fontWeight: isAtAnchor ? 700 : 500,
									color: isAtAnchor ? '#7c2d12' : 
										  price < anchorPrice ? '#f59e0b' : 
										  price > anchorPrice ? '#f97316' : 'rgba(120, 113, 108, 0.8)',
									transition: 'all 0.3s ease',
									whiteSpace: 'nowrap',
									textAlign: 'center',
									textShadow: isAtAnchor ? '0 0 8px rgba(249, 115, 22, 0.3)' : 'none',
									background: isAtAnchor ? 'rgba(255, 251, 235, 0.9)' : 'transparent',
									padding: isAtAnchor ? '3px 6px' : '2px 4px',
									borderRadius: '4px',
									border: isAtAnchor ? '1px solid rgba(249, 115, 22, 0.3)' : 'none',
									boxShadow: isAtAnchor ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
									'&:hover': {
										color: '#7c2d12',
										transform: 'scale(1.1)',
										textShadow: '0 0 6px rgba(249, 115, 22, 0.4)',
										background: 'rgba(255, 251, 235, 0.9)',
									},
								}}
							>
								{formatPrice(price)}
								{isAtAnchor && (
									<Typography component="span" sx={{ 
										fontSize: '8px', 
										ml: 0.5, 
										opacity: 0.7,
										fontWeight: 400 
									}}>
										📍
									</Typography>
								)}
							</Typography>
						</Box>
					)
				})}
			</Box>
		</Box>
	)
}

export default PriceRangeVisualizer
