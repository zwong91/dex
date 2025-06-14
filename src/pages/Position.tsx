import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Tabs,
  Tab,
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
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAccount, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import Navigation from '../components/Navigation';
import { useDexOperations, useTokenABalance, useTokenBBalance, useLiquidityTokenBalance } from '../utils/dexUtils';

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
  {
    id: '3',
    token0: 'ETH',
    token1: 'DAI',
    icon0: '🔷',
    icon1: '🟡',
    liquidity: '$800.00',
    value: '$785.20',
    apr: '0%',
    fees24h: '$0.00',
    feesTotal: '$12.30',
    range: {
      min: '1,600',
      max: '1,800',
      current: '1,851',
    },
    inRange: false,
    performance: '-1.85%',
  },
];

const PositionPage = () => {
  const { address } = useAccount();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [manageTab, setManageTab] = useState(0);
  const [removeAmount, setRemoveAmount] = useState('25');
  const [addAmount0, setAddAmount0] = useState('');
  const [addAmount1, setAddAmount1] = useState('');
  
  // Web3 hooks
  const { addLiquidity, removeLiquidity } = useDexOperations();
  const { isSuccess, error, isPending } = useWriteContract();
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const liquidityBalance = useLiquidityTokenBalance(address);

  const handleManagePosition = (position: Position) => {
    setSelectedPosition(position);
    setShowManageDialog(true);
    setAddAmount0('');
    setAddAmount1('');
  };

  const handleAddLiquidity = async () => {
    if (!addAmount0 || !addAmount1) {
      toast.error('Please enter both token amounts');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const amt0 = parseFloat(addAmount0);
      const amt1 = parseFloat(addAmount1);
      
      if (amt0 <= 0 || amt1 <= 0) {
        toast.error('Please enter valid amounts');
        return;
      }

      await addLiquidity(amt0, amt1);
      toast.success('Adding liquidity to position...');
      setShowManageDialog(false);
    } catch (err: any) {
      console.error('Add liquidity error:', err);
      toast.error('Failed to add liquidity: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!removeAmount) {
      toast.error('Please enter amount to remove');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const percentage = parseFloat(removeAmount);
      if (percentage <= 0 || percentage > 100) {
        toast.error('Please enter a valid percentage (1-100)');
        return;
      }

      // Calculate actual liquidity tokens to remove based on percentage
      const liquidityToRemove = (parseFloat(liquidityBalance || '0') * percentage) / 100;
      
      if (liquidityToRemove <= 0) {
        toast.error('No liquidity tokens to remove');
        return;
      }

      await removeLiquidity(liquidityToRemove);
      toast.success('Removing liquidity from position...');
      setShowManageDialog(false);
    } catch (err: any) {
      console.error('Remove liquidity error:', err);
      toast.error('Failed to remove liquidity: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCollectFees = async () => {
    // This would typically be a separate contract call
    toast.info('Collect fees functionality not implemented yet');
  };

  const getStatusColor = (inRange: boolean) => {
    return inRange ? 'success' : 'warning';
  };

  const getStatusText = (inRange: boolean) => {
    return inRange ? 'In Range' : 'Out of Range';
  };

  const getPerformanceColor = (performance: string) => {
    return performance.startsWith('+') ? 'success.main' : 'warning.main';
  };

  if (!address) {
    return (
      <>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card elevation={0} sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                Connect your wallet to view your positions
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect a wallet to see your liquidity positions and manage them.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Your Positions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your liquidity positions and collect fees
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}>
            New Position
          </Button>
        </Box>

        {mockPositions.length === 0 ? (
          <Card elevation={0} sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No liquidity positions found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first position to start earning fees
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Create Position
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {mockPositions.map((position) => (
              <Grid item xs={12} md={6} lg={4} key={position.id}>
                <Card elevation={0} sx={{ height: '100%' }}>
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
                      </Box>
                      <Chip
                        label={getStatusText(position.inRange)}
                        color={getStatusColor(position.inRange)}
                        size="small"
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Value
                      </Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {position.value}
                      </Typography>
                      <Typography variant="body2" color={getPerformanceColor(position.performance)}>
                        {position.performance}
                      </Typography>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          APR
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {position.apr}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          24h Fees
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {position.fees24h}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Price Range
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                          {position.range.min} - {position.range.max}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          (Current: {position.range.current})
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={position.inRange ? 65 : 0}
                        color={position.inRange ? 'success' : 'warning'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleManagePosition(position)}
                        sx={{ flex: 1 }}
                      >
                        Manage
                      </Button>
                      <IconButton size="small" onClick={() => handleManagePosition(position)}>
                        <SettingsIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Manage Position Dialog */}
        <Dialog
          open={showManageDialog}
          onClose={() => setShowManageDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedPosition && (
                  <>
                    <Avatar sx={{ width: 32, height: 32 }}>{selectedPosition.icon0}</Avatar>
                    <Avatar sx={{ width: 32, height: 32, ml: -1 }}>{selectedPosition.icon1}</Avatar>
                    <Typography variant="h6">
                      {selectedPosition.token0}/{selectedPosition.token1}
                    </Typography>
                  </>
                )}
              </Box>
              <IconButton onClick={() => setShowManageDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPosition && (
              <>
                {/* Position Overview */}
                <Card elevation={0} sx={{ mb: 3, backgroundColor: 'grey.50' }}>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Total Value
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedPosition.value}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Unclaimed Fees
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedPosition.feesTotal}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          APR
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedPosition.apr}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          label={getStatusText(selectedPosition.inRange)}
                          color={getStatusColor(selectedPosition.inRange)}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {!selectedPosition.inRange && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    Your position is out of range and not earning fees. Consider adjusting your position.
                  </Alert>
                )}

                <Tabs value={manageTab} onChange={(e, v) => setManageTab(v)} sx={{ mb: 3 }}>
                  <Tab label="Add Liquidity" />
                  <Tab label="Remove Liquidity" />
                  <Tab label="Collect Fees" />
                </Tabs>

                {manageTab === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Add Liquidity
                    </Typography>
                    <Grid container spacing={2}>
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
                      variant="contained" 
                      fullWidth 
                      sx={{ mt: 2 }}
                      disabled={!addAmount0 || !addAmount1 || isPending || !address}
                      onClick={handleAddLiquidity}
                      startIcon={isPending ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      {!address ? 'Connect Wallet' : 
                       isPending ? 'Adding Liquidity...' : 
                       'Add Liquidity'}
                    </Button>
                  </Box>
                )}

                {manageTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Remove Liquidity
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Amount to remove: {removeAmount}%
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {['25', '50', '75', '100'].map((value) => (
                          <Chip
                            key={value}
                            label={`${value}%`}
                            variant={removeAmount === value ? 'filled' : 'outlined'}
                            onClick={() => setRemoveAmount(value)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                      <TextField
                        fullWidth
                        label="Custom percentage"
                        value={removeAmount}
                        onChange={(e) => setRemoveAmount(e.target.value)}
                        type="number"
                        InputProps={{ endAdornment: '%' }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Your LP Balance: {liquidityBalance || '0'} tokens
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      fullWidth
                      disabled={!removeAmount || isPending || !address}
                      onClick={handleRemoveLiquidity}
                      startIcon={isPending ? <CircularProgress size={20} /> : <RemoveIcon />}
                    >
                      {!address ? 'Connect Wallet' : 
                       isPending ? 'Removing Liquidity...' : 
                       'Remove Liquidity'}
                    </Button>
                  </Box>
                )}

                {manageTab === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Collect Fees
                    </Typography>
                    <Card elevation={0} sx={{ mb: 2, backgroundColor: 'grey.50' }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          Unclaimed fees
                        </Typography>
                        <Typography variant="h5" fontWeight={600}>
                          {selectedPosition.feesTotal}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Button 
                      variant="contained" 
                      fullWidth
                      disabled={!address}
                      onClick={handleCollectFees}
                    >
                      {!address ? 'Connect Wallet' : 'Collect Fees'}
                    </Button>
                  </Box>
                )}

                {/* Success/Error Messages */}
                {isSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Transaction completed successfully!
                  </Alert>
                )}
                {error && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Transaction failed: {error.message}
                  </Alert>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
};

export default PositionPage;
