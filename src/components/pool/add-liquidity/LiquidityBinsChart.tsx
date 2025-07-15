import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'

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
		<Box sx={{ mt: 3 }}>
			{/* 柱状图容器 */}
			<Box
				ref={containerRef}
				onMouseDown={handleMouseDown}
				sx={{
					position: 'relative',
					height: 180,
					background: 'rgba(30, 32, 60, 0.4)',
					borderRadius: 2,
					border: '1px solid rgba(120, 113, 108, 0.2)',
					p: 2,
					cursor: isDragging ? 'grabbing' : 'crosshair',
					userSelect: 'none',
					overflow: 'hidden',
					mb: 2,
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
						const height = maxReserve > 0 ? (totalReserve / maxReserve) * 100 : 0
						const isActive = bin.binId === activeId
						const isSelected = isBinSelected(bin.binId)
						const isHovered = hoveredBinId === bin.binId

						return (
							<Box
								key={bin.binId}
								onMouseEnter={() => setHoveredBinId(bin.binId)}
								onMouseLeave={() => setHoveredBinId(null)}
								sx={{
									width: `${Math.max(1, 90 / binsData.bins.length)}%`,
									height: `${Math.max(2, height)}%`,
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
									borderRadius: '2px 2px 0 0',
									transition: 'all 0.2s ease',
									opacity: isHovered || isActive || isSelected ? 1 : 0.8,
									boxShadow: isActive
										? '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.4)'
										: isHovered
										? '0 0 6px rgba(251, 191, 36, 0.6)'
										: isSelected
										? '0 0 4px rgba(59, 130, 246, 0.4)'
										: 'none',
									transform: isHovered && !isDragging ? 'scaleY(1.1)' : 'none',
									cursor: 'pointer',
									border: isActive ? '1px solid rgba(255, 255, 255, 0.6)' : 'none',
								}}
								title={`Bin ${bin.binId}
Liquidity: $${bin.liquidityUsd.toFixed(2)}
Price X: ${bin.priceX.toFixed(6)}
Price Y: ${bin.priceY.toFixed(6)}
Reserve X: ${bin.reserveX.toFixed(4)}
Reserve Y: ${bin.reserveY.toFixed(4)}
LPs: ${bin.liquidityProviderCount}`}
							/>
						)
					})}
				</Box>

				{/* Active bin 指示线 */}
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
								width: 3,
								background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 100%)',
								transform: 'translateX(-50%)',
								zIndex: 3,
								pointerEvents: 'none',
								boxShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.4)',
								borderRadius: '1px',
							}}
						/>
					)
				})()}

				{/* 价格标签 */}
				<Box
					sx={{
						position: 'absolute',
						bottom: -25,
						left: 0,
						right: 0,
						display: 'flex',
						justifyContent: 'space-between',
						px: 1,
					}}
				>
					<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.7)', fontSize: '0.7rem' }}>
						{binsData.bins[0]?.priceX.toFixed(4)}
					</Typography>
					<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.7)', fontSize: '0.7rem' }}>
						{binsData.bins[Math.floor(binsData.bins.length / 2)]?.priceX.toFixed(4)}
					</Typography>
					<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.7)', fontSize: '0.7rem' }}>
						{binsData.bins[binsData.bins.length - 1]?.priceX.toFixed(4)}
					</Typography>
				</Box>
			</Box>

			{/* 悬停信息提示 */}
			{hoveredBinId && (() => {
				const hoveredBin = binsData.bins.find(bin => bin.binId === hoveredBinId)
				if (!hoveredBin) return null

				return (
					<Box
						sx={{
							p: 1.5,
							background: 'rgba(30, 32, 60, 0.95)',
							borderRadius: 2,
							border: '1px solid rgba(251, 191, 36, 0.3)',
							mb: 1,
							backdropFilter: 'blur(8px)',
						}}
					>
						<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
							<Typography variant="caption" sx={{ 
								color: hoveredBin.isActive ? '#ffffff' : 'rgba(251, 191, 36, 0.9)', 
								fontWeight: 600,
								fontSize: '0.75rem'
							}}>
								Bin #{hoveredBin.binId} {hoveredBin.isActive && '(Active)'}
							</Typography>
							<Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
								Price: {hoveredBin.priceX.toFixed(6)}
							</Typography>
							<Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
								Reserve: {(hoveredBin.reserveX + hoveredBin.reserveY).toExponential(2)}
							</Typography>
							<Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
								LPs: {hoveredBin.liquidityProviderCount}
							</Typography>
						</Box>
					</Box>
				)
			})()}

			{/* Bin 信息显示 */}
			{selectedRange && (
				<Box
					sx={{
						p: 2,
						background: 'rgba(255, 251, 235, 0.1)',
						borderRadius: 2,
						border: '1px solid rgba(249, 115, 22, 0.2)',
					}}
				>
					{(() => {
						const selectedBins = binsData.bins.filter(bin =>
							isBinSelected(bin.binId)
						)
						const totalLiquidity = selectedBins.reduce((sum, bin) => sum + bin.liquidityUsd, 0)

						return (
							<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
								<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.8)' }}>
									Range: {selectedRange.start} - {selectedRange.end}
								</Typography>
								<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.8)' }}>
									Liquidity: ${totalLiquidity.toFixed(2)}
								</Typography>
								<Typography variant="caption" sx={{ color: 'rgba(120, 113, 108, 0.8)' }}>
									Bins: {selectedBins.length}
								</Typography>
							</Box>
						)
					})()}
				</Box>
			)}
		</Box>
	)
}

export default LiquidityBinsChart
