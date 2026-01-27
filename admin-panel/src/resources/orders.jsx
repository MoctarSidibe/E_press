import React from 'react';
import {
    List,
    Datagrid,
    TextField,
    DateField,
    NumberField,
    Show,
    SimpleShowLayout,
    ReferenceField,
    FunctionField,
    ChipField,
    SelectInput,
    TextInput
} from 'react-admin';
import { Chip } from '@mui/material';

const StatusChip = ({ record }) => {
    const statusColors = {
        pending: '#FFA726',
        assigned: '#00D4D4',
        picked_up: '#9C27B0',
        in_facility: '#00B4D8',
        ready: '#4CAF50',
        out_for_delivery: '#FF9800',
        delivered: '#00D9A3',
        cancelled: '#FF5252',
    };

    return (
        <Chip
            label={record.status}
            style={{
                backgroundColor: statusColors[record.status] || '#999',
                color: 'white',
                fontWeight: 'bold',
            }}
        />
    );
};

export const OrderList = () => (
    <List
        sort={{ field: 'created_at', order: 'DESC' }}
        filters={[
            <SelectInput source="status" label="Status" choices={[
                { id: 'pending', name: 'Pending' },
                { id: 'assigned', name: 'Assigned' },
                { id: 'picked_up', name: 'Picked Up' },
                { id: 'in_facility', name: 'In Facility' },
                { id: 'ready', name: 'Ready' },
                { id: 'out_for_delivery', name: 'Out for Delivery' },
                { id: 'delivered', name: 'Delivered' },
                { id: 'cancelled', name: 'Cancelled' },
            ]} alwaysOn />,
            <TextInput source="order_number" label="Order #" />
        ]}
    >
        <Datagrid rowClick="show">
            <TextField source="order_number" label="Order #" />
            <FunctionField label="Status" render={(record) => <StatusChip record={record} />} />
            <TextField source="customer_email" label="Customer" />
            <NumberField source="total" options={{ style: 'currency', currency: 'USD' }} />
            <TextField source="pickup_type" label="Pickup" />
            <TextField source="payment_method" label="Payment" />
            <DateField source="created_at" label="Created" showTime />
        </Datagrid>
    </List>
);

export const OrderShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="order_number" label="Order Number" />
            <FunctionField label="Status" render={(record) => <StatusChip record={record} />} />
            <TextField source="customer_email" label="Customer Email" />
            <TextField source="customer_name" label="Customer Name" />
            <NumberField source="subtotal" options={{ style: 'currency', currency: 'USD' }} />
            <NumberField source="delivery_fee" options={{ style: 'currency', currency: 'USD' }} />
            <NumberField source="service_fee" options={{ style: 'currency', currency: 'USD' }} />
            <NumberField source="total" options={{ style: 'currency', currency: 'USD' }} />
            <TextField source="pickup_type" label="Pickup Type" />
            <TextField source="payment_method" label="Payment Method" />
            <DateField source="scheduled_pickup" label="Scheduled Pickup" showTime />
            <TextField source="pickup_driver_name" label="Pickup Driver" />
            <TextField source="delivery_driver_name" label="Delivery Driver" />
            <DateField source="created_at" label="Created At" showTime />
            <DateField source="updated_at" label="Updated At" showTime />
        </SimpleShowLayout>
    </Show>
);
