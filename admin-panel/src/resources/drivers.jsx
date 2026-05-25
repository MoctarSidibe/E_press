import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Chip, Button, Table, TableHead, TableRow,
    TableCell, TableBody, TableContainer, Paper, TextField,
    Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, CircularProgress, Switch, Tooltip,
} from '@mui/material';
import {
    CheckCircle, Cancel, HourglassEmpty, PersonOff,
    Refresh, ZoomIn, Close, Search,
} from '@mui/icons-material';
import { Truck } from '@phosphor-icons/react';
import { API_URL } from '../config/env';

const TOKEN = () => localStorage.getItem('auth_token');

const KYC_CFG = {
    pending:       { label: 'En attente',  color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
    approved:      { label: 'Approuvé',    color: 'success', icon: <CheckCircle fontSize="small" /> },
    rejected:      { label: 'Refusé',      color: 'error',   icon: <Cancel fontSize="small" /> },
    not_submitted: { label: 'Non soumis',  color: 'default', icon: <PersonOff fontSize="small" /> },
};

const DOC_LABELS = {
    national_id_front: "Pièce d'identité",
    national_id_back:  'CNI Verso',
    selfie:            'Selfie',
    driver_license:    'Permis de conduire',
    vehicle_photo:     'Photo véhicule',
};

// fileUrl is like /uploads/kyc/...  — serve via /api/uploads/ which nginx already proxies
const imgUrl = (fileUrl) => `${API_URL}${fileUrl}`;

// ── Detail dialog ─────────────────────────────────────────────────────────────
const DriverDetailDialog = ({ driver, open, onClose, onToggleActive, onApprove, onReject }) => {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    if (!driver) return null;
    const kycCfg = KYC_CFG[driver.kyc_status] || KYC_CFG.not_submitted;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Truck size={22} weight="duotone" color="#00D4D4" />
                        <Typography fontWeight={700}>Détail du livreur</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose}><Close /></IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* User info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: '#00D4D4', fontSize: 22, fontWeight: 800 }}>
                            {(driver.full_name || 'L')[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{driver.full_name}</Typography>
                            <Typography variant="body2" color="text.secondary">{driver.email}</Typography>
                            <Typography variant="caption" color="text.secondary">{driver.phone}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                            <Chip icon={kycCfg.icon} label={kycCfg.label} color={kycCfg.color} size="small" />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">Actif</Typography>
                                <Switch
                                    size="small"
                                    checked={driver.is_active}
                                    onChange={() => onToggleActive(driver.id)}
                                    color="success"
                                />
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Inscrit le</Typography>
                            <Typography variant="body2" fontWeight={600}>
                                {new Date(driver.created_at).toLocaleDateString('fr-FR')}
                            </Typography>
                        </Box>
                        {driver.kyc_submitted_at && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">KYC soumis le</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {new Date(driver.kyc_submitted_at).toLocaleDateString('fr-FR')}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Rejection reason */}
                    {driver.kyc_rejection_reason && (
                        <Box sx={{ bgcolor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: 1, p: 1.5, mb: 2 }}>
                            <Typography variant="caption" fontWeight={700} color="error">Motif du refus :</Typography>
                            <Typography variant="body2" color="error.dark">{driver.kyc_rejection_reason}</Typography>
                        </Box>
                    )}

                    {/* Documents */}
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Documents KYC ({driver.documents?.length || 0})
                    </Typography>
                    {driver.documents?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {driver.documents.map((doc) => (
                                <Button
                                    key={doc.id}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ZoomIn />}
                                    component="a"
                                    href={imgUrl(doc.file_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{ textTransform: 'none' }}
                                >
                                    {DOC_LABELS[doc.document_type] || doc.document_type}
                                </Button>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">Aucun document soumis.</Typography>
                    )}

                    {/* Reject form */}
                    {showRejectForm && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#FEF2F2', borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={600} color="error" sx={{ mb: 1 }}>
                                Motif du refus
                            </Typography>
                            <TextField
                                multiline rows={2} fullWidth size="small"
                                placeholder="ex: Photo floue, document expiré..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>Annuler</Button>
                                <Button
                                    size="small" variant="contained" color="error"
                                    disabled={!rejectReason.trim()}
                                    onClick={() => { onReject(driver.id, rejectReason); setShowRejectForm(false); setRejectReason(''); onClose(); }}
                                >
                                    Confirmer le refus
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={onClose} sx={{ mr: 'auto' }}>Fermer</Button>
                    {driver.kyc_status === 'pending' && !showRejectForm && (
                        <>
                            <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setShowRejectForm(true)}>
                                Refuser
                            </Button>
                            <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => { onApprove(driver.id); onClose(); }}>
                                Approuver
                            </Button>
                        </>
                    )}
                    {driver.kyc_status === 'rejected' && !showRejectForm && (
                        <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => { onApprove(driver.id); onClose(); }}>
                            Approuver quand même
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

        </>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DriversPage = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [kycFilter, setKycFilter] = useState('all');
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/users?role=driver`, {
                headers: { Authorization: `Bearer ${TOKEN()}` }
            });
            const data = await res.json();
            // Fetch KYC docs for each driver
            const kycRes = await fetch(`${API_URL}/admin/kyc`, {
                headers: { Authorization: `Bearer ${TOKEN()}` }
            });
            const kycData = await kycRes.json();
            const kycMap = {};
            kycData.forEach(k => { kycMap[k.id] = k; });
            const merged = data.map(d => ({ ...d, ...(kycMap[d.id] || {}), is_active: d.is_active }));
            setDrivers(merged);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleActive = async (id) => {
        await fetch(`${API_URL}/admin/users/${id}/toggle-status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${TOKEN()}` }
        });
        setDrivers(prev => prev.map(d => d.id === id ? { ...d, is_active: !d.is_active } : d));
        if (selected?.id === id) setSelected(prev => ({ ...prev, is_active: !prev.is_active }));
    };

    const approve = async (id) => {
        await fetch(`${API_URL}/admin/kyc/${id}/approve`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${TOKEN()}` }
        });
        await load();
    };

    const reject = async (id, reason) => {
        await fetch(`${API_URL}/admin/kyc/${id}/reject`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        await load();
    };

    const KYC_FILTERS = ['all', 'pending', 'approved', 'rejected', 'not_submitted'];
    const KYC_FILTER_LABELS = { all: 'Tous', pending: 'En attente', approved: 'Approuvés', rejected: 'Refusés', not_submitted: 'Non soumis' };

    const filtered = drivers.filter(d => {
        const matchSearch = !search || d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase());
        const matchKyc = kycFilter === 'all' || (d.kyc_status || 'not_submitted') === kycFilter;
        return matchSearch && matchKyc;
    });

    const countKyc = (status) => drivers.filter(d => (d.kyc_status || 'not_submitted') === status).length;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Truck size={28} weight="duotone" color="#00D4D4" />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Livreurs</Typography>
                        <Typography variant="body2" color="text.secondary">Gestion des livreurs et vérification KYC</Typography>
                    </Box>
                </Box>
                <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">Actualiser</Button>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total',       value: drivers.length,          color: '#00D4D4', bg: '#E0F7FA' },
                    { label: 'Actifs',      value: drivers.filter(d => d.is_active).length, color: '#10B981', bg: '#D1FAE5' },
                    { label: 'KYC En attente', value: countKyc('pending'), color: '#F59E0B', bg: '#FEF3C7' },
                    { label: 'KYC Approuvés', value: countKyc('approved'), color: '#8B5CF6', bg: '#EDE9FE' },
                ].map(s => (
                    <Box key={s.label} sx={{ bgcolor: s.bg, borderRadius: 2, px: 3, py: 1.5, minWidth: 100, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                        <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>{s.label}</Typography>
                    </Box>
                ))}
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small" placeholder="Rechercher par nom ou email..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                    sx={{ minWidth: 280 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {KYC_FILTERS.map(f => (
                        <Chip
                            key={f}
                            label={`${KYC_FILTER_LABELS[f]}${f !== 'all' ? ` (${countKyc(f)})` : ''}`}
                            onClick={() => setKycFilter(f)}
                            color={kycFilter === f ? 'primary' : 'default'}
                            variant={kycFilter === f ? 'filled' : 'outlined'}
                            size="small"
                        />
                    ))}
                </Box>
            </Box>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Livreur</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Téléphone</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>KYC</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Inscrit le</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        Aucun livreur trouvé
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(d => {
                                const kyc = KYC_CFG[d.kyc_status] || KYC_CFG.not_submitted;
                                return (
                                    <TableRow
                                        key={d.id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => setSelected(d)}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: '#00D4D4', fontSize: 14, fontWeight: 800 }}>
                                                    {(d.full_name || 'L')[0].toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{d.full_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{d.email}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{d.phone || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip icon={kyc.icon} label={kyc.label} color={kyc.color} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={d.is_active ? 'Actif' : 'Inactif'}
                                                color={d.is_active ? 'success' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">
                                                {new Date(d.created_at).toLocaleDateString('fr-FR')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title={d.is_active ? 'Désactiver' : 'Activer'}>
                                                <Switch
                                                    size="small"
                                                    checked={!!d.is_active}
                                                    onChange={() => toggleActive(d.id)}
                                                    color="success"
                                                />
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <DriverDetailDialog
                driver={selected}
                open={!!selected}
                onClose={() => setSelected(null)}
                onToggleActive={toggleActive}
                onApprove={approve}
                onReject={reject}
            />
        </Box>
    );
};

export default DriversPage;
