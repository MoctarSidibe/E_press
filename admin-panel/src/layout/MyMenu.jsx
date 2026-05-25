import React, { useEffect, useState } from 'react';
import { Menu, useSidebarState } from 'react-admin';
import { SquaresFour, CaretLeft, CaretRight, Star, ShieldCheck, Truck } from '@phosphor-icons/react';
import { Box, Typography, Badge } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/env';

// Custom Dashboard Icon
const DashboardIcon = () => <SquaresFour size={28} color="#00D4D4" weight="duotone" />;
const PointsIcon = () => <Star size={28} color="#FFD700" weight="duotone" />;
const KYCIcon = () => <ShieldCheck size={28} color="#8B5CF6" weight="duotone" />;
const DriverIcon = () => <Truck size={28} color="#00D4D4" weight="duotone" />;

// KYC icon with a small red counter overlay when pending submissions exist.
const KYCIconWithBadge = ({ count }) => (
    <Badge
        color="error"
        badgeContent={count}
        invisible={!count}
        overlap="circular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
        <KYCIcon />
    </Badge>
);

// Poll the backend for pending KYC count. 60s interval is plenty — admins act
// in minutes, not seconds, and the cost of a missed update is "user refreshes".
const usePendingKycCount = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchCount = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return;
                const res = await fetch(`${API_URL}/admin/kyc/pending-count`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setCount(json.count || 0);
            } catch (_) { /* network blip — keep last value */ }
        };
        fetchCount();
        const id = setInterval(fetchCount, 60000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    return count;
};

export const MyMenu = (props) => {
    const [open, setOpen] = useSidebarState();
    const pendingKyc = usePendingKycCount();

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
                <Menu.DashboardItem icon={DashboardIcon} />
                <Menu.ResourceItems />
                <Menu.Item
                    to="/points-config"
                    primaryText="Points Config"
                    leftIcon={<PointsIcon />}
                />
                <Menu.Item
                    to="/drivers"
                    primaryText="Livreurs"
                    leftIcon={<DriverIcon />}
                />
                <Menu.Item
                    to="/kyc"
                    primaryText={pendingKyc > 0 ? `Vérification KYC (${pendingKyc})` : 'Vérification KYC'}
                    leftIcon={<KYCIconWithBadge count={pendingKyc} />}
                />
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
