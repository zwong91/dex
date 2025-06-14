import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useAccount, useWriteContract, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import Navigation from '../components/Navigation';
import { 
  useDexOperations, 
  useTokenABalance, 
  useTokenBBalance, 
  useLiquidityTokenBalance,
  useTokenApproval 
} from '../utils/dexUtils';

const TestPage = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [swapAmount, setSwapAmount] = useState('');
  const [addAmount0, setAddAmount0] = useState('');
  const [addAmount1, setAddAmount1] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');
  const [approveAmount, setApproveAmount] = useState('');

  // Hooks
  const { isSuccess, error, isPending } = useWriteContract();
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const liquidityBalance = useLiquidityTokenBalance(address);
  const { swapTokenAForB, addLiquidity, removeLiquidity } = useDexOperations();
  const { approveTokenA, approveTokenB } = useTokenApproval();

  // Debug balance parsing
  const tokenANum = parseFloat(tokenABalance || '0');
  const tokenBNum = parseFloat(tokenBBalance || '0');
  const liquidityNum = parseFloat(liquidityBalance || '0');

  const handleSwap = async () => {
    if (!swapAmount || !address) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    try {
      const amount = parseFloat(swapAmount);
      console.log('Swap test:', { amount, tokenABalance, tokenANum, available: tokenANum >= amount });
      
      if (tokenANum < amount) {
        toast.error(`Insufficient balance. You have ${tokenANum} Token A, need ${amount}`);
        return;
      }
      await swapTokenAForB(amount);
      toast.success('Swap initiated...');
    } catch (err: any) {
      toast.error('Swap failed: ' + err.message);
    }
  };

  const handleAddLiquidity = async () => {
    if (!addAmount0 || !addAmount1 || !address) {
      toast.error('Please enter both amounts and connect wallet');
      return;
    }

    try {
      const amt0 = parseFloat(addAmount0);
      const amt1 = parseFloat(addAmount1);
      await addLiquidity(amt0, amt1);
      toast.success('Adding liquidity...');
    } catch (err: any) {
      toast.error('Add liquidity failed: ' + err.message);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!removeAmount || !address) {
      toast.error('Please enter amount and connect wallet');
      return;
    }

    try {
      const amount = parseFloat(removeAmount);
      await removeLiquidity(amount);
      toast.success('Removing liquidity...');
    } catch (err: any) {
      toast.error('Remove liquidity failed: ' + err.message);
    }
  };

  const handleApproveA = async () => {
    if (!approveAmount || !address) {
      toast.error('Please enter amount and connect wallet');
      return;
    }

    try {
      await approveTokenA(approveAmount);
      toast.success('Token A approval initiated...');
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const handleApproveB = async () => {
    if (!approveAmount || !address) {
      toast.error('Please enter amount and connect wallet');
      return;
    }

    try {
      await approveTokenB(approveAmount);
      toast.success('Token B approval initiated...');
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  if (!isConnected) {
    return (
      <>
        <Navigation />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom>
                Connect Wallet to Test DEX Functions
              </Typography>
              <ConnectButton />
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
        <Typography variant="h4" gutterBottom>
          DEX Testing Interface
        </Typography>

        {/* Wallet Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Wallet Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {address?.slice(0, 10)}...{address?.slice(-8)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Chain ID
                </Typography>
                <Typography variant="body1">
                  {chainId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Token A Balance
                </Typography>
                <Typography variant="body1">
                  {tokenABalance || '0'} (${tokenANum.toFixed(4)})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Token B Balance
                </Typography>
                <Typography variant="body1">
                  {tokenBBalance || '0'} (${tokenBNum.toFixed(4)})
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  LP Token Balance
                </Typography>
                <Typography variant="body1">
                  {liquidityBalance || '0'} (${liquidityNum.toFixed(4)})
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Token Approval */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Token Approval
                </Typography>
                <TextField
                  fullWidth
                  label="Amount to Approve"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={handleApproveA}
                    disabled={isPending}
                  >
                    Approve Token A
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleApproveB}
                    disabled={isPending}
                  >
                    Approve Token B
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Swap */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Swap Tokens
                </Typography>
                <TextField
                  fullWidth
                  label="Token A Amount"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleSwap}
                  disabled={isPending}
                  fullWidth
                >
                  Swap A → B
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Add Liquidity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add Liquidity
                </Typography>
                <TextField
                  fullWidth
                  label="Token A Amount"
                  value={addAmount0}
                  onChange={(e) => setAddAmount0(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Token B Amount"
                  value={addAmount1}
                  onChange={(e) => setAddAmount1(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddLiquidity}
                  disabled={isPending}
                  fullWidth
                >
                  Add Liquidity
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Remove Liquidity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Remove Liquidity
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  LP Balance: {liquidityBalance || '0'}
                </Typography>
                <TextField
                  fullWidth
                  label="LP Tokens to Remove"
                  value={removeAmount}
                  onChange={(e) => setRemoveAmount(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleRemoveLiquidity}
                  disabled={isPending}
                  fullWidth
                >
                  Remove Liquidity
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Status */}
        <Box sx={{ mt: 3 }}>
          {isPending && (
            <Alert severity="info" icon={<CircularProgress size={20} />}>
              Transaction in progress...
            </Alert>
          )}
          {isSuccess && (
            <Alert severity="success">
              Transaction completed successfully!
            </Alert>
          )}
          {error && (
            <Alert severity="warning">
              Transaction failed: {error.message}
            </Alert>
          )}
        </Box>
      </Container>
    </>
  );
};

export default TestPage;
