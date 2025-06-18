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
  TableContainer,
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
import { useDirectLBBalance } from '../dex/hooks/useDirectLBBalance';

const PortfolioPage = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  // Use real wallet data instead of mock data
  const { tokenBalances, loading, error, refetch } = useWalletData();
  const walletSummary = useWalletSummary();

  // Get detailed user positions for liquidity management
  const { positions: userPositions, loading: positionsLoading } = useUserLiquidityPositions(address);

  // Direct balance check for debugging - test with known pair addresses
  const testPairAddresses = [
    '0x5E4c51ab2EAa2fa9dB25Ea4638FfEF3c017Db34B', // WBNB/USDC
    '0xEC5255Ca9De7280439366F90ec29b03461EA5027', // USDC/USDT
    '0xf2a0388ae50204FbF4940a82b9312c58eD91E658', // USDC/WBNB
    '0x406Ca3B0acD27b8060c84902d2B0CAB6F5Ad898D', // WBNB/USDT
  ];
  
  const directBalanceResults = testPairAddresses.map(pairAddress => 
    useDirectLBBalance(address, pairAddress)
  );

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
    <Card key={position.id} elevation={0} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                <img
                  src={position.icon0}
                  alt={position.token0}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', ml: -1, zIndex: 1 }}>
                <img
                  src={position.icon1}
                  alt={position.token1}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {position.token0}/{position.token1}
            </Typography>
            <Chip
              label={position.inRange ? 'In Range' : 'Out of Range'}
              color={position.inRange ? 'success' : 'warning'}
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAddToPosition(position)}
            >
              Add
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RemoveIcon />}
              onClick={() => handleRemovePosition(position)}
            >
              Remove
            </Button>
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() => handleClaimsFees(position)}
            >
              Claims Fee
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Liquidity
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {position.liquidity}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Value
            </Typography>
            <Typography variant="body1" fontWeight={600} color="primary">
              ${position.value}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              ${position.fees24h}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Performance
            </Typography>
            <Typography
              variant="body1"
              fontWeight={600}
              color={position.performance.startsWith('+') ? 'success.main' : 'error.main'}
            >
              {position.performance}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Price Range: {position.range.min} - {position.range.max} (Current: {position.range.current})
          </Typography>
          <LinearProgress
            variant="determinate"
            value={75}
            sx={{ width: 100, height: 6, borderRadius: 3 }}
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
                  My Liquidity Positions
                </Typography>
                
                {/* Debug info - remove in production */}
                {address && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Debug Info: Address: {address.slice(0, 6)}...{address.slice(-4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Positions Loading: {positionsLoading ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Positions Count: {userPositions.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ChainId: {chainId}
                    </Typography>
                    
                    {/* Direct balance test results */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Direct Balance Tests:
                    </Typography>
                    {directBalanceResults.map((result, index) => (
                      <Typography key={index} variant="caption" color="text.secondary" display="block">
                        Pair {index + 1}: {result.balance.toString()} {result.loading ? '(loading...)' : ''}
                      </Typography>
                    ))}
                    
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => {
                        console.log('Current userPositions:', userPositions);
                        console.log('Direct balance results:', directBalanceResults.map((r, i) => ({ 
                          pairIndex: i, 
                          balance: r.balance.toString(),
                          loading: r.loading 
                        })));
                      }}
                      sx={{ mt: 1 }}
                    >
                      Log All Debug Info
                    </Button>
                  </Box>
                )}
                
                {positionsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : userPositions.length > 0 ? (
                  userPositions.map(position => renderDetailedPositionCard(position))
                ) : (
                  <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No positions found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create your first liquidity position to start earning fees.
                      </Typography>
                      <Button
                        variant="outlined"
                        href="/pool"
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          '&:hover': {
                            borderColor: 'primary.dark',
                            backgroundColor: 'primary.50'
                          }
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
