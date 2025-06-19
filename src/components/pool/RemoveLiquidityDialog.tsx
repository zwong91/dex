import { 
	Close as CloseIcon, 
	Remove as RemoveIcon,
	TrendingUp as CompoundIcon,
	Warning as WarningIcon 
} from '@mui/icons-material'
import {
	Alert,
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	TextField,
	Typography,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useDexOperations, type UserPosition } from '../../dex'

export type RemoveLiquidityAction = 'withdraw' | 'withdraw_close' | 'claim_fees'

interface RemoveLiquidityDialogProps {
	open: boolean
	onClose: () => void
	selectedPosition: UserPosition | null
	defaultOperationType?: 'partial' | 'full'
}

const RemoveLiquidityDialog = ({
	open,
	onClose,
	selectedPosition,
	defaultOperationType = 'partial',
}: RemoveLiquidityDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [removePercentage, setRemovePercentage] = useState('25')
	const [isPending, setIsPending] = useState(false)
	const [operationType, setOperationType] = useState<'partial' | 'full'>(defaultOperationType)

	// Web3 hooks
	const { removeLiquidity } = useDexOperations()

	// Sync operation type when defaultOperationType changes
	useEffect(() => {
		setOperationType(defaultOperationType)
	}, [defaultOperationType])

	// Get action-specific configuration based on operation type
	const getActionConfig = () => {
		if (operationType === 'full') {
			return {
				title: 'Withdraw Liquidity & Close Position',
				description: '💰 Liquidity Book fees have automatically compounded into your principal! Withdrawing all liquidity will give you: Principal + All Compound Rewards',
				buttonText: 'Withdraw All & Close Position',
				buttonColor: 'warning' as const,
				icon: <RemoveIcon />,
				showPercentage: false,
				warningText: '⚠️ This action will completely close your liquidity position and stop earning trading fees'
			}
		} else {
			return {
				title: 'Partial Withdraw Liquidity',
				description: '📈 Liquidity Book fees auto-compound! Partial withdrawal gets proportional principal+compound rewards, remaining continues to compound',
				buttonText: 'Withdraw Specified Ratio',
				buttonColor: 'primary' as const,
				icon: <RemoveIcon />,
				showPercentage: true,
				warningText: '💡 Tip: Withdrawn portion stops earning, remaining portion continues auto-compounding'
			}
		}
	}

	const actionConfig = getActionConfig()

	const handleActionSubmit = async () => {
		if (!selectedPosition || !userWalletAddress) {
			return
		}

		// For percentage-based actions, validate percentage
		if (actionConfig.showPercentage && (!removePercentage || parseFloat(removePercentage) <= 0)) {
			return
		}

		try {
			setIsPending(true)

			// Get token addresses from the position data
			const tokenXAddress = selectedPosition.token0Address
			const tokenYAddress = selectedPosition.token1Address
			const binIds = [selectedPosition.binId]

			if (operationType === 'full') {
				// Remove 100% of liquidity
				const totalLiquidityValue = parseFloat(selectedPosition.liquidity.replace(/[,$]/g, ''))
				const fullAmount = [BigInt(Math.floor(totalLiquidityValue * 1e18))]
				
				await removeLiquidity(
					selectedPosition.pairAddress,
					tokenXAddress,
					tokenYAddress,
					binIds,
					fullAmount,
					selectedPosition.binStep
				)
			} else {
				// Remove specified percentage
				const percentage = parseFloat(removePercentage)
				if (percentage <= 0 || percentage > 100) {
					return
				}

				const totalLiquidity = parseFloat(selectedPosition.liquidity.replace(/[,$]/g, ''))
				const amountToRemove = (totalLiquidity * percentage) / 100
				const amounts = [BigInt(Math.floor(amountToRemove * 1e18))]

				await removeLiquidity(
					selectedPosition.pairAddress,
					tokenXAddress,
					tokenYAddress,
					binIds,
					amounts,
					selectedPosition.binStep
				)
			}

			onClose()
		} catch (err: any) {
			console.error('Action error:', err)
		} finally {
			setIsPending(false)
		}
	}

	const handleClose = () => {
		setRemovePercentage('25')
		onClose()
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						{actionConfig.icon}
						<Typography variant="h6">{actionConfig.title}</Typography>
					</Box>
					<IconButton onClick={handleClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{selectedPosition ? (
					<Box>
						{/* Description */}
						<Alert 
							severity="info" 
							sx={{ mb: 3, borderRadius: 2 }}
							icon={<CompoundIcon />}
						>
							<Typography variant="body2">
								{actionConfig.description}
							</Typography>
						</Alert>

						{/* Position Info */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
							<Avatar sx={{ width: 32, height: 32 }}>
								<img 
									src={selectedPosition.icon0} 
									alt={selectedPosition.token0} 
									style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
								/>
							</Avatar>
							<Avatar sx={{ width: 32, height: 32, ml: -1 }}>
								<img 
									src={selectedPosition.icon1} 
									alt={selectedPosition.token1} 
									style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
								/>
							</Avatar>
							<Typography variant="h6">
								{selectedPosition.token0}/{selectedPosition.token1}
							</Typography>
						</Box>

						{/* Operation Type Selection */}
						<Box sx={{ mb: 3 }}>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Operation Type
							</Typography>
							<Box sx={{ display: 'flex', gap: 1 }}>
								<Chip
									label="Partial Withdraw"
									variant={operationType === 'partial' ? 'filled' : 'outlined'}
									onClick={() => setOperationType('partial')}
									sx={{ cursor: 'pointer' }}
								/>
								<Chip
									label="Close Position"
									variant={operationType === 'full' ? 'filled' : 'outlined'}
									onClick={() => setOperationType('full')}
									color="warning"
									sx={{ cursor: 'pointer' }}
								/>
							</Box>
						</Box>
						<Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
							<CardContent>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
									<Box>
										<Typography variant="body2" color="text.secondary">
											Current Position Value
										</Typography>
										<Typography variant="h5" fontWeight={600}>
											{selectedPosition.value}
										</Typography>
									</Box>
									<Box sx={{ textAlign: 'right' }}>
										<Typography variant="body2" color="text.secondary">
											Compound Rewards (24h)
										</Typography>
										<Typography variant="h6" fontWeight={600} color="success.main">
											{selectedPosition.fees24h}
										</Typography>
									</Box>
								</Box>

								{/* Show compound earnings info */}
								<Divider sx={{ my: 2 }} />
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Typography variant="body2" color="text.secondary">
										Compound Rate (APR)
									</Typography>
									<Typography variant="body1" fontWeight={600} color="primary">
										{selectedPosition.apr}
									</Typography>
								</Box>
							</CardContent>
						</Card>

						{/* Percentage Selection (only for withdraw action) */}
						{actionConfig.showPercentage && (
							<Box sx={{ mb: 3 }}>
								<Typography
									variant="body2"
									color="text.secondary"
									gutterBottom
								>
									Amount to remove: {removePercentage}%
								</Typography>
								<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
									{['25', '50', '75', '100'].map(value => (
										<Chip
											key={value}
											label={`${value}%`}
											variant={
												removePercentage === value ? 'filled' : 'outlined'
											}
											onClick={() => setRemovePercentage(value)}
											sx={{ cursor: 'pointer' }}
										/>
									))}
								</Box>
								<TextField
									fullWidth
									label="Custom percentage"
									value={removePercentage}
									onChange={e => setRemovePercentage(e.target.value)}
									type="number"
									InputProps={{
										endAdornment: '%',
										inputProps: { min: 1, max: 100 },
									}}
								/>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mt: 1 }}
								>
									Your Position Liquidity: {selectedPosition?.liquidity || '0'}
								</Typography>
							</Box>
						)}

						{/* Warning */}
						<Alert 
							severity="warning" 
							sx={{ mb: 3, borderRadius: 2 }}
							icon={<WarningIcon />}
						>
							<Typography variant="body2">
								{actionConfig.warningText}
							</Typography>
						</Alert>

						{/* Action Button */}
						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={
								isPending || 
								!userWalletAddress ||
								(actionConfig.showPercentage && (!removePercentage || parseFloat(removePercentage) <= 0))
							}
							onClick={handleActionSubmit}
							startIcon={
								isPending ? <CircularProgress size={20} /> : actionConfig.icon
							}
							color={actionConfig.buttonColor}
							sx={{ 
								py: 1.5,
								borderRadius: 2,
								textTransform: 'none',
								fontWeight: 600 
							}}
						>
							{!userWalletAddress
								? 'Connect Wallet'
								: isPending
									? 'Processing...'
									: actionConfig.buttonText}
						</Button>
					</Box>
				) : (
					<Typography>Please select a position</Typography>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default RemoveLiquidityDialog
