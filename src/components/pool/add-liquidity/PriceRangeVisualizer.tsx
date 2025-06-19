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
	
	// 计算基于拖动位置的价格（用于价格范围计算，不影响显示）
	const getDraggedPrice = () => {
		if (dragPosition !== null) {
			const positionValue = parseFloat(dragPosition.replace('%', ''))
			const binStepDecimal = binStep / 10000
			const totalBinsDisplayed = 100
			const binsFromCenter = Math.round((positionValue - 50) * totalBinsDisplayed / 100)
			const draggedPrice = anchorPrice * Math.pow(1 + binStepDecimal, binsFromCenter)
			return draggedPrice
		}
		return anchorPrice
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
	
	// 计算基于拖动位置的价格范围
	const calculatePriceRangeFromPosition = useCallback((position: string) => {
		const positionValue = parseFloat(position.replace('%', ''))
		const binStepDecimal = binStep / 10000
		
		// 根据拖动位置计算价格范围
		// 现在可视化器显示69个bin
		const totalBinsDisplayed = 69 // 总共69个bin
		const binsFromCenter = Math.round((positionValue - 50) * totalBinsDisplayed / 100)
		
		// 计算当前位置对应的价格（基于anchor price）
		const currentPositionPrice = anchorPrice * Math.pow(1 + binStepDecimal, binsFromCenter)
		
		// 基于当前位置和策略计算价格范围
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		// 根据token分布调整范围
		if (amt0 > 0 && amt1 === 0) {
			// 只有Token X：范围向右扩展，使用全部69个bin
			const minPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, -5)
			const maxPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, 64) // 69-5=64
			return { minPrice, maxPrice, numBins: 69 }
		} else if (amt1 > 0 && amt0 === 0) {
			// 只有Token Y：范围向左扩展，使用全部69个bin
			const minPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, -64) // 69-5=64
			const maxPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, 5)
			return { minPrice, maxPrice, numBins: 69 }
		} else {
			// AutoFill模式：以当前位置为中心对称扩展，使用全部69个bin
			const minPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, -34)
			const maxPrice = currentPositionPrice * Math.pow(1 + binStepDecimal, 34)
			return { minPrice, maxPrice, numBins: 69 }
		}
	}, [anchorPrice, binStep, amount0, amount1, strategy])

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
						strategy,
						anchorPrice: anchorPrice.toFixed(6)
					})
				}
			}
		}
	}, [isDragging, dragPosition, onPriceRangeChange, calculatePriceRangeFromPosition])
	
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
		const amt0 = parseFloat(amount0 || '0')
		const amt1 = parseFloat(amount1 || '0')
		
		// 如果有拖动位置，使用拖动位置
		if (dragPosition !== null) {
			return dragPosition
		}
		
		// 默认位置
		if (amt0 > 0 && amt1 === 0) {
			// Token X模式：指示线固定在左边作为锚点
			return '0.0%'
		} else if (amt1 > 0 && amt0 === 0) {
			// Token Y模式：指示线固定在右边作为锚点
			return '100%'
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
		const baseHeight = 200 // 增加Spot策略的基础高度，更好地利用480px容器空间
		const numBars = 69 // 支持69根柱子，与价格刻度数量一致

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
							width: 4, // 减小宽度以适应69根柱子
							height: Math.max(30, height), // 移除最大高度限制，让台阶更明显
							background: dissolveEffect.background || `linear-gradient(135deg,
								rgba(123, 104, 238, 0.8) 0%,
								rgba(100, 80, 200, 0.9) 50%,
								rgba(80, 60, 160, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(123, 104, 238, 0.4), 0 2px 8px rgba(123, 104, 238, 0.3)',
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
								rgba(0, 217, 255, 0.8) 0%,
								rgba(0, 150, 200, 0.9) 50%,
								rgba(0, 100, 150, 0.7) 100%)`,
							borderRadius: '3px 3px 0 0',
							transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
							boxShadow: '0 0 10px rgba(0, 217, 255, 0.4), 0 2px 8px rgba(0, 217, 255, 0.3)',
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
								? '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
								: i < 0 
									? '0 0 10px rgba(0, 217, 255, 0.4), 0 2px 8px rgba(0, 217, 255, 0.3)'
									: '0 0 10px rgba(123, 104, 238, 0.4), 0 2px 8px rgba(123, 104, 238, 0.3)',
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
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>		<Box
			ref={containerRef}
			sx={{
				position: 'relative',
				height: 480, // 进一步增加高度从320px到480px，支持6px阶梯的完整显示
				background: 'linear-gradient(135deg, #1A1B2E 0%, #252749 50%, #1A1B2E 100%)',
				borderRadius: 0,
				borderLeft: '2px solid rgba(255, 255, 255, 0.6)',
				borderBottom: '2px solid rgba(255, 255, 255, 0.6)',
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
				fontSize: '8px', // 稍微增大字体提高可读性
				color: 'rgba(255, 255, 255, 0.8)', // 增加对比度
				mb: 4,
				px: 1,
				py: 1, // 减少内边距
				alignItems: 'flex-end',
				height: '30px', // 减少高度，更像标准X轴
				overflow: 'hidden',
			}}>
				{Array.from({ length: 69 }, (_, i) => {
					const amt0 = parseFloat(amount0 || '0')
					const amt1 = parseFloat(amount1 || '0')
					
					// 使用bin step计算精确的价格刻度
					const binStepDecimal = binStep / 10000
					
					let price: number
					let basePrice = anchorPrice // 默认使用锚点价格
					let indicatorIndex = 0 // 指示器对应的刻度索引
					
					// 如果有拖动位置，使用拖动位置作为新的锚点重新计算价格刻度
					if (dragPosition !== null) {
						basePrice = getDraggedPrice()
					}
					
					// 计算指示器在刻度中的实际位置（基于拖动位置）
					const currentIndicatorPosition = getCurrentPriceIndicatorPosition()
					const indicatorPositionValue = parseFloat(currentIndicatorPosition.replace('%', ''))
					
					// 根据指示器的实际位置计算对应的刻度索引
					const calculatedIndicatorIndex = Math.round((indicatorPositionValue / 100) * 68) // 0-68范围
					
					if (amt0 > 0 && amt1 === 0) {
						// Token X模式：指示器可以在任意位置，该位置对应的刻度显示基准价格
						indicatorIndex = calculatedIndicatorIndex
						const binsPerTick = 1 // 减小步长以适应更多刻度
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						// 以指示器位置为基准，计算其他刻度的价格
						price = basePrice * Math.pow(priceMultiplier, (i - indicatorIndex))
					} else if (amt1 > 0 && amt0 === 0) {
						// Token Y模式：指示器可以在任意位置，该位置对应的刻度显示基准价格
						indicatorIndex = calculatedIndicatorIndex
						const binsPerTick = 1
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						// 以指示器位置为基准，计算其他刻度的价格
						price = basePrice * Math.pow(priceMultiplier, (i - indicatorIndex))
					} else {
						// AutoFill模式：指示器可以在任意位置，该位置对应的刻度显示基准价格
						indicatorIndex = calculatedIndicatorIndex
						const binsPerTick = 0.8 // 中心模式使用更小的步长
						const priceMultiplier = Math.pow(1 + binStepDecimal, binsPerTick)
						// 以指示器位置为基准，计算其他刻度的价格
						price = basePrice * Math.pow(priceMultiplier, (i - indicatorIndex))
					}
					
					// 判断当前刻度是否对应指示器位置
					const isIndicatorPosition = i === indicatorIndex
					
					// 添加日志以验证计算结果（仅在开发模式下）
					if (process.env.NODE_ENV === 'development' && i === 0) {
						console.log('🔢 Price Scale Calculation:', {
							binStep,
							binStepDecimal,
							binStepPercentage: `${binStep / 100}%`,
							basePrice: basePrice.toFixed(8),
							indicatorPrice: getCurrentPrice(),
							dragPosition,
							indicatorIndex,
							mode: amt0 > 0 && amt1 === 0 ? 'Token X' : 
								  amt1 > 0 && amt0 === 0 ? 'Token Y' : 'AutoFill',
						})
					}
					
					const isActivePrice = isIndicatorPosition

					return (
						<Box
							key={i}
							sx={{
								display: 'flex',
								alignItems: 'flex-end',
								justifyContent: 'center',
								height: '100%',
								minWidth: '8px', // 减小宽度以适应69个刻度
								position: 'relative',
								flex: '0 0 auto', // 防止收缩
							}}
						>
							<Typography
								variant="caption"
								sx={{
									fontSize: '6px', // 减小字体
									fontWeight: isActivePrice ? 700 : 400,
									color: isActivePrice ? '#ffffff' : 
										  price < basePrice ? '#00D9FF' : 
										  price > basePrice ? '#7B68EE' : 'rgba(255, 255, 255, 0.6)',
									transition: 'all 0.3s ease',
									// 45度倾斜显示
									transform: 'rotate(-45deg)',
									transformOrigin: 'bottom center',
									whiteSpace: 'nowrap',
									// 指示器位置的刻度添加特殊样式
									textShadow: isActivePrice ? '0 0 8px rgba(255, 255, 255, 0.8)' : 'none',
									background: isActivePrice ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
									padding: isActivePrice ? '1px 2px' : '0',
									borderRadius: isActivePrice ? '2px' : '0',
									// 添加hover效果
									'&:hover': {
										color: '#ffffff',
										transform: 'rotate(-45deg) scale(1.1)',
										textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
									},
								}}
							>
								{price.toFixed(5)} {/* 减少到5位小数以节省空间 */}
							</Typography>
						</Box>
					)
				})}
			</Box>
		</Box>
	)
}

export default PriceRangeVisualizer
