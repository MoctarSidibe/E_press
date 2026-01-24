import React, { useState, useEffect } from 'react';
import { Card, CardContent, Grid, Typography, Box, Paper, LinearProgress, Divider } from '@mui/material';
import {
    Users,
    ShoppingBag,
    Truck,
    CheckCircle,
    CurrencyDollar,
    UserCircle,
    Package,
    Clock,
    TrendUp,
    WashingMachine,
    Sparkle
} from '@phosphor-icons/react';
import dataProvider from '../providers/dataProvider';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dataProvider.getStats();
                setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>Loading Dashboard...</Typography>
                <LinearProgress sx={{ mt: 2 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #F5F7FA 0%, #E8EEF5 100%)', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Sparkle size={32} color="#00D4D4" weight="duotone" />
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1A1F36' }}>
                        Dashboard
                    </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                    Welcome back! Here's what's happening with your laundry service today.
                </Typography>
            </Box>

            {/* User Statistics */}
            <SectionHeader title="Team Overview" />
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Total Users"
                        value={stats?.total_users || 0}
                        icon={<Users size={32} weight="duotone" />}
                        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Customers"
                        value={stats?.total_customers || 0}
                        icon={<UserCircle size={32} weight="duotone" />}
                        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Drivers"
                        value={stats?.total_drivers || 0}
                        icon={<Truck size={32} weight="duotone" />}
                        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Cleaners"
                        value={stats?.total_cleaners || 0}
                        icon={<WashingMachine size={32} weight="duotone" />}
                        gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    />
                </Grid>
            </Grid>

            {/* Revenue & Orders */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <SectionHeader title="Operations" />
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <LargeStatCard
                                title="Total Orders"
                                value={stats?.total_orders || 0}
                                subtitle={`${stats?.active_orders || 0} active`}
                                icon={<ShoppingBag size={40} weight="duotone" />}
                                color="#667eea"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LargeStatCard
                                title="Completed"
                                value={stats?.orders_delivered || 0}
                                subtitle={`${stats?.orders_cancelled || 0} cancelled`}
                                icon={<CheckCircle size={40} weight="duotone" />}
                                color="#43e97b"
                            />
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12} md={4}>
                    <SectionHeader title="Revenue" />
                    <RevenueCard
                        totalRevenue={stats?.total_revenue || 0}
                        pendingRevenue={stats?.pending_revenue || 0}
                    />
                </Grid>
            </Grid>

            {/* Order Status Breakdown */}
            <SectionHeader title="Order Pipeline" />
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="Pending" value={stats?.orders_pending || 0} color="#FFA726" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="Assigned" value={stats?.orders_assigned || 0} color="#00D4D4" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="Picked Up" value={stats?.orders_picked_up || 0} color="#9C27B0" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="In Facility" value={stats?.orders_in_facility || 0} color="#00B4D8" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="Ready" value={stats?.orders_ready || 0} color="#4CAF50" />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <PipelineCard title="Out for Delivery" value={stats?.orders_out_for_delivery || 0} color="#FF9800" />
                </Grid>
            </Grid>

            {/* Recent Activities */}
            <SectionHeader title="Recent Activity" />
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E0E7F1' }}>
                {stats?.recent_activities?.length > 0 ? (
                    stats.recent_activities.map((activity, index) => (
                        <Box key={activity.id}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 2.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            bgcolor: `${getStatusColor(activity.status)}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Package size={24} color={getStatusColor(activity.status)} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body1" fontWeight={600}>
                                            {activity.order_number}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <span style={{
                                                fontWeight: 600,
                                                color: getStatusColor(activity.status),
                                                textTransform: 'capitalize'
                                            }}>
                                                {activity.status.replace('_', ' ')}
                                            </span> • {new Date(activity.updated_at).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#00D4D4' }}>
                                    ${parseFloat(activity.total || 0).toFixed(2)}
                                </Typography>
                            </Box>
                            {index < stats.recent_activities.length - 1 && <Divider />}
                        </Box>
                    ))
                ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Package size={48} color="#ccc" />
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            No recent activities
                        </Typography>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

const SectionHeader = ({ title }) => (
    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1A1F36' }}>
        {title}
    </Typography>
);

const MetricCard = ({ title, value, icon, gradient }) => (
    <Card
        elevation={0}
        sx={{
            height: '100%',
            background: 'white',
            borderRadius: 4,
            border: '1px solid #E0E7F1',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.05)'
            }
        }}
    >
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, '&:last-child': { pb: 3 } }}>
            <Box
                sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    background: gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    mr: 2.5,
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="h4" component="div" fontWeight="800" sx={{ color: '#1A1F36', lineHeight: 1.2 }}>
                    {value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mt: 0.5 }}>
                    {title}
                </Typography>
            </Box>
        </CardContent>
    </Card>
);

const LargeStatCard = ({ title, value, subtitle, icon, color }) => (
    <Card elevation={0} sx={{ height: '200px', borderRadius: 3, border: '1px solid #E0E7F1' }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight="bold" sx={{ color }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                </Box>
                <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${color}15`,
                    color: color
                }}>
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const RevenueCard = ({ totalRevenue, pendingRevenue }) => (
    <Card
        elevation={0}
        sx={{
            height: '200px',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #00D4D4 0%, #00A8A8 100%)',
            color: 'white'
        }}
    >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CurrencyDollar size={24} weight="duotone" />
                    <Typography variant="h6" fontWeight={600}>Revenue</Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>
                    ${parseFloat(totalRevenue).toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Earned
                </Typography>
            </Box>

            <Box>
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 1.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendUp size={20} weight="duotone" />
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1 }}>
                            Pending Revenue
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                            ${parseFloat(pendingRevenue).toFixed(2)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const PipelineCard = ({ title, value, color }) => (
    <Card
        elevation={0}
        sx={{
            borderRadius: 3,
            bgcolor: `${color}10`, // 10% opacity background
            border: `1px solid ${color}30`,
            textAlign: 'center',
            height: '100%',
            transition: 'transform 0.2s',
            '&:hover': {
                transform: 'translateY(-2px)',
                bgcolor: `${color}15`
            }
        }}
    >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" fontWeight="800" sx={{ color: color, mb: 0.5, lineHeight: 1 }}>
                {value}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
            </Typography>
        </CardContent>
    </Card>
);

const getStatusColor = (status) => {
    const colors = {
        pending: '#FFA726',
        assigned: '#00D4D4',
        picked_up: '#9C27B0',
        in_facility: '#00B4D8',
        ready: '#4CAF50',
        out_for_delivery: '#FF9800',
        delivered: '#00D9A3',
        cancelled: '#FF5252',
    };
    return colors[status] || '#999';
};

export default Dashboard;
