import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
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
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useChainId } from 'wagmi';
import Navigation from '../components/Navigation';
import CreatePoolDialog from '../components/pool/CreatePoolDialog';
import TokenSelectionDialog from '../components/pool/TokenSelectionDialog';
import AddLiquidityForm from '../components/pool/AddLiquidityForm';
import { PriceToggleProvider } from '../components/pool/add-liquidity';
import { useApiPoolData, type ApiPool } from '../dex/hooks/useApiPoolData';
import { getTokensForChain } from '../dex/networkTokens';
import { generateTokenIcon } from '../dex/utils/tokenIconGenerator';

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

// 简化的转换函数 - 直接使用 API 预格式化的数据
const apiPoolToPoolData = (pool: ApiPool): PoolData | null => {
  console.log('🔍 DEBUG: apiPoolToPoolData transformation:', {
    inputPool: pool,
    pairAddress: pool.pairAddress,
    id: pool.id,
    tokenX: pool.tokenX,
    tokenY: pool.tokenY,
    poolKeys: Object.keys(pool)
  });
  
  // 使用 id 或 pairAddress 作为地址
  const address = pool.pairAddress || pool.id;
  if (!address) {
    console.error('❌ Pool missing both pairAddress and id:', pool);
    return null;
  }
  
  return {
    id: address,
    token0: pool.tokenX?.symbol || '',
    token1: pool.tokenY?.symbol || '',
    icon0: generateTokenIcon(pool.tokenX?.symbol || 'TOKEN', 36),
    icon1: generateTokenIcon(pool.tokenY?.symbol || 'TOKEN', 36),
    tvl: pool.tvlFormatted,
    apr: pool.aprFormatted,
    volume24h: pool.volume24hFormatted,
    fees24h: pool.fees24hFormatted,
    userLiquidity: undefined, // Not available in ApiPool
    pairAddress: address,
    binStep: pool.lbBinStep,
    tokenXAddress: pool.tokenX?.address,
    tokenYAddress: pool.tokenY?.address,
  };
};

