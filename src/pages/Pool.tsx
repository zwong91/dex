import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  ArrowBack as ArrowBackIcon,
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
import { useRealPoolData } from '../dex';
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

  // Fetch real pool data from blockchain
  const { pools: realPoolData, loading: poolsLoading } = useRealPoolData();

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
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          elevation: 2,
          transform: 'translateY(-2px)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
          {/* Removed the Add button - clicking the card will add liquidity */}
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Click to add liquidity
          </Typography>
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                <ArrowBackIcon sx={{ fontSize: '1.5rem' }} />
              </IconButton>
              <Typography variant="h3" component="h1" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #4CAF50, #2196F3)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {selectedPool.token0}/{selectedPool.token1}
              </Typography>
            </Box>

            {/* Spacious Left/Right Split Layout */}
            <Grid container spacing={12}>
              {/* Left Side - Pool Information */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ position: 'sticky', top: 40 }}>
                  {/* Pool Header Card */}
                  <Box sx={{ 
                    p: 8,
                    background: 'linear-gradient(145deg, rgba(15, 20, 35, 0.95), rgba(25, 30, 45, 0.95))', 
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                    mb: 6
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 6 }}>
                      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Box sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '4px solid rgba(76, 175, 80, 0.4)',
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(33, 150, 243, 0.3))',
                          boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                        }}>
                          <img
                            src={selectedPool.icon0}
                            alt={selectedPool.token0}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                        <Box sx={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '4px solid rgba(33, 150, 243, 0.4)',
                          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(156, 39, 176, 0.3))',
                          ml: -3,
                          zIndex: 1,
                          boxShadow: '0 8px 25px rgba(33, 150, 243, 0.3)',
                        }}>
                          <img
                            src={selectedPool.icon1}
                            alt={selectedPool.token1}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="h3" fontWeight={700} sx={{ 
                          background: 'linear-gradient(135deg, #4CAF50, #2196F3)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          mb: 2,
                          fontSize: '2.5rem'
                        }}>
                          {selectedPool.token0}/{selectedPool.token1}
                        </Typography>
                        {selectedPool.binStep && (
                          <Chip
                            label={`${(selectedPool.binStep / 100).toFixed(2)}% Fee`}
                            size="medium"
                            sx={{
                              backgroundColor: 'rgba(76, 175, 80, 0.2)',
                              color: '#4CAF50',
                              fontWeight: 700,
                              fontSize: '1rem',
                              height: 40,
                              border: '2px solid rgba(76, 175, 80, 0.4)',
                              borderRadius: '20px'
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
                          p: 6,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1))',
                          border: '2px solid rgba(76, 175, 80, 0.4)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 2 }}>
                            Total Value Locked
                          </Typography>
                          <Typography variant="h2" fontWeight={700} sx={{ color: '#4CAF50', fontSize: '3rem' }}>
                            {selectedPool.tvl}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={12}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 6,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))',
                          border: '2px solid rgba(33, 150, 243, 0.4)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 2 }}>
                            24hr Fee / TVL
                          </Typography>
                          <Typography variant="h2" fontWeight={700} sx={{ color: '#2196F3', fontSize: '3rem' }}>
                            {selectedPool.apr}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 4,
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                            24h Volume
                          </Typography>
                          <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.5rem' }}>
                            {selectedPool.volume24h}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Box sx={{ 
                          textAlign: 'center',
                          p: 4,
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(20px)'
                        }}>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                            24h Fees
                          </Typography>
                          <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.5rem' }}>
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
                  background: 'linear-gradient(145deg, rgba(10, 15, 25, 0.7), rgba(20, 25, 35, 0.7))',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 8,
                  backdropFilter: 'blur(40px)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                }}>
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
              realPoolData.map(pool => renderPoolCard(pool))
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
