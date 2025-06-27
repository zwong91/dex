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
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  Typography,
  Skeleton,
} from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Navigation from '../components/Navigation';
import { useApiDexUserPools } from '../dex/hooks/useApiDexUserPools';
import { useWalletData } from '../dex/hooks/useWalletData';
import { useApiDexUserPoolIds } from '../dex/hooks/useApiDexUserPoolIds';
import { useApiDexUserBinIds } from '../dex/hooks/useApiDexUserBinIds';
import { useApiDexUserPoolUserBalances } from '../dex/hooks/useApiDexUserPoolUserBalances';
import { useApiDexUserFeesEarned } from '../dex/hooks/useApiDexUserFeesEarned';


const PortfolioPage = () => {

  const { address } = useAccount();


  // DEX API hooks
  const { pools: userPools, loading: poolsLoading } = useApiDexUserPools(address || '');
  const userPositions = Array.isArray(userPools) ? userPools : [];
  const positionsLoading = poolsLoading;

  // 钱包资产数据
  const { tokenBalances, loading: tokensLoading, error: tokensError, refetch: refetchTokens } = useWalletData();
  // 防御性处理 tokenBalances 为空或 null
  const safeTokenBalances = Array.isArray(tokenBalances) ? tokenBalances : [];

  // DEX 用户相关 hooks
  const { data: userPoolIdsRaw, loading: userPoolIdsLoading } = useApiDexUserPoolIds(address || '', 'bsc');
  // 防御性处理 userPoolIds 为空或 null
  const userPoolIds = Array.isArray(userPoolIdsRaw) ? userPoolIdsRaw : [];
  // 以第一个 poolId 作为演示
  const firstPoolId = userPoolIds.length > 0 ? userPoolIds[0] : '';
  const { data: userBinIdsRaw, loading: userBinIdsLoading } = useApiDexUserBinIds(address || '', firstPoolId, 'bsc');
  const userBinIds = Array.isArray(userBinIdsRaw) ? userBinIdsRaw : [];
  const { data: userPoolUserBalancesRaw, loading: userPoolUserBalancesLoading } = useApiDexUserPoolUserBalances(address || '', firstPoolId, 'bsc');
  const userPoolUserBalances = Array.isArray(userPoolUserBalancesRaw) ? userPoolUserBalancesRaw : [];
  const { data: userFeesEarnedRaw, loading: userFeesEarnedLoading } = useApiDexUserFeesEarned(address || '', firstPoolId, 'bsc');
  const userFeesEarned = Array.isArray(userFeesEarnedRaw) ? userFeesEarnedRaw : [];

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
          <Grid container spacing={4} sx={{ mb: 4 }} component="div">
            {[1, 2, 3, 4].map((j) => (
              <Grid key={j} sx={{ gridColumn: { xs: 'span 6', sm: 'span 3' } }}>
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
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
            <Typography variant="body2" color="text.secondary">TVL</Typography>
            <Typography variant="h6" fontWeight={700}>{position.liquidityUsd ? `$${Number(position.liquidityUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
            <Typography variant="body2" color="text.secondary">24h Fees</Typography>
            <Typography variant="h6" fontWeight={700}>{position.fees24hUsd ? `$${Number(position.fees24hUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
            <Typography variant="body2" color="text.secondary">24h Volume</Typography>
            <Typography variant="h6" fontWeight={700}>{position.volume24hUsd ? `$${Number(position.volume24hUsd).toLocaleString()}` : '-'}</Typography>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
            <Typography variant="body2" color="text.secondary">APR</Typography>
            <Typography variant="h6" fontWeight={700}>{position.apr ? `${position.apr}%` : '-'}</Typography>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
            <Typography variant="body2" color="text.secondary">APY</Typography>
            <Typography variant="h6" fontWeight={700}>{position.apy ? `${position.apy}%` : '-'}</Typography>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
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


            {/* User Pool IDs Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                User Pool IDs
              </Typography>
              {userPoolIdsLoading ? (
                <Skeleton width={120} />
              ) : userPoolIds.length > 0 ? (
                <Box>
                  {userPoolIds.map((id) => (
                    <Typography key={id} variant="body2">{id}</Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No pool IDs found.</Typography>
              )}
            </Box>

            {/* User Bin IDs Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                User Bin IDs (for first Pool)
              </Typography>
              {userBinIdsLoading ? (
                <Skeleton width={120} />
              ) : userBinIds.length > 0 ? (
                <Box>
                  {userBinIds.map((id: string) => (
                    <Typography key={id} variant="body2">{id}</Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No bin IDs found.</Typography>
              )}
            </Box>

            {/* User Pool User Balances Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                User Pool User Balances (for first Pool)
              </Typography>
              {userPoolUserBalancesLoading ? (
                <Skeleton width={120} />
              ) : userPoolUserBalances.length > 0 ? (
                <Box>
                  {userPoolUserBalances.map((item: any, idx: number) => (
                    <Typography key={idx} variant="body2">{JSON.stringify(item)}</Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No balances found.</Typography>
              )}
            </Box>

            {/* User Fees Earned Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                User Fees Earned (for first Pool)
              </Typography>
              {userFeesEarnedLoading ? (
                <Skeleton width={120} />
              ) : userFeesEarned.length > 0 ? (
                <Box>
                  {userFeesEarned.map((item: any, idx: number) => (
                    <Typography key={idx} variant="body2">{JSON.stringify(item)}</Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No fees earned found.</Typography>
              )}
            </Box>

            {/* User Bin IDs Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                User Bin IDs (for first pool)
              </Typography>
              {userBinIdsLoading ? (
                <Skeleton width={120} />
              ) : userBinIds && userBinIds.length > 0 ? (
                <Box>
                  {userBinIds.map((id: string) => (
                    <Typography key={id} variant="body2">{id}</Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No bin IDs found.</Typography>
              )}
            </Box>

            {/* Pool User Balances Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Pool User Balances (for first pool)
              </Typography>
              {userPoolUserBalancesLoading ? (
                <Skeleton width={120} />
              ) : userPoolUserBalances ? (
                <pre style={{ fontSize: 12, background: '#f8f8f8', padding: 8, borderRadius: 4, overflow: 'auto' }}>{JSON.stringify(userPoolUserBalances, null, 2)}</pre>
              ) : (
                <Typography variant="body2" color="text.secondary">No balances found.</Typography>
              )}
            </Box>

            {/* Fees Earned Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Fees Earned (for first pool)
              </Typography>
              {userFeesEarnedLoading ? (
                <Skeleton width={120} />
              ) : userFeesEarned ? (
                <pre style={{ fontSize: 12, background: '#f8f8f8', padding: 8, borderRadius: 4, overflow: 'auto' }}>{JSON.stringify(userFeesEarned, null, 2)}</pre>
              ) : (
                <Typography variant="body2" color="text.secondary">No fees found.</Typography>
              )}
            </Box>
            {/* 钱包资产展示区块 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Wallet Token Balances
              </Typography>
              {tokensLoading ? (
                <Skeleton width={180} />
              ) : safeTokenBalances.length > 0 ? (
                <Box>
                  {safeTokenBalances.map((token: any, idx: number) => (
                    <Typography key={idx} variant="body2">
                      {token.symbol}: {token.balance} (≈ ${token.value})
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No wallet tokens found.</Typography>
              )}
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
      </Container>
    </>
  );
};


export default PortfolioPage;
