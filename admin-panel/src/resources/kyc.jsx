import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Chip, Button,
    Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Tabs, Tab, IconButton, Table,
    TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
} from '@mui/material';
import {
    CheckCircle, Cancel, HourglassEmpty, PersonOff,
    ZoomIn, Refresh, Close,
} from '@mui/icons-material';
import { API_URL } from '../config/env';

const TOKEN = () => localStorage.getItem('auth_token');

const STATUS_CONFIG = {
    pending:       { label: 'En attente',    color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
    approved:      { label: 'Approuvé',      color: 'success', icon: <CheckCircle fontSize="small" /> },
    rejected:      { label: 'Refusé',        color: 'error',   icon: <Cancel fontSize="small" /> },
    not_submitted: { label: 'Non soumis',    color: 'default', icon: <PersonOff fontSize="small" /> },
};

const ROLE_LABELS = { driver: 'Livreur', cleaner: 'Laverie' };

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
const KYCDetailDialog = ({ record, open, onClose, onApprove, onReject }) => {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    if (!record) return null;
    const statusCfg = STATUS_CONFIG[record.kyc_status] || STATUS_CONFIG.not_submitted;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={700}>Dossier KYC — {record.full_name}</Typography>
                    <IconButton size="small" onClick={onClose}><Close /></IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontSize: 20, fontWeight: 700 }}>
                            {(record.full_name || 'U')[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{record.full_name}</Typography>
                            <Typography variant="body2" color="text.secondary">{record.email}</Typography>
                            {record.phone && <Typography variant="caption" color="text.secondary">{record.phone}</Typography>}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Chip label={ROLE_LABELS[record.role] || record.role} size="small" variant="outlined" color="primary" />
                            <Chip icon={statusCfg.icon} label={statusCfg.label} size="small" color={statusCfg.color} />
                        </Box>
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                        {record.kyc_submitted_at && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">Soumis le</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {new Date(record.kyc_submitted_at).toLocaleDateString('fr-FR', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </Typography>
                            </Box>
                        )}
                        {record.kyc_approved_at && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">Approuvé le</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {new Date(record.kyc_approved_at).toLocaleDateString('fr-FR')}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Rejection reason */}
                    {record.kyc_rejection_reason && (
                        <Box sx={{ bgcolor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: 1, p: 1.5, mb: 3 }}>
                            <Typography variant="caption" fontWeight={700} color="error">Motif du dernier refus :</Typography>
                            <Typography variant="body2" color="error.dark">{record.kyc_rejection_reason}</Typography>
                        </Box>
                    )}

                    {/* Documents */}
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        Documents soumis ({record.documents?.length || 0})
                    </Typography>
                    {record.documents?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {record.documents.map((doc) => (
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
                        <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#F9FAFB', borderRadius: 2 }}>
                            <Typography color="text.secondary">Aucun document soumis.</Typography>
                        </Box>
                    )}

                    {/* Reject form */}
                    {showRejectForm && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#FEF2F2', borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={600} color="error" sx={{ mb: 1 }}>
                                Motif du refus (visible par l'utilisateur)
                            </Typography>
                            <TextField
                                autoFocus multiline rows={3} fullWidth size="small"
                                placeholder="ex: Photo floue. Veuillez resoumettre une photo nette."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>
                                    Annuler
                                </Button>
                                <Button
                                    size="small" variant="contained" color="error"
                                    disabled={!rejectReason.trim()}
                                    onClick={() => { onReject(record.id, rejectReason); setShowRejectForm(false); setRejectReason(''); onClose(); }}
                                >
                                    Confirmer le refus
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={onClose} sx={{ mr: 'auto' }}>Fermer</Button>
                    {record.kyc_status === 'pending' && !showRejectForm && (
                        <>
                            <Button variant="outlined" color="error" startIcon={<Cancel />} size="small"
                                onClick={() => setShowRejectForm(true)}>
                                Refuser
                            </Button>
                            <Button variant="contained" color="success" startIcon={<CheckCircle />} size="small"
                                onClick={() => { onApprove(record.id); onClose(); }}>
                                Approuver
                            </Button>
                        </>
                    )}
                    {record.kyc_status === 'rejected' && !showRejectForm && (
                        <Button variant="contained" color="success" startIcon={<CheckCircle />} size="small"
                            onClick={() => { onApprove(record.id); onClose(); }}>
                            Approuver quand même
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

        </>
    );
};

// ── Main KYC page ─────────────────────────────────────────────────────────────
const KYCPage = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab]         = useState(0);
    const [selected, setSelected] = useState(null);

    const TABS = ['pending', 'rejected', 'approved', 'not_submitted'];

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/kyc`, {
                headers: { Authorization: `Bearer ${TOKEN()}` }
            });
            setRecords(await res.json());
        } catch (e) {
            console.error('KYC load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const approve = async (userId) => {
        await fetch(`${API_URL}/admin/kyc/${userId}/approve`, {
            method: 'PATCH', headers: { Authorization: `Bearer ${TOKEN()}` }
        });
        load();
    };

    const reject = async (userId, reason) => {
        await fetch(`${API_URL}/admin/kyc/${userId}/reject`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        load();
    };

    const filtered = records.filter(r => (r.kyc_status || 'not_submitted') === TABS[tab]);
    const countFor  = (status) => records.filter(r => (r.kyc_status || 'not_submitted') === status).length;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Vérification KYC</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Documents d'identité des livreurs et des laveries
                    </Typography>
                </Box>
                <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">Actualiser</Button>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                    { label: 'En attente',  status: 'pending',       color: '#F59E0B', bg: '#FEF3C7' },
                    { label: 'Approuvés',   status: 'approved',      color: '#10B981', bg: '#D1FAE5' },
                    { label: 'Refusés',     status: 'rejected',      color: '#EF4444', bg: '#FEE2E2' },
                    { label: 'Non soumis',  status: 'not_submitted', color: '#6B7280', bg: '#F3F4F6' },
                ].map(s => (
                    <Box key={s.status} sx={{ bgcolor: s.bg, borderRadius: 2, px: 3, py: 1.5, minWidth: 100, textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => setTab(TABS.indexOf(s.status))}>
                        <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>
                            {countFor(s.status)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>{s.label}</Typography>
                    </Box>
                ))}
            </Box>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                {['En attente', 'Refusés', 'Approuvés', 'Non soumis'].map((label, i) => (
                    <Tab key={i} label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {label}
                            <Chip label={countFor(TABS[i])} size="small" sx={{ height: 18, fontSize: 11 }} />
                        </Box>
                    } />
                ))}
            </Tabs>

            {/* Table list */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">Aucun dossier dans cette catégorie</Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Personne</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Rôle</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Documents</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Soumis le</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(record => {
                                const statusCfg = STATUS_CONFIG[record.kyc_status] || STATUS_CONFIG.not_submitted;
                                return (
                                    <TableRow key={record.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(record)}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
                                                    {(record.full_name || 'U')[0].toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{record.full_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{record.email}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={ROLE_LABELS[record.role] || record.role} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${record.documents?.length || 0} doc${record.documents?.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={record.documents?.length > 0 ? 'info' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">
                                                {record.kyc_submitted_at
                                                    ? new Date(record.kyc_submitted_at).toLocaleDateString('fr-FR')
                                                    : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip icon={statusCfg.icon} label={statusCfg.label} size="small" color={statusCfg.color} />
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Button size="small" variant="outlined" onClick={() => setSelected(record)}>
                                                Voir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <KYCDetailDialog
                record={selected}
                open={!!selected}
                onClose={() => setSelected(null)}
                onApprove={approve}
                onReject={reject}
            />
        </Box>
    );
};

export default KYCPage;
