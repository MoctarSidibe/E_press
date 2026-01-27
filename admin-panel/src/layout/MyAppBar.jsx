import React from 'react';
import { AppBar, UserMenu, useUserMenu } from 'react-admin';
import { useMediaQuery, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// Custom User Menu to optionally hide name
const CustomUserMenu = (props) => {
    const isSmall = useMediaQuery(theme => theme.breakpoints.down('sm'));
    return (
        <UserMenu {...props} sx={{
            '& .MuiTypography-root': {
                display: isSmall ? 'none' : 'block' // Hide name on small screens
            }
        }} />
    );
};

export const MyAppBar = (props) => {
    return (
        <AppBar {...props} userMenu={<CustomUserMenu />} />
    );
};
