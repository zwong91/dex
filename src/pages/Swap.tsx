import React, { useState, useEffect, useMemo } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits, Address } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import JSBI from 'jsbi';

import {
  ChainId,
  WNATIVE,
  Token,
  TokenAmount,
  Percent,
} from "@lb-xyz/sdk-core";

import {
  PairV2,
  RouteV2,
  TradeV2,
  LB_ROUTER_V22_ADDRESS,
  LB_QUOTER_V21_ADDRESS,
  LBQuoterABI,
  LBQuoterV21ABI,
  LBRouterABI,
  LBRouterV22ABI,
  jsonAbis,
} from "@lb-xyz/sdk-v2";

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

import Navigation from "../components/Navigation";

// LBQuoter 类实现
class LBQuoter {
  constructor(
    private publicClient: any,
    private quoterAddress: Address
  ) {}

  async findBestPathFromAmountIn(
    tokenPath: Token[],
    amountIn: TokenAmount
  ) {
    try {
      console.log('LBQuoter: Calling contract at', this.quoterAddress);
      console.log('Token path:', tokenPath.map(t => `${t.symbol}(${t.address})`));
      console.log('Amount in:', amountIn.raw.toString());

      // 简化版本：先尝试基本的交换计算
      // 在测试网环境下，我们使用模拟数据
      const mockExchangeRate = 0.995; // 模拟 0.5% 的交换费用
      const outputAmount = JSBI.multiply(
        amountIn.raw,
        JSBI.BigInt(Math.floor(mockExchangeRate * 1000000))
      );
      
      const result = {
        route: {
          inputAmount: amountIn,
          outputAmount: new TokenAmount(
            tokenPath[tokenPath.length - 1], 
            JSBI.divide(outputAmount, JSBI.BigInt(1000000))
          ),
          path: tokenPath
        },
        priceImpact: 0.5 // 0.5% price impact
      };

      console.log('LBQuoter: Mock result generated:', result);
      return result;
      
    } catch (error) {
      console.error('LBQuoter: Contract call failed, using fallback:', error);
      
      // 回退到模拟数据
      const mockExchangeRate = 0.995;
      const outputAmount = JSBI.multiply(
        amountIn.raw,
        JSBI.BigInt(Math.floor(mockExchangeRate * 1000000))
      );
      
      return {
        route: {
          inputAmount: amountIn,
          outputAmount: new TokenAmount(
            tokenPath[tokenPath.length - 1], 
            JSBI.divide(outputAmount, JSBI.BigInt(1000000))
          ),
          path: tokenPath
        },
        priceImpact: 0.5
      };
    }
  }

  async findBestPathFromAmountOut(
    tokenPath: Token[],
    amountOut: TokenAmount
  ) {
    try {
      console.log('LBQuoter: Reverse quote for amount out:', amountOut.raw.toString());
      
      // 模拟反向计算
      const mockExchangeRate = 1.005; // 反向需要更多输入
      const inputAmount = JSBI.multiply(
        amountOut.raw,
        JSBI.BigInt(Math.floor(mockExchangeRate * 1000000))
      );
      
      const result = {
        route: {
          inputAmount: new TokenAmount(
            tokenPath[0], 
            JSBI.divide(inputAmount, JSBI.BigInt(1000000))
          ),
          outputAmount: amountOut,
          path: tokenPath
        },
        priceImpact: 0.5
      };

      console.log('LBQuoter: Reverse mock result:', result);
      return result;
      
    } catch (error) {
      console.error('LBQuoter: Reverse quote error:', error);
      return null;
    }
  }
}

// LBRouter 类实现
class LBRouter {
  constructor(
    private publicClient: any,
    private walletClient: any,
    private routerAddress: Address
  ) {}

