import React from 'react';
import { Menu, useSidebarState } from 'react-admin';
import { SquaresFour, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Box, Typography } from '@mui/material';

// Custom Dashboard Icon
const DashboardIcon = () => <SquaresFour size={28} color="#00D4D4" weight="duotone" />;

export const MyMenu = (props) => {
    const [open, setOpen] = useSidebarState();

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
                <Menu.DashboardItem icon={DashboardIcon} />
                <Menu.ResourceItems />
            </Box>

            {/* Toggle Button at Bottom */}
            <Box sx={{ p: 2 }}>
                <Box
                    onClick={() => setOpen(!open)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        p: 1,
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'primary.main'
                        }
                    }}
                >
                    {open ? <CaretLeft size={24} /> : <CaretRight size={24} />}
                    {open && (
                        <Typography variant="body2" fontWeight={600} sx={{ ml: 2 }}>
                            Collapse Sidebar
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
