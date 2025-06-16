import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapIcon,
  Pool as PoolIcon,
  AccountBalanceWallet as WalletIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import Navigation from '../components/Navigation';

interface TokenHolding {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  value: string;
  change24h: string;
  price: string;
}

interface LiquidityPosition {
  id: string;
  token0: string;
  token1: string;
  icon0: string;
  icon1: string;
  liquidity: string;
  value: string;
  apr: string;
  fees24h: string;
}

const mockTokens: TokenHolding[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: '🔷',
    balance: '2.543',
    value: '$4,706.85',
    change24h: '+2.45%',
    price: '$1,851.20',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: '💵',
    balance: '1,250.00',
    value: '$1,250.00',
    change24h: '+0.01%',
    price: '$1.00',
  },
  {
    symbol: 'DAI',
    name: 'DAI',
    icon: '🟡',
    balance: '850.75',
    value: '$850.32',
    change24h: '-0.05%',
    price: '$0.999',
  },
];

const mockPositions: LiquidityPosition[] = [
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
  },
];

const PortfolioPage = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState('$0.00');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      const tokenValue = mockTokens.reduce((sum, token) => {
        return sum + parseFloat(token.value.replace('$', '').replace(',', ''));
      }, 0);
      const positionValue = mockPositions.reduce((sum, position) => {
        return sum + parseFloat(position.value.replace('$', '').replace(',', ''));
      }, 0);
      setTotalValue(`$${(tokenValue + positionValue).toLocaleString()}`);
    }
  }, [loading]);

  const getChangeColor = (change: string) => {
    return change.startsWith('+') ? 'success.main' : 'warning.main';
  };

  const getChangeIcon = (change: string) => {
    return change.startsWith('+') ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  if (!address) {
    return (
      <>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card elevation={0} sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <WalletIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                Connect your wallet to view your portfolio
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect a wallet to see your tokens, liquidity positions, and transaction history.
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
        {/* Portfolio Overview */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Portfolio
            </Typography>
            <Typography variant="h2" fontWeight={700} color="primary">
              {loading ? <LinearProgress sx={{ width: 200 }} /> : totalValue}
            </Typography>
          </Box>
          <IconButton onClick={() => setLoading(true)}>
            <RefreshIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Token Holdings */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card elevation={0} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Token Holdings
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Asset</TableCell>
                        <TableCell align="right">Balance</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">24h Change</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockTokens.map((token) => (
                        <TableRow key={token.symbol}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {token.icon}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {token.symbol}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {token.name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1">
                              {token.balance}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1">
                              {token.price}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600}>
                              {token.value}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {getChangeIcon(token.change24h)}
                              <Typography variant="body2" color={getChangeColor(token.change24h)}>
                                {token.change24h}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Liquidity Positions */}
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Liquidity Positions
                </Typography>
                {mockPositions.map((position) => (
                  <Card key={position.id} elevation={0} sx={{ mb: 2, backgroundColor: 'grey.50' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              {position.icon0}
                            </Avatar>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', ml: -0.5 }}>
                              {position.icon1}
                            </Avatar>
                          </Box>
                          <Typography variant="body1" fontWeight={600}>
                            {position.token0}/{position.token1}
                          </Typography>
                          <Chip
                            label={`${position.apr} APR`}
                            size="small"
                            color="primary"
                            icon={<TrendingUpIcon />}
                          />
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body1" fontWeight={600}>
                            {position.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Fees: {position.fees24h}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <SwapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Total Trades
                    </Typography>
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      24
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PoolIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      LP Earnings
                    </Typography>
                    <Typography variant="h4" color="secondary" fontWeight={700}>
                      $45.20
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card elevation={0}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Portfolio Change
                    </Typography>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      +12.5%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last 30 days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default PortfolioPage;
