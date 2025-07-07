import {
  Pool as PoolIcon,
  Refresh as RefreshIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  AutoGraph as AutoGraphIcon,
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
  Typography,
  Skeleton,
} from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import Navigation from '../components/Navigation';
import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';
import { useUserLiquidityPositions, type UserPosition } from '../dex/hooks/useUserPositions';
import { useDexOperations } from '../dex/hooks/useDexOperations';

const PortfolioPage = () => {
  const { address } = useAccount();

  // Use real wallet data instead of mock data
  const { tokenBalances, loading, error, refetch } = useWalletData();
  const walletSummary = useWalletSummary();

  // Get detailed user positions for liquidity management
  const { positions: userPositions, loading: positionsLoading } = useUserLiquidityPositions(address);
  
  // Get dex operations for liquidity withdrawal
  const { removeLiquidity } = useDexOperations();

  const [refreshing, setRefreshing] = useState(false);

  // Loading and error states for operations
  const [isWithdrawingAndClosing, setIsWithdrawingAndClosing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle collecting fees and withdrawing all liquidity (close position)
  const handleWithdrawAndClose = async (position: UserPosition) => {
    console.log('🔍 Debug: handleWithdrawAndClose called with position:', position);
    
    if (!address || !position.binData || position.binData.length === 0) {
      const errorMsg = !address 
        ? 'Wallet not connected' 
        : !position.binData 
          ? 'Position binData is missing'
          : 'Position binData is empty';
      
      console.error('❌ Validation failed:', errorMsg);
      console.log('Debug info:', {
        address,
        hasBinData: !!position.binData,
        binDataLength: position.binData?.length || 0,
        position
      });
      
      setOperationError(`Invalid position data: ${errorMsg}`);
      return;
    }

    try {
      setIsWithdrawingAndClosing(true);
      setOperationError(null);

      console.log('🔍 Position binData:', position.binData);
      console.log('🔍 Position details:', {
        token0: position.token0,
        token1: position.token1,
        token0Address: position.token0Address,
        token1Address: position.token1Address,
        pairAddress: position.pairAddress,
        binStep: position.binStep
      });

      // Prepare bin data for withdrawal
      const binIds: number[] = [];
      const amounts: bigint[] = [];

      position.binData.forEach(bin => {
        console.log('🔍 Processing bin:', bin);
        if (bin.shares > 0) {
          binIds.push(bin.binId);
          amounts.push(bin.shares); // Use full shares amount for complete withdrawal
          console.log(`✅ Added bin ${bin.binId} with ${bin.shares.toString()} shares`);
        } else {
          console.log(`⚠️ Skipped bin ${bin.binId} - zero shares`);
        }
      });

      if (binIds.length === 0 || amounts.length === 0) {
        const errorMsg = 'No liquidity available to withdraw from this position';
        console.error('❌ No valid bins found:', { binIds, amounts });
        throw new Error(errorMsg);
      }

      console.log('🔍 Withdrawing all liquidity and collecting fees for position:', {
        pair: `${position.token0}/${position.token1}`,
        binIds,
        amounts: amounts.map(a => a.toString()),
        pairAddress: position.pairAddress,
        token0Address: position.token0Address,
        token1Address: position.token1Address,
        binStep: position.binStep
      });

      // Validate all required parameters
      if (!position.pairAddress) {
        throw new Error('Missing pair address');
      }
      if (!position.token0Address || !position.token1Address) {
        throw new Error('Missing token addresses');
      }
      if (!position.binStep) {
        throw new Error('Missing bin step');
      }

      console.log('🚀 Calling removeLiquidity...');
      await removeLiquidity(
        position.pairAddress,
        position.token0Address,
        position.token1Address,
        binIds,
        amounts,
        position.binStep
      );

      console.log('✅ Liquidity withdrawal successful');
      // Refresh data after successful operation
      await refetch();
    } catch (error: any) {
      console.error('❌ Position closure failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      setOperationError(`Position closure failed: ${error.message}`);
    } finally {
      setIsWithdrawingAndClosing(false);
    }
  };

  // Render loading skeleton for token balances
  const renderTokenLoadingSkeleton = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3].map((i) => (
        <Card key={i} elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box>
                <Skeleton variant="text" width={80} height={24} />
                <Skeleton variant="text" width={120} height={20} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={80} height={20} />
                <Skeleton variant="text" width={100} height={24} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={60} height={20} />
                <Skeleton variant="text" width={80} height={24} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={60} height={20} />
                <Skeleton variant="text" width={80} height={24} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={80} height={20} />
                <Skeleton variant="text" width={60} height={24} />
              </Box>
            </Box>
          </Box>
        </Card>
      ))}
    </Box>
  );

  // Render loading skeleton for positions
  const renderPositionsLoadingSkeleton = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {[1, 2].map((i) => (
        <Card key={i} elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Skeleton variant="circular" width={48} height={48} sx={{ ml: -2 }} />
              </Box>
              <Box>
                <Skeleton variant="text" width={120} height={32} />
                <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 2, mt: 1 }} />
              </Box>
            </Box>
            <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 2 }} />
          </Box>
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {[1, 2, 3, 4].map((j) => (
              <Grid key={j} size={{ xs: 6, sm: 3 }}>
                <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Skeleton variant="text" width={60} height={20} sx={{ mx: 'auto', mb: 1 }} />
                  <Skeleton variant="text" width={80} height={24} sx={{ mx: 'auto' }} />
                </Card>
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
        </Card>
      ))}
    </Box>
  );

  const getChangeColor = (change: string) => {
    return change.startsWith('+') ? 'success.main' : 'warning.main';
  };

  const getChangeIcon = (change: string) => {
    return change.startsWith('+') ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  const renderDetailedPositionCard = (position: UserPosition) => (
    <Card 
      key={position.id} 
      elevation={0} 
      sx={{ 
        mb: 3, 
        border: '1px solid', 
        borderColor: 'divider',
        borderRadius: 3,
        background: 'white',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
        }
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Header with token pair and status */}
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
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                {position.token0}/{position.token1}
              </Typography>
              <Chip
                label={position.inRange ? 'In Range' : 'Out of Range'}
                color={position.inRange ? 'success' : 'warning'}
                size="small"
                variant="filled"
                sx={{ fontWeight: 600, borderRadius: 1 }}
              />
            </Box>
          </Box>
        </Box>

        {/* Price Range Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            Price Range
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {position.range.min} - {position.range.max}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {position.token1} per {position.token0}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                Current Price
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {position.range.current}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Position Liquidity Section */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Position Liquidity
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Current Balance */}
          <Grid size={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                Current Balance
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    <img src={position.icon0} alt={position.token0} style={{ width: '100%', height: '100%' }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight={600}>
                    {position.amountX} {position.token0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({position.value})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    <img src={position.icon1} alt={position.token1} style={{ width: '100%', height: '100%' }} />
                  </Avatar>
                  <Typography variant="body1" fontWeight={600}>
                    {position.amountY} {position.token1}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Auto-Compounded Fees Info */}
          <Grid size={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                📈 Auto-Compounded Trading Fees
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.50', 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'success.200' 
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      <img src={position.icon0} alt={position.token0} style={{ width: '100%', height: '100%' }} />
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>
                      {position.feeX} {position.token0}
                    </Typography>
                    <Typography variant="caption" color="success.main" sx={{ ml: 'auto' }}>
                      +{((parseFloat(position.feeX) / parseFloat(position.amountX)) * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      <img src={position.icon1} alt={position.token1} style={{ width: '100%', height: '100%' }} />
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>
                      {position.feeY} {position.token1}
                    </Typography>
                    <Typography variant="caption" color="success.main" sx={{ ml: 'auto' }}>
                      +{((parseFloat(position.feeY) / parseFloat(position.amountY)) * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mt: 1, 
                    p: 1.5, 
                    bgcolor: 'success.100', 
                    borderRadius: 1 
                  }}>
                    <AutoGraphIcon sx={{ color: 'success.main', fontSize: 16 }} />
                    <Typography variant="caption" color="success.dark" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      Fees automatically compound into your liquidity position. 
                      They're included when you withdraw.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Action Button */}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<RemoveIcon />}
            onClick={() => handleWithdrawAndClose(position)}
            disabled={isWithdrawingAndClosing}
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #fca5a5 0%, #fed7aa 100%)',
              }
            }}
          >
            {isWithdrawingAndClosing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Withdrawing Liquidity...
              </Box>
            ) : (
              'Withdraw Liquidity'
            )}
          </Button>
        </Box>

        {/* Error Display */}
        {operationError && (
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            onClose={() => setOperationError(null)}
          >
            {operationError}
          </Alert>
        )}

        {/* Performance Stats - Collapsed version */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: 3,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 2
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              24h Fee
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {position.fees24h}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Total Value
            </Typography>
            <Typography variant="body1" fontWeight={600} color="primary">
              {position.value}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              APR
            </Typography>
            <Typography variant="body1" fontWeight={600} color="info.main">
              {position.apr}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Performance
            </Typography>
            <Typography
              variant="body1"
              fontWeight={600}
              color={position.performance.startsWith('+') ? 'success.main' : 'error.main'}
            >
              {position.performance}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!address) {
    return (
      <>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Card 
            elevation={0} 
            sx={{ 
              textAlign: 'center', 
              py: 12,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #fffbf5 0%, #fed7aa 100%)',
              border: '2px dashed',
              borderColor: 'divider'
            }}
          >
            <CardContent>
              <WalletIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 4, opacity: 0.7 }} />
              <Typography variant="h3" color="text.primary" gutterBottom fontWeight={700}>
                Connect Your Wallet
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                Connect a wallet to view your portfolio, manage tokens, and track your liquidity positions.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ConnectButton.Custom>
                  {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                    const ready = mounted;
                    const connected = ready && account && chain;

                    return (
                      <div
                        {...(!ready && {
                          'aria-hidden': true,
                          'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <Button
                                onClick={openConnectModal}
                                variant="contained"
                                size="large"
                                sx={{ 
                                  px: 6,
                                  py: 2,
                                  fontSize: '1.2rem',
                                  borderRadius: 3,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
                                  }
                                }}
                              >
                                Connect Wallet
                              </Button>
                            );
                          }

                          if (chain.unsupported) {
                            return (
                              <Button
                                onClick={openChainModal}
                                variant="contained"
                                color="error"
                                size="large"
                                sx={{ 
                                  px: 6,
                                  py: 2,
                                  fontSize: '1.2rem',
                                  borderRadius: 3,
                                  textTransform: 'none',
                                  fontWeight: 700
                                }}
                              >
                                Wrong network
                              </Button>
                            );
                          }

                          return (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Button
                                onClick={openChainModal}
                                variant="outlined"
                                size="large"
                                sx={{ 
                                  px: 4,
                                  py: 2,
                                  fontSize: '1rem',
                                  borderRadius: 3,
                                  textTransform: 'none',
                                  fontWeight: 600
                                }}
                              >
                                {chain.hasIcon && (
                                  <div
                                    style={{
                                      background: chain.iconBackground,
                                      width: 20,
                                      height: 20,
                                      borderRadius: 999,
                                      overflow: 'hidden',
                                      marginRight: 8,
                                    }}
                                  >
                                    {chain.iconUrl && (
                                      <img
                                        alt={chain.name ?? 'Chain icon'}
                                        src={chain.iconUrl}
                                        style={{ width: 20, height: 20 }}
                                      />
                                    )}
                                  </div>
                                )}
                                {chain.name}
                              </Button>

                              <Button
                                onClick={openAccountModal}
                                variant="contained"
                                size="large"
                                sx={{ 
                                  px: 4,
                                  py: 2,
                                  fontSize: '1rem',
                                  borderRadius: 3,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
                                  }
                                }}
                              >
                                {account.displayName}
                                {account.displayBalance && ` (${account.displayBalance})`}
                              </Button>
                            </Box>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Performance Alert for slow loading */}
        {(loading || positionsLoading) && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #fed7aa 0%, #fef3c7 100%)',
              border: '1px solid #f97316'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Optimizing blockchain data fetching... We've implemented batching and caching to improve speed
            </Typography>
            <LinearProgress 
              sx={{ 
                mt: 1, 
                borderRadius: 1,
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 100%)'
                }
              }} 
            />
          </Alert>
        )}

        {/* Portfolio Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            width: 200,
            height: 200,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)'
          }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <Box>
              <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
                Portfolio
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                Your total portfolio value
              </Typography>
              <Typography variant="h2" fontWeight={800} sx={{ color: 'white' }}>
                {loading ? <LinearProgress sx={{ width: 300, borderRadius: 1 }} /> : walletSummary.totalValue}
              </Typography>
            </Box>
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              sx={{ 
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                width: 56,
                height: 56
              }}
            >
              <RefreshIcon fontSize="large" />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Token Holdings */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card 
              elevation={0} 
              sx={{ 
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <WalletIcon sx={{ fontSize: 28, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h5" fontWeight={700}>
                    Token Holdings
                  </Typography>
                </Box>
                {loading ? (
                  renderTokenLoadingSkeleton()
                ) : error ? (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                ) : tokenBalances.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {tokenBalances.map((token) => (
                      <Card 
                        key={token.symbol} 
                        elevation={0}
                        sx={{ 
                          p: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          background: 'white',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 48, height: 48, boxShadow: 2 }}>
                              <img 
                                src={token.icon} 
                                alt={token.symbol} 
                                style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
                              />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight={700}>
                                {token.symbol}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {token.name}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Balance
                              </Typography>
                              <Typography variant="h6" fontWeight={600}>
                                {token.balanceFormatted}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Price
                              </Typography>
                              <Typography variant="h6" fontWeight={600}>
                                {token.price}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Value
                              </Typography>
                              <Typography variant="h6" fontWeight={700} color="primary">
                                ${token.value}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                24h Change
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                {getChangeIcon(token.change24h || '0%')}
                                <Typography 
                                  variant="body1" 
                                  color={getChangeColor(token.change24h || '0%')} 
                                  fontWeight={600}
                                >
                                  {token.change24h}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No token balances found
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Liquidity Positions */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PoolIcon sx={{ fontSize: 28, color: 'secondary.main', mr: 2 }} />
                  <Typography variant="h5" fontWeight={700}>
                    Your Positions ({userPositions.length})
                  </Typography>
                </Box>
                
                {positionsLoading ? (
                  renderPositionsLoadingSkeleton()
                ) : userPositions.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {userPositions.map(position => renderDetailedPositionCard(position))}
                  </Box>
                ) : (
                  <Card 
                    elevation={0} 
                    sx={{ 
                      textAlign: 'center', 
                      py: 8, 
                      border: '2px dashed', 
                      borderColor: 'divider',
                      borderRadius: 3,
                      background: 'rgba(0,0,0,0.02)'
                    }}
                  >
                    <CardContent>
                      <PoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
                      <Typography variant="h5" color="text.secondary" gutterBottom fontWeight={600}>
                        No liquidity positions found
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                        Start providing liquidity to earn trading fees and contribute to the ecosystem.
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        href="/pool"
                        sx={{ 
                          px: 6,
                          py: 2,
                          fontSize: '1.1rem',
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        Start Providing Liquidity
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <Card 
                    elevation={0} 
                    sx={{ 
                      textAlign: 'center', 
                      p: 3, 
                      borderRadius: 3,
                      border: '1px solid', 
                      borderColor: 'divider',
                      background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
                      color: 'white'
                    }}
                  >
                    <CardContent>
                      <SwapIcon sx={{ fontSize: 56, color: 'white', mb: 2, opacity: 0.9 }} />
                      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
                        Token Types
                      </Typography>
                      <Typography variant="h2" fontWeight={800} sx={{ mb: 1, color: 'white' }}>
                        {walletSummary.tokenCount}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Different tokens
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={12}>
                  <Card 
                    elevation={0} 
                    sx={{ 
                      textAlign: 'center', 
                      p: 3, 
                      borderRadius: 3,
                      border: '1px solid', 
                      borderColor: 'divider',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: 'white'
                    }}
                  >
                    <CardContent>
                      <PoolIcon sx={{ fontSize: 56, color: 'white', mb: 2, opacity: 0.9 }} />
                      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
                        LP Value
                      </Typography>
                      <Typography variant="h2" fontWeight={800} sx={{ mb: 1, color: 'white' }}>
                        {walletSummary.lpValue || '$0.00'}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Total liquidity
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={12}>
                  <Card 
                    elevation={0} 
                    sx={{ 
                      textAlign: 'center', 
                      p: 3, 
                      borderRadius: 3,
                      border: '1px solid', 
                      borderColor: 'divider',
                      background: 'linear-gradient(135deg, #fb923c 0%, #fdba74 100%)',
                      color: 'white'
                    }}
                  >
                    <CardContent>
                      <TrendingUpIcon sx={{ fontSize: 56, color: 'white', mb: 2, opacity: 0.9 }} />
                      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
                        LP Positions
                      </Typography>
                      <Typography variant="h2" fontWeight={800} sx={{ mb: 1, color: 'white' }}>
                        {walletSummary.positionCount}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Active positions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default PortfolioPage;