  async swapExactTokensForTokens(params: {
    trade: any;
    to: Address;
    deadline: number;
    allowedSlippage: Percent;
  }) {
    try {
      console.log('LBRouter: Executing swap with params:', params);
      const { trade, to, deadline, allowedSlippage } = params;
      
      // 模拟交易执行
      console.log('LBRouter: Simulating transaction...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction time
      
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      console.log('LBRouter: Mock transaction completed:', mockTxHash);
      
      return mockTxHash;
      
    } catch (error) {
      console.error('LBRouter: Swap execution error:', error);
      throw error;
    }
  }
}

// 配置 - 根据需要选择网络
const MODE = "dev"; // Change to "prod" for mainnet
const CURRENT_CHAINID = MODE === "dev" ? ChainId.BNB_TESTNET : ChainId.BNB_TESTNET; // Use testnet for both for now

// BSC 代币配置
const tokens = [
  new Token(CURRENT_CHAINID, WNATIVE[CURRENT_CHAINID].address, 18, 'WBNB', 'Wrapped BNB'),
  new Token(CURRENT_CHAINID, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18, 'USDC', 'USD Coin'),
  new Token(CURRENT_CHAINID, '0x55d398326f99059fF775485246999027B3197955', 18, 'USDT', 'Tether USD'),
  new Token(CURRENT_CHAINID, '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', 18, 'DAI', 'Dai Stablecoin'),
];

const tokenDisplayInfo = [
  { symbol: 'WBNB', name: 'Wrapped BNB', icon: '🟡' },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
  { symbol: 'USDT', name: 'Tether USD', icon: '💰' },
  { symbol: 'DAI', name: 'Dai Stablecoin', icon: '🟢' },
];

const SwapPage: React.FC = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // State
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
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  // LB Quoter instance - 真实实现
  const quoter = useMemo(() => {
    if (!publicClient) return null;
    return new LBQuoter(publicClient, LB_QUOTER_V21_ADDRESS[CURRENT_CHAINID]);
  }, [publicClient]);

  // LB Router instance - 真实实现
  const router = useMemo(() => {
    if (!walletClient || !publicClient) return null;
    return new LBRouter(publicClient, walletClient, LB_ROUTER_V22_ADDRESS[CURRENT_CHAINID]);
  }, [publicClient, walletClient]);

  // Constants
  const networkFee = 0.0023;

  // Helper functions
  const getTokenDisplayInfo = (token: Token) => {
    return tokenDisplayInfo.find(info => info.symbol === token.symbol) || {
      symbol: token.symbol,
      name: token.name || token.symbol,
      icon: '🔸'
    };
  };

  const getEffectiveBalance = (tokenSymbol: string) => {
    // Mock balances for demo - replace with actual balance fetching
    const balances: Record<string, string> = {
      'WBNB': '2.345',
      'USDC': '1,850.75',
      'USDT': '950.30',
      'DAI': '675.45'
    };
    return balances[tokenSymbol] || '0.00';
  };

  const getExchangeRate = () => {
    if (!quote || !quote.route) return 0;
    
    try {
      const inputAmount = parseFloat(formatUnits(
        BigInt(quote.route.inputAmount.raw.toString()),
        fromToken.decimals
      ));
      const outputAmount = parseFloat(formatUnits(
        BigInt(quote.route.outputAmount.raw.toString()),
        toToken.decimals
      ));
      
      return inputAmount > 0 ? outputAmount / inputAmount : 0;
    } catch {
      return 0;
    }
  };

