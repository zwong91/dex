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
  Dashboard as DashboardIcon,
  Wallet as WalletIcon,
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
    { name: 'Pool', path: '/pool', icon: <PoolIcon /> },
    { name: 'Position', path: '/position', icon: <DashboardIcon /> },
    { name: 'Portfolio', path: '/dashboard', icon: <DashboardIcon /> },
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
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #ffa500 30%, #ffb84d 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mr: 4,
                }}
              >
                UniDEX
              </Typography>

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
              <ConnectButton />
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
