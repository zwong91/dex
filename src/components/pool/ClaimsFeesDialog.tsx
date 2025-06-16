import { Close as CloseIcon } from '@mui/icons-material'
import {
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Typography,
} from '@mui/material'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useDexOperations, type UserPosition } from '../../dex'

interface ClaimsFeesDialogProps {
	open: boolean
	onClose: () => void
	selectedPosition: UserPosition | null
}

const ClaimsFeesDialog = ({
	open,
	onClose,
	selectedPosition,
}: ClaimsFeesDialogProps) => {
	const { address: userWalletAddress } = useAccount()
	const [isPending, setIsPending] = useState(false)

	// Web3 hooks
	const { claimFees } = useDexOperations()

	const handleClaimsFeesSubmit = async () => {
		if (!selectedPosition || !userWalletAddress) {
			return
		}

		try {
			setIsPending(true)

			// For LB, claim fees for the specific bin in this position
			const binIds = [selectedPosition.binId]

			await claimFees(selectedPosition.pairAddress, binIds)
			onClose()
		} catch (err: any) {
			console.error('Claims fees error:', err)
		} finally {
			setIsPending(false)
		}
	}

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					Claims Fees
					<IconButton onClick={onClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{selectedPosition ? (
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
							<Avatar sx={{ width: 32, height: 32 }}>
								{selectedPosition.icon0}
							</Avatar>
							<Avatar sx={{ width: 32, height: 32, ml: -1 }}>
								{selectedPosition.icon1}
							</Avatar>
							<Typography variant="h6">
								{selectedPosition.token0}/{selectedPosition.token1}
							</Typography>
						</Box>

						<Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Available Fees to Claim
								</Typography>
								<Typography
									variant="h4"
									fontWeight={600}
									color="primary"
									gutterBottom
								>
									{selectedPosition.feesTotal}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									24h fees: {selectedPosition.fees24h}
								</Typography>
							</CardContent>
						</Card>

						<Button
							fullWidth
							variant="contained"
							size="large"
							disabled={!userWalletAddress || isPending}
							onClick={handleClaimsFeesSubmit}
							color="success"
							startIcon={isPending ? <CircularProgress size={20} /> : null}
						>
							{!userWalletAddress
								? 'Connect Wallet'
								: isPending
									? 'Claiming Fees...'
									: 'Claims Fees'}
						</Button>
					</Box>
				) : (
					<Typography>Select a position to claim fees</Typography>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default ClaimsFeesDialog
