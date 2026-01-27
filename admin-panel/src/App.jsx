import React from 'react';
import { Admin, Resource } from 'react-admin';
import dataProvider from './providers/dataProvider';
import authProvider from './providers/authProvider';
import Dashboard from './dashboard/Dashboard';
import LoginPage from './auth/LoginPage';
import { UserList, UserEdit, UserCreate } from './resources/users';
import { OrderList, OrderShow } from './resources/orders';
import { CategoryList, CategoryEdit, CategoryCreate } from './resources/categories';


import { MyLayout } from './layout/MyLayout';
import { UsersThree, ShoppingBag, Tag } from '@phosphor-icons/react';

// Custom colored icons
const UserIcon = () => <UsersThree size={28} color="#667eea" weight="duotone" />;
const OrderIcon = () => <ShoppingBag size={28} color="#00D4D4" weight="duotone" />;
const CategoryIcon = () => <Tag size={28} color="#f5576c" weight="duotone" />;

import { theme } from './theme/theme';

const App = () => (
    <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        dashboard={Dashboard}
        loginPage={LoginPage}
        layout={MyLayout}
        theme={theme}
        sx={{
            '& .RaSidebar-fixed': {
                width: 280, // Slightly wider sidebar
            },
            '& .RaMenuItemLink-icon': {
                minWidth: 40, // Space for bigger icons
            }
        }}
    >
        <Resource name="users" list={UserList} edit={UserEdit} create={UserCreate} icon={UserIcon} />
        <Resource name="orders" list={OrderList} show={OrderShow} icon={OrderIcon} />
        <Resource name="categories" list={CategoryList} edit={CategoryEdit} create={CategoryCreate} icon={CategoryIcon} />
    </Admin>
);

export default App;