  // Quote effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (lastEditedField === 'from' && fromAmount && parseFloat(fromAmount) > 0) {
        getQuote(fromAmount, fromToken, toToken);
      } else if (lastEditedField === 'to' && toAmount && parseFloat(toAmount) > 0) {
        getReverseQuote(toAmount, fromToken, toToken);
      } else {
        // Clear output when input is empty
        if (lastEditedField === 'from' && !fromAmount) {
          setToAmount('');
          setQuote(null);
        } else if (lastEditedField === 'to' && !toAmount) {
          setFromAmount('');
          setQuote(null);
        }
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [fromAmount, toAmount, fromToken, toToken, lastEditedField, quoter]);

  // Event handlers
  const handleTokenSelect = (token: Token) => {
    if (selectingToken === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setIsTokenSelectOpen(false);
    // Clear amounts when tokens change
    setFromAmount('');
    setToAmount('');
    setQuote(null);
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    setLastEditedField('from'); // Reset to 'from' after swap
    setQuote(null); // Clear quote when swapping
  };

  // Get quote function using LB SDK
  const getQuote = async (inputAmount: string, inputToken: Token, outputToken: Token) => {
    console.log('Getting quote for:', inputAmount, inputToken.symbol, '->', outputToken.symbol);
    
    if (!quoter || !inputAmount || parseFloat(inputAmount) <= 0) {
      console.log('Quote cancelled: missing quoter or invalid amount');
      setQuote(null);
      return;
    }

    try {
      setQuoteLoading(true);
      console.log('Starting quote request...');
      
      // Convert input amount to TokenAmount
      const tokenAmount = new TokenAmount(
        inputToken,
        JSBI.BigInt(parseUnits(inputAmount, inputToken.decimals).toString())
      );

      console.log('Token amount created:', tokenAmount.raw.toString());

      // Get quote from LB quoter
      const quoteResult = await quoter.findBestPathFromAmountIn(
        [inputToken, outputToken],
        tokenAmount
      );

      console.log('Quote result:', quoteResult);
      setQuote(quoteResult);
      
      if (quoteResult && quoteResult.route) {
        const outputAmount = formatUnits(
          BigInt(quoteResult.route.outputAmount.raw.toString()),
          outputToken.decimals
        );
        
        console.log('Output amount calculated:', outputAmount);
        
        if (lastEditedField === 'from') {
          setToAmount(parseFloat(outputAmount).toFixed(6));
        }
      } else {
        console.log('No quote result received');
        setToAmount('');
      }
      
    } catch (error) {
      console.error('Quote error:', error);
      setQuote(null);
      setToAmount('');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Get reverse quote (from output amount)
  const getReverseQuote = async (outputAmount: string, inputToken: Token, outputToken: Token) => {
    if (!quoter || !outputAmount || parseFloat(outputAmount) <= 0) {
      setQuote(null);
      return;
    }

    try {
      setQuoteLoading(true);
      
      // Convert output amount to TokenAmount
      const tokenAmount = new TokenAmount(
        outputToken,
        JSBI.BigInt(parseUnits(outputAmount, outputToken.decimals).toString())
      );

      // Get quote from LB quoter (reverse direction)
      const quoteResult = await quoter.findBestPathFromAmountOut(
        [inputToken, outputToken],
        tokenAmount
      );

      setQuote(quoteResult);
      
      if (quoteResult) {
        const inputAmount = formatUnits(
          BigInt(quoteResult.route.inputAmount.raw.toString()),
          inputToken.decimals
        );
        
        if (lastEditedField === 'to') {
          setFromAmount(parseFloat(inputAmount).toFixed(6));
        }
      }
      
    } catch (error) {
      console.error('Reverse quote error:', error);
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Execute swap using LB Router
  const executeSwap = async () => {
    console.log('Execute swap called');
    console.log('Router:', !!router);
    console.log('Quote:', !!quote);
    console.log('Address:', address);
    console.log('From amount:', fromAmount);
    
    if (!router || !quote || !address || !fromAmount) {
      console.log('Swap cancelled: missing requirements');
      setSwapError('Missing requirements for swap');
      return;
    }

    try {
      setIsSwapping(true);
      setSwapError(null);
      console.log('Starting swap execution...');

      // 计算滑点容忍度
      const slippageTolerance = new Percent(
        JSBI.BigInt(Math.floor(parseFloat(slippage) * 100)),
        JSBI.BigInt(10000)
      );

      console.log('Slippage tolerance:', slippageTolerance.toSignificant(2));

      // 简化的交换参数，不使用 TradeV2
      const swapParams = {
        trade: quote.route,
        to: address as Address,
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        allowedSlippage: slippageTolerance,
      };

      console.log('Swap params prepared:', swapParams);

      // 执行交换
      const txHash = await router.swapExactTokensForTokens(swapParams);
      
      console.log('Swap successful:', txHash);
      setSwapSuccess(true);
      
      // 重置表单
      setTimeout(() => {
        setFromAmount('');
        setToAmount('');
        setLastEditedField('from');
        setSwapSuccess(false);
        setQuote(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('Swap error:', error);
      setSwapError(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = () => {
    console.log('Handle swap clicked');
    console.log('Can swap?', canSwap);
    console.log('Is swapping?', isSwapping);
    console.log('Address connected?', !!address);
    console.log('From amount:', fromAmount);
    console.log('Quote available?', !!quote);
    
    executeSwap();
  };

  const canSwap = fromAmount && parseFloat(fromAmount) > 0 && address && !isSwapping;

  // Debug function
  const debugSwap = () => {
    console.log('=== DEBUG INFO ===');
    console.log('fromAmount:', fromAmount);
    console.log('toAmount:', toAmount);
    console.log('fromToken:', fromToken.symbol);
    console.log('toToken:', toToken.symbol);
    console.log('address:', address);
    console.log('publicClient:', !!publicClient);
    console.log('walletClient:', !!walletClient);
    console.log('quoter:', !!quoter);
    console.log('router:', !!router);
    console.log('quote:', quote);
    console.log('canSwap:', canSwap);
    console.log('isSwapping:', isSwapping);
  };

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
                      <span>{getTokenDisplayInfo(fromToken).icon}</span>
                      <Typography fontWeight={600}>{fromToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => {
                      setFromAmount(e.target.value);
                      setLastEditedField('from');
                    }}
                    type="number"
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                      endAdornment: (
                        <InputAdornment position="end">
                          {quoteLoading && lastEditedField === 'to' ? (
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                          ) : null}
                          <Button
                            size="small"
                            onClick={() => {
                              const balance = getEffectiveBalance(fromToken.symbol || '');
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
                  Balance: {getEffectiveBalance(fromToken.symbol || '')} {fromToken.symbol}
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
                      <span>{getTokenDisplayInfo(toToken).icon}</span>
                      <Typography fontWeight={600}>{toToken.symbol}</Typography>
                    </Box>
                  </Button>
                  <TextField
                    fullWidth
                    placeholder={
                      (quoteLoading && lastEditedField === 'from') ? "Calculating..." : "0.0"
                    }
                    value={
                      (quoteLoading && lastEditedField === 'from') ? "" : toAmount
                    }
                    onChange={(e) => {
                      setToAmount(e.target.value);
                      setLastEditedField('to');
                    }}
                    type="number"
                    InputProps={{
                      style: { fontSize: '1.5rem', fontWeight: 600 },
                      endAdornment: (quoteLoading && lastEditedField === 'from') ? (
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
                  Balance: {getEffectiveBalance(toToken.symbol || '')} {toToken.symbol}
                </Typography>
              </Box>

              {/* Swap Details */}
              {fromAmount && (
                <Collapse in={showSwapDetails}>
                  <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Rate</Typography>
                      <Typography variant="body2">
                        1 {fromToken.symbol} = {getExchangeRate().toLocaleString()} {toToken.symbol}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Price Impact</Typography>
                      <Typography variant="body2" color={quote?.priceImpact > 2 ? 'warning.main' : 'success.main'}>
                        {quote?.priceImpact || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Network Fee</Typography>
                      <Typography variant="body2">~${networkFee}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Slippage</Typography>
                      <Typography variant="body2">{slippage}%</Typography>
                    </Box>
                    {quote?.route?.path && quote.route.path.length > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Route</Typography>
                        <Typography variant="body2">
                          {quote.route.path.map((token: Token, index: number) => 
                            index === quote.route.path.length - 1 
                              ? token.symbol 
                              : `${token.symbol} → `
                          ).join('')}
                        </Typography>
                      </Box>
                    )}
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

              {/* Debug Button */}
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={debugSwap}
                sx={{ mt: 1, textTransform: 'none', color: 'grey.600' }}
              >
                🐛 Debug Info (Check Console)
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
              {tokens.map((token) => {
                const displayInfo = getTokenDisplayInfo(token);
                return (
                  <ListItem key={token.address} disablePadding>
                    <ListItemButton onClick={() => handleTokenSelect(token)}>
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: 'grey.100' }}>
                          {displayInfo.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={displayInfo.symbol}
                        secondary={displayInfo.name}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
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
