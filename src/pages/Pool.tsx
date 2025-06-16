import {
  Add as AddIcon,
  Close as CloseIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Refresh as RefreshIcon,
  Remove as RemoveIcon,
  TrendingUp as TrendingUpIcon,
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
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Slider,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import Navigation from '../components/Navigation';
import { useDexOperations, useLiquidityTokenBalance, useTokenBalanceByAddress } from '../utils/dexUtils';
import { getTokensForChain } from '../utils/networkTokens';

const binStepOptions = [
  { value: '0.1%', baseFee: '0.1%', label: '0.1%' },
  { value: '0.25%', baseFee: '0.25%', label: '0.25%' },
  { value: '0.5%', baseFee: '0.4%', label: '0.5%' },
  { value: '1%', baseFee: '0.8%', label: '1%' },
];

// Custom hook to fetch live price from Binance API
const useBinancePrice = (symbol: string | null) => {
  const [price, setPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        if (data.price) {
          setPrice(parseFloat(data.price).toFixed(6));
        }
      } catch (error) {
        console.error('Failed to fetch price from Binance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, [symbol]);

  return { price, loading };
};

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
}

interface Position {
  id: string;
  token0: string;
  token1: string;
  icon0: string;
  icon1: string;
  liquidity: string;
  value: string;
  apr: string;
  fees24h: string;
  feesTotal: string;
  range: {
    min: string;
    max: string;
    current: string;
  };
  inRange: boolean;
  performance: string;
}

const poolData: PoolData[] = [
  {
    id: '1',
    token0: 'ETH',
    token1: 'USDC',
    icon0: '🔷',
    icon1: '💵',
    tvl: '$45.2M',
    apr: '12.5%',
    volume24h: '$2.1M',
    fees24h: '$6.3K',
    userLiquidity: '$1,250.00',
  },
  {
    id: '2',
    token0: 'USDC',
    token1: 'USDT',
    icon0: '💵',
    icon1: '💰',
    tvl: '$28.7M',
    apr: '8.2%',
    volume24h: '$1.8M',
    fees24h: '$5.4K',
  },
  {
    id: '3',
    token0: 'ETH',
    token1: 'DAI',
    icon0: '🔷',
    icon1: '🟡',
    tvl: '$18.9M',
    apr: '15.8%',
    volume24h: '$980K',
    fees24h: '$2.9K',
  },
];

const mockPositions: Position[] = [
  {
    id: '1',
    token0: 'ETH',
    token1: 'USDC',
    icon0: '🔷',
    icon1: '💵',
    liquidity: '$2,450.00',
    value: '$2,487.35',
    apr: '12.5%',
    fees24h: '$3.25',
    feesTotal: '$127.50',
    range: {
      min: '1,750',
      max: '2,100',
      current: '1,851',
    },
    inRange: true,
    performance: '+1.52%',
  },
  {
    id: '2',
    token0: 'DAI',
    token1: 'USDC',
    icon0: '🟡',
    icon1: '💵',
    liquidity: '$1,000.00',
    value: '$1,012.80',
    apr: '8.2%',
    fees24h: '$1.15',
    feesTotal: '$45.20',
    range: {
      min: '0.995',
      max: '1.005',
      current: '0.999',
    },
    inRange: true,
    performance: '+1.28%',
  },
];

const PoolPage = () => {
  const { address: userWalletAddress } = useAccount();
  const [currentTab, setCurrentTab] = useState(0);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [showAddNewPool, setShowAddNewPool] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  // Liquidity strategy states
  const [liquidityStrategy, setLiquidityStrategy] = useState<'spot' | 'curve' | 'bid-ask'>('spot');
  const [priceMode, setPriceMode] = useState<'range' | 'radius'>('range');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [numBins, setNumBins] = useState('149');
  const [activeBinPrice] = useState('19.09372774');

  // New Pool creation states
  const [newPoolToken0, setNewPoolToken0] = useState('');
  const [newPoolToken1, setNewPoolToken1] = useState('');
  const [newPoolToken0Address, setNewPoolToken0Address] = useState('');
  const [newPoolToken1Address, setNewPoolToken1Address] = useState('');
  const [selectedBinStep, setSelectedBinStep] = useState('0.25%');
  const [activePrice, setActivePrice] = useState('0.0027');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingPoolToken, setSelectingPoolToken] = useState<'token' | 'quote'>('token');

  // Position management states
  const [showClaimsFees, setShowClaimsFees] = useState(false);
  const [showAddToPosition, setShowAddToPosition] = useState(false);
  const [showRemovePosition, setShowRemovePosition] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [addAmount0, setAddAmount0] = useState('');
  const [addAmount1, setAddAmount1] = useState('');
  const [removePercentage, setRemovePercentage] = useState('25');

  // Web3 hooks
  const { addLiquidity, claimFees, removeLiquidity } = useDexOperations();
  const { isSuccess, error, isPending } = useWriteContract();
  const chainId = useChainId();

  // Get tokens for current chain
  const tokens = getTokensForChain(chainId);

  // Get current market price from Binance API
  const token0Symbol = newPoolToken0 || 'USDC';
  const token1Symbol = newPoolToken1 || 'ETH';

  // Build Binance symbol with proper mapping
  const buildBinanceSymbol = useMemo(() => {
    return (baseToken: string, quoteToken: string) => {
      // If tokens are the same, return null (fixed rate 1:1)
      if (baseToken === quoteToken) {
        return { symbol: null, inverted: false };
      }

      // Handle stablecoin pairs specially
      const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI'];

      // If both tokens are stablecoins, return null (we'll use fixed rate ~1.0)
      if (stablecoins.includes(baseToken) && stablecoins.includes(quoteToken)) {
        return { symbol: null, inverted: false };
      }

      // Map common tokens to Binance equivalents
      const tokenMap: { [key: string]: string } = {
        'WBNB': 'BNB',
        'WETH': 'ETH',
        'WBTC': 'BTC',
      };

      const mappedBase = tokenMap[baseToken] || baseToken;
      const mappedQuote = tokenMap[quoteToken] || quoteToken;

      // For USDC/ETH pair, we want to show how many USDC per 1 ETH
      // Binance ETHUSDC gives ETH price in USDC (e.g. 2618 USDC per ETH)
      if ((mappedBase === 'USDC' && mappedQuote === 'ETH') ||
          (mappedBase === 'USDC' && mappedQuote === 'WETH')) {
        return { symbol: 'ETHUSDC', inverted: false };
      }

      // For ETH/USDC pair, we want to show how many ETH per 1 USDC
      // Need to invert ETHUSDC (1/2618 = 0.000382)
      if ((mappedBase === 'ETH' && mappedQuote === 'USDC') ||
          (mappedBase === 'WETH' && mappedQuote === 'USDC')) {
        return { symbol: 'ETHUSDC', inverted: true };
      }

      // Define major trading pairs in correct order
      const majorPairs = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
        'BTCUSDC', 'ETHUSDC', 'BNBUSDC',
        'ETHBTC', 'BNBBTC', 'ADABTC'
      ];

      // Try to find the correct pair order
      const pair1 = `${mappedBase}${mappedQuote}`;
      const pair2 = `${mappedQuote}${mappedBase}`;

      if (majorPairs.includes(pair1)) {
        return { symbol: pair1, inverted: false };
      } else if (majorPairs.includes(pair2)) {
        return { symbol: pair2, inverted: true };
      }

      // Default: try base/USDT first, then quote/USDT
      if (stablecoins.includes(mappedQuote)) {
        return { symbol: `${mappedBase}${mappedQuote}`, inverted: false };
      } else if (stablecoins.includes(mappedBase)) {
        return { symbol: `${mappedQuote}${mappedBase}`, inverted: true };
      } else {
        // For non-stablecoin pairs, try both with USDT
        return { symbol: `${mappedBase}USDT`, inverted: false };
      }
    };
  }, []);

  const binanceData = useMemo(() =>
    buildBinanceSymbol(token0Symbol, token1Symbol),
    [buildBinanceSymbol, token0Symbol, token1Symbol]
  );

  const { price: marketPrice, loading: priceLoading } = useBinancePrice(binanceData?.symbol || null);

  // Calculate display price considering inversion
  const displayPrice = useMemo(() => {
    if (!marketPrice || !binanceData) return '';

    // If the pair is inverted, we need to calculate 1/price
    return binanceData.inverted
      ? (1 / parseFloat(marketPrice)).toFixed(6)
      : marketPrice;
  }, [marketPrice, binanceData]);

  // Update active price when market price changes or tokens change
  useEffect(() => {
    if (token0Symbol === token1Symbol) {
      // For same tokens, always use 1.00
      setActivePrice('1.00');
    } else if (binanceData?.symbol === null) {
      // For stablecoin pairs, use a fixed rate close to 1.0
      setActivePrice('1.00');
    } else if (displayPrice) {
      setActivePrice(displayPrice);
    }
  }, [displayPrice, token0Symbol, token1Symbol, binanceData]);

  // Use dynamic token addresses based on current chain
  const tokenXBalance = useTokenBalanceByAddress(userWalletAddress, tokens[0]?.address as `0x${string}`);
  const tokenYBalance = useTokenBalanceByAddress(userWalletAddress, tokens[1]?.address as `0x${string}`);
  const liquidityBalance = useLiquidityTokenBalance(userWalletAddress);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAddLiquidity = (pool: PoolData) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
    setAmount0('');
    setAmount1('');
    // Reset liquidity strategy settings
    setLiquidityStrategy('spot');
    setPriceMode('range');
    setMinPrice('17.7324');
    setMaxPrice('20.5594');
    setNumBins('149');
  };

  const handleAddLiquiditySubmit = async () => {
    if (!amount0 || !amount1 || !selectedPool) {
      toast.error('Please enter both token amounts');
      return;
    }

    if (!userWalletAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amt0 = parseFloat(amount0);
      const amt1 = parseFloat(amount1);

      if (amt0 <= 0 || amt1 <= 0) {
        toast.error('Please enter valid amounts');
        return;
      }

      await addLiquidity(amt0, amt1);
      toast.success('Adding liquidity...');
      setShowAddLiquidity(false);
    } catch (err: any) {
      console.error('Add liquidity error:', err);
      toast.error('Failed to add liquidity: ' + (err.message || 'Unknown error'));
    }
  };

  const handleClaimsFees = (position: Position) => {
    setSelectedPosition(position);
    setShowClaimsFees(true);
  };

  const handleClaimsFeesSubmit = async () => {
    if (!selectedPosition || !userWalletAddress) {
      return;
    }

    try {
      const positionId = parseInt(selectedPosition.id);
      await claimFees(positionId);
      setShowClaimsFees(false);
    } catch (err: any) {
      console.error('Claims fees error:', err);
    }
  };

  const handleAddToPosition = (position: Position) => {
    setSelectedPosition(position);
    setShowAddToPosition(true);
    setAddAmount0('');
    setAddAmount1('');
  };

  const handleAddToPositionSubmit = async () => {
    if (!addAmount0 || !addAmount1 || !selectedPosition) {
      return;
    }

    if (!userWalletAddress) {
      return;
    }

    try {
      const amt0 = parseFloat(addAmount0);
      const amt1 = parseFloat(addAmount1);

      if (amt0 <= 0 || amt1 <= 0) {
        return;
      }

      await addLiquidity(amt0, amt1);
      setShowAddToPosition(false);
    } catch (err: any) {
      console.error('Add to position error:', err);
    }
  };

  const handleRemovePosition = (position: Position) => {
    setSelectedPosition(position);
    setShowRemovePosition(true);
    setRemovePercentage('25');
  };

  const handleRemovePositionSubmit = async () => {
    if (!removePercentage || !selectedPosition) {
      return;
    }

    if (!userWalletAddress) {
      return;
    }

    try {
      const percentage = parseFloat(removePercentage);

      if (percentage <= 0 || percentage > 100) {
        return;
      }

      // Calculate the amount of LP tokens to remove based on percentage
      const currentLiquidityBalance = liquidityBalance || 0;
      const liquidityToRemove = (Number(currentLiquidityBalance) * percentage) / 100;

      // Call the removeLiquidity contract function
      await removeLiquidity(liquidityToRemove);
      setShowRemovePosition(false);
    } catch (err: any) {
      console.error('Remove position error:', err);
    }
  };

  const handleCreateNewPool = async () => {
    if (!newPoolToken0Address || !newPoolToken1Address) {
      return;
    }

    if (!userWalletAddress) {
      return;
    }

    try {
      // This would typically call a createPool contract function
      // For now, we'll just close the dialog and show success
      console.log('Creating pool with:', {
        token0: newPoolToken0,
        token1: newPoolToken1,
        binStep: selectedBinStep,
        activePrice: activePrice
      });

      setShowAddNewPool(false);

      // Reset form
      setNewPoolToken0('');
      setNewPoolToken1('');
      setNewPoolToken0Address('');
      setNewPoolToken1Address('');
      setSelectedBinStep('0.25%');
      setActivePrice('0.0027');
    } catch (err: any) {
      console.error('Create new pool error:', err);
    }
  };

  const allPools = poolData;

  const renderPoolCard = (pool: PoolData) => (
    <Card key={pool.id} elevation={0} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                {pool.icon0}
              </Avatar>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', ml: -1, zIndex: 1 }}>
                {pool.icon1}
              </Avatar>
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {pool.token0}/{pool.token1}
            </Typography>
            <Chip
              label={`${pool.apr} APR`}
              color="primary"
              size="small"
              icon={<TrendingUpIcon />}
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleAddLiquidity(pool)}
          >
            Add
          </Button>
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
        </Grid>
      </CardContent>
    </Card>
  );

  const renderPositionCard = (position: Position) => (
    <Card key={position.id} elevation={0} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                {position.icon0}
              </Avatar>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', ml: -1, zIndex: 1 }}>
                {position.icon1}
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
              {position.value}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {position.fees24h}
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

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={600}>
            Pools
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddNewPool(true)}
          >
            Pool
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="All Pools" />
            <Tab label="Positions" />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <Box>
            {allPools.map(pool => renderPoolCard(pool))}
          </Box>
        )}

        {currentTab === 1 && (
          <Box>
            {!userWalletAddress ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Connect your wallet to view your positions
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            ) : mockPositions.length === 0 ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No positions found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create your first liquidity position to start earning fees.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />}>
                    Add Liquidity
                  </Button>
                </CardContent>
              </Card>
            ) : (
              mockPositions.map(position => renderPositionCard(position))
            )}
          </Box>
        )}

        {/* Add Liquidity Dialog */}
        <Dialog
          open={showAddLiquidity}
          onClose={() => setShowAddLiquidity(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Add Liquidity
              <IconButton onClick={() => setShowAddLiquidity(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPool ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>{selectedPool.icon0}</Avatar>
                  <Avatar sx={{ width: 32, height: 32, ml: -1 }}>{selectedPool.icon1}</Avatar>
                  <Typography variant="h6">
                    {selectedPool.token0}/{selectedPool.token1}
                  </Typography>
                </Box>

                {/* Liquidity Strategy Selection */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Choose Liquidity Shape
                    </Typography>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={4}>
                      <Card
                        elevation={0}
                        sx={{
                          cursor: 'pointer',
                          border: 2,
                          borderColor: liquidityStrategy === 'spot' ? '#FF6B35' : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          backgroundColor: '#1A1B2E',
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: liquidityStrategy === 'spot' ? '#FF6B35' : 'rgba(255, 255, 255, 0.2)' }
                        }}
                        onClick={() => setLiquidityStrategy('spot')}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          {/* Spot - Asymmetric bars with center peak */}
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'end', gap: 0.5 }}>
                            {[10, 15, 20, 25, 30, 35, 25, 20, 15, 10, 8, 6].map((height, index) => (
                              <Box
                                key={index}
                                sx={{
                                  width: 4,
                                  height: height,
                                  borderRadius: '2px 2px 0 0',
                                  background: liquidityStrategy === 'spot' && index < 6
                                    ? 'linear-gradient(to top, #00D9FF, #7B68EE)'
                                    : '#4A5568'
                                }}
                              />
                            ))}
                          </Box>
                          <Typography variant="h6" fontWeight={600} color="white">
                            Spot
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={4}>
                      <Card
                        elevation={0}
                        sx={{
                          cursor: 'pointer',
                          border: 2,
                          borderColor: liquidityStrategy === 'curve' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          backgroundColor: '#1A1B2E',
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: liquidityStrategy === 'curve' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)' }
                        }}
                        onClick={() => setLiquidityStrategy('curve')}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          {/* Curve - Bell curve distribution */}
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'end', gap: 0.5 }}>
                            {[8, 12, 16, 20, 25, 30, 35, 30, 25, 20, 16, 12].map((height, index) => (
                              <Box
                                key={index}
                                sx={{
                                  width: 4,
                                  height: height,
                                  borderRadius: '2px 2px 0 0',
                                  background: liquidityStrategy === 'curve' && index < 6
                                    ? 'linear-gradient(to top, #00D9FF, #7B68EE)'
                                    : '#4A5568'
                                }}
                              />
                            ))}
                          </Box>
                          <Typography variant="h6" fontWeight={600} color="white">
                            Curve
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={4}>
                      <Card
                        elevation={0}
                        sx={{
                          cursor: 'pointer',
                          border: 2,
                          borderColor: liquidityStrategy === 'bid-ask' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          backgroundColor: '#1A1B2E',
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: liquidityStrategy === 'bid-ask' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)' }
                        }}
                        onClick={() => setLiquidityStrategy('bid-ask')}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          {/* Bid-Ask - Two separate peaks */}
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'end', gap: 0.5 }}>
                            {[25, 30, 25, 20, 15, 10, 8, 10, 15, 20, 25, 30].map((height, index) => (
                              <Box
                                key={index}
                                sx={{
                                  width: 4,
                                  height: height,
                                  borderRadius: '2px 2px 0 0',
                                  background: liquidityStrategy === 'bid-ask' && index < 6
                                    ? 'linear-gradient(to top, #00D9FF, #7B68EE)'
                                    : '#4A5568'
                                }}
                              />
                            ))}
                          </Box>
                          <Typography variant="h6" fontWeight={600} color="white">
                            Bid-Ask
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                {/* Price Range Configuration */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Price
                    </Typography>
                    <ToggleButtonGroup
                      value={priceMode}
                      exclusive
                      onChange={(_e, newValue) => newValue && setPriceMode(newValue)}
                      size="small"
                    >
                      <ToggleButton value="range">By Range</ToggleButton>
                      <ToggleButton value="radius">By Radius</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Active Bin: {activeBinPrice} USDC per AVAX
                    </Typography>

                    {/* Price Range Slider */}
                    <Box sx={{ px: 2, mb: 3 }}>
                      <Slider
                        value={[parseFloat(minPrice || '17.7324'), parseFloat(maxPrice || '20.5594')]}
                        onChange={(_e, newValue) => {
                          if (Array.isArray(newValue)) {
                            setMinPrice(newValue[0].toString());
                            setMaxPrice(newValue[1].toString());
                          }
                        }}
                        valueLabelDisplay="auto"
                        min={15}
                        max={25}
                        step={0.001}
                        marks={[
                          { value: parseFloat(activeBinPrice), label: 'Current' }
                        ]}
                        sx={{
                          '& .MuiSlider-thumb': {
                            backgroundColor: 'primary.main',
                          },
                          '& .MuiSlider-track': {
                            backgroundColor: 'primary.main',
                          }
                        }}
                      />
                    </Box>

                    <Grid container spacing={3}>
                      <Grid size={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Min Price:
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {parseFloat(minPrice || '17.7324').toFixed(4)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          USDC per AVAX
                        </Typography>
                      </Grid>
                      <Grid size={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Max Price:
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {parseFloat(maxPrice || '20.5594').toFixed(4)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          USDC per AVAX
                        </Typography>
                      </Grid>
                      <Grid size={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Num Bins:
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {numBins}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button
                        size="small"
                        startIcon={<TrendingUpIcon />}
                        onClick={() => {
                          // Select rewarded range functionality
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Select rewarded range
                      </Button>
                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          setMinPrice('17.7324');
                          setMaxPrice('20.5594');
                          setNumBins('149');
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Reset price
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Token Amounts */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount of {selectedPool.token0}
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => setAmount0(tokenXBalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenXBalance || '0'} {selectedPool.token0}
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount of {selectedPool.token1}
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => setAmount1(tokenYBalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenYBalance || '0'} {selectedPool.token1}
                  </Typography>
                </Box>

                <Card elevation={0} sx={{ backgroundColor: 'grey.50', mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Pool Details
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">APR</Typography>
                      <Typography variant="body2">{selectedPool.apr}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">TVL</Typography>
                      <Typography variant="body2">{selectedPool.tvl}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">24h Volume</Typography>
                      <Typography variant="body2">{selectedPool.volume24h}</Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!amount0 || !amount1 || isPending || !userWalletAddress}
                  onClick={handleAddLiquiditySubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  {!userWalletAddress ? 'Connect Wallet' :
                   isPending ? 'Adding Liquidity...' :
                   'Add Liquidity'}
                </Button>

                {/* Success/Error Messages */}
                {isSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Liquidity added successfully!
                  </Alert>
                )}
                {error && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Failed to add liquidity: {error.message}
                  </Alert>
                )}
              </Box>
            ) : (
              <Typography>Select a pool to add liquidity</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Claims Fees Dialog */}
        <Dialog
          open={showClaimsFees}
          onClose={() => setShowClaimsFees(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Claims Fees
              <IconButton onClick={() => setShowClaimsFees(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPosition ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>{selectedPosition.icon0}</Avatar>
                  <Avatar sx={{ width: 32, height: 32, ml: -1 }}>{selectedPosition.icon1}</Avatar>
                  <Typography variant="h6">
                    {selectedPosition.token0}/{selectedPosition.token1}
                  </Typography>
                </Box>

                <Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Available Fees to Claim
                    </Typography>
                    <Typography variant="h4" fontWeight={600} color="primary" gutterBottom>
                      {selectedPosition.feesTotal}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      24h fees: {selectedPosition.fees24h}
                    </Typography>
                  </CardContent>
                </Card>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!userWalletAddress || isPending}
                  onClick={handleClaimsFeesSubmit}
                  color="success"
                  startIcon={isPending ? <CircularProgress size={20} /> : null}
                >
                  {!userWalletAddress ? 'Connect Wallet' :
                   isPending ? 'Claiming Fees...' :
                   'Claims Fees'}
                </Button>
              </Box>
            ) : (
              <Typography>Select a position to claim fees</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Add to Position Dialog */}
        <Dialog
          open={showAddToPosition}
          onClose={() => setShowAddToPosition(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Add Liquidity to Position
              <IconButton onClick={() => setShowAddToPosition(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPosition ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>{selectedPosition.icon0}</Avatar>
                  <Avatar sx={{ width: 32, height: 32, ml: -1 }}>{selectedPosition.icon1}</Avatar>
                  <Typography variant="h6">
                    {selectedPosition.token0}/{selectedPosition.token1}
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={6}>
                    <TextField
                      fullWidth
                      label={`Amount of ${selectedPosition.token0}`}
                      placeholder="0.0"
                      type="number"
                      value={addAmount0}
                      onChange={(e) => setAddAmount0(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <Button
                            size="small"
                            onClick={() => setAddAmount0(tokenXBalance?.toString() || "0")}
                            sx={{ textTransform: 'none' }}
                          >
                            Max
                          </Button>
                        ),
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Balance: {tokenXBalance || '0'}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      fullWidth
                      label={`Amount of ${selectedPosition.token1}`}
                      placeholder="0.0"
                      type="number"
                      value={addAmount1}
                      onChange={(e) => setAddAmount1(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <Button
                            size="small"
                            onClick={() => setAddAmount1(tokenYBalance?.toString() || "0")}
                            sx={{ textTransform: 'none' }}
                          >
                            Max
                          </Button>
                        ),
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Balance: {tokenYBalance || '0'}
                    </Typography>
                  </Grid>
                </Grid>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!addAmount0 || !addAmount1 || isPending || !userWalletAddress}
                  onClick={handleAddToPositionSubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  {!userWalletAddress ? 'Connect Wallet' :
                   isPending ? 'Adding Liquidity...' :
                   'Add Liquidity'}
                </Button>
              </Box>
            ) : (
              <Typography>Select a position to add liquidity</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Remove Position Dialog */}
        <Dialog
          open={showRemovePosition}
          onClose={() => setShowRemovePosition(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Remove Liquidity from Position
              <IconButton onClick={() => setShowRemovePosition(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPosition ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>{selectedPosition.icon0}</Avatar>
                  <Avatar sx={{ width: 32, height: 32, ml: -1 }}>{selectedPosition.icon1}</Avatar>
                  <Typography variant="h6">
                    {selectedPosition.token0}/{selectedPosition.token1}
                  </Typography>
                </Box>

                <Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Current Position Value
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {selectedPosition.value}
                    </Typography>
                  </CardContent>
                </Card>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount to remove: {removePercentage}%
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {['25', '50', '75', '100'].map((value) => (
                      <Chip
                        key={value}
                        label={`${value}%`}
                        variant={removePercentage === value ? 'filled' : 'outlined'}
                        onClick={() => setRemovePercentage(value)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    label="Custom percentage"
                    value={removePercentage}
                    onChange={(e) => setRemovePercentage(e.target.value)}
                    type="number"
                    InputProps={{
                      endAdornment: '%',
                      inputProps: { min: 1, max: 100 }
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Your LP Token Balance: {liquidityBalance || '0'} tokens
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!removePercentage || isPending || !userWalletAddress}
                  onClick={handleRemovePositionSubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <RemoveIcon />}
                  color="warning"
                >
                  {!userWalletAddress ? 'Connect Wallet' :
                   isPending ? 'Removing Liquidity...' :
                   'Remove Liquidity'}
                </Button>
              </Box>
            ) : (
              <Typography>Select a position to remove liquidity</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Add New Pool Dialog */}
        <Dialog
          open={showAddNewPool}
          onClose={() => setShowAddNewPool(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Create Pool
              <IconButton onClick={() => setShowAddNewPool(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* Select Token */}
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Select Token
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSelectingPoolToken('token');
                  setIsTokenSelectOpen(true);
                }}
                sx={{
                  p: 2,
                  mb: 3,
                  justifyContent: 'space-between',
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#f8f9ff',
                  '&:hover': { backgroundColor: '#f0f2ff' }
                }}
                endIcon={<KeyboardArrowDownIcon />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '14px', bgcolor: 'primary.main' }}>
                    U
                  </Avatar>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'black' }}>
                      {newPoolToken0 || 'USDC'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {tokens.find(t => t.symbol === newPoolToken0)?.name || 'USD Coin'}
                    </Typography>
                  </Box>
                </Box>
              </Button>

              {/* Select Quote Asset */}
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Select Quote Asset
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSelectingPoolToken('quote');
                  setIsTokenSelectOpen(true);
                }}
                sx={{
                  p: 2,
                  mb: 3,
                  justifyContent: 'space-between',
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#f8f9ff',
                  '&:hover': { backgroundColor: '#f0f2ff' }
                }}
                endIcon={<KeyboardArrowDownIcon />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '14px', bgcolor: 'success.main' }}>
                    E
                  </Avatar>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'black' }}>
                      {newPoolToken1 || 'ETH'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {tokens.find(t => t.symbol === newPoolToken1)?.name || 'Ethereum'}
                    </Typography>
                  </Box>
                </Box>
              </Button>

              {/* Select Bin Step */}
              <Box
                sx={{
                  bgcolor: '#4A90E2',
                  color: 'white',
                  p: 1,
                  borderRadius: '4px 4px 0 0',
                  mb: 0
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Select Bin Step
                </Typography>
              </Box>

              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '0 0 8px 8px',
                  p: 2,
                  mb: 3,
                  bgcolor: '#f8f9ff'
                }}
              >
                <Grid container spacing={1}>
                  {binStepOptions.map((option) => (
                    <Grid size={3} key={option.value}>
                      <Button
                        fullWidth
                        variant={selectedBinStep === option.value ? 'contained' : 'outlined'}
                        onClick={() => setSelectedBinStep(option.value)}
                        sx={{
                          py: 2,
                          flexDirection: 'column',
                          bgcolor: selectedBinStep === option.value ? '#d4c5f9' : 'white',
                          color: selectedBinStep === option.value ? '#6b21d4' : 'black',
                          border: '1px solid',
                          borderColor: selectedBinStep === option.value ? '#6b21d4' : '#e0e0e0',
                          '&:hover': {
                            bgcolor: selectedBinStep === option.value ? '#c4b5f8' : '#f5f5f5'
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Base Fee: {option.baseFee}
                        </Typography>
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Enter Active Price */}
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Enter Active Price
              </Typography>

              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 2,
                  mb: 3,
                  backgroundColor: '#f8f9ff'
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {token0Symbol === token1Symbol ? (
                    `Fixed rate: 1 ${token0Symbol} = 1 ${token1Symbol}`
                  ) : binanceData?.symbol === null ? (
                    `Stablecoin pair: 1 ${token0Symbol} ≈ 1 ${token1Symbol}`
                  ) : priceLoading ? (
                    'Loading market price...'
                  ) : (
                    `Current price: 1 ${token0Symbol} = ${displayPrice || activePrice} ${token1Symbol}`
                  )}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TextField
                    value={activePrice}
                    onChange={(e) => setActivePrice(e.target.value)}
                    placeholder={displayPrice || '1.00'}
                    variant="outlined"
                    fullWidth
                    disabled={token0Symbol === token1Symbol}
                    sx={{
                      mr: 2,
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.4rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        backgroundColor: token0Symbol === token1Symbol ? '#f5f5f5' : 'white',
                        '& fieldset': {
                          borderColor: '#e0e0e0'
                        },
                        '&:hover fieldset': {
                          borderColor: token0Symbol === token1Symbol ? '#e0e0e0' : '#1976d2'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2'
                        }
                      }
                    }}
                  />

                  <Box sx={{ textAlign: 'right', minWidth: '120px' }}>
                    {token0Symbol === token1Symbol ? (
                      <>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          Same token
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          1:1 rate
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          ~${displayPrice ? parseFloat(displayPrice).toFixed(4) : parseFloat(activePrice).toFixed(4)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {token1Symbol} per {token0Symbol}
                        </Typography>
                      </>
                    )}
                    {priceLoading && (
                      <CircularProgress size={16} sx={{ color: '#4A90E2', mt: 0.5 }} />
                    )}
                  </Box>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!newPoolToken0 || !newPoolToken1 || !activePrice || isPending || !userWalletAddress}
                onClick={handleCreateNewPool}
                startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                sx={{
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                {!userWalletAddress ? 'Connect Wallet' :
                 isPending ? 'Creating Pool...' :
                 'Create Pool'}
              </Button>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Token Selection Dialog for Create Pool */}
        <Dialog
          open={isTokenSelectOpen}
          onClose={() => setIsTokenSelectOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Select {selectingPoolToken === 'token' ? 'Token' : 'Quote Asset'}
              <IconButton onClick={() => setIsTokenSelectOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <List>
              {tokens.map((token) => (
                <ListItem key={token.symbol} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      if (selectingPoolToken === 'token') {
                        setNewPoolToken0(token.symbol);
                        setNewPoolToken0Address(token.address);
                      } else {
                        setNewPoolToken1(token.symbol);
                        setNewPoolToken1Address(token.address);
                      }
                      setIsTokenSelectOpen(false);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {token.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={token.symbol}
                      secondary={token.name}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
};

export default PoolPage;
