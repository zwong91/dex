import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ffa500', // Orange/Yellow primary
      light: '#ffb84d',
      dark: '#e6940e',
    },
    secondary: {
      main: '#ffdd44', // Bright yellow accent
      light: '#ffe066',
      dark: '#e6c73d',
    },
    warning: {
      main: '#ff9800', // Orange warning
      light: '#ffb74d',
      dark: '#f57c00',
    },
    background: {
      default: '#fcfcfd',
      paper: '#ffffff',
    },
    text: {
      primary: '#0d111c',
      secondary: '#5d6785',
    },
    divider: 'rgba(93, 103, 133, 0.12)',
    grey: {
      50: '#f8f9fa',
      100: '#f1f3f6',
      200: '#e5e8ec',
      300: '#c1c7d0',
      400: '#98a1b3',
      500: '#5d6785',
      600: '#4c5772',
      700: '#394455',
      800: '#2d3748',
      900: '#1a202c',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
          padding: '12px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #ffa500 30%, #ffb84d 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #e6940e 30%, #ffa500 90%)',
          },
        },
        outlined: {
          borderColor: 'rgba(93, 103, 133, 0.24)',
          '&:hover': {
            borderColor: '#ffa500',
            backgroundColor: 'rgba(255, 165, 0, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(93, 103, 133, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#f8f9fa',
            '& fieldset': {
              borderColor: 'rgba(93, 103, 133, 0.24)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(93, 103, 133, 0.48)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ffa500',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
