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
  Typography
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
  token0: pool.tokenX?.symbol || '',
  token1: pool.tokenY?.symbol || '',
  icon0: pool.tokenX?.icon || '',
  icon1: pool.tokenY?.icon || '',
  tvl: pool.tvl,
  apr: pool.apr,
  volume24h: pool.volume24h,
  fees24h: pool.fees24h,
  userLiquidity: pool.userLiquidity,
  pairAddress: pool.pairAddress,
  binStep: pool.lbBinStep,
  tokenXAddress: pool.tokenXAddress || pool.tokenX?.address,
  tokenYAddress: pool.tokenYAddress || pool.tokenY?.address,
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
  const { pools: realPoolData, loading: poolsLoading } = useApiPoolData({
    chain: chainName,
    pageSize: 10,
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
      sx={{ 
        mb: 3, 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          '& .chevron-icon': {
            transform: 'translateX(4px)',
          }
        }
      }}
      onClick={() => handleAddLiquidity(pool)}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Token Icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Avatar sx={{ width: 36, height: 36, border: '2px solid', borderColor: 'background.paper' }}>
                <img src={pool.icon0} alt={pool.token0} style={{ width: '100%', height: '100%' }} />
              </Avatar>
              <Avatar sx={{ width: 36, height: 36, ml: -1, border: '2px solid', borderColor: 'background.paper' }}>
                <img src={pool.icon1} alt={pool.token1} style={{ width: '100%', height: '100%' }} />
              </Avatar>
            </Box>
            
            {/* Token Pair */}
            <Typography variant="h6" fontWeight={600}>
              {pool.token0}/{pool.token1}
            </Typography>
            
            {/* Chips */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {pool.binStep && (
                <Chip
                  label={`${(pool.binStep / 100).toFixed(2)}%`}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'divider' }}
                />
              )}
              <Chip
                label={`${pool.apr} APR`}
                size="small"
                color="primary"
                icon={<TrendingUpIcon sx={{ fontSize: '16px !important' }} />}
              />
            </Box>
          </Box>
          
          {/* Chevron Icon */}
          <ChevronRightIcon 
            className="chevron-icon"
            sx={{ 
              color: 'text.secondary',
              transition: 'transform 0.2s ease',
              fontSize: 28
            }} 
          />
        </Box>

        {/* Pool Statistics */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              TVL
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.tvl}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              24h Volume
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.volume24h}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.fees24h}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your Liquidity
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.userLiquidity || '$0.00'}
            </Typography>
          </Grid>
        </Grid>

        {/* Pair Address */}
        {pool.pairAddress && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Pair: {pool.pairAddress.slice(0, 6)}...{pool.pairAddress.slice(-4)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {showAddLiquidity && selectedPool ? (
          <>
            {/* Back Button - move to top left outside main grid */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  color: '#43a047',
                  borderColor: '#43a047',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(67, 160, 71, 0.08)',
                    borderColor: '#388e3c',
                    color: '#388e3c',
                  },
                }}
                onClick={handleBackToPoolList}
              >
                Back
              </Button>
            </Box>
            <Grid container spacing={4}>
              {/* Pool Info Sidebar */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ position: 'sticky', top: 24 }}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Pool Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <Avatar sx={{ width: 48, height: 48, border: '2px solid', borderColor: 'background.paper' }}>
                          <img src={selectedPool.icon0} alt={selectedPool.token0} style={{ width: '100%', height: '100%' }} />
                        </Avatar>
                        <Avatar sx={{ width: 48, height: 48, ml: -1.5, border: '2px solid', borderColor: 'background.paper' }}>
                          <img src={selectedPool.icon1} alt={selectedPool.token1} style={{ width: '100%', height: '100%' }} />
                        </Avatar>
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={600}>
                          {selectedPool.token0}/{selectedPool.token1}
                        </Typography>
                        {selectedPool.binStep && (
                          <Chip
                            label={`${(selectedPool.binStep / 100).toFixed(2)}% Fee`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Pool Stats */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Value Locked
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="primary">
                          {selectedPool.tvl}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          APR
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="success.main">
                          {selectedPool.apr}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              24h Volume
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {selectedPool.volume24h}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              24h Fees
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {selectedPool.fees24h}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Add Liquidity Form */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ backgroundColor: '#23272f', color: 'white', borderRadius: 2 }}>
                  <CardContent sx={{ p: 4 }}>
                    <AddLiquidityForm
                      selectedPool={selectedPool}
                      chainId={chainId}
                      onSuccess={() => {
                        // Handle success
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          // Pool List View
          <>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight={600}>
                Pools {realPoolData.length > 0 && `(${realPoolData.length})`}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddNewPool(true)}
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: '#1976d2 !important',
                  color: 'white !important',
                  '&:hover': {
                    backgroundColor: '#1565c0 !important'
                  }
                }}
              >
                Create Pool
              </Button>
            </Box>

            {/* Pool List */}
            {poolsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : realPoolData.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
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
                    sx={{ 
                      borderRadius: 2,
                      backgroundColor: '#1976d2 !important',
                      color: 'white !important',
                      '&:hover': {
                        backgroundColor: '#1565c0 !important'
                      }
                    }}
                  >
                    Create Pool
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Box>
                {realPoolData.map(pool => renderPoolCard(apiPoolToPoolData(pool)))}
              </Box>
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
            setTimeout(() => {
              window.location.reload();
            }, 2000);
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
