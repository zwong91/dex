import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  ContentCopy as CopyIcon,
  ExitToApp as DisconnectIcon,
  SwapHoriz as SwapIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Navigation from '../components/Navigation';
import { toast } from 'sonner';

const WalletPage = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

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
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Wallet Overview
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Portfolio Value
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    $8,947.23
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +12.5% (24h)
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tokens
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    $6,807.17
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    LP Positions
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    $2,140.06
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Unclaimed Fees
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    $127.50
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card elevation={0} sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Recent Activity
                </Typography>
                
                {[
                  { type: 'Swap', tokens: 'ETH → USDC', amount: '1.5 ETH', time: '2h ago' },
                  { type: 'Add LP', tokens: 'ETH/USDC', amount: '$500', time: '1d ago' },
                  { type: 'Collect', tokens: 'Fees', amount: '$12.50', time: '3d ago' },
                ].map((activity, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {activity.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.tokens}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {activity.amount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default WalletPage;
