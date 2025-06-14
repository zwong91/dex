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
import { useDexOperations, useTokenABalance, useTokenBBalance } from '../utils/dexUtils';

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

const PoolPage = () => {
  const { address } = useAccount();
  const [currentTab, setCurrentTab] = useState(0);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  
  // Web3 hooks
  const { addLiquidity } = useDexOperations();
  const { isSuccess, error, isPending } = useWriteContract();
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);

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
          {showUserActions && pool.userLiquidity && (
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Your Liquidity
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary">
                {pool.userLiquidity}
              </Typography>
            </Grid>
          )}
        </Grid>

        {showUserActions && pool.userLiquidity && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<AddIcon />}>
              Add More
            </Button>
            <Button variant="outlined" size="small" startIcon={<RemoveIcon />}>
              Remove
            </Button>
          </Box>
        )}
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
            onClick={() => setShowAddLiquidity(true)}
          >
            New Position
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Your Liquidity" />
            <Tab label="All Pools" />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <Box>
            {!address ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Connect your wallet to view your liquidity positions
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            ) : userPools.length === 0 ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No liquidity found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Don't see a pool you joined? Import it.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />}>
                    Add Liquidity
                  </Button>
                </CardContent>
              </Card>
            ) : (
              userPools.map(pool => renderPoolCard(pool, true))
            )}
          </Box>
        )}

        {currentTab === 1 && (
          <Box>
            {allPools.map(pool => renderPoolCard(pool))}
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
      </Container>
    </>
  );
};

export default PoolPage;
