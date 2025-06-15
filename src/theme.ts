import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#10b981', // Green primary (emerald-500)
      light: '#34d399', // emerald-400
      dark: '#059669', // emerald-600
    },
    secondary: {
      main: '#06b6d4', // Cyan secondary (cyan-500)
      light: '#22d3ee', // cyan-400
      dark: '#0891b2', // cyan-600
    },
    warning: {
      main: '#f59e0b', // Amber warning (amber-500)
      light: '#fbbf24', // amber-400
      dark: '#d97706', // amber-600
    },
    info: {
      main: '#8b5cf6', // Purple info (violet-500)
      light: '#a78bfa', // violet-400
      dark: '#7c3aed', // violet-600
    },
    success: {
      main: '#10b981', // Same as primary for consistency
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444', // Red error (red-500)
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
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
          background: 'linear-gradient(45deg, #10b981 30%, #06b6d4 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #059669 30%, #0891b2 90%)',
          },
        },
        outlined: {
          borderColor: 'rgba(93, 103, 133, 0.24)',
          '&:hover': {
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.04)',
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
              borderColor: '#10b981',
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
