import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAccount, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import Navigation from '../components/Navigation';
import { useDexOperations, useTokenABalance, useTokenBBalance, useLiquidityTokenBalance } from '../utils/dexUtils';

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
  const { address } = useAccount();
  const [currentTab, setCurrentTab] = useState(0);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [showAddNewPool, setShowAddNewPool] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  
  // New Pool creation states
  const [newPoolToken0, setNewPoolToken0] = useState('');
  const [newPoolToken1, setNewPoolToken1] = useState('');
  const [newPoolToken0Address, setNewPoolToken0Address] = useState('');
  const [newPoolToken1Address, setNewPoolToken1Address] = useState('');
  const [newPoolInitialAmount0, setNewPoolInitialAmount0] = useState('');
  const [newPoolInitialAmount1, setNewPoolInitialAmount1] = useState('');
  
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
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const liquidityBalance = useLiquidityTokenBalance(address);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAddLiquidity = (pool: PoolData) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
    setAmount0('');
    setAmount1('');
  };

  const handleAddLiquiditySubmit = async () => {
    if (!amount0 || !amount1 || !selectedPool) {
      toast.error('Please enter both token amounts');
      return;
    }

    if (!address) {
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
    if (!selectedPosition || !address) {
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

    if (!address) {
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

    if (!address) {
      return;
    }

    try {
      const percentage = parseFloat(removePercentage);
      
      if (percentage <= 0 || percentage > 100) {
        return;
      }

      // Calculate the amount of LP tokens to remove based on percentage
      const currentLiquidityBalance = liquidityBalance || 0;
      const liquidityToRemove = (currentLiquidityBalance * percentage) / 100;

      // Call the removeLiquidity contract function
      await removeLiquidity(liquidityToRemove);
      setShowRemovePosition(false);
    } catch (err: any) {
      console.error('Remove position error:', err);
    }
  };

  const handleCreateNewPool = async () => {
    if (!newPoolToken0Address || !newPoolToken1Address || !newPoolInitialAmount0 || !newPoolInitialAmount1) {
      return;
    }

    if (!address) {
      return;
    }

    try {
      const amt0 = parseFloat(newPoolInitialAmount0);
      const amt1 = parseFloat(newPoolInitialAmount1);
      
      if (amt0 <= 0 || amt1 <= 0) {
        return;
      }

      // This would typically call a createPool contract function
      // For now, we'll simulate with addLiquidity as initial liquidity
      await addLiquidity(amt0, amt1);
      setShowAddNewPool(false);
      
      // Reset form
      setNewPoolToken0('');
      setNewPoolToken1('');
      setNewPoolToken0Address('');
      setNewPoolToken1Address('');
      setNewPoolInitialAmount0('');
      setNewPoolInitialAmount1('');
    } catch (err: any) {
      console.error('Create new pool error:', err);
    }
  };

  const userPools = poolData.filter(pool => pool.userLiquidity);
  const allPools = poolData;

  const renderPoolCard = (pool: PoolData, showUserActions = false) => (
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
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              TVL
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.tvl}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              24h Volume
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {pool.volume24h}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
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
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Liquidity
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {position.liquidity}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Value
            </Typography>
            <Typography variant="body1" fontWeight={600} color="primary">
              {position.value}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {position.fees24h}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
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
            {!address ? (
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
          maxWidth="sm"
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
                          onClick={() => setAmount0(tokenABalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenABalance || '0'} {selectedPool.token0}
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
                          onClick={() => setAmount1(tokenBBalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenBBalance || '0'} {selectedPool.token1}
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
                  disabled={!amount0 || !amount1 || isPending || !address}
                  onClick={handleAddLiquiditySubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  {!address ? 'Connect Wallet' : 
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
                  disabled={!address || isPending}
                  onClick={handleClaimsFeesSubmit}
                  color="success"
                  startIcon={isPending ? <CircularProgress size={20} /> : null}
                >
                  {!address ? 'Connect Wallet' : 
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
                  <Grid item xs={6}>
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
                            onClick={() => setAddAmount0(tokenABalance?.toString() || "0")}
                            sx={{ textTransform: 'none' }}
                          >
                            Max
                          </Button>
                        ),
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Balance: {tokenABalance || '0'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
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
                            onClick={() => setAddAmount1(tokenBBalance?.toString() || "0")}
                            sx={{ textTransform: 'none' }}
                          >
                            Max
                          </Button>
                        ),
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Balance: {tokenBBalance || '0'}
                    </Typography>
                  </Grid>
                </Grid>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!addAmount0 || !addAmount1 || isPending || !address}
                  onClick={handleAddToPositionSubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  {!address ? 'Connect Wallet' : 
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
                  disabled={!removePercentage || isPending || !address}
                  onClick={handleRemovePositionSubmit}
                  startIcon={isPending ? <CircularProgress size={20} /> : <RemoveIcon />}
                  color="warning"
                >
                  {!address ? 'Connect Wallet' : 
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
              <Typography variant="h6" gutterBottom>
                Token Pair Configuration
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Token A Symbol"
                    placeholder="ETH"
                    value={newPoolToken0}
                    onChange={(e) => setNewPoolToken0(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Token A Contract Address"
                    placeholder="0x..."
                    value={newPoolToken0Address}
                    onChange={(e) => setNewPoolToken0Address(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Token B Symbol"
                    placeholder="USDC"
                    value={newPoolToken1}
                    onChange={(e) => setNewPoolToken1(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Token B Contract Address"
                    placeholder="0x..."
                    value={newPoolToken1Address}
                    onChange={(e) => setNewPoolToken1Address(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Initial Liquidity
              </Typography>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`Initial ${newPoolToken0 || 'Token A'} Amount`}
                    placeholder="0.0"
                    type="number"
                    value={newPoolInitialAmount0}
                    onChange={(e) => setNewPoolInitialAmount0(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => setNewPoolInitialAmount0(tokenABalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenABalance || '0'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`Initial ${newPoolToken1 || 'Token B'} Amount`}
                    placeholder="0.0"
                    type="number"
                    value={newPoolInitialAmount1}
                    onChange={(e) => setNewPoolInitialAmount1(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => setNewPoolInitialAmount1(tokenBBalance?.toString() || "0")}
                          sx={{ textTransform: 'none' }}
                        >
                          Max
                        </Button>
                      ),
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: {tokenBBalance || '0'}
                  </Typography>
                </Grid>
              </Grid>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!newPoolToken0Address || !newPoolToken1Address || !newPoolInitialAmount0 || !newPoolInitialAmount1 || isPending || !address}
                onClick={handleCreateNewPool}
                startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
              >
                {!address ? 'Connect Wallet' : 
                 isPending ? 'Creating Pool...' : 
                 'Create Pool'}
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
};

export default PoolPage;
