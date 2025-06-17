import {
  Add as AddIcon,
  Remove as RemoveIcon,
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
  LinearProgress,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import Navigation from '../components/Navigation';
import AddLiquidityDialog from '../components/pool/AddLiquidityDialog';
import AddToPositionDialog from '../components/pool/AddToPositionDialog';
import ClaimsFeesDialog from '../components/pool/ClaimsFeesDialog';
import CreatePoolDialog from '../components/pool/CreatePoolDialog';
import RemoveLiquidityDialog from '../components/pool/RemoveLiquidityDialog';
import TokenSelectionDialog from '../components/pool/TokenSelectionDialog';
import { useRealPoolData } from '../dex';
import { useUserLiquidityPositions, type UserPosition } from '../dex/hooks/useUserPositions';
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
  const { address: userWalletAddress } = useAccount();
  const [currentTab, setCurrentTab] = useState(0);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [showAddNewPool, setShowAddNewPool] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);

  // New Pool creation states
  const [newPoolToken0, setNewPoolToken0] = useState('USDC');
  const [newPoolToken1, setNewPoolToken1] = useState('ETH');
  const [newPoolToken0Address, setNewPoolToken0Address] = useState('');
  const [newPoolToken1Address, setNewPoolToken1Address] = useState('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingPoolToken, setSelectingPoolToken] = useState<'token' | 'quote'>('token');

  // Position management states
  const [showClaimsFees, setShowClaimsFees] = useState(false);
  const [showAddToPosition, setShowAddToPosition] = useState(false);
  const [showRemovePosition, setShowRemovePosition] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);

  // Web3 hooks
  const chainId = useChainId();

  // Fetch real pool data from blockchain
  const { pools: realPoolData, loading: poolsLoading } = useRealPoolData();

  // Get real user positions instead of mock data
  const { positions: userPositions, loading: positionsLoading } = useUserLiquidityPositions(userWalletAddress);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAddLiquidity = (pool: PoolData) => {
    setSelectedPool(pool);
    setShowAddLiquidity(true);
  };

  const handleClaimsFees = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowClaimsFees(true);
  };

  const handleAddToPosition = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowAddToPosition(true);
  };

  const handleRemovePosition = (position: UserPosition) => {
    setSelectedPosition(position);
    setShowRemovePosition(true);
  };

  const renderPoolCard = (pool: PoolData) => (
    <Card key={pool.id} elevation={0} sx={{ mb: 2 }}>
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

  const renderPositionCard = (position: UserPosition) => (
    <Card key={position.id} elevation={0} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                <img
                  src={position.icon0}
                  alt={position.token0}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
              </Avatar>
              <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', ml: -1, zIndex: 1 }}>
                <img
                  src={position.icon1}
                  alt={position.token1}
                  style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                />
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
              ${position.value}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              24h Fees
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              ${position.fees24h}
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
            Pools {realPoolData.length > 0 && `(${realPoolData.length})`}
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
            <Tab label="My Positions" />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <Box>
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
            ) : positionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : userPositions.length === 0 ? (
              <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No positions found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create your first liquidity position to start earning fees.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCurrentTab(0)} // Switch to All Pools tab to add liquidity
                  >
                    Add Liquidity
                  </Button>
                </CardContent>
              </Card>
            ) : (
              userPositions.map(position => renderPositionCard(position))
            )}
          </Box>
        )}

        {/* Add Liquidity Dialog */}
        <AddLiquidityDialog
          open={showAddLiquidity}
          onClose={() => setShowAddLiquidity(false)}
          selectedPool={selectedPool}
          chainId={chainId}
        />

        {/* Claims Fees Dialog */}
        <ClaimsFeesDialog
          open={showClaimsFees}
          onClose={() => setShowClaimsFees(false)}
          selectedPosition={selectedPosition}
        />

        {/* Add to Position Dialog */}
        <AddToPositionDialog
          open={showAddToPosition}
          onClose={() => setShowAddToPosition(false)}
          selectedPosition={selectedPosition}
          chainId={chainId}
        />

        {/* Remove Position Dialog */}
        <RemoveLiquidityDialog
          open={showRemovePosition}
          onClose={() => setShowRemovePosition(false)}
          selectedPosition={selectedPosition}
        />

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
