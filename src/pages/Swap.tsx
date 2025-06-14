import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  InputAdornment,
  Collapse,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  SwapVert as SwapIcon,
  Settings as SettingsIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  useTokenABalance,
  useTokenBBalance,
  useTokenAPrice,
  useDexOperations,
} from "../utils/dexUtils";
import Navigation from "../components/Navigation";
import { toast } from 'sonner';

const tokens = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x...', icon: '🔷' },
  { symbol: 'USDC', name: 'USD Coin', address: '0x...', icon: '💵' },
  { symbol: 'USDT', name: 'Tether', address: '0x...', icon: '💰' },
  { symbol: 'DAI', name: 'DAI', address: '0x...', icon: '🟡' },
];

const SwapPage = () => {
  const { address } = useAccount();
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingToken, setSelectingToken] = useState<'from' | 'to'>('from');
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  const [showSwapDetails, setShowSwapDetails] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Web3 hooks
  const tokenABalance = useTokenABalance(address);
  const tokenBBalance = useTokenBBalance(address);
  const tokenAPrice = useTokenAPrice();
  const { swapTokenAForB, swapTokenBForA } = useDexOperations();

  const exchangeRate = tokenAPrice || 1850.5;
  const priceImpact = 0.05;
  const networkFee = 0.0023;

  // Get effective balance for UI display
  const getEffectiveBalance = (tokenSymbol: string) => {
    const realBalance = tokenSymbol === 'ETH' ? tokenABalance : tokenBBalance;
    const realBalanceNum = parseFloat(realBalance || '0');
    // Use real balance if available, otherwise default test balance for development
    return realBalanceNum > 0.001 ? realBalance : '100.0';
  };

  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const output = parseFloat(fromAmount) * exchangeRate;
      setToAmount(output.toFixed(6));
    } else {
      setToAmount('');
    }
  }, [fromAmount, exchangeRate]);

  const handleTokenSelect = (token: typeof tokens[0]) => {
    if (selectingToken === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setIsTokenSelectOpen(false);
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleSwap = async () => {
    if (!fromAmount || !address) {
      toast.error('Please connect wallet and enter amount');
      return;
    }
    
    setIsSwapping(true);
    setSwapError(null);
    setSwapSuccess(false);
    
    try {
      const amount = parseFloat(fromAmount);
      if (amount <= 0) {
        toast.error('Please enter a valid amount');
        setIsSwapping(false);
        return;
      }

      // Check if user has sufficient balance
      const effectiveBalance = getEffectiveBalance(fromToken.symbol);
      if (parseFloat(effectiveBalance) < amount) {
        toast.error('Insufficient balance');
        setIsSwapping(false);
        return;
      }

      console.log('Starting swap:', { fromToken: fromToken.symbol, toToken: toToken.symbol, amount });

      let result;
      if (fromToken.symbol === 'ETH') {
        result = await swapTokenAForB(amount);
      } else {
        result = await swapTokenBForA(amount);
      }
      
      console.log('Swap result:', result);
      setSwapSuccess(true);
      toast.success('Swap initiated successfully!');
      
      // Reset form after successful swap
      setTimeout(() => {
        setFromAmount('');
        setToAmount('');
        setSwapSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Swap error:', err);
      const errorMessage = err.message || err.toString() || 'Unknown error';
      setSwapError(errorMessage);
      toast.error('Swap failed: ' + errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  const canSwap = fromAmount && parseFloat(fromAmount) > 0 && address && !isSwapping;

  return (
    <>
      <Navigation />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" fontWeight={600}>
              Swap
            </Typography>
            <IconButton onClick={() => setShowSettings(true)}>
              <SettingsIcon />
            </IconButton>
          </Box>

          <Card elevation={0} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              {/* From Token */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  From
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectingToken('from');
                      setIsTokenSelectOpen(true);
                    }}
                    sx={{
                      minWidth: 120,
                      justifyContent: 'space-between',
                      textTransform: 'none',
                      py: 1.5,
                    }}
                    endIcon={<ArrowDownIcon />}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{fromToken.icon}</span>
                      <Typography fontWeight={600}>{fromToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    type="number"
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={() => {
                              const balance = getEffectiveBalance(fromToken.symbol);
                              setFromAmount(balance);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Max
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { border: 'none' },
                        backgroundColor: 'grey.50',
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Balance: {getEffectiveBalance(fromToken.symbol)} {fromToken.symbol}
                </Typography>
              </Box>

              {/* Swap Icon */}
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <IconButton
                  onClick={handleSwapTokens}
                  sx={{
                    backgroundColor: 'background.paper',
                    border: '4px solid',
                    borderColor: 'background.default',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                    },
                  }}
                >
                  <SwapIcon />
                </IconButton>
              </Box>

              {/* To Token */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  To
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectingToken('to');
                      setIsTokenSelectOpen(true);
                    }}
                    sx={{
                      minWidth: 120,
                      justifyContent: 'space-between',
                      textTransform: 'none',
                      py: 1.5,
                    }}
                    endIcon={<ArrowDownIcon />}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{toToken.icon}</span>
                      <Typography fontWeight={600}>{toToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={toAmount}
                    disabled
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { border: 'none' },
                        backgroundColor: 'grey.50',
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Balance: {getEffectiveBalance(toToken.symbol)} {toToken.symbol}
                </Typography>
              </Box>

              {/* Swap Details */}
              {fromAmount && (
                <Collapse in={showSwapDetails}>
                  <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Rate</Typography>
                      <Typography variant="body2">
                        1 {fromToken.symbol} = {exchangeRate.toLocaleString()} {toToken.symbol}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Price Impact</Typography>
                      <Typography variant="body2" color={priceImpact > 2 ? 'warning.main' : 'success.main'}>
                        {priceImpact}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Network Fee</Typography>
                      <Typography variant="body2">~${networkFee}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Slippage</Typography>
                      <Typography variant="body2">{slippage}%</Typography>
                    </Box>
                  </Box>
                </Collapse>
              )}

              {/* Action Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!canSwap}
                onClick={handleSwap}
                sx={{ mt: 3, py: 2, fontSize: '1.1rem', fontWeight: 600 }}
                startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {!address ? 'Connect Wallet' : 
                 isSwapping ? 'Swapping...' : 
                 !fromAmount || parseFloat(fromAmount) <= 0 ? 'Enter an amount' : 
                 `Swap ${fromToken.symbol} for ${toToken.symbol}`}
              </Button>

              {fromAmount && (
                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={() => setShowSwapDetails(!showSwapDetails)}
                  sx={{ mt: 1, textTransform: 'none' }}
                  endIcon={<InfoIcon />}
                >
                  {showSwapDetails ? 'Hide' : 'Show'} Details
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Success/Error Messages */}
          {swapSuccess && (
            <Alert severity="success" icon={<CheckIcon />}>
              Swap completed successfully!
            </Alert>
          )}
          {swapError && (
            <Alert severity="warning">
              Swap failed: {swapError}
            </Alert>
          )}
        </Box>

        {/* Token Selection Dialog */}
        <Dialog
          open={isTokenSelectOpen}
          onClose={() => setIsTokenSelectOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Select a token
              <IconButton onClick={() => setIsTokenSelectOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <List>
              {tokens.map((token) => (
                <ListItem key={token.symbol} disablePadding>
                  <ListItemButton onClick={() => handleTokenSelect(token)}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'grey.100' }}>
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

        {/* Settings Dialog */}
        <Dialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Settings
              <IconButton onClick={() => setShowSettings(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" gutterBottom>
              Slippage tolerance
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {['0.1', '0.5', '1.0'].map((value) => (
                <Chip
                  key={value}
                  label={`${value}%`}
                  variant={slippage === value ? 'filled' : 'outlined'}
                  onClick={() => setSlippage(value)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              label="Custom slippage (%)"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              type="number"
              size="small"
            />
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
};

export default SwapPage;