// Memoized pool card component for better performance
const PoolCard = React.memo<{ pool: PoolData; onAddLiquidity: (pool: PoolData) => void }>(
  ({ pool, onAddLiquidity }) => {
    const handleClick = useCallback(() => {
      onAddLiquidity(pool);
    }, [pool, onAddLiquidity]);

    return (
      <Card 
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
        onClick={handleClick}
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
  }
);

PoolCard.displayName = 'PoolCard';

const PoolPage = () => {
  const [showAddNewPool, setShowAddNewPool] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 固定每页10条
  const [allPools, setAllPools] = useState<ApiPool[]>([]); // 累积所有池子数据
  
  // Add Liquidity states
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);

  // New Pool creation states - Use BNB as Base, USDT as Quote for BSC
  const [newPoolToken0, setNewPoolToken0] = useState('BNB');
  const [newPoolToken1, setNewPoolToken1] = useState('USDT');
  const [newPoolToken0Address, setNewPoolToken0Address] = useState('');
  const [newPoolToken1Address, setNewPoolToken1Address] = useState('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingPoolToken, setSelectingPoolToken] = useState<'token' | 'quote'>('token');

  // Web3 hooks
  const chainId = useChainId();

  // Fetch pool data from backend API
  const chainMap: Record<number, string> = useMemo(() => ({
    1: 'ethereum',
    56: 'binance',
    97: 'binance',
    137: 'polygon',
    43114: 'avax',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    11155111: 'ethereum', // sepolia
  }), []);

  const chainName = chainMap[chainId] || 'binance';
  const { pools: realPoolData, loading: poolsLoading, refetch, total } = useApiPoolData({
    chain: chainName,
    pageSize: pageSize,
    pageNum: currentPage,
    orderBy: 'volume',
    filterBy: '1d',
    status: 'main',
    version: 'all',
    excludeLowVolumePools: true,
  });

  // 累积池子数据 - 当新数据到达时累积
  useEffect(() => {
    if (realPoolData.length > 0) {
      if (currentPage === 1) {
        // 第一页或刷新时重置
        setAllPools(realPoolData);
      } else {
        // 后续页面累积添加
        setAllPools(prevPools => {
          const existingIds = new Set(prevPools.map(p => p.id || p.pairAddress));
          const newPools = realPoolData.filter(p => !existingIds.has(p.id || p.pairAddress));
          return [...prevPools, ...newPools];
        });
      }
    }
  }, [realPoolData, currentPage]);

  // Get tokens for current chain - memoized
  const tokens = useMemo(() => getTokensForChain(chainId), [chainId]);

  // Initialize default token addresses when component mounts or chain changes
  useEffect(() => {
    if (tokens.length >= 2) {
      const bnbToken = tokens.find(t => t.symbol === 'BNB');
      const usdtToken = tokens.find(t => t.symbol === 'USDT');

      if (bnbToken && !newPoolToken0Address) {
        setNewPoolToken0Address(bnbToken.address);
        setNewPoolToken0('BNB');
      }
      if (usdtToken && !newPoolToken1Address) {
        setNewPoolToken1Address(usdtToken.address);
        setNewPoolToken1('USDT');
      }
    }
  }, [tokens, newPoolToken0Address, newPoolToken1Address]);

  // Memoized callbacks for better performance
  const handleAddLiquidity = useCallback((pool: PoolData) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
  }, []);

  const handleBackToPoolList = useCallback(() => {
    setSelectedPool(null);
    setShowAddLiquidity(false);
  }, []);

  const handleCreatePool = useCallback(() => {
    setShowAddNewPool(true);
  }, []);

  const handleCloseCreatePool = useCallback(() => {
    setShowAddNewPool(false);
  }, []);

  const handlePoolCreated = useCallback(() => {
    setTimeout(() => {
      setCurrentPage(1); // 重置到第一页
      setAllPools([]); // 清空累积数据
      refetch(); // Use refetch instead of window.location.reload
    }, 2000);
  }, [refetch]);

  // 当搜索查询改变时重置累积数据
  useEffect(() => {
    if (searchQuery.trim()) {
      // 如果有搜索，不需要重置累积数据，因为搜索是基于已加载的数据
    } else {
      // 如果清空搜索，确保显示所有已加载的数据
    }
  }, [searchQuery]);

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  // 调试分页状态
  console.log('🔍 DEBUG Pagination State:', {
    total,
    pageSize,
    currentPage,
    totalPages,
    allPoolsLength: allPools.length,
    realPoolDataLength: realPoolData?.length,
    hasMorePages: allPools.length < total,
    canLoadMore: allPools.length < total && realPoolData.length === pageSize
  });

  // Memoized pool data conversion for better performance
  const poolDataList = useMemo(() => {
    const pools = allPools
      .map(pool => apiPoolToPoolData(pool))
      .filter((pool): pool is PoolData => pool !== null); // 类型保护，过滤掉无效的池子
    
    // Apply search filter
    if (!searchQuery.trim()) {
      return pools;
    }
    
    const query = searchQuery.toLowerCase();
    return pools.filter(pool => 
      pool.token0.toLowerCase().includes(query) ||
      pool.token1.toLowerCase().includes(query) ||
      `${pool.token0}/${pool.token1}`.toLowerCase().includes(query) ||
      `${pool.token1}/${pool.token0}`.toLowerCase().includes(query)
    );
  }, [allPools, searchQuery]);

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
                  color: '#f97316',
                  borderColor: '#f97316',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(249, 115, 22, 0.08)',
                    borderColor: '#ea580c',
                    color: '#ea580c',
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
                <Card sx={{ 
                  background: 'linear-gradient(145deg, #ffffff 0%, #fffbf5 100%)', 
                  color: 'text.primary', 
                  borderRadius: 2,
                  border: '1px solid rgba(120, 113, 108, 0.12)',
                  boxShadow: '0 4px 20px rgba(249, 115, 22, 0.08)'
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <PriceToggleProvider>
                      <AddLiquidityForm
                        selectedPool={selectedPool}
                        chainId={chainId}
                        onSuccess={() => {
                          // Handle success
                        }}
                      />
                    </PriceToggleProvider>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          // Pool List View
          <>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log('🔄 Force refresh triggered');
                    setCurrentPage(1); // 重置到第一页
                    setAllPools([]); // 清空累积数据
                    refetch();
                  }}
                  sx={{ 
                    borderRadius: 2,
                    borderColor: '#f97316',
                    color: '#f97316',
                    '&:hover': {
                      backgroundColor: 'rgba(249, 115, 22, 0.08)',
                      borderColor: '#ea580c',
                    }
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreatePool}
                  sx={{ 
                    borderRadius: 2,
                    backgroundColor: '#f97316 !important',
                    color: 'white !important',
                    '&:hover': {
                      backgroundColor: '#ea580c !important'
                    }
                  }}
                >
                  Create Pool
                </Button>
              </Box>
            </Box>

            {/* Search Box */}
            <Box sx={{ mb: 3, maxWidth: 400 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f97316',
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f97316',
                      },
                    },
                  },
                }}
              />
            </Box>

            {/* Pool List */}
            {poolsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : poolDataList.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  {searchQuery.trim() ? (
                    <>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No pools found for "{searchQuery}"
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Try adjusting your search terms or clear the search to see all pools.
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setSearchQuery('')}
                        sx={{ 
                          borderRadius: 2,
                          borderColor: '#f97316',
                          color: '#f97316',
                          '&:hover': {
                            backgroundColor: 'rgba(249, 115, 22, 0.08)',
                            borderColor: '#ea580c',
                          }
                        }}
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No pools found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create the first liquidity pool on this network.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreatePool}
                        sx={{ 
                          borderRadius: 2,
                          backgroundColor: '#f97316 !important',
                          color: 'white !important',
                          '&:hover': {
                            backgroundColor: '#ea580c !important'
                          }
                        }}
                      >
                        Create Pool
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Box>
                  {poolDataList.map(pool => (
                    <PoolCard 
                      key={pool.id} 
                      pool={pool} 
                      onAddLiquidity={handleAddLiquidity} 
                    />
                  ))}
                </Box>
                
                {/* Load More Button */}
                {(allPools.length < total && realPoolData.length === pageSize) && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    mt: 4,
                    mb: 2
                  }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        console.log('🔄 Load more clicked, current page:', currentPage, 'total:', total);
                        setCurrentPage(currentPage + 1);
                      }}
                      sx={{ 
                        borderRadius: 2,
                        borderColor: '#f97316',
                        color: '#f97316',
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(249, 115, 22, 0.08)',
                          borderColor: '#ea580c',
                          color: '#ea580c',
                        }
                      }}
                    >
                      Load More...
                    </Button>
                  </Box>
                )}
              </>
            )}
          </>
        )}

        {/* Create Pool Dialog */}
        <CreatePoolDialog
          open={showAddNewPool}
          onClose={handleCloseCreatePool}
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
          onPoolCreated={handlePoolCreated}
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
