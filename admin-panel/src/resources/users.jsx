import React from 'react';
import {
    List,
    Datagrid,
    TextField,
    EmailField,
    DateField,
    BooleanField,
    Edit,
    SimpleForm,
    TextInput,
    SelectInput,
    BooleanInput,
    Create,
    required,
    email,
    DeleteButton,
    TopToolbar,
    ListButton,
    SaveButton,
    Toolbar,
} from 'react-admin';
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

export const UserList = () => (
    <List filters={[
        <TextInput source="q" label="Rechercher (nom, email)" alwaysOn resettable />,
        <SelectInput source="role" label="Rôle" alwaysOn choices={[
            { id: 'customer', name: 'Client' },
            { id: 'driver',   name: 'Livreur' },
            { id: 'cleaner',  name: 'Agent nettoyage' },
            { id: 'admin',    name: 'Admin' },
        ]} />,
        <SelectInput source="is_active" label="Statut" choices={[
            { id: 'true',  name: 'Actif' },
            { id: 'false', name: 'Inactif' },
        ]} />,
    ]} sort={{ field: 'created_at', order: 'DESC' }}>
        <Datagrid rowClick="edit">
            <EmailField source="email" label="Email" />
            <TextField source="full_name" label="Nom" />
            <TextField source="role" label="Rôle" />
            <TextField source="phone" label="Téléphone" />
            <BooleanField source="is_active" label="Actif" />
            <DateField source="created_at" label="Inscrit le" showTime />
            <DeleteButton />
        </Datagrid>
    </List>
);

export const UserEdit = () => (
    <Edit actions={<BackActions />}>
        <SimpleForm toolbar={<FormToolbar />}>
            <TextInput source="id" disabled />
            <TextInput source="email" validate={[required(), email()]} />
            <TextInput source="full_name" label="Nom complet" validate={required()} />
            <TextInput source="phone" label="Téléphone" />
            <SelectInput
                source="role"
                label="Rôle"
                choices={[
                    { id: 'customer', name: 'Client' },
                    { id: 'driver',   name: 'Livreur' },
                    { id: 'cleaner',  name: 'Agent nettoyage' },
                    { id: 'admin',    name: 'Admin' },
                ]}
                validate={required()}
            />
            <BooleanInput source="is_active" label="Actif" />
        </SimpleForm>
    </Edit>
);

export const UserCreate = () => (
    <Create actions={<BackActions />}>
        <SimpleForm toolbar={<FormToolbar />}>
            <TextInput source="email" validate={[required(), email()]} />
            <TextInput source="full_name" label="Nom complet" validate={required()} />
            <TextInput source="phone" label="Téléphone" />
            <TextInput source="password" type="password" label="Mot de passe" validate={required()} />
            <SelectInput
                source="role"
                label="Rôle"
                choices={[
                    { id: 'customer', name: 'Client' },
                    { id: 'driver',   name: 'Livreur' },
                    { id: 'cleaner',  name: 'Agent nettoyage' },
                    { id: 'admin',    name: 'Admin' },
                ]}
                validate={required()}
            />
            <BooleanInput source="is_active" label="Actif" defaultValue={true} />
        </SimpleForm>
    </Create>
);
