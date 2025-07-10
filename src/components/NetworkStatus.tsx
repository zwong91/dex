import { useChainId } from 'wagmi'
import { Alert, Chip, Box } from '@mui/material'
import { getApiEndpoint, getNetworkName, isDevEnvironment } from '../dex/utils/apiEndpoint'

export const NetworkStatus = () => {
	const chainId = useChainId()
	const networkName = getNetworkName(chainId)
	const apiEndpoint = getApiEndpoint(chainId)
	const isDev = isDevEnvironment(chainId)

	return (
		<Box sx={{ mb: 2 }}>
			<Alert severity={isDev ? 'info' : 'success'}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<span>网络:</span>
					<Chip 
						label={networkName} 
						color={isDev ? 'warning' : 'success'}
						size="small"
					/>
					<span>API:</span>
					<Chip 
						label={apiEndpoint} 
						color={isDev ? 'warning' : 'success'}
						size="small"
					/>
				</Box>
			</Alert>
		</Box>
	)
}

export default NetworkStatus
