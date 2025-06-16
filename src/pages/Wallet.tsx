import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  ExitToApp as DisconnectIcon,
  Refresh as RefreshIcon,
  SwapHoriz as SwapIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { useAccount, useChainId, useDisconnect } from 'wagmi';
import Navigation from '../components/Navigation';
import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';

const WalletPage = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // Use real wallet data instead of mock data
  const walletSummary = useWalletSummary();
  const { tokenBalances, lpPositions, loading, error, refetch } = useWalletData();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getChainName = (id: number) => {
    const chains: { [key: number]: string } = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BSC',
      43114: 'Avalanche',
      1337: 'Localhost',
    };
    return chains[id] || 'Unknown Network';
  };

  if (!isConnected) {
    return (
      <>
        <Navigation />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Card elevation={0} sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <WalletIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight={600} gutterBottom>
                Connect Your Wallet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Connect a wallet to access DeFi features like swapping tokens and providing liquidity.
              </Typography>
              <ConnectButton />
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Wallet
        </Typography>

        <Grid container spacing={3}>
          {/* Wallet Info */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card elevation={0}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Wallet Address
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontFamily="monospace">
                        {address}
                      </Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(address!)}>
                        <CopyIcon />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatAddress(address!)}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<DisconnectIcon />}
                    onClick={() => disconnect()}
                    color="error"
                  >
                    Disconnect
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Connected Network
                  </Typography>
                  <Chip
                    label={getChainName(chainId)}
                    color="primary"
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card elevation={0} sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SwapIcon />}
                      sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2">Swap Tokens</Typography>
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<AddIcon />}
                      sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2">Add Liquidity</Typography>
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<TrendingUpIcon />}
                      sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                    >
                      <Typography variant="body2">View Portfolio</Typography>
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Wallet Stats */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Wallet Overview
                  </Typography>
                  {!loading && (
                    <IconButton size="small" onClick={refetch}>
                      <RefreshIcon />
                    </IconButton>
                  )}
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Portfolio Value
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {walletSummary.totalValue}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        Real-time data
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tokens ({walletSummary.tokenCount})
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {walletSummary.tokensValue}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        LP Positions ({walletSummary.positionCount})
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {walletSummary.lpValue}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Unclaimed Fees
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {walletSummary.unclaimedFees}
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card elevation={0} sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Recent Activity
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : tokenBalances.length > 0 || lpPositions.length > 0 ? (
                  <>
                    {/* Show token balances as activity */}
                    {tokenBalances.slice(0, 2).map((token) => (
                      <Box key={token.symbol} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Token Balance
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {token.symbol}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {token.balanceFormatted} {token.symbol}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ${token.value}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {/* Show LP positions as activity */}
                    {lpPositions.slice(0, 1).map((position) => (
                      <Box key={position.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            LP Position
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {position.token0}/{position.token1}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={600}>
                            ${position.value}
                          </Typography>
                          <Typography variant="body2" color={position.inRange ? 'success.main' : 'warning.main'}>
                            {position.inRange ? 'In Range' : 'Out of Range'}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {tokenBalances.length === 0 && lpPositions.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No recent activity
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No activity found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default WalletPage;
