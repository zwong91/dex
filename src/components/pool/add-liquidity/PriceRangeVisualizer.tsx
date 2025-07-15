import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Typography, IconButton } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { LiquidityStrategy } from './StrategySelection'
import { usePriceToggle } from './contexts/PriceToggleContext'

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
	resetTrigger?: number // 添加重置触发器，当这个数字变化时重置拖动位置
	// 🎯 添加外部价格范围props，用于同步手动编辑
	minPrice?: number
	maxPrice?: number
}

const PriceRangeVisualizer = ({
	activeBinPrice,
	amount0,
	amount1,
	strategy,
	binStep = 1, // 默认值1基点（0.01%）
	onPriceRangeChange, // 添加价格范围变化回调
	resetTrigger, // 添加重置触发器
	// 🎯 外部价格范围props
	minPrice,
	maxPrice,
}: PriceRangeVisualizerProps) => {
	// 拖动状态
	const [isDragging, setIsDragging] = useState(false)
	const [dragPosition, setDragPosition] = useState<string | null>(null) // 存储拖动位置，null表示使用默认位置
	const [isAnimating, setIsAnimating] = useState(false) // 添加动画状态
	const [animationTargetPosition, setAnimationTargetPosition] = useState<string | null>(null) // 动画目标位置
	const [hasUserDragged, setHasUserDragged] = useState(false) // 追踪用户是否已经手动拖动过
	const containerRef = useRef<HTMLDivElement>(null)
	
	// 使用全局价格切换状态
	const { isReversed, togglePriceDirection } = usePriceToggle()
	
	// 监听金额变化，触发自动动画
	useEffect(() => {
		const amt0 = parseFloat(amount0) || 0
		const amt1 = parseFloat(amount1) || 0
		
		// 只有在用户没有手动拖动过且输入单侧流动性时才触发动画
		if (!hasUserDragged && !isDragging) {
			// 只有在用户输入左侧token（amount0 > 0 且 amount1 = 0）时触发动画
			if (amt0 > 0 && amt1 === 0) {
				console.log('🎬 Triggering auto animation: indicator moving to left (first time)')
				setIsAnimating(true)
				setAnimationTargetPosition('1%') // 移动到最左侧1%位置，真正的边界
				
				// 1秒后设置最终位置并结束动画
				setTimeout(() => {
					setDragPosition('1%')
					setIsAnimating(false)
					setAnimationTargetPosition(null)
					
					// 触发价格范围变化回调
					if (onPriceRangeChange) {
						const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition('1%')
						onPriceRangeChange(minPrice, maxPrice, numBins)
					}
				}, 1000)
			}
			// 如果用户只输入右侧token（amount1 > 0 且 amount0 = 0）时触发动画到右侧
			else if (amt1 > 0 && amt0 === 0) {
				console.log('🎬 Triggering auto animation: indicator moving to right (first time)')
				setIsAnimating(true)
				setAnimationTargetPosition('99%') // 移动到最右侧99%位置，真正的边界
				
				// 1秒后设置最终位置并结束动画
				setTimeout(() => {
					setDragPosition('99%')
					setIsAnimating(false)
					setAnimationTargetPosition(null)
					
					// 触发价格范围变化回调
					if (onPriceRangeChange) {
						const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition('99%')
						onPriceRangeChange(minPrice, maxPrice, numBins)
					}
				}, 1000)
			}
		}
	}, [amount0, amount1, hasUserDragged, isDragging, onPriceRangeChange]) // 添加hasUserDragged依赖
	
	// 监听重置触发器
	useEffect(() => {
		if (resetTrigger !== undefined) {
			console.log('🔄 Reset triggered, clearing drag position and user drag flag')
			setDragPosition(null)
			setIsAnimating(false)
			setAnimationTargetPosition(null)
			setHasUserDragged(false) // 重置时清除用户拖动标志，允许下次自动动画
		}
	}, [resetTrigger])
	
	// 价格锚点：永远显示 activeBinPrice
	const anchorPrice = activeBinPrice
	const getCurrentPrice = () => {
		// 指示棒上的价格始终显示锚点价格，不随拖动变化
		const price = isReversed ? (1 / anchorPrice) : anchorPrice
		const tokenPair = isReversed ? "USDC/WBNB" : "WBNB/USDC"
		return `${price.toFixed(4)} ${tokenPair}`
	}
	
	// 🎯 根据价格范围计算位置（用于同步手动编辑的价格）
	const calculatePositionFromPriceRange = useCallback((min: number, max: number) => {
		console.log('🔍 calculatePositionFromPriceRange:', {
			min: min.toFixed(6),
			max: max.toFixed(6), 
			anchorPrice: anchorPrice.toFixed(6),
			binStep
		})
		
		// 🚨 检测数据异常：如果 min 和 max 都远大于 anchor，这说明数据有问题
		const minRatio = min / anchorPrice // 最小价格相对于anchor的比例
		const maxRatio = max / anchorPrice // 最大价格相对于anchor的比例
		
		console.log('🔍 Range type detection:', {
			minRatio: minRatio.toFixed(4),
			maxRatio: maxRatio.toFixed(4),
			'Data analysis': minRatio > 5 && maxRatio > 5 ? 'ABNORMAL: Both min/max >> anchor' : 'Normal range'
		})
		
		// 🚨 数据异常处理：如果数据明显错误，直接使用当前拖动位置
		if (minRatio > 5 && maxRatio > 5) {
			console.log('🚨 Abnormal external price data detected, maintaining current position')
			return dragPosition || '50%'
		}
		
		// 🎯 正确的Liquidity Book流动性检测逻辑
		const tolerance = 0.01 // 1% 容差，更精确
		
		// 左侧流动性：min ≈ anchor, max < anchor (USDT only)
		const isLeftSided = Math.abs(minRatio - 1.0) < tolerance && maxRatio < (1.0 - tolerance)
		// 右侧流动性：max ≈ anchor, min > anchor (Token X only)  
		const isRightSided = Math.abs(maxRatio - 1.0) < tolerance && minRatio > (1.0 + tolerance)
		// 对称流动性：min < anchor < max
		const isSymmetric = minRatio < (1.0 - tolerance) && maxRatio > (1.0 + tolerance)
		
		console.log('🔍 Final range classification:', {
			isLeftSided: isLeftSided ? '✅ USDT only (min≈anchor, max<anchor)' : false,
			isRightSided: isRightSided ? '✅ Token X only (max≈anchor, min>anchor)' : false, 
			isSymmetric: isSymmetric ? '✅ Both tokens (min<anchor<max)' : false,
			tolerance
		})
		
		if (isLeftSided) {
			// 左侧流动性：指示棒应该在最左边
			const result = '1%'
			console.log('🔍 Left-sided: position at far left:', result)
			return result
		} else if (isRightSided) {
			// 右侧流动性：指示棒应该在最右边
			const result = '99%'
			console.log('🔍 Right-sided: position at far right:', result)
			return result
		} else if (isSymmetric) {
			// 对称流动性：指示棒在中心
			const result = '50%'
			console.log('🔍 Symmetric: position at center:', result)
			return result
		} else {
			// 其他情况：保持当前位置
			const result = dragPosition || '50%'
			console.log('🔍 Other case: maintaining current position:', result)
			return result
		}
	}, [binStep, anchorPrice, dragPosition])
	
	// 🎯 监听外部价格变化，同步可视化位置
	useEffect(() => {
		// 🚨 简单逻辑：只在不拖动时同步外部价格变化
		if (minPrice !== undefined && maxPrice !== undefined && !isDragging && !isAnimating) {
			const newPosition = calculatePositionFromPriceRange(minPrice, maxPrice)
			console.log('🎯 Syncing with external price changes:', {
				minPrice: minPrice.toFixed(6),
				maxPrice: maxPrice.toFixed(6),
				newPosition,
				currentDragPosition: dragPosition,
				willUpdate: dragPosition !== newPosition ? 'YES' : 'NO'
			})
			
			// 只有在位置真的不同时才更新
			if (dragPosition !== newPosition) {
				console.log('🎯 Setting new position:', newPosition)
				setDragPosition(newPosition)
			}
		}
	}, [minPrice, maxPrice, isDragging, isAnimating, calculatePositionFromPriceRange, anchorPrice])
	
	// 计算位置基于鼠标坐标的拖动处理
	const calculatePositionFromMouse = useCallback((x: number, containerWidth: number) => {
		const percentage = Math.max(0, Math.min(1, x / containerWidth))
		return `${percentage * 100}%`
	}, [])
	
	// 拖动开始
	const handleDragStart = useCallback((e: React.MouseEvent) => {
		console.log('🎯 Drag started')
		
		e.preventDefault()
		e.stopPropagation()
		
		// 强制设置状态，无论当前状态如何
		setIsDragging(true)
		setHasUserDragged(true)
		setIsAnimating(false) // 强制停止动画
		setAnimationTargetPosition(null)
	}, []) // 🎯 移除所有依赖，让函数更稳定
	
	// 计算基于拖动位置的价格范围
	const calculatePriceRangeFromPosition = useCallback((position: string) => {
		const positionValue = parseFloat(position.replace('%', ''))
		const binStepDecimal = binStep / 10000
		
		// 计算距离中心的偏移（-50% 到 +50%）
		const offsetFromCenter = positionValue - 50 // -50 to +50
		
		// 计算实际的价格范围
		let minPrice: number
		let maxPrice: number
		
		if (Math.abs(offsetFromCenter) < 3) {
			// 中心位置（±3%容差）：创建对称的合理范围
			// 使用固定的bin数量来创建对称范围
			const symmetricBins = 10 // 两边各10个bin，总共20个bin
			
			minPrice = anchorPrice * Math.pow(1 + binStepDecimal, -symmetricBins)
			maxPrice = anchorPrice * Math.pow(1 + binStepDecimal, symmetricBins)
		} else if (offsetFromCenter < 0) {
			// 左侧偏移（USDT only）：liquidty从 minPrice 到 anchorPrice
			// anchorPrice 是右边界（最高价格）
			maxPrice = anchorPrice
			
			// 计算离中心的距离，转换为bin数量 - 大幅增加范围
			const offsetPercent = Math.abs(offsetFromCenter) // 0 to 50
			// 大幅增加bin数量范围：最多可达1000个bin，实现更大的价格变化
			const binsCount = Math.round((offsetPercent / 50) * 1000) // 0 to 1000 bins
			
			// 向左扩展：计算更低的价格
			minPrice = anchorPrice * Math.pow(1 + binStepDecimal, -binsCount)
		} else {
			// 右侧偏移（Token X only）：liquidity从 anchorPrice 到 maxPrice  
			// anchorPrice 是左边界（最低价格）
			minPrice = anchorPrice
			
			// 计算离中心的距离，转换为bin数量 - 大幅增加范围
			const offsetPercent = Math.abs(offsetFromCenter) // 0 to 50
			// 大幅增加bin数量范围：最多可达1000个bin，实现更大的价格变化
			const binsCount = Math.round((offsetPercent / 50) * 1000) // 0 to 1000 bins
			
			// 向右扩展：计算更高的价格
			maxPrice = anchorPrice * Math.pow(1 + binStepDecimal, binsCount)
		}
		
		// 关键：基于价格范围动态计算bin数量
		// 使用对数公式：bins = log(maxPrice/minPrice) / log(1 + binStepDecimal)
		const priceRatio = maxPrice / minPrice
		const numBinsCalculated = Math.round(Math.log(priceRatio) / Math.log(1 + binStepDecimal))
		
		// 大幅增加bin数量限制，支持更大的价格范围变化
		const actualNumBins = Math.max(5, Math.min(2000, numBinsCalculated))
		
		// Log for debugging - 验证你的数学计算
		if (process.env.NODE_ENV === 'development') {
			const rangePercent = ((maxPrice / minPrice - 1) * 100).toFixed(1)
			const minPriceChange = ((minPrice / anchorPrice - 1) * 100).toFixed(2)
			const maxPriceChange = ((maxPrice / anchorPrice - 1) * 100).toFixed(2)
			
			console.log('🎯 Liquidity Book Range Calculation (FIXED):', {
				positionValue: positionValue.toFixed(1) + '%',
				offsetFromCenter: offsetFromCenter.toFixed(1) + '%',
				binStep: binStep + ' basis points (' + (binStep / 100).toFixed(2) + '%)',
				anchorPrice: anchorPrice.toFixed(6),
				minPrice: minPrice.toFixed(6),
				maxPrice: maxPrice.toFixed(6),
				minPriceChange: minPriceChange + '%',
				maxPriceChange: maxPriceChange + '%',
				priceRatio: priceRatio.toFixed(4),
				totalRangePercent: rangePercent + '%',
				calculatedBins: numBinsCalculated,
				actualNumBins,
				// 验证Liquidity Book协议
				protocolCheck: offsetFromCenter < -3 ? 
					`✅ LEFT SIDE: Range ${minPrice.toFixed(6)} → ${anchorPrice.toFixed(6)} (maxPrice = anchor ✓)` : 
					offsetFromCenter > 3 ? 
					`✅ RIGHT SIDE: Range ${anchorPrice.toFixed(6)} → ${maxPrice.toFixed(6)} (minPrice = anchor ✓)` : 
					`✅ BOTH TOKENS: Symmetric range around anchor`,
				// 验证计算：如果是20个bin的对称范围
				verifyRange20Bins: binStep === 20 ? 
					((Math.pow(1.002, 10) / Math.pow(1.002, -10) - 1) * 100).toFixed(1) + '% (expected ~4%)' : 
					binStep === 100 ? 
					((Math.pow(1.01, 10) / Math.pow(1.01, -10) - 1) * 100).toFixed(1) + '% (expected ~22%)' : 
					'N/A'
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

	// 使用useRef来追踪是否已经设置了初始价格范围
	const hasSetInitialRange = useRef(false)

	// 初始化价格范围 - 确保即使用户不拖拽也有默认的价格范围参数
	React.useEffect(() => {
		if (onPriceRangeChange && anchorPrice > 0 && !hasSetInitialRange.current) {
			// 使用默认位置（50%）计算初始价格范围
			const defaultPosition = '50%'
			const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition(defaultPosition)
			
			// 只在有效的价格范围时调用回调
			if (minPrice > 0 && maxPrice > minPrice) {
				onPriceRangeChange(minPrice, maxPrice, numBins)
				hasSetInitialRange.current = true
				
				if (process.env.NODE_ENV === 'development') {
					console.log('🎯 Initial price range set:', {
						minPrice: minPrice.toFixed(6),
						maxPrice: maxPrice.toFixed(6),
						numBins,
						anchorPrice: anchorPrice.toFixed(6)
					})
				}
			}
		}
	}, [anchorPrice]) // 只依赖anchorPrice，避免无限循环

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
		const position = isAnimating 
			? animationTargetPosition || getCurrentPriceIndicatorPosition()
			: getCurrentPriceIndicatorPosition()
		const positionValue = parseFloat(position.replace('%', ''))
		
		// 判断指示器的位置范围来决定标签的定位策略
		if (positionValue <= 5) {
			// 指示器在最左边：标签显示在右侧，紧贴指示棒
			return {
				left: position,
				transform: 'translateX(4px)', // 减小偏移距离，更贴近指示棒
				transition: isAnimating ? 'left 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'left 0.3s ease-out',
			}
		} else if (positionValue >= 95) {
			// 指示器在最右边：标签显示在左侧，紧贴指示棒
			return {
				left: position,
				transform: 'translateX(-100%) translateX(-4px)', // 完全向左偏移再减去间距
				transition: isAnimating ? 'left 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'left 0.3s ease-out',
			}
		} else {
			// 指示器在中间：标签居中对齐到指示器位置
			return {
				left: position,
				transform: 'translateX(-50%)',
				transition: isAnimating ? 'left 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'left 0.3s ease-out',
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
						fontStyle: 'italic',
					}}
				>
					Enter token amounts to see liquidity distribution
				</Box>
			)
		}

		const barsToRender = []
		const baseHeight = 200

		const currentPosition = dragPosition || getCurrentPriceIndicatorPosition()
		const { numBins: dynamicNumBins } = calculatePriceRangeFromPosition(currentPosition)

		// 🎯 恢复原来密集的柱子数量，让初始柱子数量更密集，最多70根，最少50根
		const numBars = Math.min(70, Math.max(50, dynamicNumBins))

		if (amt0 > 0 && amt1 === 0) {
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					height = 450 - (i * 6)
				} else if (strategy === 'bid-ask') {
					height = 30 + (i * 6)
				}
				const dissolveEffect = getBarDissolveEffect(i, numBars, false)
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4,
							height: Math.max(30, height),
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
			for (let i = 0; i < numBars; i++) {
				let height = baseHeight
				if (strategy === 'curve') {
					height = 450 - (i * 6)
				} else if (strategy === 'bid-ask') {
					height = 30 + (i * 6)
				}
				const dissolveEffect = getBarDissolveEffect(i, numBars, true)
				barsToRender.push(
					<Box
					key={i}
						sx={{
							width: 4,
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
			for (let i = -Math.floor(numBars / 2); i <= Math.floor(numBars / 2); i++) {
				let height = baseHeight
				const distance = Math.abs(i)
				if (strategy === 'curve') {
					height = 450 - (distance * 6)
				} else if (strategy === 'bid-ask') {
					height = 30 + (distance * 6)
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
				const dissolveEffect = getBarDissolveEffect(i + Math.floor(numBars / 2), numBars, false)
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4,
							height: Math.max(30, height),
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
		<Box sx={{ mb: 3, position: 'relative', pt: 6 }}>
			{/* 主要的可视化容器 */}
			<Box
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
					left: isAnimating 
						? animationTargetPosition || getCurrentPriceIndicatorPosition()
						: getCurrentPriceIndicatorPosition(),
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
					// 添加动画过渡
					transition: isAnimating 
						? 'left 1s cubic-bezier(0.4, 0, 0.2, 1)'
						: isDragging 
							? 'none' 
							: 'left 0.3s ease-out',
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
						left: isAnimating 
							? animationTargetPosition || getCurrentPriceIndicatorPosition()
							: getCurrentPriceIndicatorPosition(),
						bottom: -8,
						width: 20,
						height: 16,
						background: isDragging 
							? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
							: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.9) 100%)',
						transform: 'translateX(-50%)',
						zIndex: 10, // 🎯 增加z-index确保在最顶层
						borderRadius: '8px 8px 4px 4px',
						cursor: isDragging ? 'grabbing' : 'grab',
						border: isDragging ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.6)',
						// 🎯 确保鼠标事件不被阻止
						pointerEvents: 'auto',
						userSelect: 'none',
						// 添加动画过渡
						transition: isAnimating 
							? 'left 1s cubic-bezier(0.4, 0, 0.2, 1)'
							: isDragging 
								? 'none' 
								: 'all 0.2s ease',
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
					<Typography component="span" sx={{ 
						fontSize: '10px',
						color: 'rgba(26, 27, 46, 0.6)',
						fontWeight: 500,
						mr: 0.5
					}}>
						Current Price:
					</Typography>
					{getCurrentPrice()}
					<IconButton 
						size="small"
						onClick={togglePriceDirection}
						sx={{ 
							ml: 0.5,
							width: 16,
							height: 16,
							minWidth: 16,
							padding: 0,
							color: 'rgba(26, 27, 46, 0.6)',
							'&:hover': {
								color: 'rgba(26, 27, 46, 0.8)',
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
							}
						}}
					>
						<SwapHorizIcon sx={{ fontSize: 10 }} />
					</IconButton>
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

			{/* Price scale - 基于实际minPrice和maxPrice的动态刻度 */}
			<Box sx={{
				display: 'flex',
				justifyContent: 'space-between',
				fontSize: '11px', // 恢复字体大小
				color: 'rgba(255, 255, 255, 0.9)', // 增加对比度
				mb: 4,
				px: 1,
				py: 2,
				alignItems: 'flex-end',
				height: '40px',
				overflow: 'visible',
			}}>
				{Array.from({ length: 14 }, (_, i) => { // 🎯 增加到14个刻度
					// 获取当前实际的价格范围
					const currentMinPrice = minPrice || anchorPrice * 0.9
					const currentMaxPrice = maxPrice || anchorPrice * 1.1
					
					// 计算价格刻度 - 线性分布从 minPrice 到 maxPrice
					const priceRatio = i / 13 // 0 到 1 (14个刻度，13个间隔)
					const price = currentMinPrice + (currentMaxPrice - currentMinPrice) * priceRatio
					
					// 🎯 简单逻辑：判断 anchor price 在哪个刻度位置
					const isAtLeftEdge = anchorPrice <= currentMinPrice
					const isAtRightEdge = anchorPrice >= currentMaxPrice
					const anchorIndex = isAtLeftEdge ? 0 : isAtRightEdge ? 13 : Math.round((anchorPrice - currentMinPrice) / (currentMaxPrice - currentMinPrice) * 13)
					
					const isNearAnchor = (i === anchorIndex)
					
					// 应用价格反转逻辑
					const displayPrice = isReversed && price !== 0 ? 1 / price : price
					
					// 判断当前刻度是否是 anchor price 位置
					const isAtAnchor = isNearAnchor // 使用前面计算的 isNearAnchor
					
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
								background: isAtAnchor ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.4)',
								zIndex: 1,
							}} />
							
							<Typography
								variant="caption"
								sx={{
									fontSize: isAtAnchor ? '11px' : '10px',
									fontWeight: isAtAnchor ? 700 : 500,
									color: isAtAnchor ? '#7c2d12' : 
										  displayPrice < (isReversed && anchorPrice !== 0 ? 1 / anchorPrice : anchorPrice) ? '#00D9FF' : 
										  displayPrice > (isReversed && anchorPrice !== 0 ? 1 / anchorPrice : anchorPrice) ? '#7B68EE' : 'rgba(255, 255, 255, 0.8)',
									transition: 'all 0.3s ease',
									whiteSpace: 'nowrap',
									textAlign: 'center',
									textShadow: isAtAnchor ? '0 0 8px rgba(255, 255, 255, 0.8)' : 'none',
									background: isAtAnchor ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
									padding: isAtAnchor ? '3px 6px' : '2px 4px',
									borderRadius: '4px',
									border: isAtAnchor ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
									boxShadow: isAtAnchor ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
									'&:hover': {
										color: '#ffffff',
										transform: 'scale(1.1)',
										textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
										background: 'rgba(255, 255, 255, 0.15)',
									},
								}}
							>
								{formatPrice(displayPrice)}
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
