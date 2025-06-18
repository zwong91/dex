import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
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
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import CreatePoolDialog from '../components/pool/CreatePoolDialog';
import TokenSelectionDialog from '../components/pool/TokenSelectionDialog';
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
  const navigate = useNavigate();
  const [showAddNewPool, setShowAddNewPool] = useState(false);

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
    // Navigate to add liquidity page with pool ID as query parameter
    navigate(`/pool/add-liquidity?poolId=${encodeURIComponent(pool.id)}`);
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
