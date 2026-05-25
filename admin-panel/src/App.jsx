import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import dataProvider from './providers/dataProvider';
import authProvider from './providers/authProvider';
import Dashboard from './dashboard/Dashboard';
import LoginPage from './auth/LoginPage';
import { UserList, UserEdit, UserCreate } from './resources/users';
import { OrderList, OrderShow } from './resources/orders';
import { CategoryList, CategoryEdit, CategoryCreate } from './resources/categories';
import { CouponList, CouponCreate, CouponEdit } from './resources/coupons';
import { PointsConfigPage } from './resources/pointsConfig';
import KYCPage from './resources/kyc';
import DriversPage from './resources/drivers';
import { LaverieList, LaverieCreate, LaverieEdit } from './resources/laveries';

import { MyLayout } from './layout/MyLayout';
import { UsersThree, ShoppingBag, Tag, Ticket, Star, ShieldCheck, Storefront, Truck } from '@phosphor-icons/react';

// Custom colored icons
const UserIcon = () => <UsersThree size={28} color="#667eea" weight="duotone" />;
const OrderIcon = () => <ShoppingBag size={28} color="#00D4D4" weight="duotone" />;
const CategoryIcon = () => <Tag size={28} color="#f5576c" weight="duotone" />;
const CouponIcon = () => <Ticket size={28} color="#00b894" weight="duotone" />;
const PointsIcon = () => <Star size={28} color="#FFD700" weight="duotone" />;
const KYCIcon = () => <ShieldCheck size={28} color="#8B5CF6" weight="duotone" />;
const LaverieIcon = () => <Storefront size={28} color="#06B6D4" weight="duotone" />;
const DriverIcon  = () => <Truck size={28} color="#00D4D4" weight="duotone" />;

import { theme } from './theme/theme';

const App = () => (
    <Admin
        basename="/admin"
        dataProvider={dataProvider}
        authProvider={authProvider}
        dashboard={Dashboard}
        loginPage={LoginPage}
        layout={MyLayout}
        theme={theme}
        sx={{
            '& .RaSidebar-fixed': {
                width: 280,
            },
            '& .RaMenuItemLink-icon': {
                minWidth: 40,
            }
        }}
    >
        <Resource name="users" list={UserList} edit={UserEdit} create={UserCreate} icon={UserIcon} />
        <Resource name="orders" list={OrderList} show={OrderShow} icon={OrderIcon} />
        <Resource name="categories" list={CategoryList} edit={CategoryEdit} create={CategoryCreate} icon={CategoryIcon} />
        <Resource name="coupons" list={CouponList} create={CouponCreate} edit={CouponEdit} icon={CouponIcon} />
        <Resource name="laveries" list={LaverieList} create={LaverieCreate} edit={LaverieEdit} icon={LaverieIcon} />
        <CustomRoutes>
            <Route path="/points-config" element={<PointsConfigPage />} />
            <Route path="/kyc" element={<KYCPage />} />
            <Route path="/drivers" element={<DriversPage />} />
        </CustomRoutes>
    </Admin>
);

export default App;
