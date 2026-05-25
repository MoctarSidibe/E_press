import React, { useState, useCallback, useEffect } from 'react';
import {
    List, Datagrid, TextField, NumberField, BooleanField, FunctionField,
    Create, Edit, SimpleForm, TextInput, NumberInput, BooleanInput,
    required, useNotify, useRedirect, useRecordContext, EditButton, DeleteButton,
    TopToolbar, ListButton, SaveButton, Toolbar,
} from 'react-admin';
import {
    Box, Chip, Typography, Paper, Divider, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Tooltip,
} from '@mui/material';
import { MapPin, X, CrosshairSimple, ArrowLeft } from '@phosphor-icons/react';

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

// ─── Map picker (OpenStreetMap iframe + click-to-pick) ────────────────────────
// We use an HTML page inside an iframe that sends postMessage with coordinates.
function MapPicker({ lat, lng, onPick }) {
    const [open, setOpen] = useState(false);

    const handleMessage = useCallback(
        (e) => {
            if (e.data && e.data.type === 'map_pick') {
                onPick(e.data.lat, e.data.lng);
                setOpen(false);
            }
        },
        [onPick]
    );

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;}
#hint{position:absolute;top:10px;left:50%;transform:translateX(-50%);
background:rgba(0,0,0,.7);color:#fff;padding:6px 14px;border-radius:20px;
font-size:13px;z-index:1000;pointer-events:none;}
</style>
</head>
<body>
<div id="hint">Cliquez sur la carte pour placer la laverie</div>
<div id="map"></div>
<script>
var initLat = ${lat || 0.3924};
var initLng = ${lng || 9.4536};
var map = L.map('map').setView([initLat, initLng], ${lat ? 14 : 12});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
var marker;
if(${lat ? 'true' : 'false'}){
  marker = L.marker([initLat, initLng]).addTo(map);
}
map.on('click', function(e){
  var lat = e.latlng.lat.toFixed(7);
  var lng = e.latlng.lng.toFixed(7);
  if(marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map);
  window.parent.postMessage({type:'map_pick', lat:parseFloat(lat), lng:parseFloat(lng)}, '*');
});
</script>
</body>
</html>`;

    const blob = new Blob([mapHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    return (
        <>
            <Tooltip title="Choisir sur la carte">
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MapPin size={16} />}
                    onClick={() => setOpen(true)}
                    sx={{ mt: 1, mb: 1, textTransform: 'none', borderRadius: 2 }}
                >
                    {lat && lng ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}` : 'Choisir sur la carte'}
                </Button>
            </Tooltip>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CrosshairSimple size={22} weight="duotone" color="#00D4D4" />
                        <Typography fontWeight={700}>Positionner la laverie</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setOpen(false)}>
                        <X size={18} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <iframe
                        src={url}
                        style={{ width: '100%', height: 480, border: 'none' }}
                        title="map-picker"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
                        Annuler
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ─── Form with embedded map picker ────────────────────────────────────────────
const LaverieForm = ({ defaultValues }) => {
    const [lat, setLat] = useState(defaultValues?.lat ?? '');
    const [lng, setLng] = useState(defaultValues?.lng ?? '');

    const handlePick = useCallback((pickedLat, pickedLng) => {
        setLat(pickedLat);
        setLng(pickedLng);
    }, []);

    return (
        <Box sx={{ maxWidth: 600, p: 2 }}>
            <SimpleForm defaultValues={{ lat, lng, ...defaultValues }} toolbar={<FormToolbar />}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Informations de la laverie
                </Typography>
                <TextInput source="name" label="Nom" validate={required()} fullWidth />
                <TextInput source="address" label="Adresse" fullWidth />
                <TextInput source="phone" label="Téléphone" fullWidth />

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Géolocalisation
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <NumberInput
                        source="lat"
                        label="Latitude"
                        validate={required()}
                        sx={{ flex: 1 }}
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                    />
                    <NumberInput
                        source="lng"
                        label="Longitude"
                        validate={required()}
                        sx={{ flex: 1 }}
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                    />
                </Box>
                <MapPicker lat={lat} lng={lng} onPick={handlePick} />

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Paramètres de service
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <NumberInput
                        source="radius_km"
                        label="Rayon de service (km)"
                        defaultValue={5}
                        sx={{ flex: 1 }}
                    />
                    <NumberInput
                        source="max_concurrent_orders"
                        label="Commandes max simultanées"
                        defaultValue={20}
                        sx={{ flex: 1 }}
                    />
                </Box>
                <BooleanInput source="active" label="Active" defaultValue={true} />
            </SimpleForm>
        </Box>
    );
};

// ─── Status chip ──────────────────────────────────────────────────────────────
const StatusField = () => {
    const record = useRecordContext();
    if (!record) return null;
    const active = record.active !== false && record.active !== 'false';
    return <Chip label={active ? 'Active' : 'Inactive'} color={active ? 'success' : 'default'} size="small" />;
};

// ─── List ─────────────────────────────────────────────────────────────────────
export const LaverieList = () => (
    <List sort={{ field: 'name', order: 'ASC' }} perPage={25}>
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <TextField source="name" label="Nom" />
            <TextField source="address" label="Adresse" />
            <TextField source="phone" label="Téléphone" />
            <FunctionField
                label="Position"
                render={(r) =>
                    r.lat && r.lng ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MapPin size={14} color="#00D4D4" weight="fill" />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lng).toFixed(4)}
                            </Typography>
                        </Box>
                    ) : '—'
                }
            />
            <NumberField source="radius_km" label="Rayon (km)" />
            <NumberField source="max_concurrent_orders" label="Max commandes" />
            <FunctionField
                label="En cours"
                render={(r) => (
                    <Chip
                        label={`${r.active_orders ?? 0} / ${r.max_concurrent_orders}`}
                        size="small"
                        color={
                            parseInt(r.active_orders ?? 0) >= parseInt(r.max_concurrent_orders)
                                ? 'error'
                                : 'info'
                        }
                    />
                )}
            />
            <StatusField label="Statut" />
            <EditButton />
            <DeleteButton />
        </Datagrid>
    </List>
);

// ─── Create ───────────────────────────────────────────────────────────────────
export const LaverieCreate = () => (
    <Create actions={<BackActions />}>
        <LaverieForm />
    </Create>
);

// ─── Edit ─────────────────────────────────────────────────────────────────────
export const LaverieEdit = () => (
    <Edit actions={<BackActions />}>
        <LaverieForm />
    </Edit>
);
