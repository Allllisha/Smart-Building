import { createTheme } from '@mui/material/styles'

// 建築デザイン事務所向けプロフェッショナルテーマ
export const professionalTheme = createTheme({
  palette: {
    primary: {
      main: '#2C3E50',      // ダークネイビー（プロフェッショナル）
      light: '#34495E',     // ライトグレー
      dark: '#1A252F',      // ダークネイビー
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#95A5A6',      // ニュートラルグレー
      light: '#BDC3C7',     // ライトグレー
      dark: '#7F8C8D',      // ダークグレー
      contrastText: '#2C3E50'
    },
    background: {
      default: '#F8F9FA',   // 極薄グレー背景
      paper: '#FFFFFF'      // 純白
    },
    text: {
      primary: '#2C3E50',   // ダークネイビー
      secondary: '#5D6D7E', // ミディアムグレー
      disabled: '#95A5A6'   // ライトグレー
    },
    divider: '#E5E8E8',     // 境界線色
    success: {
      main: '#27AE60',      // プロフェッショナルグリーン
      light: '#2ECC71',
      dark: '#229954',
      contrastText: '#FFFFFF'
    },
    error: {
      main: '#E74C3C',      // プロフェッショナルレッド
      light: '#EC7063',
      dark: '#CB4335',
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#F39C12',      // プロフェッショナルオレンジ
      light: '#F8C471',  
      dark: '#E67E22',
      contrastText: '#FFFFFF'
    },
    info: {
      main: '#3498DB',      // プロフェッショナルブルー
      light: '#5DADE2',
      dark: '#2980B9',
      contrastText: '#FFFFFF'
    }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
      color: '#2C3E50'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
      color: '#2C3E50'
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.167,
      letterSpacing: '0em',
      color: '#2C3E50'
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.235,
      letterSpacing: '0.00735em',
      color: '#2C3E50'
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.334,
      letterSpacing: '0em',
      color: '#2C3E50'
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.0075em',
      color: '#2C3E50'
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
      letterSpacing: '0.00938em',
      color: '#5D6D7E'
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
      color: '#5D6D7E'
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
      color: '#2C3E50'
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
      color: '#5D6D7E'
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'none' as const
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
      color: '#95A5A6'
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase' as const,
      color: '#95A5A6'
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#2C3E50',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          borderBottom: '1px solid #E5E8E8'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
          }
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 8
        },
        outlined: {
          border: '1px solid #E5E8E8',
          boxShadow: 'none'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 8,
          border: '1px solid #F4F6F6'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        },
        standardSuccess: {
          backgroundColor: '#D5F4E6',
          color: '#27AE60',
          border: '1px solid #27AE60'
        },
        standardError: {
          backgroundColor: '#FADBD8',
          color: '#E74C3C',
          border: '1px solid #E74C3C'
        },
        standardWarning: {
          backgroundColor: '#FCF3CF',
          color: '#F39C12',
          border: '1px solid #F39C12'
        },
        standardInfo: {
          backgroundColor: '#D6EAF8',
          color: '#3498DB',
          border: '1px solid #3498DB'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: '0.75rem'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            '& fieldset': {
              borderColor: '#E5E8E8',
              borderWidth: '2px'
            },
            '&:hover fieldset': {
              borderColor: '#BDC3C7'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2C3E50',
              borderWidth: '2px'
            }
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: 6,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E5E8E8',
            borderWidth: '2px'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#BDC3C7'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2C3E50',
            borderWidth: '2px'
          }
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: '#F4F6F6'
        },
        bar: {
          borderRadius: 4
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#2C3E50',
          height: 6
        },
        thumb: {
          backgroundColor: '#2C3E50',
          border: '2px solid #FFFFFF',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }
        },
        track: {
          backgroundColor: '#2C3E50',
          border: 'none'
        },
        rail: {
          backgroundColor: '#E5E8E8'
        }
      }
    }
  }
})

export default professionalTheme