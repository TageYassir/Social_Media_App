import { createTheme, alpha } from '@mui/material/styles'
import { deepPurple, teal, indigo, grey, white } from '@mui/material/colors'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Pure black for primary elements
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666', // Medium gray for secondary elements
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff', // Pure white background
      paper: '#ffffff',
    },
    text: {
      primary: '#000000', // High contrast black
      secondary: '#444444', // Slightly lighter for secondary text
      disabled: '#aaaaaa', // Light gray for disabled states
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      marginBottom: '1.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
      marginBottom: '1rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      marginBottom: '0.75rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: '#333333',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#555555',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
        background: `
          radial-gradient(at 73% 47%,rgb(245, 243, 243) 0px, transparent 50%),
          radial-gradient(at 24% 72%, #f9fafb 0px, transparent 50%),
          linear-gradient(to bottom right, #ffffff, #f8f9fa)
        `,
        backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          padding: '8px 16px',
          transition: 'all 0.2s ease',
          borderWidth: '1px',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: '#111111',
          },
        },
        outlined: {
          borderColor: '#e0e0e0',
          '&:hover': {
            borderColor: '#cccccc',
            backgroundColor: 'transparent',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'transparent',
            color: '#333333',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#000000',
          textDecoration: 'underline',
          textDecorationColor: '#e0e0e0',
          textUnderlineOffset: '3px',
          transition: 'all 0.2s ease',
          '&:hover': {
            textDecorationColor: '#000000',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          borderBottom: '1px solid #eaeaea',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0',
          boxShadow: 'none',
          border: '1px solid #eaeaea',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#cccccc',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: '0',
          boxShadow: 'none',
          border: '1px solid #eaeaea',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#cccccc',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '0',
          boxShadow: 'none',
          border: '1px solid #eaeaea',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#cccccc',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '0',
          boxShadow: 'none',
          border: '1px solid #eaeaea',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#cccccc',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '& fieldset': {
              borderColor: '#e0e0e0',
            },
            '&:hover fieldset': {
              borderColor: '#cccccc',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#eaeaea',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #eaeaea',
        },
      },
    },
  },
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
})

export default theme