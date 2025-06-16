import { Box, Button, Menu, MenuItem, Typography } from '@mui/material'
import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

const WalletConnector = () => {
	const { address, isConnected } = useAccount()
	const { connect, connectors } = useConnect()
	const { disconnect } = useDisconnect()
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

	const handleConnect = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget)
	}

	const handleClose = () => {
		setAnchorEl(null)
	}

	const handleConnectorClick = (connector: any) => {
		connect({ connector })
		handleClose()
	}

	if (isConnected && address) {
		return (
			<Button
				variant="outlined"
				onClick={() => disconnect()}
				sx={{ textTransform: 'none' }}
			>
				{`${address.slice(0, 6)}...${address.slice(-4)}`}
			</Button>
		)
	}

	return (
		<>
			<Button
				variant="contained"
				onClick={handleConnect}
				sx={{ textTransform: 'none' }}
			>
				Connect Wallet
			</Button>
			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={handleClose}
			>
				{connectors.map((connector) => (
					<MenuItem
						key={connector.id}
						onClick={() => handleConnectorClick(connector)}
						disabled={!connector.ready}
					>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<Typography>{connector.name}</Typography>
						</Box>
					</MenuItem>
				))}
			</Menu>
		</>
	)
}

export default WalletConnector
