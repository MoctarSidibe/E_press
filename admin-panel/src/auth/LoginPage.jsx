import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Box, Button, TextField, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useLogin();
    const notify = useNotify();

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        login({ username: email, password })
            .catch((error) => {
                setLoading(false);
                notify('Invalid email or password');
            });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at 50% 14em, #313264 0%, #00023b 60%, #00023b 100%)',
            }}
        >
            <Typography variant="h3" sx={{ color: 'white', mb: 4, fontWeight: 'bold' }}>
                E-Press Admin
            </Typography>

            <Card sx={{ minWidth: 300, maxWidth: 400, width: '100%', borderRadius: 4, boxShadow: 6 }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: '50%' }}>
                            <LockIcon color="primary" />
                        </Box>
                    </Box>
                    <Typography variant="h5" align="center" gutterBottom>
                        Sign In
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                name="email"
                                type="email"
                                label="Email"
                                fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                required
                                autoFocus
                                InputLabelProps={{ shrink: true }} // Fix overlap
                            />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                name="password"
                                type="password"
                                label="Password"
                                fullWidth
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                required
                                InputLabelProps={{ shrink: true }} // Fix overlap
                            />
                        </Box>
                        <Button
                            type="submit"
                            color="primary"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={{ mt: 3, mb: 2, height: 48, fontSize: '1.1rem', borderRadius: 2 }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoginPage;
