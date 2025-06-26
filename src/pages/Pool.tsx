import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Typography,
  IconButton
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import Navigation from '../components/Navigation';
import CreatePoolDialog from '../components/pool/CreatePoolDialog';
import TokenSelectionDialog from '../components/pool/TokenSelectionDialog';
import AddLiquidityForm from '../components/pool/AddLiquidityForm';
import { useApiPoolData } from '../dex/hooks/useApiPoolData';
import { getTokensForChain } from '../dex/networkTokens';

interface PoolData {
  id: string;
  token0: string;
  token1: string;
  icon0: string;
  icon1: string;
  tvl: string;
  apr: string;
  volume24h: string;
  fees24h: string;
  userLiquidity?: string;
  pairAddress?: string;
  binStep?: number;
  tokenXAddress?: string;
  tokenYAddress?: string;
}

// 转换函数
const apiPoolToPoolData = (pool: any): PoolData => ({
  id: pool.id,
  token0: pool.token0,
  token1: pool.token1,
  icon0: pool.icon0,
  icon1: pool.icon1,
  tvl: pool.tvl,
  apr: pool.apr,
  volume24h: pool.volume24h,
  fees24h: pool.fees24h,
  userLiquidity: pool.userLiquidity,
  pairAddress: pool.pairAddress,
  binStep: pool.binStep,
  tokenXAddress: pool.tokenXAddress,
  tokenYAddress: pool.tokenYAddress,
});

