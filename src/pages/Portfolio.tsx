import {
  Pool as PoolIcon,
  Refresh as RefreshIcon,
  SwapHoriz as SwapIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import Navigation from '../components/Navigation';
import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';

const PortfolioPage = () => {
  const { address } = useAccount();

  // Use real wallet data instead of mock data
  const { tokenBalances, lpPositions, loading, error, refetch } = useWalletData();
  const walletSummary = useWalletSummary();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getChangeColor = (change: string) => {
    return change.startsWith('+') ? 'success.main' : 'warning.main';
  };

  const getChangeIcon = (change: string) => {
    return change.startsWith('+') ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  if (!address) {
    return (
      <>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card elevation={0} sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <WalletIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                Connect your wallet to view your portfolio
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect a wallet to see your tokens, liquidity positions, and transaction history.
              </Typography>
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
        {/* Portfolio Overview */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Portfolio
            </Typography>
            <Typography variant="h2" fontWeight={700} color="primary">
              {loading ? <LinearProgress sx={{ width: 200 }} /> : walletSummary.totalValue}
            </Typography>
          </Box>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Token Holdings */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card elevation={0} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Token Holdings
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                ) : tokenBalances.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Asset</TableCell>
                          <TableCell align="right">Balance</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell align="right">24h Change</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tokenBalances.map((token) => (
                          <TableRow key={token.symbol}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                  <img src={token.icon} alt={token.symbol} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                </Avatar>
                                <Box>
                                  <Typography variant="body1" fontWeight={600}>
                                    {token.symbol}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {token.name}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1">
                                {token.balanceFormatted}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1">
                                ${token.price}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" fontWeight={600}>
                                ${token.value}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                {getChangeIcon(token.change24h || '0%')}
                                <Typography variant="body2" color={getChangeColor(token.change24h || '0%')}>
                                  {token.change24h}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No token balances found
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Liquidity Positions */}
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Liquidity Positions
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : lpPositions.length > 0 ? (
                  lpPositions.map((position) => (
                    <Card key={position.id} elevation={0} sx={{ mb: 2, backgroundColor: 'grey.50' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                <img
                                  src={position.icon0}
                                  alt={position.token0}
                                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                                />
                              </Avatar>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', ml: -0.5 }}>
                                <img
                                  src={position.icon1}
                                  alt={position.token1}
                                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                                />
                              </Avatar>
                            </Box>
                            <Typography variant="body1" fontWeight={600}>
                              {position.token0}/{position.token1}
                            </Typography>
                            <Chip
                              label={position.inRange ? 'In Range' : 'Out of Range'}
                              size="small"
                              color={position.inRange ? 'success' : 'warning'}
                              icon={<TrendingUpIcon />}
                            />
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body1" fontWeight={600}>
                              ${position.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Fees: ${position.feesTotal}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No liquidity positions found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <SwapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Token Types
                    </Typography>
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      {walletSummary.tokenCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Different tokens
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PoolIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      LP Earnings
                    </Typography>
                    <Typography variant="h4" color="secondary" fontWeight={700}>
                      {walletSummary.unclaimedFees}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unclaimed fees
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      LP Positions
                    </Typography>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {walletSummary.positionCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active positions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default PortfolioPage;
