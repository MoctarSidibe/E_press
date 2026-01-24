import React from 'react';
import {
    List,
    Datagrid,
    TextField,
    NumberField,
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    Create,
    required,
    DeleteButton
} from 'react-admin';

export const CategoryList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="icon_name" label="Icon" />
            <NumberField source="base_price" options={{ style: 'currency', currency: 'USD' }} label="Base Price" />
            <NumberField source="express_price" options={{ style: 'currency', currency: 'USD' }} label="Express Price" />
            <DeleteButton />
        </Datagrid>
    </List>
);

export const CategoryEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" validate={required()} />
            <TextInput source="icon_name" label="Icon Name" validate={required()} />
            <NumberInput source="base_price" label="Base Price" validate={required()} />
            <NumberInput source="express_price" label="Express Price" validate={required()} />
        </SimpleForm>
    </Edit>
);

export const CategoryCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" validate={required()} />
            <TextInput source="icon_name" label="Icon Name" validate={required()} />
            <NumberInput source="base_price" label="Base Price ($)" validate={required()} defaultValue={5.00} />
            <NumberInput source="express_price" label="Express Price ($)" validate={required()} defaultValue={8.00} />
        </SimpleForm>
    </Create>
);