const PoolPage = () => {
  const [showAddNewPool, setShowAddNewPool] = useState(false);
  
  // Add Liquidity states
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);

  // New Pool creation states
  const [newPoolToken0, setNewPoolToken0] = useState('USDC');
  const [newPoolToken1, setNewPoolToken1] = useState('ETH');
  const [newPoolToken0Address, setNewPoolToken0Address] = useState('');
  const [newPoolToken1Address, setNewPoolToken1Address] = useState('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingPoolToken, setSelectingPoolToken] = useState<'token' | 'quote'>('token');

  // Web3 hooks
  const chainId = useChainId();

  // Fetch pool data from backend API
  // chain 映射：1=ethereum, 56=binance, 137=polygon, 43114=avax, 42161=arbitrum, 10=optimism
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'binance',
    97: 'binance',
    137: 'polygon',
    43114: 'avax',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    11155111: 'ethereum', // sepolia
  };
  const chainName = chainMap[chainId] || 'binance';
  const { pools: realPoolData, loading: poolsLoading /*, error: poolsError*/ } = useApiPoolData({
    chain: chainName,
    pageSize: 50,
    orderBy: 'volume',
    filterBy: '1d',
    status: 'main',
    version: 'all',
    excludeLowVolumePools: true,
  });

  // Get tokens for current chain
  const tokens = getTokensForChain(chainId);

  // Initialize default token addresses when component mounts or chain changes
  useEffect(() => {
    if (tokens.length >= 2) {
      // Find USDC and ETH tokens in current chain
      const usdcToken = tokens.find(t => t.symbol === 'USDC');
      const ethToken = tokens.find(t => t.symbol === 'ETH');

      if (usdcToken && !newPoolToken0Address) {
        setNewPoolToken0Address(usdcToken.address);
      }
      if (ethToken && !newPoolToken1Address) {
        setNewPoolToken1Address(ethToken.address);
      }
    }
  }, [tokens, newPoolToken0Address, newPoolToken1Address]);

  const handleAddLiquidity = (pool: PoolData) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
  };

  const handleBackToPoolList = () => {
    setSelectedPool(null);
    setShowAddLiquidity(false);
  };

  const renderPoolCard = (pool: PoolData) => (
    <Card 
      key={pool.id} 
      elevation={0} 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-4px)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(76, 175, 80, 0.3)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(76, 175, 80, 0.1)',
          '& .chevron-indicator': {
            color: 'rgba(76, 175, 80, 1)',
            transform: 'translateX(8px) scale(1.1)',
          }
        }
      }}
      onClick={() => handleAddLiquidity(pool)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                <img
                  src={pool.icon0}
                  alt={pool.token0}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', ml: -1, zIndex: 1 }}>
                <img
                  src={pool.icon1}
                  alt={pool.token1}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {pool.token0}/{pool.token1}
            </Typography>
            {pool.binStep && (
              <Chip
                label={`${(pool.binStep / 100).toFixed(2)}% Fee`}
                color="secondary"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
            <Chip
              label={`${pool.apr} APR`}
              color="primary"
              size="small"
              icon={<TrendingUpIcon />}
            />
          </Box>
          {/* Intuitive clickable indicator - chevron arrow */}
          <Box 
            className="chevron-indicator"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <ChevronRightIcon sx={{ 
              fontSize: '1.5rem',
              transition: 'inherit'
            }} />
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              TVL
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.tvl}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              24h Volume
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.volume24h}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.fees24h}
            </Typography>
          </Grid>
          {pool.pairAddress && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Pair: {pool.pairAddress.slice(0, 10)}...{pool.pairAddress.slice(-8)}
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 6 }}>
        {showAddLiquidity && selectedPool ? (
          // Add Liquidity Sub-page
          <>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 8,
              px: 4
            }}>
              <IconButton 
                onClick={handleBackToPoolList}
                sx={{ 
                  mr: 4,
                  p: 2,
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.1))',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  borderRadius: '16px',
                  color: '#4CAF50',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(33, 150, 243, 0.2))',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(76, 175, 80, 0.3)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ArrowBackIcon sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </Box>

            {/* Spacious Left/Right Split Layout */}
            <Grid container spacing={12}>
              {/* Left Side - Pool Information */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ position: 'sticky', top: 40 }}>
                  {/* Pool Header Card */}
                  <Box sx={{ 
                    p: 6,
                    background: 'linear-gradient(145deg, rgba(30, 35, 50, 0.95), rgba(42, 45, 62, 0.95))', 
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    mb: 4
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Box sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid rgba(76, 175, 80, 0.5)',
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(33, 150, 243, 0.3))',
                          boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                        }}>
                          <img
                            src={selectedPool.icon0}
                            alt={selectedPool.token0}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                        <Box sx={{
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid rgba(33, 150, 243, 0.5)',
                          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(156, 39, 176, 0.3))',
                          ml: -2,
                          zIndex: 1,
                          boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)'
                        }}>
                          <img
                            src={selectedPool.icon1}
                            alt={selectedPool.token1}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      </Box>
                        <Box>
                          <Typography variant="h4" fontWeight={700} sx={{ 
                            background: 'linear-gradient(135deg, #4CAF50, #2196F3)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 2,
                            fontSize: '1.8rem'
                          }}>
                            {selectedPool.token0}/{selectedPool.token1}
                          </Typography>
                          {selectedPool.binStep && (
                            <Chip
                              label={`${(selectedPool.binStep / 100).toFixed(2)}% Fee`}
                              size="medium"
                              sx={{
                                backgroundColor: 'rgba(76, 175, 80, 0.25)',
                                color: '#4CAF50',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                height: 32,
                                border: '1px solid rgba(76, 175, 80, 0.4)',
                                borderRadius: '16px'
                              }}
                            />
                          )}
                        </Box>
                    </Box>
                    
                    {/* Pool Stats Grid */}
                    <Grid container spacing={4}>
                      <Grid size={12}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 4,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1))',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ 
                            mb: 2, 
                            fontWeight: 600, 
                            fontSize: '0.875rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: 1
                          }}>
                            💰 Total Value Locked
                          </Typography>
                          <Typography variant="h4" fontWeight={700} sx={{ 
                            color: '#4CAF50', 
                            fontSize: '2rem'
                          }}>
                            {selectedPool.tvl}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={12}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 4,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ 
                            mb: 2, 
                            fontWeight: 600, 
                            fontSize: '0.875rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: 1
                          }}>
                            📈 24hr APR
                          </Typography>
                          <Typography variant="h4" fontWeight={700} sx={{ 
                            color: '#2196F3', 
                            fontSize: '2rem'
                          }}>
                            {selectedPool.apr}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 3,
                          borderRadius: 3,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ 
                            mb: 1.5, 
                            fontWeight: 500, 
                            fontSize: '0.8rem', 
                            textTransform: 'uppercase'
                          }}>
                            24h Volume
                          </Typography>
                          <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                            {selectedPool.volume24h}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 3,
                          borderRadius: 3,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ 
                            mb: 1.5, 
                            fontWeight: 500, 
                            fontSize: '0.8rem', 
                            textTransform: 'uppercase'
                          }}>
                            24h Fees
                          </Typography>
                          <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                            {selectedPool.fees24h}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </Grid>

              {/* Right Side - Add Liquidity Form */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{
                  background: 'linear-gradient(145deg, rgba(30, 35, 50, 0.8), rgba(42, 45, 62, 0.8))',
                  borderRadius: 8,
                  border: '2px solid rgba(33, 150, 243, 0.2)',
                  p: 8,
                  backdropFilter: 'blur(40px)',
                  boxShadow: '0 20px 60px rgba(33, 150, 243, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #2196F3, #4CAF50, #FF9800)',
                    borderRadius: '8px 8px 0 0'
                  }
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    mb: 4,
                    pb: 3,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="h5" sx={{ 
                      background: 'linear-gradient(135deg, #2196F3, #4CAF50)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 600
                    }}>
                      🚀 Ready to add liquidity?
                    </Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ ml: 'auto' }}>
                      Let's get started! ✨
                    </Typography>
                  </Box>
                  <AddLiquidityForm
                    selectedPool={selectedPool}
                    chainId={chainId}
                    onSuccess={() => {
                      // Optionally go back to pool list after successful liquidity addition
                      // handleBackToPoolList();
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </>
        ) : (
          // Pool List View
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight={600}>
                Pool {realPoolData.length > 0 && `(${realPoolData.length})`}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddNewPool(true)}
              >
                Pool
              </Button>
            </Box>

            {poolsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : realPoolData.length === 0 ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No pools found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create the first liquidity pool on this network.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddNewPool(true)}
                  >
                    Create Pool
                  </Button>
                </CardContent>
              </Card>
            ) : (
              realPoolData.map(pool => renderPoolCard(apiPoolToPoolData(pool)))
            )}
          </>
        )}

        {/* Create Pool Dialog */}
        <CreatePoolDialog
          open={showAddNewPool}
          onClose={() => setShowAddNewPool(false)}
          chainId={chainId}
          onTokenSelectOpen={(type) => {
            setSelectingPoolToken(type);
            setIsTokenSelectOpen(true);
          }}
          newPoolToken0={newPoolToken0}
          newPoolToken1={newPoolToken1}
          newPoolToken0Address={newPoolToken0Address}
          newPoolToken1Address={newPoolToken1Address}
          setNewPoolToken0={setNewPoolToken0}
          setNewPoolToken1={setNewPoolToken1}
          setNewPoolToken0Address={setNewPoolToken0Address}
          setNewPoolToken1Address={setNewPoolToken1Address}
          onPoolCreated={() => {
            // Refresh pool data when a new pool is created
            setTimeout(() => {
              window.location.reload()
            }, 2000) // Wait 2 seconds for the transaction to be mined
          }}
        />

        {/* Token Selection Dialog */}
        <TokenSelectionDialog
          open={isTokenSelectOpen}
          onClose={() => setIsTokenSelectOpen(false)}
          chainId={chainId}
          selectingPoolToken={selectingPoolToken}
          onTokenSelect={(type, symbol, address) => {
            if (type === 'token') {
              setNewPoolToken0(symbol);
              setNewPoolToken0Address(address);
            } else {
              setNewPoolToken1(symbol);
              setNewPoolToken1Address(address);
            }
            setIsTokenSelectOpen(false);
          }}
        />
      </Container>
    </>
  );
};

export default PoolPage;
