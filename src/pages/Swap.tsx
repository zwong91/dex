import {
  KeyboardArrowDown as ArrowDownIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  SwapVert as SwapIcon,
  AccountBalanceWallet as WalletIcon,
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
  Collapse,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import * as ethers from "ethers";
import {
  useReverseSwapQuote,
  useSwapQuote,
  useSwapWithSDK,
  useTokenBalanceByAddress,
  useTokenApproval
} from '../dex';
import { LB_ROUTER_V22_ADDRESS } from "@lb-xyz/sdk-v2";
import { wagmiChainIdToSDKChainId } from '../dex/lbSdkConfig';

import Navigation from "../components/Navigation";
import { getTokensForChain } from "../dex/networkTokens";
import { addTokenToWallet, BSC_TESTNET_TOKENS } from "../dex/walletUtils";

const SwapPage = () => {
  const { address: userWalletAddress } = useAccount();
  const chainId = useChainId();  // Get tokens for current chain
  const tokens = getTokensForChain(chainId);

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingToken, setSelectingToken] = useState<'from' | 'to'>('from');
  const [slippage, setSlippage] = useState("0.5");
  const [lastEditedField, setLastEditedField] = useState<'from' | 'to'>('from');
  const [showSettings, setShowSettings] = useState(false);
  const [showSwapDetails, setShowSwapDetails] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  // Web3 hooks
  const fromTokenBalance = useTokenBalanceByAddress(userWalletAddress, fromToken.address as `0x${string}`);
  const toTokenBalance = useTokenBalanceByAddress(userWalletAddress, toToken.address as `0x${string}`);
  const { swapWithSDK } = useSwapWithSDK();
  const { approveToken } = useTokenApproval();

  // Get swap quote for dynamic pricing
  const swapQuote = useSwapQuote(
    lastEditedField === 'from' ? (parseFloat(fromAmount) || 0).toString() : "0",
    fromToken.address,
    toToken.address
  );

  // Get reverse swap quote when user edits output amount
  const reverseSwapQuote = useReverseSwapQuote(
    lastEditedField === 'to' ? parseFloat(toAmount) || 0 : 0,
    fromToken.address as `0x${string}`,
    toToken.address as `0x${string}`
  );

  // Calculate display rate from swap quote or fallback to token prices
  const getDisplayRate = () => {
    // If we have swap quote data, use it for accurate rate
    if (swapQuote.amountOut && fromAmount && parseFloat(fromAmount) > 0) {
      const amountOutNum = parseFloat(swapQuote.amountOut);
      const fromAmountNum = parseFloat(fromAmount);
      const rate = amountOutNum / fromAmountNum;
      
      // Debug log for rate calculation
      console.log('Rate calculation:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromAmount: fromAmount,
        amountOut: swapQuote.amountOut,
        fromAmountNum,
        amountOutNum,
        calculatedRate: rate,
        chainId: chainId,
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        swapQuoteLoading: swapQuote.loading,
        swapQuoteError: swapQuote.error
      });
      
      // Sanity check: if rate is extremely small (< 0.01), something is wrong
      if (rate < 0.01 && (fromToken.symbol.includes('BNB') || toToken.symbol.includes('BNB'))) {
        console.warn('⚠️ Suspicious rate detected, using fallback instead:', {
          rate,
          expected: 'BNB should be worth hundreds of USDT, not fractions'
        });
        // Fall through to fallback calculation
      } else {
        return rate;
      }
    }
    
    // Fallback: calculate from token USD prices
    // Note: On testnet, USDT/USDC are test tokens with 18 decimals, not real stablecoins
    const isTestnet = chainId === 97;
    
    let fromTokenPrice = 1.0;
    let toTokenPrice = 1.0;
    
    if (fromToken.symbol === 'WBNB' || fromToken.symbol === 'BNB') {
      fromTokenPrice = isTestnet ? 600.0 : 766.92; // Lower testnet price
    } else if (fromToken.symbol === 'USDT' || fromToken.symbol === 'USDC') {
      fromTokenPrice = isTestnet ? 600.0 : 1.0; // Test tokens worth ~600 like BNB
    }
    
    if (toToken.symbol === 'WBNB' || toToken.symbol === 'BNB') {
      toTokenPrice = isTestnet ? 600.0 : 766.92;
    } else if (toToken.symbol === 'USDT' || toToken.symbol === 'USDC') {
      toTokenPrice = isTestnet ? 600.0 : 1.0; // Test tokens worth ~600 like BNB
    }
    
    if (fromTokenPrice > 0 && toTokenPrice > 0) {
      const fallbackRate = fromTokenPrice / toTokenPrice;
      console.log('Using fallback rate:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromTokenPrice,
        toTokenPrice,
        fallbackRate,
        isTestnet,
        note: isTestnet ? 'Using testnet prices - USDT/USDC are test tokens worth ~600 like BNB' : 'Using mainnet prices'
      });
      return fallbackRate;
    }
    
    return 1.0; // Ultimate fallback
  };

  const displayRate = getDisplayRate();
  const exchangeRate = 1.0; // Keep for backward compatibility in calculations
  const networkFee = 0.0023;

  // Get effective balance for UI display
  const getEffectiveBalance = (tokenSymbol: string) => {
    const isFromToken = tokenSymbol === fromToken.symbol;
    const tokenBalance = isFromToken ? fromTokenBalance : toTokenBalance;
    const realBalanceNum = tokenBalance ? parseFloat(ethers.formatUnits(tokenBalance, 18)) : 0;
    // Use real balance if available, otherwise default test balance for development
    return realBalanceNum > 0.001 ? ethers.formatUnits(tokenBalance || BigInt(0), 18) : '0.0';
  };

  // Get LB Router address for approvals
  const CHAIN_ID = wagmiChainIdToSDKChainId(chainId);
  const lbRouterAddress = LB_ROUTER_V22_ADDRESS[CHAIN_ID];

  // Check token allowance
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: fromToken.address as `0x${string}`,
    functionName: "allowance",
    args: userWalletAddress && lbRouterAddress ? [userWalletAddress, lbRouterAddress as `0x${string}`] : undefined,
    account: userWalletAddress,
    chainId: chainId,
  });

  useEffect(() => {
    if (tokenAllowance !== undefined && fromAmount) {
      try {
        const allowanceAmount = parseFloat(ethers.formatUnits(tokenAllowance, 18));
        const requiredAmount = parseFloat(fromAmount);
        setNeedsApproval(allowanceAmount < requiredAmount);
      } catch (error) {
        console.error('Error checking allowance:', error);
        setNeedsApproval(true);
      }
    } else {
      setNeedsApproval(false);
    }
  }, [tokenAllowance, fromAmount]);

  // Update tokens when chain changes
  useEffect(() => {
    const newTokens = getTokensForChain(chainId);
    setFromToken(newTokens[0]);
    setToToken(newTokens[1]);
    setFromAmount('');
    setToAmount('');
  }, [chainId]);

  const handleApprove = async () => {
    if (!fromToken.address || !userWalletAddress || !fromAmount) {
      return;
    }

    setIsApproving(true);

    try {
      // Approve a large amount to avoid frequent approvals
      const approvalAmount = "1000000"; // 1M tokens should be enough
      const result = await approveToken(
        fromToken.address as `0x${string}`, 
        lbRouterAddress as `0x${string}`, 
        approvalAmount
      );
      console.log('Token approval result:', result);
      
      // Wait a bit and refetch allowance
      setTimeout(() => {
        refetchAllowance();
      }, 2000);
    } catch (err: any) {
      console.error('Token approval error:', err);
      setSwapError(`Approval failed: ${err.message || err.toString()}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwap = async () => {
    if (!fromAmount || !userWalletAddress) {
      return;
    }

    setIsSwapping(true);
    setSwapError(null);
    setSwapSuccess(false);

    try {
      const amount = parseFloat(fromAmount);
      if (amount <= 0) {
        setIsSwapping(false);
        return;
      }

      // Check if user has sufficient balance
      const effectiveBalance = getEffectiveBalance(fromToken.symbol);
      if (parseFloat(effectiveBalance) < amount) {
        setIsSwapping(false);
        return;
      }

      console.log('Starting LB SDK swap:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        fromTokenContract: fromToken.address,
        toTokenContract: toToken.address
      });

      // Use LB SDK swap for better pricing and routing
      const result = await swapWithSDK(
        fromToken.address,
        toToken.address,
        fromAmount,
        userWalletAddress,
        slippage
      );

      console.log('LB SDK Swap result:', result);
      setSwapSuccess(true);

      // Reset form after successful swap
      setTimeout(() => {
        setFromAmount('');
        setToAmount('');
        setLastEditedField('from');
        setSwapSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error('LB SDK Swap error:', err);
      const errorMessage = err.message || err.toString() || 'Unknown error';
      setSwapError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

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
    setLastEditedField('from'); // Reset to 'from' after swap
  };

  useEffect(() => {
    // Avoid circular updates by checking if the calculation is needed
    if (lastEditedField === 'from' && fromAmount) {
      if (!isNaN(parseFloat(fromAmount))) {
        // Use quote data if available, otherwise fallback to exchange rate
        if (swapQuote.amountOut && !swapQuote.loading) {
          const quotedAmount = swapQuote.amountOut;
          if (quotedAmount !== toAmount) {
            setToAmount(quotedAmount);
          }
        } else if (!swapQuote.loading) {
          const output = parseFloat(fromAmount) * exchangeRate;
          const calculatedAmount = output.toFixed(6);
          if (calculatedAmount !== toAmount) {
            setToAmount(calculatedAmount);
          }
        }
      } else if (fromAmount === '') {
        if (toAmount !== '') {
          setToAmount('');
        }
      }
    } else if (lastEditedField === 'to' && toAmount) {
      if (!isNaN(parseFloat(toAmount))) {
        // Use reverse quote data if available, otherwise fallback to reverse exchange rate
        if (reverseSwapQuote.amountIn && !reverseSwapQuote.loading) {
          const quotedAmount = reverseSwapQuote.amountIn;
          if (quotedAmount !== fromAmount) {
            setFromAmount(quotedAmount);
          }
        } else if (!reverseSwapQuote.loading) {
          const reverseRate = 1 / exchangeRate;
          const input = parseFloat(toAmount) * reverseRate;
          const calculatedAmount = input.toFixed(6);
          if (calculatedAmount !== fromAmount) {
            setFromAmount(calculatedAmount);
          }
        }
      } else if (toAmount === '') {
        if (fromAmount !== '') {
          setFromAmount('');
        }
      }
    }
  }, [fromAmount, toAmount, exchangeRate, swapQuote.amountOut, swapQuote.loading, reverseSwapQuote.amountIn, reverseSwapQuote.loading, lastEditedField]);

  const canSwap = fromAmount && parseFloat(fromAmount) > 0 && userWalletAddress && !isSwapping;

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
                      <img
                        src={fromToken.icon}
                        alt={fromToken.symbol}
                        style={{ width: 20, height: 20, borderRadius: '50%' }}
                      />
                      <Typography fontWeight={600}>{fromToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) {
                        setFromAmount(val);
                        setLastEditedField('from');
                      }
                    }}
                    type="number"
                    inputProps={{ min: 0 }}
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                      endAdornment: (
                        <InputAdornment position="end">
                          {reverseSwapQuote.loading && lastEditedField === 'to' ? (
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                          ) : null}
                          <Button
                            size="small"
                            onClick={() => {
                              const balance = getEffectiveBalance(fromToken.symbol);
                              setFromAmount(balance);
                              setLastEditedField('from');
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
                      <img
                        src={toToken.icon}
                        alt={toToken.symbol}
                        style={{ width: 20, height: 20, borderRadius: '50%' }}
                      />
                      <Typography fontWeight={600}>{toToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder={
                      (swapQuote.loading && lastEditedField === 'from') ? "Calculating..." : "0.0"
                    }
                    value={
                      (swapQuote.loading && lastEditedField === 'from') ? "" : toAmount
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) {
                        setToAmount(val);
                        setLastEditedField('to');
                      }
                    }}
                    type="number"
                    inputProps={{ min: 0 }}
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                      endAdornment: (swapQuote.loading && lastEditedField === 'from') ? (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ) : null,
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
                        1 {fromToken.symbol} = {displayRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.symbol}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Price Impact</Typography>
                      <Typography variant="body2" color={parseFloat(swapQuote.priceImpact) > 2 ? 'warning.main' : 'success.main'}>
                        {swapQuote.priceImpact}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Gas Fee</Typography>
                      <Typography variant="body2">~${networkFee}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Trade Fee</Typography>
                      <Typography variant="body2">
                        {swapQuote.tradeFee.feeAmountIn} {fromToken.symbol} ({swapQuote.tradeFee.totalFeePct}%)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Slippage</Typography>
                      <Typography variant="body2">{slippage}%</Typography>
                    </Box>
                    {swapQuote.path.length > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Route</Typography>
                        <Typography variant="body2">
                          {swapQuote.path.map((token, index) =>
                            index === swapQuote.path.length - 1
                              ? tokens.find(t => t.address === token)?.symbol || 'Unknown'
                              : `${tokens.find(t => t.address === token)?.symbol || 'Unknown'} → `
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              )}

              {/* Action Button */}
              {needsApproval && userWalletAddress && fromAmount && parseFloat(fromAmount) > 0 ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isApproving}
                  onClick={handleApprove}
                  sx={{ mt: 3, py: 2, fontSize: '1.1rem', fontWeight: 600 }}
                  startIcon={isApproving ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isApproving ? 'Approving...' : `Approve ${fromToken.symbol}`}
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!canSwap}
                  onClick={handleSwap}
                  sx={{ mt: 3, py: 2, fontSize: '1.1rem', fontWeight: 600 }}
                  startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {!userWalletAddress ? 'Connect Wallet' :
                   isSwapping ? 'Swapping...' :
                   !fromAmount || parseFloat(fromAmount) <= 0 ? 'Enter an amount' :
                   `Swap ${fromToken.symbol} for ${toToken.symbol}`}
                </Button>
              )}

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
          {swapQuote.error && (
            <Alert severity="info">
              {swapQuote.error}
            </Alert>
          )}
          {reverseSwapQuote.error && (
            <Alert severity="info">
              {reverseSwapQuote.error}
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
            {/* Quick Add Tokens Header */}
            {chainId === 97 && (
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Don't see your token? Quick add to wallet:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(BSC_TESTNET_TOKENS).map(([key, token]) => (
                    <Chip
                      key={key}
                      label={`+ ${token.symbol}`}
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        const success = await addTokenToWallet(token);
                        if (success) {
                          console.log(`${token.symbol} added to wallet`);
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <List>
              {tokens.map((token) => (
                <ListItem key={token.symbol} disablePadding>
                  <ListItemButton onClick={() => handleTokenSelect(token)}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'grey.100' }}>
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          style={{ width: 24, height: 24, borderRadius: '50%' }}
                        />
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
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || parseFloat(val) >= 0) {
                  setSlippage(val);
                }
              }}
              type="number"
              size="small"
              inputProps={{ min: 0 }}
              sx={{ mb: 3 }}
            />

            {/* Quick Add Tokens Section */}
            {chainId === 97 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Quick add tokens to wallet
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(BSC_TESTNET_TOKENS).map(([key, token]) => (
                    <Button
                      key={key}
                      variant="outlined"
                      size="small"
                      startIcon={<WalletIcon />}
                      onClick={async () => {
                        const success = await addTokenToWallet(token);
                        if (success) {
                          console.log(`${token.symbol} added to wallet`);
                        }
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Add {token.symbol}
                    </Button>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Click button to add tokens to your MetaMask wallet
                </Typography>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
};

export default SwapPage;
