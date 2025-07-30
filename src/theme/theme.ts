import { createTheme } from '@mui/material/styles'
import { Shadows } from '@mui/material/styles/shadows'

// 建築的で洗練されたカラーパレット
const colors = {
  // プライマリー: 深いティール（建築の鉄骨を想起）
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  // セカンダリー: ウォームグレー（コンクリートを想起）
  secondary: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
  // アクセント: 建築的なゴールド
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // グレースケール: より洗練されたトーン
  grey: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  }
}

// カスタムシャドウ（建築的な深み）
const shadows: Shadows = [
  'none',
  '0px 1px 2px rgba(0, 0, 0, 0.05)',
  '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
  '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '0px 32px 64px -12px rgba(0, 0, 0, 0.4)',
  '0px 0px 0px 1px rgba(255, 255, 255, 0.05), 0px 1px 1px rgba(0, 0, 0, 0.075), 0px 0px 0px 1px rgba(0, 0, 0, 0.05)',
  '0px 3px 5px rgba(0, 0, 0, 0.2)',
  '0px 4px 5px rgba(0, 0, 0, 0.14), 0px 1px 10px rgba(0, 0, 0, 0.12), 0px 2px 4px rgba(0, 0, 0, 0.2)',
  '0px 5px 5px rgba(0, 0, 0, 0.14), 0px 3px 14px rgba(0, 0, 0, 0.12), 0px 8px 10px rgba(0, 0, 0, 0.2)',
  '0px 7px 8px rgba(0, 0, 0, 0.14), 0px 5px 22px rgba(0, 0, 0, 0.12), 0px 12px 17px rgba(0, 0, 0, 0.2)',
  '0px 8px 10px rgba(0, 0, 0, 0.14), 0px 6px 30px rgba(0, 0, 0, 0.12), 0px 16px 24px rgba(0, 0, 0, 0.2)',
  '0px 8px 12px rgba(0, 0, 0, 0.14), 0px 7px 40px rgba(0, 0, 0, 0.12), 0px 20px 32px rgba(0, 0, 0, 0.2)',
  '0px 9px 15px rgba(0, 0, 0, 0.14), 0px 8px 50px rgba(0, 0, 0, 0.12), 0px 24px 40px rgba(0, 0, 0, 0.2)',
  '0px 10px 18px rgba(0, 0, 0, 0.14), 0px 9px 60px rgba(0, 0, 0, 0.12), 0px 28px 48px rgba(0, 0, 0, 0.2)',
  '0px 11px 21px rgba(0, 0, 0, 0.14), 0px 10px 70px rgba(0, 0, 0, 0.12), 0px 32px 56px rgba(0, 0, 0, 0.2)',
  '0px 12px 24px rgba(0, 0, 0, 0.14), 0px 11px 80px rgba(0, 0, 0, 0.12), 0px 36px 64px rgba(0, 0, 0, 0.2)',
  '0px 13px 27px rgba(0, 0, 0, 0.14), 0px 12px 90px rgba(0, 0, 0, 0.12), 0px 40px 72px rgba(0, 0, 0, 0.2)',
  '0px 14px 30px rgba(0, 0, 0, 0.14), 0px 13px 100px rgba(0, 0, 0, 0.12), 0px 44px 80px rgba(0, 0, 0, 0.2)',
  '0px 15px 33px rgba(0, 0, 0, 0.14), 0px 14px 110px rgba(0, 0, 0, 0.12), 0px 48px 88px rgba(0, 0, 0, 0.2)',
  '0px 16px 36px rgba(0, 0, 0, 0.14), 0px 15px 120px rgba(0, 0, 0, 0.12), 0px 52px 96px rgba(0, 0, 0, 0.2)',
  '0px 17px 39px rgba(0, 0, 0, 0.14), 0px 16px 130px rgba(0, 0, 0, 0.12), 0px 56px 104px rgba(0, 0, 0, 0.2)',
  '0px 18px 42px rgba(0, 0, 0, 0.14), 0px 17px 140px rgba(0, 0, 0, 0.12), 0px 60px 112px rgba(0, 0, 0, 0.2)',
]

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[600],
      light: colors.primary[400],
      dark: colors.primary[800],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary[600],
      light: colors.secondary[400],
      dark: colors.secondary[800],
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: colors.accent[500],
      light: colors.accent[300],
      dark: colors.accent[700],
    },
    info: {
      main: colors.primary[500],
      light: colors.primary[300],
      dark: colors.primary[700],
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    grey: colors.grey,
    background: {
      default: '#fafaf9',
      paper: '#ffffff',
    },
    text: {
      primary: colors.grey[900],
      secondary: colors.grey[600],
    },
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      '@media (max-width: 600px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      '@media (max-width: 600px)': {
        fontSize: '1.75rem',
      },
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      '@media (max-width: 600px)': {
        fontSize: '1.5rem',
      },
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      '@media (max-width: 600px)': {
        fontSize: '1.25rem',
      },
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      '@media (max-width: 600px)': {
        fontSize: '1.125rem',
      },
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      '@media (max-width: 600px)': {
        fontSize: '1rem',
      },
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02857em',
      textTransform: 'none' as const,
    },
  },
  shadows,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Inter", "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", system-ui, -apple-system, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          borderColor: colors.grey[200],
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: colors.grey[300],
            },
            '&:hover fieldset': {
              borderColor: colors.grey[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary[500],
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid',
          borderColor: colors.grey[200],
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderBottomColor: colors.grey[200],
          boxShadow: 'none',
          color: colors.grey[900],
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: colors.grey[100],
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
})