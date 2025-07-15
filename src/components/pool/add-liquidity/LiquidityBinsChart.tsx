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
}

const LiquidityBinsChart = ({
	poolAddress,
	chainId,
	onBinRangeChange,
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

	// 使用全局价格切换状态
	const { isReversed } = usePriceToggle()

	// 获取bins数据
	const fetchBinsData = useCallback(async () => {
		if (!poolAddress || !chainId) return

		setLoading(true)
		setError(null)

		try {
			const response = await fetch(
				`https://api.dex.jongun2038.win/v1/api/dex/pools/${chainId}/${poolAddress}/bins?range=20&limit=50`,
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

	// 检查bin是否在选择范围内
	const isBinSelected = (binId: number) => {
		if (!selectedRange) return false
		return binId >= selectedRange.start && binId <= selectedRange.end
	}

	return (
		<Box sx={{ mt: 2 }}>
			{/* 柱状图容器 - 更紧凑的设计 */}
			<Box
				ref={containerRef}
				onMouseDown={handleMouseDown}
				sx={{
					position: 'relative',
					height: 120, // 从 180 降到 120
					background: 'rgba(30, 32, 60, 0.4)',
					borderRadius: 2,
					border: '1px solid rgba(120, 113, 108, 0.2)',
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
					{binsData.bins.map((bin) => {
						const totalReserve = bin.reserveX + bin.reserveY
						const height = maxReserve > 0 ? (totalReserve / maxReserve) * 80 : 0 // 最大高度从 100% 降到 80%
						const isActive = bin.binId === activeId
						const isSelected = isBinSelected(bin.binId)
						const isHovered = hoveredBinId === bin.binId

						return (
							<Box
								key={bin.binId}
								onMouseEnter={() => !isDragging && setHoveredBinId(bin.binId)}
								onMouseLeave={() => setHoveredBinId(null)}
								sx={{
									width: `${Math.max(1, 90 / binsData.bins.length)}%`,
									height: `${Math.max(3, height)}%`, // 最小高度从 2% 增加到 3%
									background: isActive
										? 'linear-gradient(to top, #ffffff 0%, #f5f5f5 100%)'
										: isHovered
										? 'linear-gradient(to top, #fbbf24 0%, #f59e0b 100%)'
										: isSelected
										? 'linear-gradient(to top, #3b82f6 0%, #1d4ed8 100%)'
										: bin.reserveX > 0 && bin.reserveY > 0
										? 'linear-gradient(to top, #8b5cf6 0%, #7c3aed 100%)'
										: bin.reserveX > 0
										? 'linear-gradient(to top, #10b981 0%, #059669 100%)'
										: bin.reserveY > 0
										? 'linear-gradient(to top, #6366f1 0%, #4f46e5 100%)'
										: 'linear-gradient(to top, rgba(120, 113, 108, 0.3) 0%, rgba(120, 113, 108, 0.5) 100%)',
									borderRadius: '1px 1px 0 0', // 从 2px 降到 1px
									transition: 'all 0.2s ease',
									opacity: isHovered || isActive || isSelected ? 1 : 0.8,
									boxShadow: isActive
										? '0 0 6px rgba(255, 255, 255, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)' // 减小阴影
										: isHovered
										? '0 0 4px rgba(251, 191, 36, 0.6)'
										: isSelected
										? '0 0 3px rgba(59, 130, 246, 0.4)'
										: 'none',
									transform: isHovered && !isDragging ? 'scaleY(1.05)' : 'none', // 从 1.1 降到 1.05
									cursor: 'pointer',
									border: isActive ? '1px solid rgba(255, 255, 255, 0.6)' : 'none',
								}}
								title={`Bin ${bin.binId}${bin.isActive ? ' (Active)' : ''}
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
								width: 2, // 从 3 降到 2
								background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 100%)',
								transform: 'translateX(-50%)',
								zIndex: 3,
								pointerEvents: 'none',
								boxShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)', // 减小阴影
								borderRadius: '1px',
							}}
						/>
					)
				})()}

				{/* 价格刻度轴 - 更紧凑的设计 */}
				<Box
					sx={{
						position: 'absolute',
						bottom: -25, // 从 -35 调整到 -25
						left: 0,
						right: 0,
						height: 20, // 从 30 降到 20
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
					
					{/* 价格标签 */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							px: 1,
							position: 'relative',
						}}
					>
						{Array.from({ length: 7 }, (_, i) => {
							const binIndex = Math.floor((i / 6) * (binsData.bins.length - 1))
							const bin = binsData.bins[binIndex]
							if (!bin) return null

							// 智能格式化价格显示
							const formatPrice = () => {
								const basePrice = bin.priceY || (1 / bin.priceX)
								const displayPrice = isReversed ? (1 / basePrice) : basePrice
								
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

							const isActive = bin.binId === activeId
							
							return (
								<Box key={i} sx={{ 
									display: 'flex', 
									flexDirection: 'column', 
									alignItems: 'center', 
									flex: 1,
									position: 'relative'
								}}>
									{/* 刻度线 - 更小 */}
									<Box sx={{
										width: isActive ? '1.5px' : '1px', // 从 2px/1px 降到 1.5px/1px
										height: isActive ? '8px' : '6px', // 从 12px/8px 降到 8px/6px
										background: isActive 
											? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
											: 'rgba(120, 113, 108, 0.4)',
										borderRadius: '1px',
										mb: 0.5, // 从 0.8 降到 0.5
									}} />
									
									{/* 价格标签 - 更小 */}
									<Typography 
										variant="caption" 
										sx={{ 
											color: isActive ? '#f59e0b' : 'rgba(120, 113, 108, 0.7)',
											fontSize: isActive ? '0.65rem' : '0.6rem', // 减小字体
											fontWeight: isActive ? 600 : 500,
											textAlign: 'center',
											whiteSpace: 'nowrap',
											letterSpacing: '0.02em',
											background: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
											px: isActive ? 0.5 : 0.25, // 减小padding
											py: isActive ? 0.2 : 0,
											borderRadius: isActive ? '4px' : 0,
											border: isActive ? '1px solid rgba(245, 158, 11, 0.2)' : 'none',
											transition: 'all 0.2s ease',
										}}
									>
										{formatPrice()}
										{isActive && (
											<Typography component="span" sx={{ 
												fontSize: '0.5rem', // 减小圆点大小
												ml: 0.3, 
												opacity: 0.7,
												color: '#f59e0b'
											}}>
												●
											</Typography>
										)}
									</Typography>
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
