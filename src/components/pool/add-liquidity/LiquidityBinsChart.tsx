import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { usePriceToggle } from './contexts/PriceToggleContext'

interface BinData {
	binId: number
	isActive: boolean
	priceX: number
	priceY: number
	reserveX: number
	reserveY: number
	liquidityUsd: number
	liquidityProviderCount: number
}

interface PoolBinsData {
	poolInfo: {
		name: string
		activeId: number
		binStep: number
		tokenX: {
			symbol: string
			decimals: number
		}
		tokenY: {
			symbol: string
			decimals: number
		}
	}
	bins: BinData[]
}

interface LiquidityBinsChartProps {
	poolAddress: string
	chainId: string
	onBinRangeChange?: (minBinId: number, maxBinId: number) => void
	minPrice?: number // 最小价格，用于动态调整刻度
	maxPrice?: number // 最大价格，用于动态调整刻度  
	currentPrice?: number // 当前价格，用于计算涨幅
	binStep?: number // bin step，用于价格计算
}

const LiquidityBinsChart = ({
	poolAddress,
	chainId,
	onBinRangeChange,
	minPrice,
	maxPrice,
	currentPrice,
	binStep = 25, // 默认25基点
}: LiquidityBinsChartProps) => {
	// 早期检查必需参数
	if (!poolAddress || !chainId) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: 200,
					border: '1px solid rgba(249, 115, 22, 0.2)',
					borderRadius: 2,
					mb: 2,
					backgroundColor: 'rgba(249, 115, 22, 0.05)',
				}}
			>
				<Typography variant="body2" sx={{ color: 'rgba(249, 115, 22, 0.9)' }}>
					Missing pool address or chain ID
				</Typography>
			</Box>
		)
	}

	const [binsData, setBinsData] = useState<PoolBinsData | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null)
	const [hoveredBinId, setHoveredBinId] = useState<number | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	
	// 新增：圆点拖动状态
	const [isDraggingDot, setIsDraggingDot] = useState<'left' | 'right' | null>(null)
	const [dotPositions, setDotPositions] = useState<{ left: number; right: number }>({ left: 0, right: 100 }) // 百分比位置，默认覆盖全范围

	// 使用全局价格切换状态
	const { isReversed } = usePriceToggle()

	// 获取bins数据
	const fetchBinsData = useCallback(async () => {
		if (!poolAddress || !chainId) return

		setLoading(true)
		setError(null)

		try {
			const response = await fetch(
				`https://api.dex.jongun2038.win/v1/api/dex/pools/${chainId}/${poolAddress}/bins?range=50&limit=80`,
				{
					headers: {
						'x-api-key': 'test-key',
					},
				}
			)

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const result = await response.json()
			
			// 检查API响应格式
			if (!result.success || !result.data) {
				throw new Error('Invalid API response format')
			}

			const apiData = result.data
			
			// 转换为我们的数据格式
			const transformedData: PoolBinsData = {
				poolInfo: {
					name: apiData.poolName,
					activeId: apiData.currentActiveId,
					binStep: parseInt(apiData.binStep),
					tokenX: {
						symbol: apiData.tokenX.symbol,
						decimals: parseInt(apiData.tokenX.decimals),
					},
					tokenY: {
						symbol: apiData.tokenY.symbol,
						decimals: parseInt(apiData.tokenY.decimals),
					},
				},
				bins: apiData.bins.map((bin: any) => ({
					binId: bin.binId,
					isActive: bin.isActive,
					priceX: bin.priceX,
					priceY: bin.priceY,
					reserveX: bin.reserveX,
					reserveY: bin.reserveY,
					liquidityUsd: typeof bin.liquidityUsd === 'number' ? bin.liquidityUsd : parseFloat(bin.liquidityUsd || '0'),
					liquidityProviderCount: bin.liquidityProviderCount,
				})),
			}

			setBinsData(transformedData)
			console.log('🎯 Bins data loaded:', transformedData)
			console.log('📊 Total bins count:', transformedData.bins.length) // 新增：显示bins数量
			console.log('📊 Bins with liquidity:', transformedData.bins.filter(bin => bin.reserveX > 0 || bin.reserveY > 0).length) // 新增：有流动性的bins
			console.log('🚨 BinStep from API:', transformedData.poolInfo.binStep, 'basis points')
			console.log('🚨 API returned', transformedData.bins.length, 'bins - this should be 20 total for proper range calculation')
			console.log('📊 Price debugging:', {
				activeId: transformedData.poolInfo.activeId,
				tokenX: transformedData.poolInfo.tokenX.symbol,
				tokenY: transformedData.poolInfo.tokenY.symbol,
				isReversed: isReversed,
				sampleBinPrices: transformedData.bins.slice(0, 3).map(bin => ({
					binId: bin.binId,
					priceX: bin.priceX,
					priceY: bin.priceY,
					isActive: bin.isActive
				}))
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch bins data')
			console.error('Error fetching bins data:', err)
		} finally {
			setLoading(false)
		}
	}, [poolAddress, chainId])

	// 初始加载数据
	useEffect(() => {
		fetchBinsData()
	}, [fetchBinsData])

	// 处理拖拽选择
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (!containerRef.current || !binsData || !binsData.bins) return

		setIsDragging(true)
		const rect = containerRef.current.getBoundingClientRect()
		const x = e.clientX - rect.left
		const binIndex = Math.floor((x / rect.width) * binsData.bins.length)
		const binId = binsData.bins[binIndex]?.binId

		if (binId !== undefined) {
			setSelectedRange({ start: binId, end: binId })
		}
	}, [binsData])

	// 新增：圆点拖动处理函数
	const handleDotMouseDown = useCallback((e: React.MouseEvent, dotType: 'left' | 'right') => {
		e.preventDefault()
		e.stopPropagation() // 防止触发容器的mousedown
		setIsDraggingDot(dotType)
		console.log(`🔴 开始拖动 ${dotType} 圆点`)
	}, [])

	const handleDotMouseMove = useCallback((e: MouseEvent) => {
		if (!isDraggingDot || !containerRef.current || !binsData?.bins) return

		const rect = containerRef.current.getBoundingClientRect()
		const x = e.clientX - rect.left
		const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

		setDotPositions(prev => {
			const newPositions = { ...prev }
			
			if (isDraggingDot === 'left') {
				// 左圆点不能超过右圆点
				newPositions.left = Math.min(percentage, prev.right - 5)
			} else if (isDraggingDot === 'right') {
				// 右圆点不能超过左圆点
				newPositions.right = Math.max(percentage, prev.left + 5)
			}
			
			console.log(`🔴 拖动 ${isDraggingDot} 圆点到: ${newPositions[isDraggingDot].toFixed(1)}%`)
			
			// 计算对应的bin范围并触发回调
			const leftBinIndex = Math.floor((newPositions.left / 100) * binsData.bins.length)
			const rightBinIndex = Math.floor((newPositions.right / 100) * binsData.bins.length)
			const leftBinId = binsData.bins[leftBinIndex]?.binId
			const rightBinId = binsData.bins[rightBinIndex]?.binId
			
			if (leftBinId !== undefined && rightBinId !== undefined && onBinRangeChange) {
				onBinRangeChange(leftBinId, rightBinId)
			}
			
			return newPositions
		})
	}, [isDraggingDot, binsData, onBinRangeChange])

	const handleDotMouseUp = useCallback(() => {
		if (isDraggingDot) {
			console.log(`🔴 结束拖动 ${isDraggingDot} 圆点`)
			setIsDraggingDot(null)
		}
	}, [isDraggingDot])

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !containerRef.current || !binsData || !binsData.bins || !selectedRange) return

			const rect = containerRef.current.getBoundingClientRect()
			const x = e.clientX - rect.left
			const binIndex = Math.floor((x / rect.width) * binsData.bins.length)
			const binId = binsData.bins[binIndex]?.binId

			if (binId !== undefined) {
				setSelectedRange({
					start: Math.min(selectedRange.start, binId),
					end: Math.max(selectedRange.start, binId),
				})
			}
		},
		[isDragging, binsData, selectedRange]
	)

	const handleMouseUp = useCallback(() => {
		if (isDragging && selectedRange && onBinRangeChange) {
			onBinRangeChange(selectedRange.start, selectedRange.end)
		}
		setIsDragging(false)
	}, [isDragging, selectedRange, onBinRangeChange])

	// 绑定全局鼠标事件
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
			}
		}
	}, [isDragging, handleMouseMove, handleMouseUp])

	// 新增：绑定圆点拖动事件
	useEffect(() => {
		if (isDraggingDot) {
			document.addEventListener('mousemove', handleDotMouseMove)
			document.addEventListener('mouseup', handleDotMouseUp)
			return () => {
				document.removeEventListener('mousemove', handleDotMouseMove)
				document.removeEventListener('mouseup', handleDotMouseUp)
			}
		}
	}, [isDraggingDot, handleDotMouseMove, handleDotMouseUp])

	// 渲染加载状态
	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: 200,
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: 2,
					mb: 2,
				}}
			>
				<CircularProgress size={24} />
				<Typography variant="body2" sx={{ ml: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
					Loading bins data...
				</Typography>
			</Box>
		)
	}

	// 渲染错误状态
	if (error) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: 200,
					border: '1px solid rgba(255, 0, 0, 0.2)',
					borderRadius: 2,
					mb: 2,
					backgroundColor: 'rgba(255, 0, 0, 0.05)',
				}}
			>
				<Typography variant="body2" sx={{ color: 'rgba(255, 100, 100, 0.9)' }}>
					Error: {error}
				</Typography>
			</Box>
		)
	}

	// 渲染bins数据
	if (!binsData || !binsData.bins || binsData.bins.length === 0) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: 200,
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: 2,
					mb: 2,
				}}
			>
				<Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
					No bins data available
				</Typography>
			</Box>
		)
	}

	// 计算最大储备量用于归一化高度
	const maxReserve = Math.max(...binsData.bins.map(bin => bin.reserveX + bin.reserveY))
	const activeId = binsData.poolInfo.activeId
	
	// 获取当前活跃bin的价格作为参考价格
	const activeBin = binsData.bins.find(bin => bin.binId === activeId)
	const activeBinPrice = activeBin ? (activeBin.priceY || (1 / activeBin.priceX)) : (currentPrice || 1)

	// 🎯 直接根据当前价格和binStep计算正确的价格范围（左右各35个bin）
	const calculatePriceRange = () => {
		const currentPriceValue = currentPrice || activeBinPrice
		const effectiveBinStep = binStep || binsData.poolInfo.binStep || 25
		const binStepDecimal = effectiveBinStep / 10000
		
		// 左右各35个bin = 总共70个bin的范围
		const binsOnEachSide = 35
		
		const minP = currentPriceValue * Math.pow(1 + binStepDecimal, -binsOnEachSide)
		const maxP = currentPriceValue * Math.pow(1 + binStepDecimal, binsOnEachSide)
		
		console.log('🎯 LiquidityBinsChart Price Range (70 bins total):', {
			currentPrice: currentPriceValue.toFixed(6),
			binStep: effectiveBinStep + ' basis points',
			binsOnEachSide: binsOnEachSide,
			totalBins: binsOnEachSide * 2,
			minPrice: minP.toFixed(6),
			maxPrice: maxP.toFixed(6),
			minPercent: (((minP / currentPriceValue) - 1) * 100).toFixed(1) + '%',
			maxPercent: (((maxP / currentPriceValue) - 1) * 100).toFixed(1) + '%'
		})
		
		return { minP, maxP }
	}
	
	const { minP: calculatedMinPrice, maxP: calculatedMaxPrice } = calculatePriceRange()

	// 检查bin是否在选择范围内
	const isBinSelected = (binId: number) => {
		if (!selectedRange) return false
		return binId >= selectedRange.start && binId <= selectedRange.end
	}

	// 新增：根据圆点位置检查bin是否在范围内
	const isBinInDotRange = (binIndex: number) => {
		if (!binsData?.bins) return false
		const totalBins = binsData.bins.length
		const leftIndex = Math.floor((dotPositions.left / 100) * totalBins)
		const rightIndex = Math.floor((dotPositions.right / 100) * totalBins)
		return binIndex >= leftIndex && binIndex <= rightIndex
	}

	return (
		<Box sx={{ mt: 2 }}>
			{/* 柱状图容器 - 坐标轴样式设计 */}
			<Box
				ref={containerRef}
				onMouseDown={handleMouseDown}
				sx={{
					position: 'relative',
					height: 120, // 从 180 降到 120
					background: 'transparent', // 去掉背景色
					borderRadius: 0, // 去掉圆角
					border: 'none', // 去掉边框
					p: 1.5, // 从 2 降到 1.5
					cursor: isDragging ? 'grabbing' : 'crosshair',
					userSelect: 'none',
					overflow: 'visible',
					mb: 3, // 从 5 降到 3
				}}
			>
				{/* 柱状图 */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'space-between',
						height: '100%',
						position: 'relative',
					}}
				>
					{binsData.bins.map((bin, binIndex) => {
						const totalReserve = bin.reserveX + bin.reserveY
						const height = maxReserve > 0 ? (totalReserve / maxReserve) * 80 : 0 // 最大高度从 100% 降到 80%
						const isActive = bin.binId === activeId
						const isSelected = isBinSelected(bin.binId)
						const isInDotRange = isBinInDotRange(binIndex) // 新增：检查是否在圆点范围内
						const isHovered = hoveredBinId === bin.binId

						return (
							<Box
								key={bin.binId}
								onMouseEnter={() => !isDragging && setHoveredBinId(bin.binId)}
								onMouseLeave={() => setHoveredBinId(null)}
								sx={{
									width: `${Math.max(3, 85 / binsData.bins.length)}%`, // 20个bins，每个约4.25%宽度
									height: `${Math.max(8, height)}%`, // 增加最小高度到8%
									background: isActive
										? 'linear-gradient(to top, #10b981 0%, #6366f1 50%, #10b981 100%)' // 交界颜色：绿蓝渐变
										: isHovered
										? 'linear-gradient(to top, #fbbf24 0%, #f59e0b 100%)'
										: isSelected
										? 'linear-gradient(to top, #3b82f6 0%, #1d4ed8 100%)'
										: isInDotRange // 拖动范围内的bin变灰
										? 'linear-gradient(to top, rgba(120, 113, 108, 0.5) 0%, rgba(120, 113, 108, 0.7) 100%)'
										: bin.reserveX > 0 && bin.reserveY > 0
										? 'linear-gradient(to top, #10b981 0%, #6366f1 100%)' // 统一双币种颜色
										: bin.reserveX > 0
										? 'linear-gradient(to top, #10b981 0%, #059669 100%)' // 保持绿色系
										: bin.reserveY > 0
										? 'linear-gradient(to top, #6366f1 0%, #4f46e5 100%)' // 保持蓝色系
										: 'linear-gradient(to top, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.4) 100%)', // 空bins改为蓝色系
									borderRadius: '1px 1px 0 0', // 从 2px 降到 1px
									transition: 'all 0.2s ease',
									opacity: isHovered || isActive || isSelected ? 1 : isInDotRange ? 0.8 : 0.7, // 拖动范围内的透明度调整
									boxShadow: isActive
										? '0 0 8px rgba(16, 185, 129, 0.6), 0 0 16px rgba(99, 102, 241, 0.4)' // 交界颜色阴影
										: isHovered
										? '0 0 4px rgba(251, 191, 36, 0.6)'
										: isSelected
										? '0 0 3px rgba(59, 130, 246, 0.4)'
										: isInDotRange // 拖动范围内不要额外阴影
										? 'none'
										: 'none',
									transform: isHovered && !isDragging ? 'scaleY(1.05)' : 'none', // 从 1.1 降到 1.05
									cursor: 'pointer',
									border: isActive 
										? '2px solid rgba(16, 185, 129, 0.8)' // 绿色边框突出active状态
										: 'none', // 移除拖动范围内的边框
								}}
								title={`Bin ${bin.binId}${bin.isActive ? ' (Active)' : ''}${isInDotRange ? ' (In Range)' : ''}
Price: ${(isReversed ? (bin.priceX) : (bin.priceY || (1 / bin.priceX))).toFixed(6)} ${isReversed ? 'USDC/WBNB' : 'WBNB/USDC'}
Reserve: ${bin.reserveX.toFixed(2)} USDC + ${bin.reserveY.toFixed(4)} WBNB`}
							/>
						)
					})}
				</Box>

				{/* Active bin 指示线 - 更细更紧凑 */}
				{(() => {
					const activeBinIndex = binsData.bins.findIndex(bin => bin.binId === activeId)
					if (activeBinIndex === -1) return null

					const position = (activeBinIndex / (binsData.bins.length - 1)) * 100

					return (
						<Box
							sx={{
								position: 'absolute',
								left: `${position}%`,
								top: 0,
								bottom: 0,
								width: 3, // 加粗active指示线
								background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.95) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(16, 185, 129, 0.95) 100%)', // 交界颜色指示线
								transform: 'translateX(-50%)',
								zIndex: 3,
								pointerEvents: 'none',
								boxShadow: '0 0 6px rgba(16, 185, 129, 0.8), 0 0 12px rgba(99, 102, 241, 0.4)', // 交界颜色阴影
								borderRadius: '2px',
							}}
						/>
					)
				})()}

				{/* 坐标轴样式的范围选择圆点 */}
				{/* 左侧端点 - 坐标轴样式 */}
				<Box
					onMouseDown={(e) => handleDotMouseDown(e, 'left')}
					sx={{
						position: 'absolute',
						left: `${dotPositions.left}%`,
						bottom: -8, // 放在底部坐标轴上
						transform: 'translateX(-50%)',
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
						border: '2px solid rgba(255, 255, 255, 0.9)',
						cursor: 'grab',
						zIndex: 6,
						boxShadow: '0 2px 6px rgba(16, 185, 129, 0.8)',
						transition: 'all 0.2s ease',
						'&:hover': {
							transform: 'translateX(-50%) scale(1.2)',
							boxShadow: '0 3px 8px rgba(16, 185, 129, 0.9)',
						},
						'&:active': {
							cursor: 'grabbing',
							transform: 'translateX(-50%) scale(1.1)',
						}
					}}
				/>

				{/* 右侧端点 - 坐标轴样式 */}
				<Box
					onMouseDown={(e) => handleDotMouseDown(e, 'right')}
					sx={{
						position: 'absolute',
						left: `${dotPositions.right}%`,
						bottom: -8, // 放在底部坐标轴上
						transform: 'translateX(-50%)',
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
						border: '2px solid rgba(255, 255, 255, 0.9)',
						cursor: 'grab',
						zIndex: 6,
						boxShadow: '0 2px 6px rgba(99, 102, 241, 0.8)',
						transition: 'all 0.2s ease',
						'&:hover': {
							transform: 'translateX(-50%) scale(1.2)',
							boxShadow: '0 3px 8px rgba(99, 102, 241, 0.9)',
						},
						'&:active': {
							cursor: 'grabbing',
							transform: 'translateX(-50%) scale(1.1)',
						}
					}}
				/>

				{/* 连接线 - 坐标轴范围指示 */}
				<Box
					sx={{
						position: 'absolute',
						left: `${dotPositions.left}%`,
						right: `${100 - dotPositions.right}%`,
						bottom: -2, // 在坐标轴线上
						height: '2px',
						background: 'linear-gradient(to right, rgba(16, 185, 129, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
						borderRadius: '1px',
						zIndex: 4,
						pointerEvents: 'none',
					}}
				/>

				{/* 价格刻度轴 - 与PriceRangeVisualizer一致的动态刻度 */}
				<Box
					sx={{
						position: 'absolute',
						bottom: -25,
						left: 0,
						right: 0,
						height: 20,
					}}
				>
					{/* 刻度底线 */}
					<Box
						sx={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: '1px',
							background: 'linear-gradient(90deg, transparent 0%, rgba(120, 113, 108, 0.3) 10%, rgba(120, 113, 108, 0.3) 90%, transparent 100%)',
						}}
					/>
					
					{/* 价格标签 - 基于MinPrice和MaxPrice动态计算 */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							px: 1,
							position: 'relative',
						}}
					>
						{Array.from({ length: 7 }, (_, i) => {
							// 🎯 使用内部计算的40bin范围价格，忽略外部传入的props
							const referencePrice = currentPrice || activeBinPrice
							
							// 使用计算出的精确价格范围（40bin范围）
							const effectiveMinPrice = calculatedMinPrice
							const effectiveMaxPrice = calculatedMaxPrice
							
							console.log('🎯 Price scale calculation (70 bins):', {
								calculatedMinPrice: calculatedMinPrice,
								calculatedMaxPrice: calculatedMaxPrice,
								referencePrice: referencePrice,
								stepPrice: effectiveMinPrice + (effectiveMaxPrice - effectiveMinPrice) * i / 6,
								binStepProp: binStep
							})
							
							// 在价格范围内均匀分布刻度
							const priceRange = effectiveMaxPrice - effectiveMinPrice
							const stepPrice = effectiveMinPrice + (priceRange * i / 6)
							
							// 应用价格反转逻辑
							const displayPrice = isReversed && stepPrice !== 0 ? 1 / stepPrice : stepPrice
							const displayReferencePrice = isReversed && referencePrice !== 0 ? 1 / referencePrice : referencePrice
							
							// 计算相对于当前价格的涨幅百分比
							const percentChange = ((displayPrice / displayReferencePrice) - 1) * 100
							const isCurrentPrice = Math.abs(percentChange) < 1 // 1%容差判断是否为当前价格
							
							// 智能格式化价格显示
							const formatPrice = () => {
								if (displayPrice >= 1000) {
									return displayPrice.toFixed(0)
								} else if (displayPrice >= 100) {
									return displayPrice.toFixed(1)
								} else if (displayPrice >= 10) {
									return displayPrice.toFixed(2)
								} else if (displayPrice >= 1) {
									return displayPrice.toFixed(3)
								} else if (displayPrice >= 0.1) {
									return displayPrice.toFixed(4)
								} else if (displayPrice >= 0.01) {
									return displayPrice.toFixed(5)
								} else {
									return displayPrice.toFixed(6)
								}
							}

							return (
								<Box key={i} sx={{ 
									display: 'flex', 
									flexDirection: 'column', 
									alignItems: 'center', 
									flex: 1,
									position: 'relative'
								}}>
									{/* 刻度线 */}
									<Box sx={{
										width: isCurrentPrice ? '1.5px' : '1px',
										height: isCurrentPrice ? '8px' : '6px',
										background: isCurrentPrice 
											? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
											: 'rgba(120, 113, 108, 0.4)',
										borderRadius: '1px',
										mb: 0.5,
									}} />
									
									{/* 价格标签和百分比 */}
									<Box sx={{ 
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: 0.2
									}}>
										<Typography 
											variant="caption" 
											sx={{ 
												color: isCurrentPrice ? '#f59e0b' : 'rgba(120, 113, 108, 0.7)',
												fontSize: isCurrentPrice ? '0.65rem' : '0.6rem',
												fontWeight: isCurrentPrice ? 600 : 500,
												textAlign: 'center',
												whiteSpace: 'nowrap',
												letterSpacing: '0.02em',
												background: isCurrentPrice ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
												px: isCurrentPrice ? 0.5 : 0.25,
												py: isCurrentPrice ? 0.2 : 0,
												borderRadius: isCurrentPrice ? '4px' : 0,
												border: isCurrentPrice ? '1px solid rgba(245, 158, 11, 0.2)' : 'none',
												transition: 'all 0.2s ease',
											}}
										>
											{formatPrice()}
											{isCurrentPrice && (
												<Typography component="span" sx={{ 
													fontSize: '0.5rem',
													ml: 0.3, 
													opacity: 0.7,
													color: '#f59e0b'
												}}>
													●
												</Typography>
											)}
										</Typography>
										
										{/* 百分比显示 - 模仿PriceRangeVisualizer */}
										{!isCurrentPrice && (
											<Typography 
												variant="caption"
												sx={{
													fontSize: '0.5rem',
													fontWeight: 500,
													color: percentChange > 0 ? '#f97316' : '#10b981',
													textAlign: 'center',
													whiteSpace: 'nowrap',
												}}
											>
												{percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
											</Typography>
										)}
									</Box>
								</Box>
							)
						})}
					</Box>
				</Box>
			</Box>
		</Box>
	)
}

export default LiquidityBinsChart
