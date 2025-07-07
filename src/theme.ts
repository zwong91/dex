import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#f97316', // Orange primary (orange-500) - Cloudflare inspired
      light: '#fb923c', // orange-400
      dark: '#ea580c', // orange-600
    },
    secondary: {
      main: '#f59e0b', // Amber secondary (amber-500)
      light: '#fbbf24', // amber-400
      dark: '#d97706', // amber-600
    },
    warning: {
      main: '#ef4444', // Red warning (red-500)
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
    },
    info: {
      main: '#0ea5e9', // Sky blue info (sky-500)
      light: '#38bdf8', // sky-400
      dark: '#0284c7', // sky-600
    },
    success: {
      main: '#22c55e', // Green success (green-500)
      light: '#4ade80', // green-400
      dark: '#16a34a', // green-600
    },
    error: {
      main: '#ef4444', // Red error (red-500)
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
    },
    background: {
      default: '#fffbf5', // Warm white background
      paper: '#ffffff',
    },
    text: {
      primary: '#292524', // Warm dark gray
      secondary: '#78716c', // Warm gray
    },
    divider: 'rgba(120, 113, 108, 0.12)',
    grey: {
      50: '#fafaf9', // Warm white
      100: '#f5f5f4', // Stone-100
      200: '#e7e5e4', // Stone-200
      300: '#d6d3d1', // Stone-300
      400: '#a8a29e', // Stone-400
      500: '#78716c', // Stone-500
      600: '#57534e', // Stone-600
      700: '#44403c', // Stone-700
      800: '#292524', // Stone-800
      900: '#1c1917', // Stone-900
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
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 25px rgba(249, 115, 22, 0.25)',
          },
        },
        outlined: {
          borderColor: 'rgba(249, 115, 22, 0.3)',
          color: '#f97316',
          '&:hover': {
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(120, 113, 108, 0.12)',
          background: 'linear-gradient(145deg, #ffffff 0%, #fffbf5 100%)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#fafaf9',
            '& fieldset': {
              borderColor: 'rgba(120, 113, 108, 0.24)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(249, 115, 22, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#f97316',
              borderWidth: '2px',
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
