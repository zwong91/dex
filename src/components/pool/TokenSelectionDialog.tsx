import { Close as CloseIcon } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText
} from '@mui/material'
import { getTokensForChain } from '../../dex/networkTokens'

interface TokenSelectionDialogProps {
	open: boolean
	onClose: () => void
	chainId: number
	selectingPoolToken: 'token' | 'quote'
	onTokenSelect: (
		type: 'token' | 'quote',
		symbol: string,
		address: string,
	) => void
}

const TokenSelectionDialog = ({
	open,
	onClose,
	chainId,
	selectingPoolToken,
	onTokenSelect,
}: TokenSelectionDialogProps) => {
	const tokens = getTokensForChain(chainId)

	const handleTokenSelect = (token: any) => {
		onTokenSelect(selectingPoolToken, token.symbol, token.address)
		onClose()
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
					Select {selectingPoolToken === 'token' ? 'Token' : 'Quote Asset'}
					<IconButton onClick={onClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				<List>
					{tokens.map(token => (
						<ListItem key={token.symbol} disablePadding>
							<ListItemButton onClick={() => handleTokenSelect(token)}>
								<ListItemAvatar>
									<Avatar sx={{ bgcolor: 'primary.main' }}>
										<img
											src={token.icon}
											alt={token.symbol}
											style={{
												width: 24,
												height: 24,
												borderRadius: '50%',
											}}
										/>
									</Avatar>
								</ListItemAvatar>
								<ListItemText
									primary={token.symbol}
									secondary={token.name}
								/>
							</ListItemButton>
						</ListItem>
					))}
				</List>
			</DialogContent>
		</Dialog>
	)
}

export default TokenSelectionDialog
export type { TokenSelectionDialogProps }
