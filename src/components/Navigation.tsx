import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Pool as PoolIcon,
  AccountBalanceWallet as PortfolioIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navigationItems = [
    { name: 'Swap', path: '/swap', icon: <SwapIcon /> },
    { name: 'Pools', path: '/pool', icon: <PoolIcon /> },
    { name: 'Portfolio', path: '/portfolio', icon: <PortfolioIcon /> },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }}>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                backgroundColor: location.pathname === item.path ? 'primary.main' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'text.primary',
                '&:hover': {
                  backgroundColor: location.pathname === item.path ? 'primary.dark' : 'grey.100',
                },
              }}
            >
              {item.icon}
              <ListItemText primary={item.name} sx={{ ml: 1 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'rgba(255, 251, 245, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(120, 113, 108, 0.12)',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    mr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Back layer - Purple */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 20,
                      height: 24,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '4px',
                      transform: 'perspective(100px) rotateY(-15deg) rotateX(5deg)',
                      top: 2,
                      right: 2,
                      zIndex: 1,
                    }}
                  />
                  {/* Middle layer - Teal */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 20,
                      height: 24,
                      background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                      borderRadius: '4px',
                      transform: 'perspective(100px) rotateY(0deg) rotateX(5deg)',
                      top: 6,
                      left: '50%',
                      marginLeft: '-10px',
                      zIndex: 2,
                    }}
                  />
                  {/* Front layer - Green */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 20,
                      height: 24,
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '4px',
                      transform: 'perspective(100px) rotateY(15deg) rotateX(5deg)',
                      top: 10,
                      left: 2,
                      zIndex: 3,
                    }}
                  />
                </Box>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #f97316 0%, #f59e0b 50%, #fbbf24 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  EntySquare
                </Typography>
              </Box>

              {!isMobile && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      startIcon={item.icon}
                      onClick={() => navigate(item.path)}
                      variant={location.pathname === item.path ? 'contained' : 'text'}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        color: location.pathname === item.path ? 'white' : 'text.primary',
                      }}
                    >
                      {item.name}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button
                              onClick={openConnectModal}
                              variant="contained"
                              sx={{
                                background: 'linear-gradient(45deg, #f97316 30%, #f59e0b 90%)',
                                color: 'white',
                                fontWeight: 600,
                                px: 3,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.25)',
                                border: 'none',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #059669 30%, #0891b2 90%)',
                                  boxShadow: '0 6px 20px 0 rgba(16, 185, 129, 0.35)',
                                  transform: 'translateY(-1px)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              Connect Wallet
                            </Button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <Button
                              onClick={openChainModal}
                              variant="outlined"
                              color="error"
                              sx={{
                                fontWeight: 600,
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                              }}
                            >
                              Wrong network
                            </Button>
                          );
                        }

                        return (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              onClick={openChainModal}
                              variant="outlined"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: 'divider',
                                color: 'text.primary',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  backgroundColor: 'primary.50',
                                },
                              }}
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 20, height: 20 }}
                                    />
                                  )}
                                </div>
                              )}
                              {chain.name}
                            </Button>

                            <Button
                              onClick={openAccountModal}
                              variant="contained"
                              sx={{
                                background: 'linear-gradient(45deg, #f97316 30%, #f59e0b 90%)',
                                color: 'white',
                                fontWeight: 600,
                                px: 2.5,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                boxShadow: '0 2px 8px 0 rgba(16, 185, 129, 0.2)',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #059669 30%, #0891b2 90%)',
                                  boxShadow: '0 4px 12px 0 rgba(16, 185, 129, 0.3)',
                                },
                              }}
                            >
                              {account.displayName}
                              {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ''}
                            </Button>
                          </Box>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Navigation;
