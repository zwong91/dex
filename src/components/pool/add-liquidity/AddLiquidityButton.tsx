import { Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Collapse, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material'
import { useState } from 'react'
import { LiquidityStrategy } from './StrategySelection'
import { validateLiquidityParams, hasBlockingErrors, groupErrorsBySeverity, type ValidateParams } from './utils/validation'

interface AddLiquidityButtonProps {
	amount0: string
	amount1: string
	isPending: boolean
	userWalletAddress?: string
	error: Error | null
	slippageTolerance: number
	onAddLiquidity: () => void
	// 新增验证相关属性
	tokenXBalance?: bigint
	tokenYBalance?: bigint
	activeBinPrice: number
	minPrice: string
	maxPrice: string
	strategy: LiquidityStrategy
	binStep?: number
	selectedPool?: {
		token0: string
		token1: string
		pairAddress?: string
		binStep?: number
	} | null
}

const AddLiquidityButton = ({
	amount0,
	amount1,
	isPending,
	userWalletAddress,
	error,
	slippageTolerance,
	onAddLiquidity,
	tokenXBalance,
	tokenYBalance,
	activeBinPrice,
	minPrice,
	maxPrice,
	strategy,
	binStep,
	selectedPool,
}: AddLiquidityButtonProps) => {
	const [showValidation, setShowValidation] = useState(false)

	// 执行验证
	const validationParams: ValidateParams = {
		amount0,
		amount1,
		tokenXBalance,
		tokenYBalance,
		activeBinPrice,
		minPrice,
		maxPrice,
		strategy,
		binStep,
		userWalletAddress,
		selectedPool
	}

	const validationResults = validateLiquidityParams(validationParams)
	const { errors: validationErrors, warnings: validationWarnings } = groupErrorsBySeverity(validationResults)
	const hasErrors = hasBlockingErrors(validationResults)

	// 原有的禁用逻辑 + 验证错误
	const isDisabled = (!amount0 && !amount1) || isPending || !userWalletAddress || hasErrors

	// 处理添加流动性点击
	const handleClick = () => {
		if (validationResults.length > 0) {
			setShowValidation(true)
		}
		
		if (!hasErrors) {
			onAddLiquidity()
		}
	}

	return (
		<Box>
			{/* 验证结果显示 */}
			{validationResults.length > 0 && (
				<Box sx={{ mb: 2 }}>
					<Button
						size="small"
						variant="outlined"
						onClick={() => setShowValidation(!showValidation)}
						startIcon={<WarningIcon />}
						sx={{
							borderColor: 'warning.main',
							color: 'warning.main',
							mb: 1
						}}
					>
						{validationWarnings.length + validationErrors.length} Issues
						{showValidation ? ' (Hide)' : ' (Show Details)'}
					</Button>

					<Collapse in={showValidation}>
						{validationErrors.length > 0 && (
							<Alert severity="warning" sx={{ mb: 1 }}>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									⚠️ The following issues should be addressed:
								</Typography>
								<List dense>
									{validationErrors.map((error, index) => (
										<ListItem key={index} disablePadding>
											<ListItemIcon sx={{ minWidth: 20 }}>
												<Box sx={{ width: 4, height: 4, bgcolor: 'error.main', borderRadius: '50%' }} />
											</ListItemIcon>
											<ListItemText 
												primary={error.message}
												primaryTypographyProps={{ fontSize: '0.875rem' }}
											/>
										</ListItem>
									))}
								</List>
							</Alert>
						)}

						{validationWarnings.length > 0 && (
							<Alert severity="warning" sx={{ mb: 1 }}>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									💡 Suggestions:
								</Typography>
								<List dense>
									{validationWarnings.map((warning, index) => (
										<ListItem key={index} disablePadding>
											<ListItemIcon sx={{ minWidth: 20 }}>
												<Box sx={{ width: 4, height: 4, bgcolor: 'warning.main', borderRadius: '50%' }} />
											</ListItemIcon>
											<ListItemText 
												primary={warning.message}
												primaryTypographyProps={{ fontSize: '0.875rem' }}
											/>
										</ListItem>
									))}
								</List>
							</Alert>
						)}
					</Collapse>
				</Box>
			)}

			{/* Add Liquidity Button */}
			<Button
				fullWidth
				variant="contained"
				size="large"
				disabled={isDisabled}
				onClick={handleClick}
				startIcon={
					isPending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AddIcon />
				}
				sx={{
					py: 2,
					fontSize: '1.1rem',
					fontWeight: 700,
					textTransform: 'none',
					borderRadius: 3,
					background: isDisabled 
						? 'rgba(255, 255, 255, 0.1)'
						: 'linear-gradient(135deg, #4CAF50, #2196F3)',
					border: '2px solid transparent',
					backgroundClip: 'padding-box',
					boxShadow: isDisabled 
						? 'none'
						: '0 8px 32px rgba(76, 175, 80, 0.4)',
					'&:hover': {
						background: isDisabled 
							? 'rgba(255, 255, 255, 0.1)'
							: 'linear-gradient(135deg, #66BB6A, #42A5F5)',
						transform: isDisabled ? 'none' : 'translateY(-2px)',
						boxShadow: isDisabled 
							? 'none'
							: '0 12px 40px rgba(76, 175, 80, 0.5)',
					},
					'&:disabled': {
						color: 'rgba(255, 255, 255, 0.4)',
						background: 'rgba(255, 255, 255, 0.1)',
					},
					transition: 'all 0.3s ease',
				}}
			>
				{!userWalletAddress
					? '🔗 Connect Wallet'
					: isPending
						? 'Adding Liquidity...'
						: '💎 Add Liquidity'}
			</Button>

			{/* Slippage Helper */}
			{error && error.message.includes('LBRouter__AmountSlippageCaught') && (
				<Alert severity="info" sx={{ mt: 2 }}>
					<Typography variant="body2" sx={{ mb: 1 }}>
						<strong>Slippage Protection Triggered:</strong> The transaction was prevented because the price moved too much during execution.
					</Typography>
					<Typography variant="body2">
						💡 Try: Increase slippage tolerance to {Math.min(20, slippageTolerance + 5)}% or wait for price to stabilize.
					</Typography>
				</Alert>
			)}

			{/* Error Message Only */}
			{error && (
				<Alert severity="warning" sx={{ mt: 2 }}>
					Failed to add liquidity: {error.message}
				</Alert>
			)}
		</Box>
	)
}

export default AddLiquidityButton
