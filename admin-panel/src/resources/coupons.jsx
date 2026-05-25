import React from 'react';
import {
    List, Datagrid, TextField, DateField, FunctionField,
    Create, Edit, SimpleForm, TextInput, NumberInput, BooleanInput,
    SelectInput, DateTimeInput, required, useRecordContext,
    TopToolbar, ListButton, SaveButton, Toolbar, DeleteButton,
} from 'react-admin';
import { Chip } from '@mui/material';
import { ArrowLeft } from '@phosphor-icons/react';

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

const CouponStatusField = () => {
    const record = useRecordContext();
    if (!record) return null;
    const now = new Date();
    const expired = record.valid_until && new Date(record.valid_until) < now;
    const exhausted = record.max_uses !== null && record.uses_count >= record.max_uses;
    let label = 'Actif';
    let color = 'success';
    if (!record.is_active)   { label = 'Désactivé'; color = 'default'; }
    else if (expired)        { label = 'Expiré';    color = 'error'; }
    else if (exhausted)      { label = 'Épuisé';    color = 'warning'; }
    return <Chip label={label} color={color} size="small" />;
};

export const CouponList = () => (
    <List sort={{ field: 'created_at', order: 'DESC' }}>
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <TextField source="code" label="Code" />
            <TextField source="name" label="Nom" />
            <FunctionField
                label="Réduction"
                render={r => r.discount_type === 'percent'
                    ? `${r.discount_value}%`
                    : `${Number(r.discount_value).toFixed(0)} Fcfa`}
            />
            <FunctionField label="Commande min" render={r => `${Number(r.min_order_amount || 0).toFixed(0)} Fcfa`} />
            <FunctionField
                label="Utilisations"
                render={r => r.max_uses ? `${r.uses_count} / ${r.max_uses}` : `${r.uses_count} / ∞`}
            />
            <DateField source="valid_until" label="Expire le" showTime={false} emptyText="Jamais" />
            <CouponStatusField label="Statut" />
            <DeleteButton />
        </Datagrid>
    </List>
);

export const CouponCreate = () => (
    <Create redirect="list" actions={<BackActions />}>
        <SimpleForm toolbar={<FormToolbar />}>
            <TextInput source="code" label="Code coupon (auto majuscule)" validate={required()} fullWidth />
            <TextInput source="name" label="Nom affiché" validate={required()} fullWidth />
            <TextInput source="description" label="Description" multiline rows={2} fullWidth />
            <SelectInput
                source="discount_type"
                label="Type de réduction"
                validate={required()}
                choices={[
                    { id: 'percent', name: 'Pourcentage (%)' },
                    { id: 'fixed',   name: 'Montant fixe (Fcfa)' },
                ]}
            />
            <NumberInput source="discount_value" label="Valeur de la réduction" validate={required()} min={0} />
            <NumberInput source="min_order_amount" label="Montant minimum de commande (Fcfa)" defaultValue={0} min={0} />
            <NumberInput source="max_discount_amount" label="Plafond de réduction (Fcfa, optionnel)" min={0} />
            <NumberInput source="max_uses" label="Utilisations max (vide = illimité)" min={1} />
            <DateTimeInput source="valid_from" label="Valide à partir du" />
            <DateTimeInput source="valid_until" label="Valide jusqu'au (vide = pas d'expiration)" />
            <BooleanInput source="is_active" label="Actif" defaultValue={true} />
        </SimpleForm>
    </Create>
);

export const CouponEdit = () => (
    <Edit mutationMode="pessimistic" actions={<BackActions />}>
        <SimpleForm toolbar={<FormToolbar />}>
            <TextInput source="code" label="Code coupon" validate={required()} fullWidth disabled />
            <TextInput source="name" label="Nom affiché" validate={required()} fullWidth />
            <TextInput source="description" label="Description" multiline rows={2} fullWidth />
            <SelectInput
                source="discount_type"
                label="Type de réduction"
                validate={required()}
                choices={[
                    { id: 'percent', name: 'Pourcentage (%)' },
                    { id: 'fixed',   name: 'Montant fixe (Fcfa)' },
                ]}
            />
            <NumberInput source="discount_value" label="Valeur de la réduction" validate={required()} min={0} />
            <NumberInput source="min_order_amount" label="Montant minimum (Fcfa)" min={0} />
            <NumberInput source="max_discount_amount" label="Plafond de réduction (Fcfa)" min={0} />
            <NumberInput source="max_uses" label="Utilisations max (vide = illimité)" min={1} />
            <DateTimeInput source="valid_from" label="Valide à partir du" />
            <DateTimeInput source="valid_until" label="Valide jusqu'au" />
            <BooleanInput source="is_active" label="Actif" />
        </SimpleForm>
    </Edit>
);
