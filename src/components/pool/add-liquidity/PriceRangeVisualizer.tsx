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
	// 🎯 新增：来自LiquidityBinsChart的动态bin计算信息
	dynamicBinCount?: number
	binCalculation?: {
		binStep: number
		priceMultiplier: number
		halfRange: number
		totalPriceRangePercent: number
		centerBinOffset: number
	}
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
	// 🎯 动态bin同步props
	dynamicBinCount,
	binCalculation,
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
				setAnimationTargetPosition('0%') // 移动到最左侧0%位置，真正的边界
				
				// 1秒后设置最终位置并结束动画
				setTimeout(() => {
					setDragPosition('0%')
					setIsAnimating(false)
					setAnimationTargetPosition(null)
					
					// 触发价格范围变化回调
					if (onPriceRangeChange) {
						const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition('0%')
						onPriceRangeChange(minPrice, maxPrice, numBins)
					}
				}, 1000)
			}
			// 如果用户只输入右侧token（amount1 > 0 且 amount0 = 0）时触发动画到右侧
			else if (amt1 > 0 && amt0 === 0) {
				console.log('🎬 Triggering auto animation: indicator moving to right (first time)')
				setIsAnimating(true)
				setAnimationTargetPosition('100%') // 移动到最右侧99%位置，真正的边界
				
				// 1秒后设置最终位置并结束动画
				setTimeout(() => {
					setDragPosition('100%')
					setIsAnimating(false)
					setAnimationTargetPosition(null)
					
					// 触发价格范围变化回调
					if (onPriceRangeChange) {
						const { minPrice, maxPrice, numBins } = calculatePriceRangeFromPosition('100%')
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
		
		// 🎯 新逻辑：直接根据anchor price在价格范围中的位置计算指示棒位置
		// 计算anchor price在价格范围中的相对位置
		const anchorRatio = (anchorPrice - min) / (max - min)
		const clampedRatio = Math.max(0, Math.min(1, anchorRatio)) // 限制在0-1之间
		
		// 🎯 直接使用比例位置，允许0%-100%全范围移动
		const flexPosition = clampedRatio * 100
		const result = `${flexPosition}%`
		
		console.log('🎯 计算指示棒位置基于编辑的价格范围（允许边界位置）:', {
			anchorPrice: anchorPrice.toFixed(6),
			minPrice: min.toFixed(6),
			maxPrice: max.toFixed(6),
			anchorRatio: anchorRatio.toFixed(4),
			clampedRatio: clampedRatio.toFixed(4),
			flexPosition: flexPosition.toFixed(2),
			calculatedPosition: result,
			canReachBoundary: '✅ 现在可以到达0%和100%边界'
		})
		
		return result
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
		let actualNumBins: number
		
		if (Math.abs(offsetFromCenter) < 3) {
			// 中心位置（±3%容差）：创建对称的合理范围
			// 🎯 修正：使用合理的bin数量，不要太大
			const symmetricBins = 20 // 两边各20个bin，总共40个bin
			actualNumBins = symmetricBins * 2
			
			minPrice = anchorPrice * Math.pow(1 + binStepDecimal, -symmetricBins)
			maxPrice = anchorPrice * Math.pow(1 + binStepDecimal, symmetricBins)
		} else if (offsetFromCenter < 0) {
			// 左侧偏移（USDT only）：liquidity从 minPrice 到 anchorPrice
			// anchorPrice 是右边界（最高价格）
			maxPrice = anchorPrice
			
			// 🎯 修正：基于拖动距离计算合理的bin数量
			const offsetPercent = Math.abs(offsetFromCenter) // 0 to 50
			// 🎯 合理的bin数量范围：根据拖动距离线性映射到5-100个bin
			const binsCount = Math.round(5 + (offsetPercent / 50) * 95) // 5 to 100 bins
			actualNumBins = binsCount
			
			// 向左扩展：计算更低的价格
			minPrice = anchorPrice * Math.pow(1 + binStepDecimal, -binsCount)
		} else {
			// 右侧偏移（Token X only）：liquidity从 anchorPrice 到 maxPrice  
			// anchorPrice 是左边界（最低价格）
			minPrice = anchorPrice
			
			// 🎯 修正：基于拖动距离计算合理的bin数量
			const offsetPercent = Math.abs(offsetFromCenter) // 0 to 50
			// 🎯 合理的bin数量范围：根据拖动距离线性映射到5-100个bin
			const binsCount = Math.round(5 + (offsetPercent / 50) * 95) // 5 to 100 bins
			actualNumBins = binsCount
			
			// 向右扩展：计算更高的价格
			maxPrice = anchorPrice * Math.pow(1 + binStepDecimal, binsCount)
		}
		
		// 🎯 不再重新计算bin数量，直接使用上面计算的actualNumBins
		// 确保bin数量在合理范围内
		const finalNumBins = Math.max(5, Math.min(200, actualNumBins))
		
		// Log for debugging - 验证你的数学计算
		if (process.env.NODE_ENV === 'development') {
			const rangePercent = ((maxPrice / minPrice - 1) * 100).toFixed(1)
			const minPriceChange = ((minPrice / anchorPrice - 1) * 100).toFixed(2)
			const maxPriceChange = ((maxPrice / anchorPrice - 1) * 100).toFixed(2)
			
			console.log('🎯 Liquidity Book Range Calculation (CORRECTED):', {
				positionValue: positionValue.toFixed(1) + '%',
				offsetFromCenter: offsetFromCenter.toFixed(1) + '%',
				binStep: binStep + ' basis points (' + (binStep / 100).toFixed(2) + '%)',
				anchorPrice: anchorPrice.toFixed(6),
				minPrice: minPrice.toFixed(6),
				maxPrice: maxPrice.toFixed(6),
				minPriceChange: minPriceChange + '%',
				maxPriceChange: maxPriceChange + '%',
				totalRangePercent: rangePercent + '%',
				directCalculatedBins: actualNumBins, // 🎯 显示直接计算的bin数量
				finalNumBins, // 🎯 显示最终使用的bin数量
				// 验证Liquidity Book协议
				protocolCheck: offsetFromCenter < -3 ? 
					`✅ LEFT SIDE: Range ${minPrice.toFixed(6)} → ${anchorPrice.toFixed(6)} (maxPrice = anchor ✓)` : 
					offsetFromCenter > 3 ? 
					`✅ RIGHT SIDE: Range ${anchorPrice.toFixed(6)} → ${maxPrice.toFixed(6)} (minPrice = anchor ✓)` : 
					`✅ BOTH TOKENS: Symmetric range around anchor`,
				// 🎯 验证bin数量计算逻辑
				binCalculationMethod: offsetFromCenter < -3 ? 
					`左侧：5 + (${Math.abs(offsetFromCenter).toFixed(1)}/50) * 95 = ${actualNumBins}` :
					offsetFromCenter > 3 ? 
					`右侧：5 + (${Math.abs(offsetFromCenter).toFixed(1)}/50) * 95 = ${actualNumBins}` :
					`对称：20 * 2 = ${actualNumBins}`
			})
		}
		
		return { 
			minPrice, 
			maxPrice, 
			numBins: finalNumBins 
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
		// 如果有拖动位置，直接使用拖动位置（允许0%-100%全范围）
		if (dragPosition !== null) {
			return dragPosition
		}
		
		// 🎯 如果有外部价格范围，根据anchor price在范围中的位置计算指示线位置
		if (minPrice !== undefined && maxPrice !== undefined) {
			const currentMinPrice = minPrice
			const currentMaxPrice = maxPrice
			
			// 计算anchor price在价格范围中的相对位置
			const anchorRatio = (anchorPrice - currentMinPrice) / (currentMaxPrice - currentMinPrice)
			const clampedRatio = Math.max(0, Math.min(1, anchorRatio)) // 限制在0-1之间
			
			// 🎯 新逻辑：直接使用比例位置，而不是强制对齐到14个刻度
			// 这样可以让指示棒在0%-100%之间自由移动
			const flexPosition = clampedRatio * 100
			const position = `${flexPosition}%`
			
			console.log('🎯 指示线自由位置计算（不限制到刻度中心）:', {
				anchorPrice: anchorPrice.toFixed(6),
				minPrice: currentMinPrice.toFixed(6),
				maxPrice: currentMaxPrice.toFixed(6),
				anchorRatio: anchorRatio.toFixed(4),
				clampedRatio: clampedRatio.toFixed(4),
				flexPosition: flexPosition.toFixed(2),
				calculatedPosition: position,
				explanation: '指示棒现在可以到达0%和100%的真正边界位置'
			})
			
			return position
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
		// 🎯 修正：根据容器高度计算合理的基础高度
		// 容器高度是480px，减去上下边距和可拖拽区域，有效高度约为400px
		const containerHeight = 400 // 有效绘制区域高度
		const maxBarHeight = containerHeight * 0.8 // 最高柱子占80%高度
		const minBarHeight = 30 // 最小柱子高度
		const baseHeight = maxBarHeight * 0.5 // 基础高度为最大高度的50%

		const currentPosition = dragPosition || getCurrentPriceIndicatorPosition()
		const { numBins: localCalculatedBins } = calculatePriceRangeFromPosition(currentPosition)

		// 🎯 优先使用来自LiquidityBinsChart拖动的动态bin数量，否则使用本地计算
		const dynamicNumBins = dynamicBinCount || localCalculatedBins
		
		// 🎯 添加详细调试信息来诊断bin数量不匹配问题
		console.log('🔍 Bin数量调试信息 - PriceRangeVisualizer收到的props:', {
			外部dynamicBinCount: dynamicBinCount,
			外部dynamicBinCount类型: typeof dynamicBinCount,
			本地localCalculatedBins: localCalculatedBins,
			最终dynamicNumBins: dynamicNumBins,
			数据来源: dynamicBinCount ? 'LiquidityBinsChart' : '本地计算',
			binCalculation存在: !!binCalculation,
			当前拖动位置: dragPosition,
			计算位置: currentPosition,
			// 🎯 新增：详细的数据流追踪
			props检查: {
				传入的dynamicBinCount: dynamicBinCount,
				传入的binCalculation: binCalculation,
				binCalculation内容: binCalculation ? {
					binStep: binCalculation.binStep,
					halfRange: binCalculation.halfRange,
					centerBinOffset: binCalculation.centerBinOffset
				} : null
			},
			// 🎯 检查props是否为undefined的原因
			props原始值: {
				dynamicBinCount值: dynamicBinCount,
				binCalculation值: binCalculation,
				是否都为undefined: dynamicBinCount === undefined && binCalculation === undefined
			}
		})
		
		// 🎯 强制优先使用外部传入的数量，而不是本地计算
		let finalDynamicNumBins = dynamicNumBins
		if (dynamicBinCount && dynamicBinCount !== localCalculatedBins) {
			console.log('🚨 检测到bin数量不一致，强制使用外部数量:', {
				外部: dynamicBinCount,
				本地: localCalculatedBins,
				选择: '外部数量优先'
			})
			finalDynamicNumBins = dynamicBinCount
		}
		
		// 🎯 如果有bin计算信息，在控制台显示同步状态
		if (binCalculation && dynamicBinCount) {
			console.log('🔄 PriceRangeVisualizer 同步状态:', {
				来源: 'LiquidityBinsChart拖动',
				动态bin数量: dynamicBinCount,
				binStep: binCalculation.binStep + ' basis points',
				价格倍数: binCalculation.priceMultiplier?.toFixed(4) || 'N/A',
				半程范围: binCalculation.halfRange,
				总价格范围: binCalculation.totalPriceRangePercent?.toFixed(1) + '%' || 'N/A',
				中心偏移: binCalculation.centerBinOffset,
				本地计算bin数量: localCalculatedBins,
				最终显示柱子数: finalDynamicNumBins, // 🎯 使用修正后的数量
				状态: '✅ 实时同步中'
			})
		}

		// 🎯 修正：优先显示正确的bin数量，只在数量过大时才限制
		// 容器宽度限制：每个柱子4px宽度 + 间距，总共不超过容器宽度
		const containerWidth = 800 // 假设容器宽度800px
		const barWidthWithSpacing = 6 // 每个柱子包括间距占用6px
		const maxBarsForContainer = Math.floor(containerWidth / barWidthWithSpacing) // 约133个柱子
		
		// 🎯 优先使用准确的bin数量，只有在超出容器限制时才压缩
		let numBars: number
		if (finalDynamicNumBins <= maxBarsForContainer) {
			// 在安全范围内：直接使用动态bin数量
			numBars = Math.max(5, finalDynamicNumBins)
		} else {
			// 超出容器限制：限制到最大安全数量
			numBars = maxBarsForContainer
		}
		
		console.log('🎯 柱子数量控制（优先准确性）:', {
			原始动态bin数量: dynamicNumBins,
			修正后bin数量: finalDynamicNumBins,
			容器最大柱子数: maxBarsForContainer,
			最终显示柱子数: numBars,
			显示策略: finalDynamicNumBins <= maxBarsForContainer ? '✅ 精确显示' : '⚠️ 压缩显示',
			是否同步: finalDynamicNumBins === numBars ? '✅ 完全同步' : '⚠️ 已压缩',
			数据流: `外部${dynamicBinCount} → 修正${finalDynamicNumBins} → 最终${numBars}`
		})

		if (amt0 > 0 && amt1 === 0) {
			for (let i = 0; i < numBars; i++) {
				// 🎯 修正：使用梯度下降算法计算柱子高度
				let height = baseHeight
				if (strategy === 'curve') {
					// 指数衰减：从最大高度逐渐降低到最小高度
					const decayFactor = Math.exp(-i * 2 / numBars) // 指数衰减系数
					height = minBarHeight + (maxBarHeight - minBarHeight) * decayFactor
				} else if (strategy === 'bid-ask') {
					// 线性递增：从最小高度逐渐增加
					const incrementFactor = i / Math.max(1, numBars - 1)
					height = minBarHeight + (baseHeight - minBarHeight) * incrementFactor
				} else {
					// 默认：均匀分布
					height = baseHeight + (Math.sin(i * Math.PI / numBars) * (maxBarHeight - baseHeight) * 0.3)
				}
				
				const dissolveEffect = getBarDissolveEffect(i, numBars, false)
				barsToRender.push(
					<Box
						key={i}
						sx={{
							width: 4,
							height: Math.max(minBarHeight, Math.min(maxBarHeight, height)), // 确保高度在范围内
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
				// 🎯 修正：使用梯度下降算法计算柱子高度（从右到左）
				let height = baseHeight
				if (strategy === 'curve') {
					// 指数衰减：从最大高度逐渐降低到最小高度
					const decayFactor = Math.exp(-i * 2 / numBars) // 指数衰减系数
					height = minBarHeight + (maxBarHeight - minBarHeight) * decayFactor
				} else if (strategy === 'bid-ask') {
					// 线性递增：从最小高度逐渐增加
					const incrementFactor = i / Math.max(1, numBars - 1)
					height = minBarHeight + (baseHeight - minBarHeight) * incrementFactor
				} else {
					// 默认：均匀分布
					height = baseHeight + (Math.sin(i * Math.PI / numBars) * (maxBarHeight - baseHeight) * 0.3)
				}
				
				const dissolveEffect = getBarDissolveEffect(i, numBars, true)
				barsToRender.push(
					<Box
					key={i}
						sx={{
							width: 4,
							height: Math.max(minBarHeight, Math.min(maxBarHeight, height)), // 确保高度在范围内
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
				// 🎯 修正：对称分布的高度计算
				const distance = Math.abs(i)
				let height = baseHeight
				if (strategy === 'curve') {
					// 钟型分布：中心最高，两边递减
					const bellFactor = Math.exp(-(distance * distance) / (numBars * 0.1))
					height = minBarHeight + (maxBarHeight - minBarHeight) * bellFactor
				} else if (strategy === 'bid-ask') {
					// 线性递增：距离中心越远，高度越高
					const incrementFactor = distance / Math.max(1, Math.floor(numBars / 2))
					height = minBarHeight + (baseHeight - minBarHeight) * incrementFactor
				} else {
					// 默认：均匀分布
					height = baseHeight + (Math.sin(distance * Math.PI / numBars) * (maxBarHeight - baseHeight) * 0.3)
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
							height: Math.max(minBarHeight, Math.min(maxBarHeight, height)), // 确保高度在范围内
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
					
					// 🎯 优化：使用与指示线相同的计算逻辑
					let anchorIndex = 7 // 默认中间位置
					
					// 如果有外部价格范围，使用相对位置计算
					if (minPrice !== undefined && maxPrice !== undefined) {
						const anchorRatio = (anchorPrice - currentMinPrice) / (currentMaxPrice - currentMinPrice)
						const clampedRatio = Math.max(0, Math.min(1, anchorRatio))
						anchorIndex = Math.round(clampedRatio * 13)
					} else {
						// 如果没有外部价格范围，判断是否在边缘
						const isAtLeftEdge = anchorPrice <= currentMinPrice
						const isAtRightEdge = anchorPrice >= currentMaxPrice
						anchorIndex = isAtLeftEdge ? 0 : isAtRightEdge ? 13 : 7 // 默认中间
					}
					
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
