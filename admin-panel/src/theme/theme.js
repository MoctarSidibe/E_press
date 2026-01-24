import { defaultTheme } from 'react-admin';
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    ...defaultTheme,
    palette: {
        primary: {
            main: '#00D4D4',
            light: '#33E0E0',
            dark: '#00A8A8',
        },
        secondary: {
            main: '#FF6B9D',
            light: '#FF8FB3',
            dark: '#E5527F',
        },
        background: {
            default: '#F5F7FA',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1A1F36',
            secondary: '#697386',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 700,
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFFFFF',
                    color: '#1A1F36',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1A1F36',
                    color: '#FFFFFF',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 212, 212, 0.3)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    },
                },
            },
        },
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    borderLeft: '3px solid transparent',
                    '&.RaMenuItemLink-active': {
                        backgroundColor: 'rgba(0, 212, 212, 0.15)',
                        color: '#00D4D4',
                        borderLeft: '3px solid #00D4D4',
                        fontWeight: 'bold',
                        '& .RaMenuItemLink-icon': {
                            color: '#00D4D4',
                        },
                    },
                },
            },
        },
    },
});
