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
import { useApiDexUserPools } from '../dex/hooks/useApiDexUserPools';
import { useApiDexUserHistory } from '../dex/hooks/useApiDexUserHistory';
import { useApiDexUserStats } from '../dex/hooks/useApiDexUserStats';
import { useWalletData } from '../dex/hooks/useWalletData';
// import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';
// import { useUserLiquidityPositions, type UserPosition } from '../dex/hooks/useUserPositions';
import { useDexOperations } from '../dex/hooks/useDexOperations';

const PortfolioPage = () => {
  const { address } = useAccount();

  // New DEX API hooks
  const { pools: userPools, loading: poolsLoading, error: poolsError, refetch: refetchUserPools } = useApiDexUserPools(address);
  const { history: userHistory, loading: historyLoading, error: historyError, refetch: refetchUserHistory } = useApiDexUserHistory(address);
  const { stats: userStats, loading: statsLoading, error: statsError, refetch: refetchUserStats } = useApiDexUserStats(address);
  const { tokenBalances, loading: tokensLoading, error: tokensError, refetch: refetchTokens } = useWalletData();

  // Helper: fallback summary from userStats
  const walletSummary = userStats && tokenBalances
    ? {
        totalValue: userStats.totalLiquidityUsd ? `$${Number(userStats.totalLiquidityUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00',
        tokenCount: tokenBalances.length,
        lpValue: userStats.totalLiquidityUsd ? `$${Number(userStats.totalLiquidityUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00',
        positionCount: userStats.poolsCount || 0,
      }
    : {
        totalValue: '$0.00',
        tokenCount: 0,
        lpValue: '$0.00',
        positionCount: 0,
      };

  // tokenBalances 已包含 balance, price, value, change24h 等字段，直接用于渲染
  const loading = tokensLoading || statsLoading;
  const error = tokensError || statsError;
  const refetch = async () => {
    await Promise.all([refetchTokens(), refetchUserStats()]);
  };

  // Use userPools for positions
  const userPositions = Array.isArray(userPools) ? userPools : [];
  const positionsLoading = poolsLoading;
  
  // Get dex operations for liquidity withdrawal
  const { removeLiquidity } = useDexOperations();

  const [refreshing, setRefreshing] = useState(false);

  // Loading and error states for operations
  // (Unused, but keep for future UI feedback)
  // const [isWithdrawingAndClosing, setIsWithdrawingAndClosing] = useState(false);
  // const [operationError, setOperationError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle collecting fees and withdrawing all liquidity (close position)
  // NOTE: The legacy UserPosition type is not used anymore; userPositions now come from API (DexUserPool)
  // const handleWithdrawAndClose = async (position: any) => {
  //   // ...implementation, see previous version if needed
  // };

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

  // 适配 DexUserPool，展示核心 DEX 数据
  const renderDetailedPositionCard = (position: any) => (
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: 2 }}>
              <img
                src={`/src/assets/${position.tokenX.symbol?.toLowerCase()}.svg`}
                alt={position.tokenX.symbol}
                style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                onError={(e: any) => { e.target.onerror = null; e.target.src = '/src/assets/react.svg'; }}
              />
            </Avatar>
            <Avatar sx={{ width: 40, height: 40, ml: -1.5, zIndex: 1, border: '2px solid white', boxShadow: 2 }}>
              <img
                src={`/src/assets/${position.tokenY.symbol?.toLowerCase()}.svg`}
                alt={position.tokenY.symbol}
                style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                onError={(e: any) => { e.target.onerror = null; e.target.src = '/src/assets/react.svg'; }}
              />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                {position.tokenX.symbol}/{position.tokenY.symbol}
              </Typography>
              <Chip
                label={position.status === 'active' ? 'Active' : 'Inactive'}
                color={position.status === 'active' ? 'success' : 'warning'}
                size="small"
                variant="filled"
                sx={{ fontWeight: 600, borderRadius: 1 }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Pool Version: {position.version}
            </Typography>
          </Box>
        </Box>

        {/* Pool Stats Section */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">TVL</Typography>
            <Typography variant="h6" fontWeight={700}>{position.liquidityUsd ? `$${Number(position.liquidityUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">24h Fees</Typography>
            <Typography variant="h6" fontWeight={700}>{position.fees24hUsd ? `$${Number(position.fees24hUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">24h Volume</Typography>
            <Typography variant="h6" fontWeight={700}>{position.volume24hUsd ? `$${Number(position.volume24hUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">APR</Typography>
            <Typography variant="h6" fontWeight={700}>{position.apr ? `${position.apr}%` : '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">APY</Typography>
            <Typography variant="h6" fontWeight={700}>{position.apy ? `${position.apy}%` : '-'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="text.secondary">Swaps</Typography>
            <Typography variant="h6" fontWeight={700}>{position.txCount ?? '-'}</Typography>
          </Grid>
        </Grid>

        {/* Action Button (optional, can be disabled if无链上操作) */}
        {/*
        <Box sx={{ mt: 2 }}>
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
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff5252 0%, #e53e3e 100%)',
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #ffb3b3 0%, #ffcccc 100%)',
              }
            }}
          >
            Withdraw Liquidity
          </Button>
        </Box>
        */}
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
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
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
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
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
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
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
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              border: '1px solid #2196f3'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              正在优化链上数据获取... 我们已实施了批处理和缓存来提升速度
            </Typography>
            <LinearProgress 
              sx={{ 
                mt: 1, 
                borderRadius: 1,
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #2196f3 0%, #21cbf3 100%)'
                }
              }} 
            />
          </Alert>
        )}

        {/* Portfolio Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
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
