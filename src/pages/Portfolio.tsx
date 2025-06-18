import {
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
  Typography,
} from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import Navigation from '../components/Navigation';
import ClaimsFeesDialog from '../components/pool/ClaimsFeesDialog';
import RemoveLiquidityDialog from '../components/pool/RemoveLiquidityDialog';
import { useWalletData, useWalletSummary } from '../dex/hooks/useWalletData';
import { useUserLiquidityPositions, type UserPosition } from '../dex/hooks/useUserPositions';

const PortfolioPage = () => {
  const { address } = useAccount();

  // Use real wallet data instead of mock data
  const { tokenBalances, loading, error, refetch } = useWalletData();
  const walletSummary = useWalletSummary();

  // Get detailed user positions for liquidity management
  const { positions: userPositions, loading: positionsLoading } = useUserLiquidityPositions(address);

  const [refreshing, setRefreshing] = useState(false);

  // Position management states
  const [showClaimsFees, setShowClaimsFees] = useState(false);
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
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Avatar sx={{ width: 48, height: 48, border: '3px solid white', boxShadow: 3 }}>
                <img
                  src={position.icon0}
                  alt={position.token0}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
              <Avatar sx={{ width: 48, height: 48, ml: -2, zIndex: 1, border: '3px solid white', boxShadow: 3 }}>
                <img
                  src={position.icon1}
                  alt={position.token1}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                {position.token0}/{position.token1}
              </Typography>
              <Chip
                label={position.inRange ? 'In Range' : 'Out of Range'}
                color={position.inRange ? 'success' : 'warning'}
                size="medium"
                variant="filled"
                sx={{ fontWeight: 600, borderRadius: 2 }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<RemoveIcon />}
              onClick={() => handleRemovePosition(position)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Remove
            </Button>
            <Button
              variant="contained"
              size="medium"
              color="success"
              onClick={() => handleClaimsFees(position)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Claim Fees
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                Liquidity
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {position.liquidity}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                Value
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                ${position.value}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                24h Fees
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                ${position.fees24h}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                Performance
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                color={position.performance.startsWith('+') ? 'success.main' : 'error.main'}
              >
                {position.performance}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        <Card elevation={0} sx={{ 
          p: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 2
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Typography variant="body1" fontWeight={600} color="text.primary">
              Price Range: <strong>{position.range.min}</strong> - <strong>{position.range.max}</strong> 
              <br />
              <Typography component="span" variant="body2" color="text.secondary">
                Current: <strong>{position.range.current}</strong>
              </Typography>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={75}
              sx={{ 
                width: 140, 
                height: 10, 
                borderRadius: 5,
                bgcolor: 'grey.300',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            />
          </Box>
        </Card>
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
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={48} />
                  </Box>
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
                                ${token.price}
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
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={48} />
                  </Box>
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
                        LP Earnings
                      </Typography>
                      <Typography variant="h2" fontWeight={800} sx={{ mb: 1, color: 'white' }}>
                        {walletSummary.unclaimedFees}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Unclaimed fees
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

        {/* Claims Fees Dialog */}
        <ClaimsFeesDialog
          open={showClaimsFees}
          onClose={() => setShowClaimsFees(false)}
          selectedPosition={selectedPosition}
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
