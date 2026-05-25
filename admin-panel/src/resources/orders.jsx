import React, { useState } from 'react';
import {
    List,
    Datagrid,
    TextField,
    DateField,
    Show,
    SimpleShowLayout,
    FunctionField,
    SelectInput,
    TextInput,
    DateInput,
    TopToolbar,
    ListButton,
    useRecordContext,
    useNotify,
    useRefresh,
} from 'react-admin';
import {
    Chip, Box, Typography, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, MenuItem, Select, FormControl,
    InputLabel, IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ArrowLeft } from '@phosphor-icons/react';
import { API_URL } from '../config/env';

const STATUS_LABELS = {
    pending:          'En attente',
    assigned:         'Assigné',
    picked_up:        'Collecté',
    in_facility:      'En traitement',
    ready:            'Prêt',
    out_for_delivery: 'En livraison',
    delivered:        'Livré',
    cancelled:        'Annulé',
};

const STATUS_COLORS = {
    pending:          '#FFA726',
    assigned:         '#00D4D4',
    picked_up:        '#9C27B0',
    in_facility:      '#00B4D8',
    ready:            '#4CAF50',
    out_for_delivery: '#FF9800',
    delivered:        '#00D9A3',
    cancelled:        '#FF5252',
};

const StatusChip = ({ record }) => (
    <Chip
        label={STATUS_LABELS[record.status] || record.status}
        style={{
            backgroundColor: STATUS_COLORS[record.status] || '#999',
            color: 'white',
            fontWeight: 'bold',
        }}
        size="small"
    />
);

const FcfaField = ({ source, label }) => (
    <FunctionField
        label={label}
        render={(record) => {
            const val = parseFloat(record[source] || 0);
            return val > 0 ? `${(val * 100).toFixed(0)} Fcfa` : '-';
        }}
    />
);

// ── Status update dialog ───────────────────────────────────────────────────────
const StatusUpdateDialog = ({ open, onClose, record, onUpdated }) => {
    const [status, setStatus] = useState(record?.status || 'pending');
    const [saving, setSaving] = useState(false);
    const notify = useNotify();

    if (!record) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_URL}/orders/${record.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Erreur lors de la mise à jour');
            notify('Statut mis à jour', { type: 'success' });
            onUpdated();
            onClose();
        } catch (e) {
            notify(e.message, { type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight={700}>Changer le statut</Typography>
                <IconButton size="small" onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Commande <b>{record.order_number}</b>
                </Typography>
                <FormControl fullWidth size="small">
                    <InputLabel>Nouveau statut</InputLabel>
                    <Select
                        value={status}
                        label="Nouveau statut"
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        {Object.entries(STATUS_LABELS).map(([id, name]) => (
                            <MenuItem key={id} value={id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[id] }} />
                                    {name}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose}>Annuler</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving || status === record.status}>
                    {saving ? 'Enregistrement...' : 'Confirmer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ── Show actions ───────────────────────────────────────────────────────────────
const OrderShowActions = () => {
    const record = useRecordContext();
    const refresh = useRefresh();
    const [open, setOpen] = useState(false);

    return (
        <TopToolbar>
            <ListButton label="Retour" icon={<ArrowLeft size={16} />} />
            {record && record.status !== 'delivered' && record.status !== 'cancelled' && (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => setOpen(true)}
                    sx={{ ml: 1, textTransform: 'none' }}
                >
                    Changer statut
                </Button>
            )}
            <StatusUpdateDialog
                open={open}
                onClose={() => setOpen(false)}
                record={record}
                onUpdated={refresh}
            />
        </TopToolbar>
    );
};

export const OrderList = () => (
    <List
        sort={{ field: 'created_at', order: 'DESC' }}
        filters={[
            <SelectInput source="status" label="Statut" alwaysOn choices={
                Object.entries(STATUS_LABELS).map(([id, name]) => ({ id, name }))
            } />,
            <TextInput source="order_number" label="N° Commande" alwaysOn resettable />,
            <TextInput source="customer_email" label="Email client" resettable />,
            <SelectInput source="pickup_type" label="Type collecte" choices={[
                { id: 'immediate', name: 'Immédiate' },
                { id: 'scheduled', name: 'Planifiée' },
            ]} />,
            <SelectInput source="payment_method" label="Paiement" choices={[
                { id: 'cash',         name: 'Espèces' },
                { id: 'mobile_money', name: 'Mobile Money' },
                { id: 'card',         name: 'Carte' },
            ]} />,
            <DateInput source="date_from" label="Du" />,
            <DateInput source="date_to"   label="Au" />,
        ]}
    >
        <Datagrid rowClick="show">
            <TextField source="order_number" label="N° Commande" />
            <FunctionField label="Statut" render={(record) => <StatusChip record={record} />} />
            <TextField source="customer_email" label="Client" />
            <FunctionField label="Total" render={(record) => `${(parseFloat(record.total || 0) * 100).toFixed(0)} Fcfa`} />
            <TextField source="pickup_type" label="Collecte" />
            <TextField source="payment_method" label="Paiement" />
            <FunctionField
                label="Livreur collecte"
                render={(r) => r.pickup_driver_name || '—'}
            />
            <DateField source="created_at" label="Créé le" showTime />
        </Datagrid>
    </List>
);

export const OrderShow = () => (
    <Show actions={<OrderShowActions />}>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <TextField source="order_number" label="N° Commande" />
            <FunctionField label="Statut" render={(record) => <StatusChip record={record} />} />
            <TextField source="customer_email" label="Email client" />
            <TextField source="customer_name" label="Nom client" />

            <FcfaField source="subtotal" label="Sous-total" />
            <FcfaField source="delivery_fee" label="Frais de livraison" />
            <FcfaField source="express_fee" label="Supplément express" />

            <FunctionField
                label="Coupon"
                render={(record) =>
                    record.coupon_code
                        ? `${record.coupon_code} (-${(parseFloat(record.coupon_discount || 0) * 100).toFixed(0)} Fcfa)`
                        : '-'
                }
            />
            <FunctionField
                label="Points utilisés"
                render={(record) =>
                    record.points_redeemed > 0
                        ? `${record.points_redeemed} pts (-${(parseFloat(record.points_discount || 0) * 100).toFixed(0)} Fcfa)`
                        : '-'
                }
            />
            <FunctionField
                label="Total"
                render={(record) => `${(parseFloat(record.total || 0) * 100).toFixed(0)} Fcfa`}
            />

            <TextField source="pickup_type" label="Type de collecte" />
            <TextField source="payment_method" label="Mode de paiement" />
            <DateField source="scheduled_pickup" label="Collecte prévue" showTime />
            <TextField source="pickup_driver_name" label="Livreur (collecte)" />
            <TextField source="delivery_driver_name" label="Livreur (livraison)" />
            <DateField source="created_at" label="Créé le" showTime />
            <DateField source="updated_at" label="Mis à jour le" showTime />
        </SimpleShowLayout>
    </Show>
);
