import { useEffect, useState } from 'react'

export interface PerformanceMetrics {
	tokenDataLoadTime: number | null
	positionsLoadTime: number | null
	totalLoadTime: number | null
	cacheHitRate: number
}

export const usePerformanceMetrics = () => {
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		tokenDataLoadTime: null,
		positionsLoadTime: null,
		totalLoadTime: null,
		cacheHitRate: 0
	})

	const [startTime, setStartTime] = useState<number>(Date.now())
	const [tokenStartTime, setTokenStartTime] = useState<number | null>(null)
	const [positionsStartTime, setPositionsStartTime] = useState<number | null>(null)

	const startTokenDataLoad = () => {
		setTokenStartTime(Date.now())
	}

	const endTokenDataLoad = () => {
		if (tokenStartTime) {
			const loadTime = Date.now() - tokenStartTime
			setMetrics(prev => ({
				...prev,
				tokenDataLoadTime: loadTime
			}))
		}
	}

	const startPositionsLoad = () => {
		setPositionsStartTime(Date.now())
	}

	const endPositionsLoad = () => {
		if (positionsStartTime) {
			const loadTime = Date.now() - positionsStartTime
			setMetrics(prev => ({
				...prev,
				positionsLoadTime: loadTime
			}))
		}
	}

	const updateCacheHitRate = (hits: number, total: number) => {
		const rate = total > 0 ? (hits / total) * 100 : 0
		setMetrics(prev => ({
			...prev,
			cacheHitRate: rate
		}))
	}

	// Calculate total load time when both loads complete
	useEffect(() => {
		if (metrics.tokenDataLoadTime && metrics.positionsLoadTime) {
			const totalTime = Date.now() - startTime
			setMetrics(prev => ({
				...prev,
				totalLoadTime: totalTime
			}))
		}
	}, [metrics.tokenDataLoadTime, metrics.positionsLoadTime, startTime])

	return {
		metrics,
		startTokenDataLoad,
		endTokenDataLoad,
		startPositionsLoad,
		endPositionsLoad,
		updateCacheHitRate,
		reset: () => {
			setStartTime(Date.now())
			setTokenStartTime(null)
			setPositionsStartTime(null)
			setMetrics({
				tokenDataLoadTime: null,
				positionsLoadTime: null,
				totalLoadTime: null,
				cacheHitRate: 0
			})
		}
	}
}
