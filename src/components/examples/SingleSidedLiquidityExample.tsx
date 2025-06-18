import React, { useState } from 'react'
import { useDexOperations } from '../../dex/hooks/useDexOperations'

/**
 * 单边流动性使用示例组件
 * 展示如何使用整合了单边流动性功能的 addLiquidity 函数
 */
export const SingleSidedLiquidityExample: React.FC = () => {
	const { addLiquidity } = useDexOperations()
	
	const [isLoading, setIsLoading] = useState(false)
	const [txHash, setTxHash] = useState<string>('')
	const [error, setError] = useState<string>('')

	// 示例：添加双边流动性（传统方式）
	const handleDualSidedLiquidity = async () => {
		setIsLoading(true)
		setError('')
		setTxHash('')

		try {
			const result = await addLiquidity(
				'0x1234...', // pairAddress
				'0xTokenA...', // tokenXAddress
				'0xTokenB...', // tokenYAddress  
				100, // tokenAAmount - 提供100个TokenA
				50,  // tokenBAmount - 提供50个TokenB
				8388608, // activeBinId - 当前活跃bin
				25, // binStep - 25 basis points
				undefined, // deltaIds - 使用默认分布
				undefined, // distributionX - 使用默认分布
				undefined, // distributionY - 使用默认分布
				false, // singleSidedMode - 不启用单边模式
				undefined // singleSidedStrategy - 不需要策略
			)
			setTxHash(result)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setIsLoading(false)
		}
	}

	// 示例：添加单边流动性 - 只提供TokenA，保守策略
	const handleSingleSidedTokenA = async () => {
		setIsLoading(true)
		setError('')
		setTxHash('')

		try {
			const result = await addLiquidity(
				'0x1234...', // pairAddress
				'0xTokenA...', // tokenXAddress
				'0xTokenB...', // tokenYAddress
				100, // tokenAAmount - 提供100个TokenA
				0,   // tokenBAmount - 不提供TokenB（单边）
				8388608, // activeBinId
				25, // binStep
				undefined, // deltaIds - 让系统自动计算
				undefined, // distributionX - 让系统自动生成
				undefined, // distributionY - 让系统自动生成
				true, // singleSidedMode - 启用单边模式
				'conservative' // singleSidedStrategy - 保守策略
			)
			setTxHash(result)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setIsLoading(false)
		}
	}

	// 示例：添加单边流动性 - 只提供TokenB，激进策略
	const handleSingleSidedTokenB = async () => {
		setIsLoading(true)
		setError('')
		setTxHash('')

		try {
			const result = await addLiquidity(
				'0x1234...', // pairAddress
				'0xTokenA...', // tokenXAddress  
				'0xTokenB...', // tokenYAddress
				0,   // tokenAAmount - 不提供TokenA（单边）
				50,  // tokenBAmount - 提供50个TokenB
				8388608, // activeBinId
				25, // binStep
				undefined, // deltaIds
				undefined, // distributionX
				undefined, // distributionY
				true, // singleSidedMode - 启用单边模式
				'aggressive' // singleSidedStrategy - 激进策略，分布更广
			)
			setTxHash(result)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setIsLoading(false)
		}
	}

	// 示例：自动检测单边流动性（不需要显式设置singleSidedMode）
	const handleAutoDetectSingleSided = async () => {
		setIsLoading(true)
		setError('')
		setTxHash('')

		try {
			// 系统会自动检测这是单边流动性（tokenBAmount = 0）
			const result = await addLiquidity(
				'0x1234...', // pairAddress
				'0xTokenA...', // tokenXAddress
				'0xTokenB...', // tokenYAddress
				200, // tokenAAmount - 提供200个TokenA
				0,   // tokenBAmount - 0表示不提供TokenB，自动触发单边模式
				8388608, // activeBinId
				25, // binStep
				undefined, // deltaIds
				undefined, // distributionX
				undefined, // distributionY
				undefined, // singleSidedMode - 不需要设置，自动检测
				'balanced' // singleSidedStrategy - 平衡策略
			)
			setTxHash(result)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setIsLoading(false)
		}
	}

	// 示例：使用自定义分布的单边流动性
	const handleCustomDistributionSingleSided = async () => {
		setIsLoading(true)
		setError('')
		setTxHash('')

		try {
			// 自定义delta IDs和分布
			const customDeltaIds = [-2, -1, 0, 1, 2] // 5个bin，围绕当前价格
			const customDistributionX = [
				BigInt(2000), // 20%
				BigInt(3000), // 30%
				BigInt(3000), // 30%
				BigInt(1500), // 15%
				BigInt(500)   // 5%
			] // 集中在中心，向右递减
			
			const result = await addLiquidity(
				'0x1234...', // pairAddress
				'0xTokenA...', // tokenXAddress
				'0xTokenB...', // tokenYAddress
				150, // tokenAAmount
				0,   // tokenBAmount - 单边
				8388608, // activeBinId
				25, // binStep
				customDeltaIds, // 自定义bin范围
				customDistributionX, // 自定义X分布
				undefined, // distributionY - 系统会自动设为0
				true, // singleSidedMode
				'balanced' // singleSidedStrategy
			)
			setTxHash(result)
		} catch (err: any) {
			setError(err.message)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-6 p-6 bg-white rounded-lg shadow-lg">
			<h2 className="text-2xl font-bold text-gray-800">
				单边流动性示例
			</h2>
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* 双边流动性 */}
				<div className="p-4 border rounded-lg">
					<h3 className="text-lg font-semibold mb-2">双边流动性（传统）</h3>
					<p className="text-sm text-gray-600 mb-3">
						同时提供TokenA和TokenB，系统自动分布在当前价格附近
					</p>
					<button
						onClick={handleDualSidedLiquidity}
						disabled={isLoading}
						className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
					>
						添加双边流动性
					</button>
				</div>

				{/* 单边流动性 - TokenA */}
				<div className="p-4 border rounded-lg">
					<h3 className="text-lg font-semibold mb-2">单边流动性 - TokenA</h3>
					<p className="text-sm text-gray-600 mb-3">
						只提供TokenA，使用保守策略（高集中度）
					</p>
					<button
						onClick={handleSingleSidedTokenA}
						disabled={isLoading}
						className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
					>
						添加TokenA单边流动性
					</button>
				</div>

				{/* 单边流动性 - TokenB */}
				<div className="p-4 border rounded-lg">
					<h3 className="text-lg font-semibold mb-2">单边流动性 - TokenB</h3>
					<p className="text-sm text-gray-600 mb-3">
						只提供TokenB，使用激进策略（分布更广）
					</p>
					<button
						onClick={handleSingleSidedTokenB}
						disabled={isLoading}
						className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
					>
						添加TokenB单边流动性
					</button>
				</div>

				{/* 自动检测单边 */}
				<div className="p-4 border rounded-lg">
					<h3 className="text-lg font-semibold mb-2">自动检测单边</h3>
					<p className="text-sm text-gray-600 mb-3">
						系统自动检测单边模式，无需手动设置
					</p>
					<button
						onClick={handleAutoDetectSingleSided}
						disabled={isLoading}
						className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
					>
						自动检测模式
					</button>
				</div>

				{/* 自定义分布 */}
				<div className="p-4 border rounded-lg md:col-span-2">
					<h3 className="text-lg font-semibold mb-2">自定义分布单边流动性</h3>
					<p className="text-sm text-gray-600 mb-3">
						使用自定义的bin范围和流动性分布，精确控制流动性位置
					</p>
					<button
						onClick={handleCustomDistributionSingleSided}
						disabled={isLoading}
						className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:opacity-50"
					>
						自定义分布流动性
					</button>
				</div>
			</div>

			{/* 状态显示 */}
			{isLoading && (
				<div className="p-4 bg-blue-50 border border-blue-200 rounded">
					<p className="text-blue-800">交易进行中...</p>
				</div>
			)}

			{txHash && (
				<div className="p-4 bg-green-50 border border-green-200 rounded">
					<p className="text-green-800">
						交易成功！Hash: 
						<span className="font-mono text-sm ml-2">{txHash}</span>
					</p>
				</div>
			)}

			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded">
					<p className="text-red-800">错误: {error}</p>
				</div>
			)}

			{/* 策略说明 */}
			<div className="mt-6 p-4 bg-gray-50 rounded-lg">
				<h3 className="font-semibold mb-2">流动性策略说明：</h3>
				<ul className="space-y-1 text-sm text-gray-600">
					<li><strong>Conservative:</strong> 高集中度，流动性集中在当前价格附近，适合稳定市场</li>
					<li><strong>Balanced:</strong> 平衡分布，在收益和风险之间取得平衡</li>
					<li><strong>Aggressive:</strong> 分布更广，适合高波动市场，潜在收益更高但风险也更大</li>
				</ul>
			</div>
		</div>
	)
}

export default SingleSidedLiquidityExample
