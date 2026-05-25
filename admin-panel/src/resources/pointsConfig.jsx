import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button,
    CircularProgress, Divider, Paper, InputAdornment,
} from '@mui/material';
import { Star, Gift, CurrencyCircleDollar, ArrowsClockwise, Info, Lightning } from '@phosphor-icons/react';
import { useNotify } from 'react-admin';
import { API_URL } from '../config/env';

export const PointsConfigPage = () => {
    const notify = useNotify();
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [form, setForm] = useState({
        points_per_1000_fcfa:    10,
        points_value_fcfa:       5,
        min_redemption_points:   100,
        max_redemption_percent:  50,
        express_percentage:      20,
    });

    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetch(`${API_URL}/admin/points-config`, { headers })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data && data.points_per_1000_fcfa) {
                    setForm({
                        points_per_1000_fcfa:   data.points_per_1000_fcfa,
                        points_value_fcfa:      data.points_value_fcfa,
                        min_redemption_points:  data.min_redemption_points,
                        max_redemption_percent: data.max_redemption_percent,
                        express_percentage:     data.express_percentage ?? 20,
                    });
                }
            })
            .catch(e => notify(`Erreur chargement: ${e.message}`, { type: 'error' }))
            .finally(() => setLoading(false));
    }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: Number(val) }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/points-config`, {
                method: 'PATCH', headers, body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            notify('Configuration sauvegardée !', { type: 'success' });
        } catch (e) {
            notify(`Erreur sauvegarde: ${e.message}`, { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Live preview calculations
    const example5000    = Math.floor(5 * form.points_per_1000_fcfa);
    const minFcfa        = form.min_redemption_points * form.points_value_fcfa;
    const maxFcfa        = Math.floor(5000 * form.max_redemption_percent / 100);
    const maxPtsFor5000  = Math.floor(maxFcfa / form.points_value_fcfa);
    const expressFee5000 = Math.round(5000 * (form.express_percentage / 100));

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box p={3} maxWidth={720}>
            <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                <Star size={28} color="#FFD700" weight="fill" />
                <Typography variant="h5" fontWeight={800}>Configuration des Points Fidélité</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Ces paramètres s'appliquent en temps réel sur l'application mobile.
            </Typography>

            {/* Live preview */}
            <Paper sx={{ p: 2.5, mb: 3, background: 'linear-gradient(135deg, #0F3460 0%, #1a237e 100%)', borderRadius: 3 }}>
                <Typography color="rgba(255,255,255,0.5)" variant="caption" fontWeight={700} letterSpacing={1}>
                    APERÇU EN DIRECT
                </Typography>
                <Box mt={1.5} display="flex" flexDirection="column" gap={1}>
                    <Typography color="white" variant="body1">
                        💳 Commande de <b>5 000 Fcfa</b> → <b style={{ color: '#FFD700' }}>+{example5000} points</b> gagnés
                    </Typography>
                    <Typography color="rgba(255,255,255,0.75)" variant="body2">
                        🔓 Minimum pour utiliser : <b>{form.min_redemption_points} pts</b> = {minFcfa} Fcfa de réduction
                    </Typography>
                    <Typography color="rgba(255,255,255,0.75)" variant="body2">
                        🚫 Plafond sur commande 5 000 Fcfa : max <b>{maxPtsFor5000} pts</b> ({form.max_redemption_percent}% = {maxFcfa} Fcfa)
                    </Typography>
                    <Typography color="rgba(255,255,255,0.75)" variant="body2">
                        ⚡ Commande de <b>5 000 Fcfa</b> en express → surcharge de <b style={{ color: '#FF9800' }}>{expressFee5000} Fcfa</b> ({form.express_percentage}%)
                    </Typography>
                </Box>
            </Paper>

            {/* Earning */}
            <Card sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CurrencyCircleDollar size={22} color="#10B981" weight="duotone" />
                        <Typography variant="subtitle1" fontWeight={700}>Gain de points</Typography>
                    </Box>
                    <TextField
                        label="Points gagnés par tranche de 1 000 Fcfa"
                        type="number"
                        fullWidth
                        value={form.points_per_1000_fcfa}
                        onChange={e => set('points_per_1000_fcfa', e.target.value)}
                        helperText={`Ex: 10 = le client gagne ${form.points_per_1000_fcfa * 10} pts pour une commande de 10 000 Fcfa`}
                        inputProps={{ min: 1 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">pts / 1 000 Fcfa</InputAdornment> }}
                    />
                </CardContent>
            </Card>

            {/* Express */}
            <Card sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Lightning size={22} color="#FF9800" weight="duotone" />
                        <Typography variant="subtitle1" fontWeight={700}>Supplément Express</Typography>
                    </Box>
                    <TextField
                        label="Pourcentage express"
                        type="number"
                        fullWidth
                        value={form.express_percentage}
                        onChange={e => set('express_percentage', e.target.value)}
                        helperText={`Appliqué sur le sous-total de la commande. Ex: ${form.express_percentage}% sur 10 000 Fcfa = +${Math.round(10000 * form.express_percentage / 100)} Fcfa`}
                        inputProps={{ min: 1, max: 100 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                </CardContent>
            </Card>

            {/* Redemption */}
            <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Gift size={22} color="#8B5CF6" weight="duotone" />
                        <Typography variant="subtitle1" fontWeight={700}>Utilisation des points</Typography>
                    </Box>

                    <TextField
                        label="Valeur d'1 point en Fcfa"
                        type="number"
                        fullWidth
                        value={form.points_value_fcfa}
                        onChange={e => set('points_value_fcfa', e.target.value)}
                        helperText={`1 point = ${form.points_value_fcfa} Fcfa de réduction`}
                        inputProps={{ min: 1 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">Fcfa / pt</InputAdornment> }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label="Points minimum requis pour utiliser"
                        type="number"
                        fullWidth
                        value={form.min_redemption_points}
                        onChange={e => set('min_redemption_points', e.target.value)}
                        helperText={`Le client doit avoir au moins ${form.min_redemption_points} pts (= ${minFcfa} Fcfa) pour pouvoir utiliser ses points`}
                        inputProps={{ min: 1 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">pts minimum</InputAdornment> }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label="Plafond : % maximum d'une commande payable en points"
                        type="number"
                        fullWidth
                        value={form.max_redemption_percent}
                        onChange={e => set('max_redemption_percent', e.target.value)}
                        helperText={`Ex: ${form.max_redemption_percent}% → sur une commande de 10 000 Fcfa, max ${Math.floor(10000 * form.max_redemption_percent / 100 / form.points_value_fcfa)} pts utilisables`}
                        inputProps={{ min: 1, max: 100 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                </CardContent>
            </Card>

            <Box mt={3} display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} /> : <ArrowsClockwise size={18} />}
                    sx={{ px: 4, borderRadius: 2 }}
                >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                </Button>
            </Box>
        </Box>
    );
};
