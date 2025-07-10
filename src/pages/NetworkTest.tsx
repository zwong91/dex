import { Box, Typography, Card, CardContent, Button } from '@mui/material'
import { useChainId, useSwitchChain, useAccount } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { NetworkStatus } from '../components/NetworkStatus'
import { useApiDexTokens } from '../dex/hooks/useApiDexTokens'

const NetworkTest = () => {
	const chainId = useChainId()
	const { switchChain } = useSwitchChain()
	const { isConnected } = useAccount()
	const { tokens, loading, error } = useApiDexTokens()

	const handleSwitchToTestnet = () => {
		if (switchChain) {
			switchChain({ chainId: bscTestnet.id })
		}
	}

	const handleSwitchToMainnet = () => {
		if (switchChain) {
			switchChain({ chainId: bsc.id })
		}
	}

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h4" gutterBottom>
				网络切换测试
			</Typography>
			
			<NetworkStatus />
			
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						网络切换
					</Typography>
					<Box sx={{ display: 'flex', gap: 2 }}>
						<Button 
							variant="contained" 
							color="warning"
							onClick={handleSwitchToTestnet}
							disabled={!isConnected || chainId === bscTestnet.id}
						>
							切换到测试网 (开发端点)
						</Button>
						<Button 
							variant="contained" 
							color="success"
							onClick={handleSwitchToMainnet}
							disabled={!isConnected || chainId === bsc.id}
						>
							切换到主网 (生产端点)
						</Button>
					</Box>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						API 测试 - 获取代币列表
					</Typography>
					{loading && <Typography>加载中...</Typography>}
					{error && <Typography color="error">错误: {error}</Typography>}
					{!loading && !error && (
						<Typography>
							获取到 {tokens.length} 个代币
						</Typography>
					)}
				</CardContent>
			</Card>
		</Box>
	)
}

export default NetworkTest
