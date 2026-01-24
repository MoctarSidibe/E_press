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
    DeleteButton
} from 'react-admin';

export const UserList = () => (
    <List filters={[
        <SelectInput source="role" label="Role" choices={[
            { id: 'customer', name: 'Customer' },
            { id: 'driver', name: 'Driver' },
            { id: 'cleaner', name: 'Cleaner' },
            { id: 'admin', name: 'Admin' },
        ]} alwaysOn />
    ]}>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <EmailField source="email" />
            <TextField source="full_name" label="Name" />
            <TextField source="role" />
            <TextField source="phone" />
            <BooleanField source="is_active" label="Active" />
            <DateField source="created_at" label="Created" showTime />
            <DeleteButton />
        </Datagrid>
    </List>
);

export const UserEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="email" validate={[required(), email()]} />
            <TextInput source="full_name" label="Full Name" validate={required()} />
            <TextInput source="phone" />
            <SelectInput
                source="role"
                choices={[
                    { id: 'customer', name: 'Customer' },
                    { id: 'driver', name: 'Driver' },
                    { id: 'cleaner', name: 'Cleaner' },
                    { id: 'admin', name: 'Admin' },
                ]}
                validate={required()}
            />
            <BooleanInput source="is_active" label="Active" />
        </SimpleForm>
    </Edit>
);

export const UserCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="email" validate={[required(), email()]} />
            <TextInput source="full_name" label="Full Name" validate={required()} />
            <TextInput source="phone" />
            <TextInput source="password" type="password" validate={required()} />
            <SelectInput
                source="role"
                choices={[
                    { id: 'customer', name: 'Customer' },
                    { id: 'driver', name: 'Driver' },
                    { id: 'cleaner', name: 'Cleaner' },
                    { id: 'admin', name: 'Admin' },
                ]}
                validate={required()}
            />
            <BooleanInput source="is_active" label="Active" defaultValue={true} />
        </SimpleForm>
    </Create>
);
