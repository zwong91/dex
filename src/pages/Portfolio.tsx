import {
  Add as AddIcon,
  Pool as PoolIcon,
  Refresh as RefreshIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
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
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import Navigation from '../components/Navigation';
import AddToPositionDialog from '../components/pool/AddToPositionDialog';
import ClaimsFeesDialog from '../components/pool/ClaimsFeesDialog';
import RemoveLiquidityDialog from '../components/pool/RemoveLiquidityDialog';
import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';
import { useUserLiquidityPositions, type UserPosition } from '../dex/hooks/useUserPositions';

const PortfolioPage = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  // Use real wallet data instead of mock data
  const { tokenBalances, loading, error, refetch } = useWalletData();
  const walletSummary = useWalletSummary();

  // Get detailed user positions for liquidity management
  const { positions: userPositions, loading: positionsLoading } = useUserLiquidityPositions(address);

  const [refreshing, setRefreshing] = useState(false);

  // Position management states
  const [showClaimsFees, setShowClaimsFees] = useState(false);
  const [showAddToPosition, setShowAddToPosition] = useState(false);
  const [showRemovePosition, setShowRemovePosition] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClaimsFees = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowClaimsFees(true);
  };

  const handleAddToPosition = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowAddToPosition(true);
  };

  const handleRemovePosition = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowRemovePosition(true);
  };

  const getChangeColor = (change: string) => {
    return change.startsWith('+') ? 'success.main' : 'warning.main';
  };

  const getChangeIcon = (change: string) => {
    return change.startsWith('+') ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  const renderDetailedPositionCard = (position: UserPosition) => (
    <Card key={position.id} elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Avatar sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: 2 }}>
                <img
                  src={position.icon0}
                  alt={position.token0}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
              <Avatar sx={{ width: 40, height: 40, ml: -1.5, zIndex: 1, border: '2px solid white', boxShadow: 2 }}>
                <img
                  src={position.icon1}
                  alt={position.token1}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                {position.token0}/{position.token1}
              </Typography>
              <Chip
                label={position.inRange ? 'In Range' : 'Out of Range'}
                color={position.inRange ? 'success' : 'warning'}
                size="small"
                variant="filled"
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAddToPosition(position)}
              sx={{ minWidth: 'auto' }}
            >
              Add
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RemoveIcon />}
              onClick={() => handleRemovePosition(position)}
              sx={{ minWidth: 'auto' }}
            >
              Remove
            </Button>
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() => handleClaimsFees(position)}
              sx={{ minWidth: 'auto' }}
            >
              Claim Fees
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Liquidity
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {position.liquidity}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Value
              </Typography>
              <Typography variant="h6" fontWeight={600} color="primary">
                ${position.value}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                24h Fees
              </Typography>
              <Typography variant="h6" fontWeight={600} color="success.main">
                ${position.fees24h}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Performance
              </Typography>
              <Typography
                variant="h6"
                fontWeight={600}
                color={position.performance.startsWith('+') ? 'success.main' : 'error.main'}
              >
                {position.performance}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            Price Range: <strong>{position.range.min}</strong> - <strong>{position.range.max}</strong> 
            (Current: <strong>{position.range.current}</strong>)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={75}
            sx={{ 
              width: 120, 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );

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
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 180 }}>Asset</TableCell>
                          <TableCell align="right" sx={{ minWidth: 120 }}>Balance</TableCell>
                          <TableCell align="right" sx={{ minWidth: 100 }}>Price</TableCell>
                          <TableCell align="right" sx={{ minWidth: 100 }}>Value</TableCell>
                          <TableCell align="right" sx={{ minWidth: 120 }}>24h Change</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tokenBalances.map((token) => (
                          <TableRow key={token.symbol} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 36, height: 36 }}>
                                  <img 
                                    src={token.icon} 
                                    alt={token.symbol} 
                                    style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
                                  />
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
                              <Typography variant="body1" fontWeight={500}>
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
                                <Typography variant="body2" color={getChangeColor(token.change24h || '0%')} fontWeight={500}>
                                  {token.change24h}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
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
                  Your Positions
                </Typography>
                
                {positionsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : userPositions.length > 0 ? (
                  userPositions.map(position => renderDetailedPositionCard(position))
                ) : (
                  <Card elevation={0} sx={{ textAlign: 'center', py: 8, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <PoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 3 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No liquidity positions found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                        Start providing liquidity to earn trading fees and contribute to the ecosystem.
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        href="/pool"
                        sx={{ 
                          px: 4,
                          py: 1.5,
                          fontSize: '1rem'
                        }}
                      >
                        Go To Pool
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Card elevation={0} sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <SwapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Token Types
                      </Typography>
                      <Typography variant="h3" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                        {walletSummary.tokenCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Different tokens
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={12}>
                  <Card elevation={0} sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <PoolIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        LP Earnings
                      </Typography>
                      <Typography variant="h3" color="secondary" fontWeight={700} sx={{ mb: 1 }}>
                        {walletSummary.unclaimedFees}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unclaimed fees
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={12}>
                  <Card elevation={0} sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        LP Positions
                      </Typography>
                      <Typography variant="h3" color="success.main" fontWeight={700} sx={{ mb: 1 }}>
                        {walletSummary.positionCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active positions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        {/* Claims Fees Dialog */}
        <ClaimsFeesDialog
          open={showClaimsFees}
          onClose={() => setShowClaimsFees(false)}
          selectedPosition={selectedPosition}
        />

        {/* Add to Position Dialog */}
        <AddToPositionDialog
          open={showAddToPosition}
          onClose={() => setShowAddToPosition(false)}
          selectedPosition={selectedPosition}
          chainId={chainId}
        />

        {/* Remove Position Dialog */}
        <RemoveLiquidityDialog
          open={showRemovePosition}
          onClose={() => setShowRemovePosition(false)}
          selectedPosition={selectedPosition}
        />
      </Container>
    </>
  );
};

export default PortfolioPage;
