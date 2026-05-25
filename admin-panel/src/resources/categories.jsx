import React, { useState } from 'react';
import {
    List,
    Datagrid,
    TextField,
    FunctionField,
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    Create,
    required,
    DeleteButton,
    useRecordContext,
    useNotify,
    TopToolbar,
    ListButton,
    SaveButton,
    Toolbar,
} from 'react-admin';
import {
    Box, Typography, Button, CircularProgress, Divider,
    Chip, Paper,
} from '@mui/material';
import { ArrowLeft, Image as ImageIcon, Tag, SlidersHorizontal, Clock } from '@phosphor-icons/react';
import { API_URL } from '../config/env';

const TEAL = '#00D4D4';

const BackActions = () => (
    <TopToolbar>
        <ListButton label="Retour" icon={<ArrowLeft size={16} />} />
    </TopToolbar>
);

const FormToolbar = () => (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
        <SaveButton />
        <ListButton label="Annuler" icon={<ArrowLeft size={16} />} />
    </Toolbar>
);

// Display FCFA from stored decimal (40 → "4 000 Fcfa")
const fcfaFormat = (val) =>
    val != null && val !== '' ? `${(parseFloat(val) * 100).toLocaleString('fr-FR')} Fcfa` : '—';

// ─── Section header ───────────────────────────────────────────────────────────
const SectionTitle = ({ icon, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
        <Box sx={{ color: TEAL }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">{label}</Typography>
        <Divider sx={{ flex: 1, ml: 1 }} />
    </Box>
);

// ─── Upload a GIF to a given category ────────────────────────────────────────
const uploadGif = async (categoryId, file) => {
    const formData = new FormData();
    formData.append('gif', file);
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_URL}/admin/categories/${categoryId}/gif`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur upload');
    return data;
};

// ─── GIF uploader (Edit — record already exists) ─────────────────────────────
const GifUploader = () => {
    const record = useRecordContext();
    const [preview, setPreview] = useState(
        record?.gif_url ? `${API_URL}${record.gif_url}?t=${Date.now()}` : null
    );
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    if (!record?.id) return null;

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setUploading(true);
        try {
            const data = await uploadGif(record.id, file);
            setPreview(`${API_URL}${data.gif_url}?t=${Date.now()}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {/* Preview */}
                <Box sx={{
                    width: 90, height: 90, borderRadius: 3,
                    border: `2px dashed ${preview ? TEAL : '#e0e0e0'}`,
                    bgcolor: preview ? 'transparent' : '#f9fafb',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {preview ? (
                        <img
                            src={preview}
                            alt="aperçu"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <ImageIcon size={28} color="#ccc" />
                    )}
                </Box>
                {/* Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={13} /> : null}
                        sx={{ textTransform: 'none', borderColor: TEAL, color: TEAL, '&:hover': { borderColor: TEAL, bgcolor: `${TEAL}0a` } }}
                    >
                        {uploading ? 'Envoi...' : preview ? "Changer l'image" : 'Ajouter image / GIF'}
                        <input type="file" accept="image/gif,image/png,image/jpeg,image/webp" hidden onChange={handleUpload} />
                    </Button>
                    {preview && !uploading && (
                        <Typography variant="caption" color="success.main">✓ Image uploadée</Typography>
                    )}
                    {error && <Typography variant="caption" color="error">{error}</Typography>}
                </Box>
            </Box>
        </Box>
    );
};

// ─── GIF picker (Create — upload deferred until record saved) ─────────────────
const GifPickerForCreate = ({ onFilePicked, selectedFile }) => {
    const [preview, setPreview] = useState(null);

    const handlePick = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        onFilePicked(file);
        setPreview(URL.createObjectURL(file));
    };

    return (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                    width: 90, height: 90, borderRadius: 3,
                    border: `2px dashed ${preview ? TEAL : '#e0e0e0'}`,
                    bgcolor: preview ? 'transparent' : '#f9fafb',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {preview ? (
                        <img src={preview} alt="aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <ImageIcon size={28} color="#ccc" />
                    )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        sx={{ textTransform: 'none', borderColor: TEAL, color: TEAL, '&:hover': { borderColor: TEAL, bgcolor: `${TEAL}0a` } }}
                    >
                        {selectedFile ? "Changer l'image" : 'Ajouter image / GIF'}
                        <input type="file" accept="image/gif,image/png,image/jpeg,image/webp" hidden onChange={handlePick} />
                    </Button>
                    {selectedFile && (
                        <Typography variant="caption" color="text.secondary">
                            📎 {selectedFile.name}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

// ─── Category list ────────────────────────────────────────────────────────────
export const CategoryList = () => (
    <List sort={{ field: 'display_order', order: 'ASC' }}>
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <FunctionField
                label="Aperçu"
                render={(r) => {
                    if (r.gif_url) {
                        return (
                            <Box
                                component="a"
                                href={`${API_URL}${r.gif_url}`}
                                target="_blank"
                                rel="noreferrer"
                                sx={{ display: 'inline-block', lineHeight: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={`${API_URL}${r.gif_url}`}
                                    alt={r.name_fr || r.name}
                                    style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: `2px solid ${TEAL}33`, display: 'block' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fb = e.target.parentElement.querySelector('.gif-fb');
                                        if (fb) fb.style.display = 'flex';
                                    }}
                                />
                                <Box className="gif-fb" sx={{ display: 'none', width: 52, height: 52, borderRadius: 8, bgcolor: '#e0f7fa', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0.25 }}>
                                    <Typography sx={{ color: '#00796b', fontSize: 8, fontWeight: 700 }}>GIF</Typography>
                                    <Typography variant="caption" sx={{ color: '#00796b', fontSize: 7, px: 0.5, lineHeight: 1.1, textAlign: 'center' }}>{(r.icon_name || '').substring(0, 10)}</Typography>
                                </Box>
                            </Box>
                        );
                    }
                    // Styled initials badge when no GIF uploaded
                    const initials = (r.name_fr || r.name || '?').substring(0, 2).toUpperCase();
                    const palette = ['#6366f1', '#f59e0b', TEAL, '#10b981', '#f43f5e', '#8b5cf6'];
                    const color = palette[(r.display_order || 0) % palette.length];
                    return (
                        <Box sx={{ width: 52, height: 52, borderRadius: 8, bgcolor: color + '18', border: `2px solid ${color}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1 }}>{initials}</Typography>
                            <Typography variant="caption" sx={{ fontSize: 7, color, lineHeight: 1.1, textAlign: 'center', px: 0.25, maxWidth: 48, overflow: 'hidden' }}>
                                {(r.icon_name || '').substring(0, 10)}
                            </Typography>
                        </Box>
                    );
                }}
            />
            <TextField source="name_fr" label="Nom (FR)" />
            <TextField source="name" label="Nom (EN)" />
            <TextField source="icon_name" label="Icône" />
            <FunctionField
                source="base_price"
                label="Prix de base"
                render={(r) => (
                    <Chip
                        label={fcfaFormat(r.base_price)}
                        size="small"
                        sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: 12 }}
                    />
                )}
            />
            <FunctionField
                label="Express (+%)"
                render={(r) => (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        +% global
                    </Typography>
                )}
            />
            <FunctionField source="display_order" label="Ordre" render={(r) => (
                <Chip label={r.display_order ?? '—'} size="small" variant="outlined" />
            )} />
            <DeleteButton />
        </Datagrid>
    </List>
);

// ─── Category Edit ────────────────────────────────────────────────────────────
export const CategoryEdit = () => (
    <Edit actions={<BackActions />}>
        <SimpleForm toolbar={<FormToolbar />}>
            <Box sx={{ maxWidth: 560, width: '100%' }}>
                {/* ── Identification ── */}
                <SectionTitle icon={<Tag size={16} />} label="Identification" />
                <TextInput
                    source="name_fr"
                    label="Nom en français"
                    validate={required()}
                    fullWidth
                    helperText="Affiché sur l'application mobile"
                />
                <TextInput
                    source="name"
                    label="Nom en anglais"
                    validate={required()}
                    fullWidth
                    helperText="Nom de référence interne"
                />

                {/* ── Visuel ── */}
                <SectionTitle icon={<ImageIcon size={16} />} label="Visuel & Icône" />
                <TextInput
                    source="icon_name"
                    label="Nom de l'icône"
                    validate={required()}
                    fullWidth
                    helperText='Nom MaterialCommunityIcons — ex: "tshirt-crew", "human-male", "briefcase"'
                />
                <GifUploader />

                {/* ── Tarification ── */}
                <SectionTitle icon={<Tag size={16} />} label="Tarification" />

                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        ℹ️ Le prix express est calculé automatiquement via le <strong>pourcentage global express</strong> configuré dans <em>Config Points</em>. Pas besoin de le saisir ici.
                    </Typography>
                </Paper>

                <NumberInput
                    source="base_price"
                    label="Prix de base (Fcfa)"
                    validate={required()}
                    fullWidth
                    format={v => v != null && v !== '' ? Math.round(parseFloat(v) * 100) : ''}
                    parse={v => v !== '' && v != null ? parseFloat(v) / 100 : null}
                    helperText="Saisissez le prix réel en Fcfa — ex: 4000 pour 4 000 Fcfa"
                />

                {/* ── Paramètres ── */}
                <SectionTitle icon={<SlidersHorizontal size={16} />} label="Paramètres" />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <NumberInput
                        source="display_order"
                        label="Ordre d'affichage"
                        helperText="1 = premier dans la liste"
                        sx={{ flex: 1 }}
                    />
                    <NumberInput
                        source="processing_time_hours"
                        label="Délai de traitement"
                        helperText="En heures (ex: 24)"
                        sx={{ flex: 1 }}
                        InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>heures</Typography> }}
                    />
                </Box>
            </Box>
        </SimpleForm>
    </Edit>
);

// ─── Category Create ──────────────────────────────────────────────────────────
export const CategoryCreate = () => {
    const [pendingFile, setPendingFile] = useState(null);
    const notify = useNotify();

    const handleSuccess = async (data) => {
        if (!pendingFile || !data?.id) return;
        try {
            await uploadGif(data.id, pendingFile);
            notify('Catégorie créée avec image !', { type: 'success' });
        } catch (err) {
            notify(`Catégorie créée, mais erreur image: ${err.message}`, { type: 'warning' });
        }
    };

    return (
        <Create mutationOptions={{ onSuccess: handleSuccess }} actions={<BackActions />}>
            <SimpleForm toolbar={<FormToolbar />}>
                <Box sx={{ maxWidth: 560, width: '100%' }}>
                    {/* ── Identification ── */}
                    <SectionTitle icon={<Tag size={16} />} label="Identification" />
                    <TextInput
                        source="name_fr"
                        label="Nom en français"
                        validate={required()}
                        fullWidth
                        helperText="Affiché sur l'application mobile"
                    />
                    <TextInput
                        source="name"
                        label="Nom en anglais"
                        validate={required()}
                        fullWidth
                        helperText="Nom de référence interne"
                    />

                    {/* ── Visuel ── */}
                    <SectionTitle icon={<ImageIcon size={16} />} label="Visuel & Icône" />
                    <TextInput
                        source="icon_name"
                        label="Nom de l'icône"
                        validate={required()}
                        fullWidth
                        defaultValue="hanger"
                        helperText='Nom MaterialCommunityIcons — ex: "tshirt-crew", "human-male", "briefcase"'
                    />
                    <GifPickerForCreate onFilePicked={setPendingFile} selectedFile={pendingFile} />

                    {/* ── Tarification ── */}
                    <SectionTitle icon={<Tag size={16} />} label="Tarification" />

                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            ℹ️ Le prix express est calculé automatiquement via le <strong>pourcentage global express</strong> configuré dans <em>Config Points</em>. Pas besoin de le saisir ici.
                        </Typography>
                    </Paper>

                    <NumberInput
                        source="base_price"
                        label="Prix de base (Fcfa)"
                        validate={required()}
                        fullWidth
                        defaultValue={2000}
                        format={v => v != null && v !== '' ? Math.round(parseFloat(v) * 100) : ''}
                        parse={v => v !== '' && v != null ? parseFloat(v) / 100 : null}
                        helperText="Saisissez le prix réel en Fcfa — ex: 2000 pour 2 000 Fcfa"
                    />

                    {/* ── Paramètres ── */}
                    <SectionTitle icon={<SlidersHorizontal size={16} />} label="Paramètres" />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <NumberInput
                            source="display_order"
                            label="Ordre d'affichage"
                            defaultValue={99}
                            helperText="1 = premier dans la liste"
                            sx={{ flex: 1 }}
                        />
                        <NumberInput
                            source="processing_time_hours"
                            label="Délai de traitement"
                            defaultValue={24}
                            helperText="En heures (ex: 24)"
                            sx={{ flex: 1 }}
                            InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>heures</Typography> }}
                        />
                    </Box>
                </Box>
            </SimpleForm>
        </Create>
    );
};
